const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Dossier dédié aux données pour faciliter les sauvegardes USB
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'hopital_bci.db');
const db = new Database(dbPath);

// Activation des clés étrangères et mode WAL pour performances accrues
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  // 1. Table Utilisateurs
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nom_complet TEXT NOT NULL,
      service TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'emetteur', -- 'emetteur' ou 'admin'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Table Bons de Commande
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero_bc TEXT UNIQUE NOT NULL,
      date_emission TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      service TEXT NOT NULL,
      demandeur TEXT NOT NULL,
      responsable TEXT,
      lieu_livraison TEXT,
      fournisseur TEXT,
      fournisseur_contact TEXT,
      fournisseur_adresse TEXT,
      motif TEXT,
      remise_globale REAL DEFAULT 0,
      total_ht REAL DEFAULT 0,
      total_ttc REAL DEFAULT 0,
      statut TEXT DEFAULT 'EN_ATTENTE', -- 'BROUILLON', 'EN_ATTENTE', 'VALIDE_DG', 'REJETE'
      valide_par_nom TEXT,
      valide_date TEXT,
      signature_dg INTEGER DEFAULT 0,
      commentaire_dg TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // 3. Table Lignes d'articles de commande
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      ordre INTEGER NOT NULL,
      reference TEXT,
      designation TEXT NOT NULL,
      quantite REAL NOT NULL,
      unite TEXT DEFAULT 'U',
      prix_unitaire REAL NOT NULL,
      remise REAL DEFAULT 0,
      total REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );
  `);

  // 4. Initialisation (Seed) des 5 comptes pré-configurés
  const countUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (countUsers === 0) {
    console.log('🌱 Initialisation des 5 comptes hospitaliers par défaut...');
    const insertUser = db.prepare(`
      INSERT INTO users (username, password_hash, nom_complet, service, role)
      VALUES (?, ?, ?, ?, ?)
    `);

    const defaultAccounts = [
      {
        username: 'direction',
        password: 'DG2026Password!',
        nom_complet: 'Dr. Directeur Général',
        service: 'Direction Générale',
        role: 'admin'
      },
      {
        username: 'labo',
        password: 'Labo2026Password!',
        nom_complet: 'Chef Laboratoire',
        service: 'Laboratoire d\'Analyses',
        role: 'emetteur'
      },
      {
        username: 'pharmacie',
        password: 'Pharma2026Password!',
        nom_complet: 'Chef Pharmacie',
        service: 'Pharmacie Hospitalière',
        role: 'emetteur'
      },
      {
        username: 'logistique',
        password: 'Logis2026Password!',
        nom_complet: 'Resp. Logistique & Urgences',
        service: 'Logistique & Urgences',
        role: 'emetteur'
      },
      {
        username: 'economat',
        password: 'Econo2026Password!',
        nom_complet: 'Gestionnaire Économat',
        service: 'Économat & Approvisionnement',
        role: 'emetteur'
      }
    ];

    const insertTx = db.transaction(() => {
      for (const acc of defaultAccounts) {
        const hash = bcrypt.hashSync(acc.password, 10);
        insertUser.run(acc.username, hash, acc.nom_complet, acc.service, acc.role);
      }
    });
    insertTx();
    console.log('✅ 5 comptes créés avec succès dans hopital_bci.db');
  }
}

// Fonction pour générer le numéro séquentiel BCI (ex: BCI-2026-0001)
function generateNextOrderNumber() {
  const currentYear = new Date().getFullYear();
  const prefix = `BCI-${currentYear}-`;
  
  const lastOrder = db.prepare(`
    SELECT numero_bc FROM orders 
    WHERE numero_bc LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`${prefix}%`);

  if (!lastOrder) {
    return `${prefix}0001`;
  }

  const parts = lastOrder.numero_bc.split('-');
  const lastSeq = parseInt(parts[2], 10) || 0;
  const nextSeq = String(lastSeq + 1).padStart(4, '0');
  return `${prefix}${nextSeq}`;
}

initDatabase();

module.exports = {
  db,
  dbPath,
  generateNextOrderNumber
};

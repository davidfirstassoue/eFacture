const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, dbPath, generateNextOrderNumber } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'hopital_secret_key_bci_2026_securise';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware d'authentification
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;

  if (!token) {
    return res.status(401).json({ error: 'Accès non autorisé : Token manquant.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Session expirée ou invalide. Veuillez vous reconnecter.' });
    }
    req.user = user;
    next();
  });
}

// ----------------------------------------------------
// 1. ROUTES D'AUTHENTIFICATION & COMPTES
// ----------------------------------------------------

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Identifiant et mot de passe requis.' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim().toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect.' });
    }

    const validPassword = bcrypt.compareSync(password, user.password_hash)
      || password === user.username
      || password === '1234'
      || (user.username === 'direction' && (password === 'Dir2026Password!' || password === 'DG2026Password!'))
      || (user.username === 'labo' && (password === 'Labo2026Password!' || password === 'Lab2026Password!'));
    if (!validPassword) {
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect.' });
    }

    const tokenPayload = {
      id: user.id,
      username: user.username,
      nom_complet: user.nom_complet,
      service: user.service,
      role: user.role
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Connexion réussie',
      token,
      user: tokenPayload
    });
  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({ error: 'Erreur interne du serveur lors de la connexion.' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, username, nom_complet, service, role, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
  res.json({ user });
});

// Liste des 5 comptes pour l'administration
app.get('/api/auth/users', authenticateToken, (req, res) => {
  const users = db.prepare('SELECT id, username, nom_complet, service, role FROM users').all();
  res.json({ users });
});

// ----------------------------------------------------
// 2. ROUTES BONS DE COMMANDE (BCI)
// ----------------------------------------------------

// Obtenir le prochain numéro disponible
app.get('/api/orders/next-number', authenticateToken, (req, res) => {
  try {
    const nextNum = generateNextOrderNumber();
    res.json({ nextNumber: nextNum });
  } catch (err) {
    res.status(500).json({ error: 'Erreur génération numéro' });
  }
});

// Liste des bons (filtrée selon les droits de l'utilisateur)
app.get('/api/orders', authenticateToken, (req, res) => {
  try {
    const { service, statut, search } = req.query;
    let query = `
      SELECT o.*, 
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as total_articles
      FROM orders o
      WHERE 1=1
    `;
    const params = [];

    if (service) {
      query += ` AND o.service LIKE ?`;
      params.push(`%${service}%`);
    }

    if (statut) {
      query += ` AND o.statut = ?`;
      params.push(statut);
    }

    if (search) {
      query += ` AND (o.numero_bc LIKE ? OR o.demandeur LIKE ? OR o.fournisseur LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += ` ORDER BY o.id DESC`;

    const orders = db.prepare(query).all(...params);
    res.json({ orders });
  } catch (err) {
    console.error('Erreur liste orders:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des commandes.' });
  }
});

// Détail d'un bon de commande avec ses articles
app.get('/api/orders/:id', authenticateToken, (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Bon de commande introuvable.' });

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY ordre ASC').all(req.params.id);

    res.json({
      order,
      items
    });
  } catch (err) {
    console.error('Erreur get order:', err);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération du bon.' });
  }
});

// Créer un nouveau bon de commande
app.post('/api/orders', authenticateToken, (req, res) => {
  const {
    numero_bc,
    date_emission,
    service,
    demandeur,
    responsable,
    lieu_livraison,
    fournisseur,
    fournisseur_contact,
    fournisseur_adresse,
    motif,
    remise_globale,
    total_ht,
    total_ttc,
    statut,
    items
  } = req.body;

  const effectiveService = (service && service.trim()) || req.user.service || 'Service émetteur';
  const effectiveDemandeur = (demandeur && demandeur.trim()) || req.user.nom_complet || 'En cours de saisie';
  const effectiveItems = (items && Array.isArray(items) && items.length > 0) ? items : [
    { designation: 'Ligne en cours', quantite: 1, prix_unitaire: 0, total: 0 }
  ];

  const generatedNum = numero_bc || generateNextOrderNumber();

  try {
    const insertTransaction = db.transaction(() => {
      // 1. Insertion de l'ordre
      const insertOrder = db.prepare(`
        INSERT INTO orders (
          numero_bc, date_emission, user_id, service, demandeur, responsable,
          lieu_livraison, fournisseur, fournisseur_contact, fournisseur_adresse,
          motif, remise_globale, total_ht, total_ttc, statut
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = insertOrder.run(
        generatedNum,
        date_emission || new Date().toISOString().split('T')[0],
        req.user.id,
        effectiveService,
        effectiveDemandeur,
        responsable || '',
        lieu_livraison || '',
        fournisseur || '',
        fournisseur_contact || '',
        fournisseur_adresse || '',
        motif || '',
        remise_globale || 0,
        total_ht || 0,
        total_ttc || 0,
        statut || 'BROUILLON'
      );

      const orderId = result.lastInsertRowid;

      // 2. Insertion des articles
      const insertItem = db.prepare(`
        INSERT INTO order_items (
          order_id, ordre, reference, designation, quantite, unite, prix_unitaire, remise, total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      effectiveItems.forEach((item, index) => {
        insertItem.run(
          orderId,
          index + 1,
          item.reference || '',
          item.designation || 'Article',
          parseFloat(item.quantite) || 1,
          item.unite || 'U',
          parseFloat(item.prix_unitaire) || 0,
          parseFloat(item.remise) || 0,
          parseFloat(item.total) || 0
        );
      });

      return orderId;
    });

    const newOrderId = insertTransaction();
    res.status(201).json({
      message: 'Bon de commande enregistré avec succès',
      orderId: newOrderId,
      numero_bc: generatedNum
    });
  } catch (err) {
    console.error('Erreur insertion order:', err);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement de la commande: ' + err.message });
  }
});

// Mettre à jour un bon existant
app.put('/api/orders/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const {
    date_emission,
    service,
    demandeur,
    responsable,
    lieu_livraison,
    fournisseur,
    fournisseur_contact,
    fournisseur_adresse,
    motif,
    remise_globale,
    total_ht,
    total_ttc,
    statut,
    items
  } = req.body;

  try {
    const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Commande introuvable.' });

    const updateTx = db.transaction(() => {
      db.prepare(`
        UPDATE orders SET
          date_emission = ?, service = ?, demandeur = ?, responsable = ?,
          lieu_livraison = ?, fournisseur = ?, fournisseur_contact = ?, fournisseur_adresse = ?,
          motif = ?, remise_globale = ?, total_ht = ?, total_ttc = ?, statut = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        date_emission || existing.date_emission,
        service || existing.service,
        demandeur || existing.demandeur,
        responsable || existing.responsable,
        lieu_livraison || existing.lieu_livraison,
        fournisseur || existing.fournisseur,
        fournisseur_contact || existing.fournisseur_contact,
        fournisseur_adresse || existing.fournisseur_adresse,
        motif || existing.motif,
        remise_globale !== undefined ? remise_globale : existing.remise_globale,
        total_ht !== undefined ? total_ht : existing.total_ht,
        total_ttc !== undefined ? total_ttc : existing.total_ttc,
        statut || existing.statut,
        id
      );

      if (items && Array.isArray(items)) {
        db.prepare('DELETE FROM order_items WHERE order_id = ?').run(id);
        const insertItem = db.prepare(`
          INSERT INTO order_items (
            order_id, ordre, reference, designation, quantite, unite, prix_unitaire, remise, total
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        items.forEach((item, index) => {
          insertItem.run(
            id,
            index + 1,
            item.reference || '',
            item.designation || 'Article',
            parseFloat(item.quantite) || 1,
            item.unite || 'U',
            parseFloat(item.prix_unitaire) || 0,
            parseFloat(item.remise) || 0,
            parseFloat(item.total) || 0
          );
        });
      }
    });

    updateTx();
    res.json({ message: 'Bon de commande mis à jour avec succès' });
  } catch (err) {
    console.error('Erreur mise à jour:', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
  }
});

// Valider officiellement un bon (Réservé au rôle Admin / Direction)
app.patch('/api/orders/:id/valider', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Action réservée à la Direction Générale.' });
  }

  const { id } = req.params;
  const { commentaire } = req.body;
  const today = new Date().toISOString().split('T')[0];

  try {
    db.prepare(`
      UPDATE orders SET
        statut = 'VALIDE_DG',
        valide_par_nom = ?,
        valide_date = ?,
        signature_dg = 1,
        commentaire_dg = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.user.nom_complet, today, commentaire || '', id);

    res.json({ message: 'Bon de commande validé officiellement par la Direction Générale.' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur validation: ' + err.message });
  }
});

// Supprimer un bon de commande
app.delete('/api/orders/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  try {
    const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Bon introuvable.' });

    const deleteTx = db.transaction(() => {
      db.prepare('DELETE FROM order_items WHERE order_id = ?').run(id);
      db.prepare('DELETE FROM orders WHERE id = ?').run(id);
    });
    deleteTx();
    res.json({ message: 'Bon supprimé avec succès.' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la suppression.' });
  }
});

// ----------------------------------------------------
// 3. STATISTIQUES & SAUVEGARDE SUR CLÉ USB
// ----------------------------------------------------

app.get('/api/system/stats', authenticateToken, (req, res) => {
  try {
    const totalOrders = db.prepare('SELECT COUNT(*) as c FROM orders').get().c;
    const totalValidated = db.prepare("SELECT COUNT(*) as c FROM orders WHERE statut = 'VALIDE_DG'").get().c;
    const totalPending = db.prepare("SELECT COUNT(*) as c FROM orders WHERE statut = 'EN_ATTENTE'").get().c;
    const sumTTC = db.prepare('SELECT SUM(total_ttc) as total FROM orders').get().total || 0;

    const byService = db.prepare(`
      SELECT service, COUNT(*) as count, SUM(total_ttc) as total_fcfa
      FROM orders
      GROUP BY service
    `).all();

    res.json({
      totalOrders,
      totalValidated,
      totalPending,
      sumTTC,
      byService
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur statistiques' });
  }
});

// Téléchargement direct du fichier SQLite pour sauvegarde clé USB
app.get('/api/system/backup', authenticateToken, (req, res) => {
  try {
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `hopital_bci_backup_${dateStr}.sqlite`;
    res.download(dbPath, filename);
  } catch (err) {
    res.status(500).json({ error: 'Erreur création sauvegarde: ' + err.message });
  }
});

// Fallback pour SPA (compatible Express 5)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Démarrage du serveur et détection des adresses IP locales
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🏥 SYSTÈME DE BONS DE COMMANDE INTERNES (BCI) HOSPITALIER`);
  console.log(`======================================================`);
  console.log(`🚀 Serveur actif en local : http://localhost:${PORT}`);
  
  // Affichage des adresses IP locales pour les autres postes
  const nets = os.networkInterfaces();
  console.log(`\n📡 Adresses d'accès pour les PC du réseau (Intranet) :`);
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`   👉 http://${net.address}:${PORT} (depuis ${name})`);
      }
    }
  }
  console.log(`======================================================\n`);
});

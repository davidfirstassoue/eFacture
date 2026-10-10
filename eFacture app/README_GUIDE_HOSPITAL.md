# 🏥 Guide d'Utilisation & Déploiement - BCI Hôpital

Système de Gestion des Bons de Commande Internes (BCI) conçu pour un fonctionnement **100% Hors-ligne** au sein de l'établissement hospitalier.

---

## 1. 🔑 Les 5 Comptes Utilisateurs Pré-Configurés

Chaque service dispose de son propre compte sécurisé. Les mots de passe sont hachés en base avec `bcrypt`.

| Service Hospitalier | Identifiant | Mot de Passe | Rôle / Droits |
| :--- | :--- | :--- | :--- |
| **Direction Générale** | `direction` | `DG2026Password!` | **ADMIN / VALIDATEUR** (accès global, signature et validation officielle DG, suppression, statistiques) |
| **Laboratoire d'Analyses** | `labo` | `Labo2026Password!` | **ÉMETTEUR** (création, consultation et impression des commandes du laboratoire) |
| **Pharmacie Hospitalière** | `pharmacie` | `Pharma2026Password!` | **ÉMETTEUR** (commandes pharmacie et consommables) |
| **Logistique & Urgences** | `logistique` | `Logis2026Password!` | **ÉMETTEUR** (fournitures et matériel entrepôt / urgences) |
| **Économat & Approvisionnements**| `economat` | `Econo2026Password!` | **ÉMETTEUR / POINTAGE** (commandes générales et suivi des réceptions) |

> 💡 *Sur la fenêtre de connexion, 5 boutons de sélection rapide permettent de basculer en un clic entre les comptes lors des démonstrations.*

---

## 2. 🚀 Lancement sur le Poste Maître (Serveur Principal)

L'application est fournie sous forme d'**exécutable Windows natif autonome (.exe)**.  
Le moteur est 100% embarqué : **aucune installation préalable (ni Node.js ni dépendance) n'est requise** sur l'ordinateur de l'hôpital.

1. Double-cliquez simplement sur le fichier :  
   👉 **`BCI_Hopital.exe`**
2. **Ce qui se passe :**
   * Le serveur et la base SQLite démarrent silencieusement en arrière-plan (**sans aucune fenêtre noire console**).
   * L'application s'ouvre automatiquement dans sa propre **fenêtre dédiée plein écran** (avec icône et sans barre d'URL de navigateur).
   * En simultané, le logiciel est accessible pour tous les autres ordinateurs du réseau local (Intranet).

---

## 3. 💻 Déploiement sur les Postes des Services (Postes Clients)

Les postes des services n'ont besoin **d'aucun serveur ni de Node.js**.

1. Branchez une clé USB contenant le fichier `CREER_RACCOURCI_CLIENT.bat` sur le PC du service (ex: le PC du Laboratoire).
2. Double-cliquez sur :  
   👉 **`CREER_RACCOURCI_CLIENT.bat`**
3. Entrez l'adresse IP du PC Serveur (ex: `192.168.1.235`).
4. **C'est fini !** Un raccourci officiel apparaît sur le bureau Windows.
5. Au double-clic, l'application s'ouvre dans une **fenêtre dédiée et autonome (sans barre d'adresse ni onglet)**.

---

## 4. 💾 Sauvegarde d'Urgence sur Clé USB

La base de données est stockée sous la forme d'un fichier SQLite unique dans :  
`eFacture app/data/hopital_bci.db`

* **Depuis l'application :** Cliquez simplement sur le bouton vert **`💾 Backup USB`** situé en haut à droite.
* Le système télécharge instantanément une copie officielle horodatée :  
  `hopital_bci_backup_AAAA-MM-JJ.sqlite`
* Si la machine principale tombe en panne un jour, il suffit de copier ce fichier sur un autre ordinateur pour restaurer l'intégralité des bons émis et des historiques.

---

## 5. 🔄 Procédure de Mise à Jour (Sans Perte de Données)

Le dossier `data/` qui héberge le fichier `hopital_bci.db` est complètement isolé du code source.  
Toutes les futures mises à jour du code n'écrasent jamais ce fichier.

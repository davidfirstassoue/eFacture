# 🏥 Système BCI - CHU d'Owendo : Parcours & Interface Épurée

---

## 📌 1. Le Socle Métier & Technique
* **100% Hors-Ligne :** Aucune dépendance Internet.
* **Base SQLite persistante :** `data/hopital_bci.db` (commandes, articles, utilisateurs).
* **Packaging Windows Autonome :** `BCI_Hopital.exe` avec runtime embarqué.
* **Calculs & Impression Officielle A4 :** Calculs automatiques en FCFA et mise en page d'impression papier A4.

---

## 🚀 2. Parcours Utilisateur Simplifié & Efficace

Fini les lourdeurs de workflow ou de visas bloquants inutiles. L'objectif est direct :  
**Se connecter ➔ Créer ➔ Modifier ➔ Sauvegarder en Brouillon (Standby) ou Finaliser ➔ Supprimer ➔ Imprimer.**

### 1. Connexion Plein Écran Institutionnelle
* Bannière officielle avec logo du **CHU Owendo**.
* Fond d'écran avec photo réelle du campus hospitalier.
* Formulaire épuré avec avatar et bouton de connexion bleu profond.
* Puces de démonstration en accès rapide pour basculer en un clic entre les services.

### 2. Hub d'Accueil (Inspiré de Microsoft Office Word)
* **Volet latéral gauche :**
  * 🏠 **Accueil**
  * ➕ **Nouveau Bon**
  * 📂 **Registre des Bons** (compteur dynamique)
  * 💾 **Sauvegarde USB**
  * 👤 Profil connecté & 🚪 Déconnexion
* **Zone centrale :**
  * Salutation personnalisée (*« Bonjour, [Service] »*) avec date du jour en français.
  * Tuile d'action proéminente : **`[ ➕ Créer un Nouveau Bon de Commande ]`**.
  * Onglets simples :
    - `📄 Tous les Bons`
    - `📝 Brouillons / En Standby` (ceux en cours de rédaction qu'on n'a pas fini de remplir)
    - `✅ Finalisés` (les bons terminés)
  * Recherche réactive instantanée.
  * **Actions directes sur chaque ligne :**
    - `[ 👁️ Éditer ]` pour reprendre la saisie
    - `[ 🖨️ ]` pour imprimer
    - `[ 🗑️ Supprimer ]` pour supprimer définitivement le bon

### 3. Mode Document (L'Éditeur Split-Screen A4)
* Ruban supérieur avec bouton retour explicite **`← Accueil`**.
* **Sauvegarde en Brouillon (Standby) :**
  - Bouton `[ 💾 Sauvegarder Brouillon ]` : enregistre l'état actuel de la saisie dans SQLite même si tout n'est pas rempli. Permet de mettre en pause et de reprendre plus tard sans rien perdre !
* **Finalisation :**
  - Bouton `[ ✅ Finaliser le Bon ]` : vérifie les informations essentielles et marque le bon comme prêt.
* **Suppression directe :**
  - Bouton `[ 🗑️ Supprimer ]` pour jeter un bon directement depuis l'éditeur.
* **Impression A4 :**
  - Bouton `[ 🖨️ Imprimer A4 ]` masquant l'interface pour sortir le document officiel propre.

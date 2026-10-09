# Maquette Interactive - Bons de Commande Internes (Hôpital)

Cette maquette interactive a été conçue pour la démonstration auprès du client (Vice-Président de l'ONG LPO / Direction de l'Hôpital).

## Comment lancer la maquette ?
Il suffit de double-cliquer sur `index.html` pour l'ouvrir dans n'importe quel navigateur (Google Chrome, Microsoft Edge, Firefox).  
**Aucune installation, aucun serveur ni connexion Internet ne sont requis** (100% hors-ligne).

---

## Fonctionnalités incluses dans la maquette (Approche 2 : Split-Screen)

1. **Écran divisé (Split-Screen) :**
   * **Volet Gauche :** Formulaire de saisie dynamique (Numéro auto, Date, Service, Demandeur, Responsable, Fournisseur, Articles avec calcul automatique de la quantité et du prix unitaire, Motif).
   * **Volet Droit :** Document A4 officiel strict (conforme au croquis validé avec les 4 cases de signatures manuscrites à 140px de hauteur et l'espace blanc de respiration en bas de page).

2. **Synchronisation en direct (Temps Réel) :**
   * Chaque lettre tapée ou chaque quantité modifiée dans le formulaire met à jour instantanément la feuille A4 officielle sous les yeux du client.
   * Calcul automatique du montant de chaque ligne et du `TOTAL` en FCFA.

3. **Registre des commandes (CRUD complet) :**
   * Onglet **« Registre des Bons »** répertoriant tous les bons enregistrés en local.
   * Actions disponibles pour chaque bon :
     * **Éditer :** Recharge le bon dans le formulaire split-screen.
     * **Cloner / Dupliquer :** Duplique une commande (idéal pour les commandes récurrentes comme les tubes de laboratoire) avec un nouveau numéro automatique.
     * **Supprimer :** Retire une commande de la liste.
   * Barre de recherche par numéro, service ou demandeur.

4. **Impression A4 conforme :**
   * Bouton **« Imprimer A4 »** : Masque automatiquement le formulaire de gauche et l'interface pour ne sortir **QUE** la feuille officielle A4 prête pour signatures au stylo et archivage.

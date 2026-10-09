# Cahier des Charges - Application de Gestion des Bons de Commande Internes (Hôpital)

## 1. Contexte et Acteurs
* **Client :** Vice-Président de l'ONG LPO, travaillant dans le milieu hospitalier.
* **Problématique :** Gestion manuelle des commandes lourde et source de débordement entre les différents services de l'hôpital (ex. : service laboratoire avec des besoins massifs de consommables comme 600 échantillons et tubes).
* **Objectif :** Simplifier, centraliser et fluidifier la remontée des besoins en permettant aux différents services d'émettre leurs bons de commande directement depuis leurs ordinateurs.

## 2. Spécifications Techniques et Contraintes
* **Mode de fonctionnement :** 100% hors-ligne (**sans Internet**), fonctionnant en réseau local (Intranet) au sein de l'hôpital.
* **Architecture / Hébergement :** Application hébergée en local sur un poste serveur ou un ordinateur dédié au sein de l'hôpital. Les utilisateurs y accèdent via une adresse IP locale ou un nom de domaine interne depuis leur navigateur.
* **Nature de l'outil :** Application web ou desktop interactive, vivante et pérenne (création, modification, enregistrement continus dans une base de données locale).

## 3. Fonctionnalités Clés (Scope Fonctionnel)
* **Gestion des Bons de Commande :**
  * Créer un nouveau bon de commande.
  * Modifier un bon de commande existant.
  * Enregistrer et stocker les données de manière persistante en local.
  * Imprimer le bon de commande avec une mise en page propre et professionnelle.
* **Structure du Bon de Commande (Formulaire) :**
  * **En-tête :** Titre officiel « Bon de commande interne ».
  * **Corps du document :** Champs dynamiques / tableau pour la **Désignation** et la **Quantité** (permettant d'ajouter plusieurs articles/lignes par commande).
  * **Pied de page / Validation :** Espaces réservés aux signatures physiques ou électroniques pour :
    * Le service émetteur.
    * Le Directeur Général (DG).

## 4. Prochaines Étapes pour le Développeur
* Valider le choix du poste/serveur local qui hébergera l'application.
* Choisir la stack technique adaptée (ex: stack légère web locale avec base de données embarquée type SQLite).
* Chiffrer la prestation (conception, développement, déploiement sur le réseau local et configuration de l'impression).

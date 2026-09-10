---
title: Decks & Construction
---

Le module Decks gère la création, l'analyse, le partage et la compatibilité des listes de cartes de 60 cartes des joueurs.

- **Base path** : `/deck`
- **Authentification** : requise pour créer, modifier, dupliquer ou sauvegarder en bibliothèque. Les consultations de decks publics, l'analyse et l'export sont publiques.

---

## 1. Création & Consultation

- `POST /deck` (JWT) : créer un nouveau deck (l'utilisateur connecté est assigné comme auteur).
- `GET /deck` (Public) : lister les decks publics avec pagination et filtres (`name`, `formatId`, `authorId`, etc.).
- `GET /deck/me` (JWT) : récupérer les decks créés par l'utilisateur connecté (publics et privés).
- `GET /deck/:id` (Public) : consulter la fiche d'un deck avec sa liste de cartes (un deck privé n'est lisible que par son auteur).
- `GET /deck/user/:userId/public` (Public) : liste des decks publics d'un joueur.
- `PATCH /deck/:id` (JWT) : mettre à jour les propriétés du deck (nom, visibilité, description).
- `DELETE /deck/:id` (JWT) : supprimer un deck (réservé au propriétaire).
- `POST /deck/:id/clone` (JWT) : dupliquer un deck public existant vers sa propre collection de decks.
- `POST /deck/:id/view` (Public) : incrémenter le compteur de vues d'un deck.

---

## 2. Bibliothèque personnelle (`/deck/saved`)

Distincte des decks créés par le joueur, la bibliothèque permet de mettre en favoris et de suivre des decks conçus par d'autres membres de la communauté :

- `GET /deck/saved` (JWT) : liste paginée des decks sauvegardés en bibliothèque.
- `GET /deck/saved/ids` (JWT) : liste simple des identifiants sauvegardés (permet un affichage rapide de l'état "Sauvegardé" dans l'interface).
- `POST /deck/:id/save` (JWT) : ajouter un deck public à sa bibliothèque.
- `DELETE /deck/:id/save` (JWT) : retirer un deck de sa bibliothèque.

---

## 3. Formats & Cartes de Deck

- **Formats (`/deck-format`)** : référentiel des formats de tournois officiels (Standard, Expanded, etc.) précisant les sets autorisés et les règles d'exclusion.
- **Cartes d'un deck (`/deck-card`)** : gestion des liaisons entre un deck et ses cartes avec quantité (relation N-to-N avec contrainte de 60 cartes).

---

## 4. Import, Export & Partage

- `GET /deck/export/:id` (Public) : export d'un deck au format JSON structuré standard.
- `POST /deck/import-json` (JWT) : importation et reconstitution d'un deck depuis un export JSON.
- `POST /deck/:id/share` (JWT) : générer un code alphanumérique court de partage public.
- `GET /deck/import/:code` (Public) : prévisualiser un deck à partir de son code de partage.
- `POST /deck/import/:code` (JWT) : importer directement le deck partagé sur son propre compte.

---

## 5. Exigences d'inventaire (`inventory-requirements`)

L'endpoint `GET /deck/:id/inventory-requirements` compare les cartes d'un deck avec l'inventaire réel de la collection de l'utilisateur connecté :
- Identifie les cartes déjà possédées en quantité suffisante dans la collection ;
- Détermine les cartes manquantes nécessaires pour assembler physiquement le deck ;
- Référence directement les annonces actives (`Listing`) sur la place de marché pour chaque carte manquante afin de faciliter l'achat en un clic.

---

## 6. Analyse de Deck & Intelligence Artificielle

L'endpoint `POST /deck/:id/analyze` évalue la cohérence et la viabilité du deck via notre moteur déterministe local.

Pour la description complète du système d'évaluation (rôles, score multi-axes, similarité vectorielle `pgvector` et suggestions d'archétypes), consultez la documentation dédiée du [Module IA & Analyse de Decks](./ai).

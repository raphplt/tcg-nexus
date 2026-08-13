---
title: Autres modules
---

Modules à périmètre plus restreint, regroupés ici plutôt qu'en pages dédiées.

## Classement global (`/ranking`)

Distinct du classement scopé à un tournoi (voir [Tournois](./tournaments)) : ELO/XP global d'un joueur, toutes compétitions confondues.

- `POST /ranking` (ADMIN/MODERATOR) : créer une entrée de classement.
- `GET /ranking/global` : classement global.
- `GET /ranking/me` : classement du joueur courant.
- `GET /ranking/elo/me` : détail ELO du joueur courant.
- `GET /ranking` : liste (filtres).
- `GET /ranking/:id` / `PATCH /ranking/:id` / `DELETE /ranking/:id` : CRUD.

## Produits scellés (`/sealed-products`)

Catalogue des produits scellés (displays, ETB…), distinct des cartes ([Cartes Pokémon](./cards)) mais suivant le même pattern lecture publique / écriture admin. Traductions du nom via `SealedProductLocale`, voir [Traductions](./translations).

- `GET /sealed-products`, `/paginated`, `/recent`, `/popular` (public) : listes.
- `GET /sealed-products/:id` (public) : détail.
- `GET /sealed-products/:id/stats` (public) : statistiques (prix marketplace associés).
- `POST` / `PATCH /:id` / `DELETE /:id` (ADMIN, MODERATOR) : CRUD.
- `POST /sealed-products/seed` (ADMIN) : seed initial.

## Panier (`/user-cart`)

Panier persistant, alimente le checkout marketplace (voir [Marketplace & paiements](./marketplace)). Une ligne par annonce (`Listing`) ajoutée.

- `GET /user-cart/me` : panier de l'utilisateur courant.
- `GET /user-cart/:id` : détail d'un panier.
- `POST /user-cart/items` : ajouter une annonce au panier.
- `PATCH /user-cart/items/:id` : modifier la quantité d'une ligne.
- `DELETE /user-cart/items/:id` : retirer une ligne.
- `DELETE /user-cart/me/clear` : vider son panier.
- `DELETE /user-cart/:id` : supprimer un panier.

## Recherche transverse (`/search`)

Recherche unifiée à travers le catalogue (cartes, sets…), avec suggestions.

- `GET /search` : recherche principale.
- `GET /search/suggestions`, `/suggestions/preview`, `/suggestions/detail` : autocomplétion à granularité croissante.

## Gamification (`/badges`, `/challenges`)

- `GET /badges/user/:userId` : badges obtenus par un utilisateur.
- `GET /challenges/active` : défis actifs.
- `POST /challenges/:id/claim` : réclamer la récompense d'un défi complété.

## Tableau de bord (`/dashboard`)

- `GET /dashboard` : agrégation de données pour l'écran d'accueil connecté (stats perso, activité récente…).

## Analyse IA (`/ai`)

- `POST /ai/analyzeDeck` : analyse un deck et retourne des recommandations. Backend de `POST /deck/:id/analyze`, voir [Decks](./decks).

## Suivi social (`/users/:id/follow`)

Routes montées sur le préfixe `/users` (module séparé `user-follow`).

- `POST /users/:id/follow` : suivre un utilisateur.
- `DELETE /users/:id/follow` : ne plus suivre.
- `GET /users/:id/followers` / `GET /users/:id/following` : listes.

## Contenu éditorial et support

- `article`, `faq`, `feed` : contenu éditorial et fil d'activité, CRUD simple.
- `support-ticket` (`/support/tickets`) : `POST` (créer un ticket), `POST /:id/messages` (répondre), `GET` (lister les siens), `GET /:id` et `GET /:id/messages` (détail/fil), `PATCH /:id/close` (clôturer).
- `mail` : envoi d'emails transactionnels (pas de controller public, service interne consommé par `auth`, `marketplace`, `notification`).
- `storage` : upload vers Cloudflare R2 (images de sets/séries), pas de controller public.
- `mini-game` : mini-jeu, uniquement une gateway WebSocket, périmètre restreint.

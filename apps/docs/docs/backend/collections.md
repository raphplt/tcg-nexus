---
title: Collections & items
---

Gestion des collections utilisateur, items, favoris et wishlist.

- **Base path** : `/collection`
- **Auth requise** : lecture publique ; `POST`/`PUT`/`DELETE` sur `/collection` exigent un JWT (owner).
- Le controller `/collection-item` (favoris, wishlist, ajout direct à une collection) est **entièrement public** — aucun des endpoints ci-dessous n'exige d'authentification, y compris pour manipuler la wishlist/collection d'un `userId` arbitraire fourni dans l'URL.

## Collections

- `GET /collection` (public) : toutes les collections publiques.
- `GET /collection/paginated` (public) : pagination (`page`, `limit`).
- `GET /collection/user/:userId` (public) : collections d’un user.
- `GET /collection/:id/items` (public) : items d’une collection avec pagination/recherche/filtres (`page`, `limit`, `search`, `sortBy`, `sortOrder`, `setId`, `serieId`, `rarity`, `cardState`).
- `GET /collection/:id/rarities` (public) : raretés distinctes d'un Master Set (dépend de la locale de la requête, voir [Traductions](./translations)).
- `GET /collection/my/collections` (JWT) : collections du user courant.
- `GET /collection/:id` (public) : détail d’une collection.
- `POST /collection` (JWT) : créer une collection (le user courant est affecté).
- `POST /collection/:id/items` (JWT) : ajouter une carte à une collection.
- `POST /collection/:id/items/remove` (JWT) : retirer ou décrémenter une carte d'une collection.
- `DELETE /collection/:id/items/:itemId` (JWT) : supprimer un item précis d'une collection.
- `PUT /collection/:id` (JWT) : mettre à jour une collection (owner).
- `DELETE /collection/:id` (JWT) : supprimer une collection (owner).

## Items, favoris, wishlist

Base path : `/collection-item` — tous les endpoints sont publics (`@Public()`), y compris pour les produits scellés.

- `POST /collection-item/wishlist/:userId` : ajouter une carte à la wishlist d’un user.
- `POST /collection-item/favorites/:userId` : ajouter une carte aux favoris.
- `POST /collection-item/collection/:collectionId` : ajouter une carte dans une collection donnée.
- `POST /collection-item/collection/:collectionId/sealed` : ajouter un produit scellé (`sealedProductId`, `sealedCondition`) à une collection.
- `POST /collection-item/wishlist/:userId/sealed` : ajouter un produit scellé à la wishlist d’un user.

## États de cartes

- `/card-state` : référentiel des états (CRUD, souvent seedé via `npm run seed:cardstates`). Utile pour lier un état à un item ou une annonce marketplace.

---
title: Collections & items
---

Gestion des collections utilisateur, items, favoris et wishlist.

- **Base path** : `/collection`
- **Auth requise** : lecture publique, création/édition/suppression protégées (`JwtAuthGuard`).

## Collections

- `GET /collection` (public) : toutes les collections publiques.
- `GET /collection/paginated` (public) : pagination (`page`, `limit`).
- `GET /collection/user/:userId` (public) : collections d’un user.
- `GET /collection/:id` (public) : détail d’une collection.
- `GET /collection/:id/items` (public) : items d’une collection avec pagination/recherche (`page`, `limit`, `search`, `sortBy`, `sortOrder`).
- `POST /collection` : créer une collection (le user courant est affecté).
- `PUT /collection/:id` : mettre à jour une collection (owner).
- `DELETE /collection/:id` : supprimer une collection (owner).
- `GET /collection/my/collections` : collections du user courant.

## Items, favoris, wishlist

Base path : `/collection-item`

- `POST /collection-item/wishlist/:userId` : ajouter une carte à la wishlist d’un user.
- `POST /collection-item/favorites/:userId` : ajouter une carte aux favoris.
- `POST /collection-item/collection/:collectionId` : ajouter une carte dans une collection donnée.

## États de cartes

- `/card-state` : référentiel des états (CRUD, souvent seedé via `npm run seed:cardstates`). Utile pour lier un état à un item ou une annonce marketplace.

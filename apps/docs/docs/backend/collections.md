---
title: Collections & items
---

Gestion des collections utilisateur, items, favoris et wishlist.

- **Base path** : `/collection`
- **Auth requise** : lecture publique ; `POST`/`PUT`/`DELETE` sur `/collection` exigent un JWT (owner).
- Toutes les mutations de `/collection-item` exigent un JWT. Le `userId` des favoris/wishlists doit être celui de l’utilisateur connecté ; les ajouts à une collection exigent son propriétaire. Une violation de propriété renvoie `403`.
- Une collection privée est lisible uniquement par son propriétaire ou un administrateur. Les autres lecteurs reçoivent `404`, comme pour une collection inexistante. Cette règle couvre le détail, les items et les raretés. Un administrateur lecteur n’obtient pas le droit de modifier la collection d’autrui.

## Collections

- `GET /collection` (public) : toutes les collections publiques.
- `GET /collection/paginated` (public) : pagination (`page`, `limit`).
- `GET /collection/user/:userId` (public) : collections publiques d’un utilisateur ; le propriétaire et les administrateurs voient aussi les privées.
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

Base path : `/collection-item` — tous les endpoints exigent un JWT, y compris pour les produits scellés.

- `POST /collection-item/wishlist/:userId` : ajouter une carte à la wishlist d’un user.
- `POST /collection-item/favorites/:userId` : ajouter une carte aux favoris.
- `POST /collection-item/collection/:collectionId` : ajouter une carte dans une collection donnée.
- `POST /collection-item/collection/:collectionId/sealed` : ajouter un produit scellé (`sealedProductId`, `sealedCondition`) à une collection.
- `POST /collection-item/wishlist/:userId/sealed` : ajouter un produit scellé à la wishlist d’un user.

## États de cartes

- `/card-state` : référentiel des états (CRUD, souvent seedé via `npm run seed:cardstates`). Utile pour lier un état à un item ou une annonce marketplace.

## Affichage des inventaires mixtes

Les items paginés incluent `productKind` (`card` ou `sealed`), la relation
`pokemonCard` ou `sealedProduct`, et l’état correspondant (`cardState` ou
`sealedCondition`). Les anciens placeholders Master Set sans `productKind`
restent compatibles avec les clients web. Un état absent reste inconnu.
Les produits scellés sont chargés avec leur extension ; la recherche reconnaît
leurs noms localisés et le tri par nom inclut les deux types de produits.

Sur le web, grille et tableau affichent les deux types, avec un lien vers leur
fiche catalogue respective. Les boutons de quantité des cartes sont réservés
au propriétaire. Sur mobile, les produits scellés affichent leur emballage,
leur quantité et leur état sans appeler les actions destinées aux cartes.
Les ajouts scellés utilisent l’endpoint dédié décrit ci-dessus.

Une erreur de chargement sur le web affiche une action de nouvelle tentative.
Les collections inaccessibles et les collections vides ont des états distincts.

Vérification : 2026-09-06, contrôleurs `collection` / `collection-item` et tests
`CollectionService`, `CollectionItemService`, `CollectionDetailPage`.

---
title: Collections & Inventaires
---

Le module Collections gère les inventaires personnels des collectionneurs, les listes de souhaits (wishlist), les cartes favorites ainsi que les opérations d'import/export de masse en CSV avec compensation.

- **Base path** : `/collection` et `/collection-item`
- **Authentification** : lecture publique des collections ouvertes ; les mutations (`POST`, `PUT`, `DELETE`) exigent un JWT.
- **Règles de confidentialité** : une collection marquée privée n'est accessible que par son propriétaire ou un administrateur. Toute tentative de lecture externe renvoie une erreur `404` (pour ne pas divulguer l'existence de la ressource).

---

## 1. Gestion des collections (`/collection`)

- `GET /collection` (Public) : lister les collections publiques.
- `GET /collection/paginated` (Public) : liste paginée avec filtres.
- `GET /collection/my/collections` (JWT) : collections du compte connecté (publiques et privées).
- `GET /collection/user/:userId` (Public) : collections publiques d'un utilisateur cible.
- `GET /collection/:id` (Public) : détail d'une collection.
- `GET /collection/:id/items` (Public) : liste paginée des items (cartes et produits scellés) avec filtres étendus (`search`, `setId`, `serieId`, `rarity`, `cardState`, etc.).
- `GET /collection/:id/rarities` (Public) : liste des raretés distinctes d'un Master Set pour l'affichage de la progression.
- `POST /collection` (JWT) : créer une nouvelle collection.
- `PUT /collection/:id` (JWT) : renommer ou modifier la visibilité d'une collection.
- `DELETE /collection/:id` (JWT) : supprimer une collection et ses items associés.

---

## 2. Items, Favoris & Wishlist (`/collection-item`)

Chaque entrée d'inventaire (`CollectionItem`) gère aussi bien des cartes individuelles que des produits scellés (`productKind` discriminant) :

- `POST /collection/:id/items` (JWT) : ajouter un exemplaire de carte dans une collection.
- `POST /collection/:id/items/remove` (JWT) : décrémenter ou retirer une carte d'une collection.
- `DELETE /collection/:id/items/:itemId` (JWT) : supprimer définitivement un item de collection.
- `POST /collection-item/collection/:collectionId/sealed` (JWT) : ajouter un produit scellé avec son état de conservation (`sealedCondition`).
- `POST /collection-item/wishlist/:userId` (JWT) : ajouter une carte à sa liste de souhaits.
- `POST /collection-item/wishlist/:userId/sealed` (JWT) : ajouter un produit scellé à sa liste de souhaits.
- `POST /collection-item/favorites/:userId` (JWT) : ajouter un item dans ses favoris.

---

## 3. Référentiel des états de cartes (`/card-state`)

Le module `/card-state` définit les grades physiques normalisés du marché international des cartes de collection :

| Code | Libellé international | Description |
|---|---|---|
| **NM** | *Near Mint* | État neuf ou quasi-neuf, défauts minimes d'impression tolérés. |
| **EX** | *Excellent* | Très légères micro-rayures ou léger blanchiment sur les bordures. |
| **GD** | *Good* | Usure d'usage visible mais structure de la carte saine. |
| **LP** | *Light Played* | Traces de jeu visibles, bordures marquées. |
| **PL** | *Played* | Carte manifestement jouée, usure prononcée des coins. |
| **PO** | *Poor* | Pliures, taches ou altérations physiques sévères. |

- `GET /card-state` (Public) : consultation du référentiel (initialisé via `npm run seed:cardstates`).
- `POST`, `PATCH`, `DELETE` (ADMIN) : administration des états.

---

## 4. Import / Export CSV et Annulation compensatoire

TCG Nexus propose un système professionnel d'import et d'export de collections via fichiers CSV structurés avec garantie de reproductibilité :

### Contrat de fichier CSV
L'exportation produit des colonnes stables documentées par une version de schéma (`schemaVersion`). Chaque ligne décrit de façon exhaustive l'exemplaire physique :
- Nature (`card` ou `sealed`), identifiant catalogue, variante, langue et tirage ;
- État de conservation (`cardState`), quantité possédée, quantité réservée pour la vente ;
- Données d'acquisition optionnelles : coût unitaire d'achat, devise, date d'acquisition, lieu de stockage physique et notes personnelles.

### Traitement atomique & Déduplication
- Lors d'un import, une ligne CSV met à jour un item existant **uniquement si son identité physique complète correspond** (carte, langue, variante ET état d'usure). Une carte en état NM et une carte en état Played forment ainsi deux piles d'inventaire distinctes.
- En mode remplacement (`replace`), la quantité demandée ne peut jamais être inférieure aux copies déjà engagées dans une vente active ou une commande en cours.

### Annulation d'import en masse (`undo-operation`)
Chaque opération de masse enregistre une trace d'audit `collection_bulk_operation` répertoriant pour chaque article la valeur précédente et la variation appliquée :

- `POST /collection/:id/items/undo-operation` (JWT) : compense et annule l'opération d'import en masse. Les items créés sont retirés, les items modifiés retrouvent leur quantité antérieure, et les suppressions sont restaurées.
- Si des exemplaires ont été vendus ou réservés sur la marketplace entre-temps, ils sont préservés et signalés dans un tableau de conflits (`conflicts`).

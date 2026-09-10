---
title: Marketplace & paiements
---

La marketplace couvre trois objets : les **annonces** (`Listing`), les **commandes** (`Order` + `OrderItem`) et les **paiements** (`PaymentTransaction`). Tout est exposé sous le préfixe `/marketplace`.

Les anciennes routes `/listings/*` n'existent plus.

**Auth** : `JwtAuthGuard` pour publier, acheter et vendre. Les routes d'administration exigent `ADMIN` ou `MODERATOR`. Lecture publique pour les annonces, les cartes et les statistiques. Aucune restriction « vendeur professionnel » n'est appliquée : n'importe quel compte authentifié peut publier.

## Cycle de vie d'une annonce

Une annonce a deux dimensions indépendantes :

- `status` (`active` / `inactive`) — l'**intention du vendeur**, la seule chose qu'il contrôle.
- La **disponibilité réelle**, dérivée et jamais stockée : `status = active` **ET** `quantityAvailable > 0` **ET** (`expiresAt` nul ou dans le futur) **ET** `deletedAt` nul.

Cette séparation évite le classique statut « sold » désynchronisé du stock. Une annonce épuisée reste `active` : si le vendeur réapprovisionne, elle réapparaît sans intervention.

La suppression est un **soft delete** (`deletedAt`). Les lignes de commande qui la référençaient restent valides : `order_item.listing_id` passe à `NULL` (`ON DELETE SET NULL`) et l'historique s'appuie sur le snapshot (voir plus bas).

## Cycle de vie d'une commande

```
                 paiement confirmé
   PENDING ─────────────────────────► PAID ──────► SHIPPED ──────► DELIVERED
      │                                 │             │                │
      │ échec / expiration / annulation │             │                │
      ▼                                 ▼             ▼                ▼
  CANCELLED                        CANCELLED      REFUNDED         REFUNDED
                                   REFUNDED
```

Les transitions autorisées sont déclarées dans `ORDER_STATUS_TRANSITIONS` (`order.entity.ts`) et vérifiées par `OrderService.transitionOrder`. Une transition non listée lève une `BadRequestException` : il n'est pas possible de repasser une commande `Cancelled` en `Paid`.

Chaque ligne porte en plus son **propre** état d'expédition, parce qu'une commande peut concerner plusieurs vendeurs :

```
TO_SHIP ──► PREPARING ──► SHIPPED ──► DELIVERED
    │            │
    └────────────┴──────► CANCELLED
```

Défini dans `FULFILLMENT_TRANSITIONS` (`common/enums/fulfillment-status.ts`). Le vendeur ne fait avancer que ses propres lignes.

## Snapshot des lignes de commande

`OrderItem` recopie au moment de l'achat : `productKind`, `productName`, `productImage`, `productCondition`, `productLanguage`, `productSetName`, `sellerName`, plus `seller_id`.

C'est volontairement redondant avec le `Listing`. Une commande est une pièce comptable : elle doit rester lisible même si l'annonce est supprimée, si le vendeur change de pseudo, ou si le prix évolue. Sans snapshot, un historique d'achat se vide au fil des suppressions d'annonces.

## Réservation de stock

Les prix unitaires figés sur les lignes utilisent les mêmes prix relus sous verrou que le total de la commande, même si une annonce a changé depuis la lecture du panier.

Le stock est décrémenté **au moment du checkout**, pas à la confirmation du paiement. Sinon deux acheteurs peuvent payer le même exemplaire unique.

`reserveStockAndCreateOrder` ouvre une transaction et pose un **verrou pessimiste** (`SELECT ... FOR UPDATE`) sur chaque annonce du panier avant de vérifier puis décrémenter `quantityAvailable`. Un deuxième acheteur sur le dernier exemplaire attend le verrou, puis reçoit une erreur de stock insuffisant.

La commande est créée en `PENDING` avec `reservationExpiresAt = now + 20 min`.

Trois issues :

| Issue | Effet |
|---|---|
| Paiement confirmé avant expiration | `PENDING → PAID`, la réservation devient définitive |
| Paiement échoué | `PENDING → CANCELLED`, stock restitué |
| Rien ne se passe pendant 20 min | `OrderReservationScheduler` (cron toutes les 5 min) appelle `expireStaleReservations` → `PENDING → CANCELLED`, stock restitué |

Le drapeau `order.stockReleased` garantit que la restitution n'a lieu **qu'une fois**, quel que soit le nombre de fois où l'annulation est déclenchée (webhook rejoué + cron + action admin).

Un remboursement ne réapprovisionne **jamais automatiquement** une annonce,
même avant expédition : il ne prouve ni le retour physique ni l’état revendable.
Seule l’annulation d’une réservation `Pending` libère automatiquement le stock.
Une commande `Paid` peut déjà contenir des lignes expédiées par un vendeur ; son
annulation globale ne suffit donc pas non plus à remettre les articles en vente.
Le workflow de retour avec inspection, disposition et mouvement de stock audité
reste à implémenter dans MKT-02. Les statuts et les montants publics ne changent pas.


## Parcours de paiement

```
Acheteur            Web              API                     Stripe
   │                 │                │                        │
   │─ Payer ────────►│                │                        │
   │                 │─ POST /marketplace/checkout ───────────►│
   │                 │                │─ réserve le stock      │
   │                 │                │─ crée l'Order PENDING  │
   │                 │                │─ createPaymentIntent ─►│
   │                 │                │◄─ clientSecret ────────│
   │                 │                │─ vide le panier        │
   │                 │◄─ clientSecret ┤                        │
   │◄─ formulaire ───┤                │                        │
   │─ confirmPayment ───────────────────────────────────────►  │
   │                 │                │◄── webhook payment_intent.succeeded
   │                 │                │─ markOrderPaid         │
   │                 │─ POST /marketplace/orders/:id/confirm ─►│
   │                 │                │─ retrievePaymentIntent►│
   │                 │                │─ markOrderPaid (no-op) │
   │◄─ récapitulatif ┤◄───────────────┤                        │
```

Deux points importants :

1. **La confirmation ne fait jamais confiance au client.** `confirmOrderPayment` relit le `PaymentIntent` chez Stripe et vérifie, via `assertPaymentMatchesOrder`, que le montant, la devise, `metadata.orderId` et `metadata.userId` correspondent à la commande. Un client qui rejoue le `clientSecret` d'une autre commande, ou qui appelle `confirm` sur un paiement non abouti, est rejeté.
2. **Le webhook et le retour client font la même chose.** `markOrderPaid` est idempotent : une commande déjà `Paid` n'est pas retouchée. Les deux chemins peuvent donc arriver dans n'importe quel ordre, ou en double.

Si la création du `PaymentIntent` échoue, la commande déjà créée est annulée et le stock restitué avant de propager l'erreur — pas de commande fantôme.

Le panier n'est vidé qu'une fois le `PaymentIntent` obtenu : un échec Stripe laisse l'acheteur avec son panier intact.

## Frais de port

Une grille de frais fixe (`SHIPPING_POLICY`, `marketplace/shipping-policy.ts`) s'applique par nature de produit : 3,50 € pour une carte (lettre suivie), 6,90 € pour un produit scellé (colis suivi), avec un délai de préparation par défaut de 3 jours. Ces valeurs sont recopiées au moment de l'annonce (`listing.shippingCost`, `listing.handlingTimeDays`) puis à nouveau au moment de la commande (`order_item.shippingCost`, `order_item.handlingTimeDays`, `order.shippingAmount` = somme des lignes) — même logique de snapshot que le reste de la commande. `GET /marketplace/shipping-policy` expose la grille courante côté client.

## Devises

Un panier ne peut pas mélanger les devises : `UserCartService` refuse l'ajout d'un article dont la devise diffère de celle déjà présente. La commande, le `PaymentIntent` et la `PaymentTransaction` portent donc une devise unique et cohérente.

Côté statistiques, `getCardStatistics` n'agrège **jamais** entre devises. Sans paramètre `currency`, il retient celle qui compte le plus d'annonces pour la carte, calcule min/moyenne/max dans cette devise uniquement, et renvoie `availableCurrencies` pour laisser l'interface proposer les autres.

## Endpoints

### Annonces

| Méthode | Route | Accès |
|---|---|---|
| `POST` | `/marketplace/listings` | authentifié |
| `GET` | `/marketplace/listings` | public |
| `GET` | `/marketplace/listings/my-listings` | authentifié |
| `GET` | `/marketplace/listings/:id` | public |
| `PATCH` | `/marketplace/listings/:id` | propriétaire ou `ADMIN` |
| `DELETE` | `/marketplace/listings/:id` | propriétaire ou `ADMIN` |

Filtres de `GET /marketplace/listings` (`FindAllListingsQuery`) : `search`, `cardState`, `language`, `status`, `currency`, `priceMin`, `priceMax`, `sellerId`, `pokemonCardId`, `sealedProductId`, `productKind`, `sortBy`, `sortOrder`, `page`, `limit`.

### Achat

| Méthode | Route | Rôle |
|---|---|---|
| `POST` | `/marketplace/checkout` | crée la commande, réserve le stock, ouvre le paiement |
| `POST` | `/marketplace/orders/:id/confirm` | confirme depuis l'état réel du paiement chez Stripe |
| `GET` | `/marketplace/orders` | commandes de l'acheteur connecté |
| `GET` | `/marketplace/orders/:id` | détail (acheteur propriétaire uniquement) |

### Vente

| Méthode | Route | Rôle |
|---|---|---|
| `GET` | `/marketplace/sales` | lignes vendues par le vendeur connecté (filtre `fulfillmentStatus`, paginé) |
| `GET` | `/marketplace/sales/revenue` | montants encaissés, ventilés par devise |
| `PATCH` | `/marketplace/sales/:id/fulfillment` | fait avancer l'expédition d'une ligne (`carrier`, `trackingNumber`) |

### Administration (`ADMIN` / `MODERATOR`)

| Méthode | Route |
|---|---|
| `GET` | `/marketplace/admin/orders` |
| `GET` | `/marketplace/admin/orders/:id` |
| `PATCH` | `/marketplace/admin/orders/:id/status` |

### Données cartes & statistiques (public)

- `GET /marketplace/cards` — cartes enrichies, paginées (`page`, `limit`, `search`, `setId`, `serieId`, `rarity`, `currency`, `cardState`, `priceMin`, `priceMax`, `sortBy`, `sortOrder`).
- `GET /marketplace/cards/:id/stats` — statistiques de prix (`currency`, `cardState`).
- `GET /marketplace/cards/:id/price-suggestion` — prix de vente suggéré pour une carte (`currency`, `cardState`).
- `GET /marketplace/shipping-policy` — grille de frais de port et délais appliqués par la plateforme.
- `GET /marketplace/best-sellers` — meilleurs vendeurs (`limit`).
- `GET /marketplace/sellers/:id` — statistiques d'un vendeur.
- `GET /marketplace/sellers/:id/listings` — annonces d'un vendeur.
- `GET /marketplace/popular`, `GET /marketplace/trending` — popularité des cartes.
- `POST /marketplace/events`, `POST /marketplace/sealed-events` — collecte des vues/consultations.

### Webhook Stripe

`POST /webhook` — route publique, signature vérifiée avec `STRIPE_WEBHOOK_SECRET`. Le corps brut est nécessaire (`rawBody: true` dans `main.ts`).

Événements traités :

| Événement | Effet |
|---|---|
| `payment_intent.succeeded` | `markOrderPaid` (idempotent) |
| `payment_intent.payment_failed` | commande annulée, stock restitué |
| `charge.refunded` | Reconcile each provider refund; only the successful total can mark the order `Refunded` |
| `refund.created`, `refund.updated`, `refund.failed` | Re-read current provider outcomes, including pending and failed refunds |

La contrainte d'unicité sur `payment_transaction.transactionId` empêche qu'un rejeu crée une seconde transaction.

## Reversement aux vendeurs

Les fonds arrivent sur le compte Stripe de la plateforme et **n'en repartent pas** : Stripe Connect n'est pas implémenté. C'est une limite assumée, détaillée dans [ADR-005](https://github.com/raphplt/tcg-nexus/blob/main/doc/adr/005-reversement-vendeurs.md). L'interface vendeur parle d'« encaissé pour vous », jamais de solde disponible.

## Configuration

| Variable | Rôle |
|---|---|
| `STRIPE_SECRET_KEY` | clé serveur. Absente, les paiements sont désactivés proprement (l'API le signale au démarrage et le checkout renvoie une erreur explicite) |
| `STRIPE_WEBHOOK_SECRET` | vérification de signature du webhook |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | côté web, monte le formulaire Stripe Elements |

## Autorisation des retours et des remboursements

`GET /marketplace/orders/:id/refunds`, `GET /marketplace/orders/:id/refunds/remaining` et `GET /marketplace/orders/:id/returns` requièrent un participant authentifié à la commande ou un membre du personnel (staff). Un compte tiers reçoit une erreur 403. Les acheteurs et le personnel conservent la vue intégrale de la commande ; un vendeur ne consulte que les montants et retours de ses propres lignes. Les motifs partagés, les références de paiement et les détails de l'initiateur sont masqués aux vendeurs.

`POST /marketplace/orders/:id/refund` exige du vendeur qu'il spécifie explicitement les `lines` qui lui appartiennent. Les lignes d'un autre vendeur déclenchent un 403 ; les identifiants d'articles de commande manquants ou invalides renvoient un 400 avant tout appel au prestataire de paiement. Le personnel peut soumettre des remboursements au niveau de la commande globale.

## Réservations durables de remboursement

`POST /marketplace/orders/:id/refund` accepte une clé optionnelle `requestKey` (128 caractères maximum). Le client génère une clé pour chaque remboursement intentionnel et la conserve lors des réessais. La même clé renvoie l'opération existante ; modifier le payload sous cette même clé renvoie une erreur 409 (conflit).

L'autorisation, la validation du paiement effectif, l'appartenance des lignes, les quantités cumulées, les montants d'articles, les frais d'expédition et le plafond de la commande sont contrôlés sous un verrou de ligne de commande. Les montants utilisent des centimes comptables entiers. Chaque ligne doit préciser une quantité entière (`quantity`) ; zéro correspond à un ajustement de prix ou de port sans copie physique retournée. Les mouvements monétaires ne réapprovisionnent jamais directement l'inventaire physique.

L'opération en attente et son audit sont enregistrés avant de contacter Stripe. Les appels prestataire utilisent `refund-{operationId}` avec l'ID d'opération en métadonnée. Une réponse ambiguë renvoie un 503 tout en conservant la réservation.

## Grand livre de settlement vendeur, séquestres et versements

Les soldes vendeurs sont une projection de `seller_ledger_entry`, une table immuable de mouvements en centimes entiers. Chaque mise sous séquestre, libération, blocage conservatoire, ajustement de remboursement ou versement écrit une entrée sous un verrou `pessimistic_write` sur le compte de règlement. Chaque écriture porte une `requestKey` unique par compte : un événement métier rejoué (confirmation répétée, webhook dupliqué) est ignoré et ne déplace aucun solde deux fois. Les annulations sont de nouvelles écritures d'inversion, jamais des modifications.

- `GET /marketplace/admin/settlements/reconcile` : vérifie que la somme des entrées comptables correspond exactement aux soldes disponibles, en attente et versés.
- `GET /marketplace/seller/settlement/ledger` : expose l'historique complet des mouvements comptables au vendeur connecté.

Le paiement d'une commande place le montant net du vendeur (articles + port, moins 5% de commission) en statut `pending`. La livraison de tous ses articles dans la commande libère ce montant vers `available`. L'ouverture d'un litige acheteur transfère les fonds en `on_hold`. La clôture du ticket rétablit le solde ou déduit le remboursement.

## Conservation de l'inventaire physique

Toute modification des exemplaires disponibles, réservés ou vendus d'un article de collection est enregistrée dans `inventory_movement` sous un verrou `pessimistic_write`. Un mouvement redistribue les copies et n'en crée jamais ex nihilo : la somme des deltas (disponible, réservé, vendu) est strictement nulle, et aucune composante ne peut devenir négative.

Une annonce adossée à une collection conserve les copies qu'elle mobilise dans `inventoryReservedQuantity`. La création, la désactivation, la réactivation ou la suppression réservent ou libèrent exactement la différence entre l'offre précédente et la nouvelle. Le passage en caisse retient le stock sur l'annonce ; le paiement convertit les copies réservées du vendeur en statut vendu.

## Bons de réception en collection (`receipt_import`)

La réception d'un achat dans une collection est consignée dans `receipt_import`, rattachée à la ligne de commande. La quantité cumulée reçue ne peut jamais dépasser la quantité achetée : importer une même ligne livrée dans une seconde collection consomme le solde restant sans dupliquer les exemplaires. Supprimer l'item de collection conserve le bon de réception en place, empêchant qu'un achat ne soit réimporté une seconde fois.

- `POST /marketplace/orders/:id/receipt-import` (JWT) : importe les articles livrés d'une commande dans la collection choisie.
- `GET /marketplace/orders/:id/receipt-preview` (JWT) : indique les quantités déjà importées, restantes et la date de confirmation de réception.

La confirmation explicite de l'acheteur (`POST /marketplace/orders/:orderId/items/:itemId/confirm-receipt`) certifie la bonne livraison et ouvre l'éligibilité à l'import en collection.

## Reprise de paiement et compensation financière

Une clé de tentative de checkout identifie une commande unique : réutiliser la même clé pour un panier modifié renvoie une erreur 409. Un réessai sous la même clé reprend la commande existante et réutilise le même `PaymentIntent` Stripe créé sous la clé d'idempotence `order-{orderId}`.

L'annulation par l'acheteur lit le statut sous verrou et restitue le stock de façon atomique. Les fonds capturés pour une commande qui ne peut plus être honorée sont signalés dans `payment_transaction` via les drapeaux `compensationRequiredAt` et `compensationReason`.

- `GET /admin/ops/payments/compensation` : liste les remboursements compensatoires en attente.
- `POST /admin/ops/payments/:id/compensate` : exécute le remboursement compensatoire audité sous la clé `late-payment-{paymentId}`.
- `POST /admin/ops/orders/expire-stale` : purge périodique des réservations de stock périmées.

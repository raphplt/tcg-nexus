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

## Refund and return authorization

`GET /marketplace/orders/:id/refunds`, `GET /marketplace/orders/:id/refunds/remaining` and `GET /marketplace/orders/:id/returns` require an authenticated order participant or staff member. An unrelated account receives 403. Buyers and staff retain the complete order view; a seller receives only their own line amounts and returns. Shared refund reasons, provider references and initiating-user details are excluded from seller projections.

`POST /marketplace/orders/:id/refund` requires a seller to provide explicit `lines` owned by that seller. Cross-seller lines return 403; missing or foreign order-item identities return 400 before the payment provider is called. Staff may still submit order-wide amounts. The reservation and provider reconciliation boundary is described below.


## Durable refund reservations

`POST /marketplace/orders/:id/refund` accepts an optional `requestKey` (maximum 128 characters). Generate a key for each intentional refund and retain it with the unchanged payload through retries. The same key returns the existing operation; changing its payload returns 409. Legacy requests without a key use a payload fingerprint and are conservatively deduplicated. An intentionally repeated identical refund needs a new explicit key.

Authorization, completed-payment validation, unique line membership, cumulative quantities, merchandise amounts, shipping amounts and the order ceiling are checked inside an order-row lock. Pending and successful refunds consume the allowance; failed refunds do not. Amounts use integer accounting cents, with currency-specific provider units (JPY has no fractional unit). Each line must have an integer `quantity`; zero represents a price or shipping adjustment without another refunded copy. Staff amount-only requests are allocated across the remaining line balances. Money movement never restocks physical inventory.

The pending operation, lines and reservation audit commit before contacting Stripe. Provider calls use `refund-{operationId}` and carry the operation ID as metadata. An ambiguous exception returns 503 and retains the reservation. A retry searches all provider refund pages for that operation before creating anything. After 23 hours from the first recorded attempt, absence of a matching provider record returns 409 and retains the reservation for manual reconciliation. This margin accounts for Stripe potentially pruning idempotency keys after 24 hours; simply generating a new key would risk another refund. See [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests) and [refund pagination](https://docs.stripe.com/api/refunds/list).

Successful HTTP transport does not imply a successful refund: callers must inspect the returned operation `status`. `PENDING` also covers provider `requires_action`; no success event is emitted for it. The balance response keeps `alreadyRefunded` limited to confirmed successes and excludes both pending and successful reservations from `remainingAmount`.

Subscribe the signed webhook to `charge.refunded`, `refund.created`, `refund.updated` and `refund.failed`. Reconciliation fetches current individual refund records under the order lock instead of trusting cumulative charge amounts or event order. Each confirmed status change and its outbox record commit together. Partial refunds preserve the order/payment state. Full confirmed refunds mark both refunded; a later bank rejection restores the saved fulfillment state and releases that refund's allowance. Stripe documents these asynchronous outcomes in [refund and cancel payments](https://docs.stripe.com/refunds).

Provider-originated refunds without local line allocations are recorded once, count toward the order balance, and block additional line refunds until reviewed. Legacy records are preserved by the additive `RefundReservations1788768000000` migration; they are not retroactively claimed to have provider proof. The targeted migration test runs actual DDL against a legacy table. Repair of the historical migration chain remains a separate block.

Recovery currently uses a retry of the original authorized POST or provider webhook redelivery. There is no autonomous refund recovery worker in this sub-block. After a 409 for an expired ambiguous attempt, staff must compare the operation metadata and full refund history in Stripe before deciding a correction; never delete the reservation merely to retry. Seller balance deductions, payout freezes, claim holds and Connect execution are the next financial sub-block and are not established by these refund tests. Provider tests are simulated; a Stripe sandbox rehearsal remains required before enabling production refunds.

## Seller settlement ledger, holds and payouts

Seller balances are a projection of `seller_ledger_entry`, an append-only table of integer-cent movements. Every escrow, release, hold, refund adjustment and payout writes one entry under a `pessimistic_write` lock on the settlement account, inside the caller's transaction when one is open. Each entry carries a `requestKey` unique per account, so a replayed business event (a repeated payment confirmation, a redelivered claim, a retried refund reconciliation) is recorded once and moves no balance twice. Reversals are new negating entries, never edits.

`GET /marketplace/admin/settlements/reconcile` verifies, per account, that the stored pending, available, on-hold and paid-out balances equal the sum of their entries and that disbursed funds equal the completed payouts. `GET /marketplace/seller/settlement/ledger` exposes the same movements to the seller.

Order payment escrows the seller net amount (merchandise plus shipping, less the 5% commission) as `pending`. Delivery of every one of that seller's items in the order releases it to `available`. Opening a buyer claim moves the allocation to `on_hold` from whichever bucket held it; closing the support ticket returns it to that same bucket. A succeeded refund debits the seller for the refunded merchandise less its proportional commission, plus refunded shipping, and a provider-confirmed late failure of that refund restores it. Allocation rows record `refundedAmount` and `commissionReversedAmount` alongside the remaining net.

Payouts follow one state machine: `REQUESTED -> PROCESSING -> COMPLETED | FAILED`, with `CANCELLED` reachable only from `REQUESTED`. Terminal states accept no further action; a replayed `COMPLETE` or `FAIL` returns 409 instead of moving funds again. `POST /marketplace/seller/settlement/payouts` accepts an optional `requestKey`: the same key returns the existing payout, a changed amount under that key returns 409. Validation reads the balance the account lock protects, so concurrent requests cannot overdraw it.

A manual or bank payout is completed by an administrator only with a `transactionReference`, which is stored on the payout as disbursement evidence. A `stripe_connect` payout cannot be declared complete by an administrator at all: `PROCESS` executes a provider transfer keyed `payout-{payoutId}` carrying the payout ID as metadata, and only the provider's own outcome completes it. An ambiguous provider response returns 503 and keeps the payout `PROCESSING` with its reservation; a retry searches the connected account's transfers for that payout before creating anything, and after 23 hours returns 409 for manual reconciliation. A reversed transfer fails the payout and returns the reserved amount to `available`.

Settlement changes are additive through `SellerLedgerAndPayoutExecution1788800000000`, which adopts existing balances as one opening entry per account so reconciliation is meaningful from installation. Provider tests are simulated; a Stripe sandbox rehearsal remains required before enabling production disbursements, and no test moves real money.

## Physical inventory conservation

Every change to a collection item's available, reserved or sold copies is an entry in `inventory_movement`, applied under a `pessimistic_write` lock on that item and keyed by the transition that caused it. A movement redistributes copies and never creates them: its available, reserved and sold deltas sum to zero, and no component may become negative. The first movement of an item adopts the quantities it already carried, so `InventoryLedgerService.reconcileItem` can prove stored quantities equal the sum of their movements and surface any write that bypassed the ledger.

An inventory-backed listing stores the copies it holds in `inventoryReservedQuantity`: the quantity it offers plus any copy committed to a pending order. Creation, deactivation, reactivation, quantity edits and deletion each reserve or release exactly the difference between the previous and the next offer. Deactivating twice, or deleting an already inactive listing, therefore moves nothing further, and reactivation reacquires its copies — failing with 400 when the collection can no longer back the offer. Checkout holds stock on the listing itself; payment converts the seller's reserved copies to sold once per order line, so a replayed payment confirmation cannot sell the same copy twice and a later deletion cannot release copies the buyer owns.

Return dispositions are applied by difference and identified by a revision, so a corrected inspection is safe: `RESTOCK` returns the received copies to the listing that still offers them (or to the collection when it does not), a correction to `DAMAGED` or `DISCARDED` reverses that restock, and re-submitting the same disposition changes no stock at all. Both reads happen under the same lock as the write, so concurrent inspections cannot both restock. Money movement stays decoupled: a refund never restocks by itself.

Migration `InventoryMovementsAndListingReservations1788900000000` is additive: it adopts each collection item's current quantities as one opening movement and records each inventory-backed listing's held copies from its offer plus its pending orders.

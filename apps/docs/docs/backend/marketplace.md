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
| `charge.refunded` | commande passée en `Refunded` |

La contrainte d'unicité sur `payment_transaction.transactionId` empêche qu'un rejeu crée une seconde transaction.

## Reversement aux vendeurs

Les fonds arrivent sur le compte Stripe de la plateforme et **n'en repartent pas** : Stripe Connect n'est pas implémenté. C'est une limite assumée, détaillée dans [ADR-005](https://github.com/raphplt/tcg-nexus/blob/main/doc/adr/005-reversement-vendeurs.md). L'interface vendeur parle d'« encaissé pour vous », jamais de solde disponible.

## Configuration

| Variable | Rôle |
|---|---|
| `STRIPE_SECRET_KEY` | clé serveur. Absente, les paiements sont désactivés proprement (l'API le signale au démarrage et le checkout renvoie une erreur explicite) |
| `STRIPE_WEBHOOK_SECRET` | vérification de signature du webhook |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | côté web, monte le formulaire Stripe Elements |

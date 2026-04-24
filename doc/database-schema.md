# Schéma de base de données

Ce document décrit le modèle relationnel utilisé par `apps/api` (PostgreSQL + TypeORM). Les diagrammes sont découpés par domaine pour rester lisibles. Les noms de tables et de colonnes reflètent les entités TypeORM ; certaines colonnes techniques peu informatives (`createdAt`, `updatedAt`, `deletedAt`) ne sont pas toujours représentées.

## 1. Utilisateur, joueur, panier

```mermaid
erDiagram
  USER ||--o| PLAYER : "has"
  USER ||--o| USER_CART : "has"
  USER ||--o{ DECK : "owns"
  USER ||--o{ COLLECTION : "owns"
  USER ||--o{ USER_BADGE : "earned"
  USER_CART ||--o{ CART_ITEM : "contains"
  CART_ITEM }o--|| LISTING : "refers"

  USER {
    int id PK
    string email UK
    string firstName
    string lastName
    string password
    string avatarUrl
    enum role "USER|MODERATOR|ADMIN"
    enum preferredCurrency "EUR|USD|..."
    bool isPro
    bool isActive
    bool emailVerified
    string refreshToken "nullable, HttpOnly cookie source"
    string previousRefreshToken "grace period"
    timestamp previousRefreshTokenExpiresAt
  }

  PLAYER {
    int id PK
    int user_id FK "OneToOne"
    int xp
    int level
  }

  USER_CART {
    int id PK
    int user_id FK "OneToOne"
  }

  CART_ITEM {
    int id PK
    int cart_id FK
    int listing_id FK
    int quantity
  }
```

## 2. Catalogue cartes et produits scellés

Le catalogue est organisé en trois niveaux : **série** (ex : « Écarlate et Violet ») → **set** (ex : « 151 ») → **carte** individuelle. Les produits scellés (boosters, display, ETB) sont rattachés à un set.

```mermaid
erDiagram
  POKEMON_SERIE ||--o{ POKEMON_SET : "contains"
  POKEMON_SET ||--o{ CARD : "contains"
  POKEMON_SET ||--o{ SEALED_PRODUCT : "packages"
  CARD ||--o| POKEMON_CARD_DETAILS : "has"
  SEALED_PRODUCT ||--o{ SEALED_PRODUCT_LOCALE : "translated in"

  POKEMON_SERIE {
    string id PK "TCGdex serie ID"
    enum game "Pokemon|..."
    string name
    string logo
  }

  POKEMON_SET {
    string id PK "TCGdex set ID"
    string name
    string logo
    string symbol
    int cardCount_total
    int cardCount_official
    int cardCount_holo
    string releaseDate
    bool legal_standard
    bool legal_expanded
    string serie_id FK
  }

  CARD {
    uuid id PK
    enum game
    string tcgDexId
    string localId
    string name
    string image
    string rarity
    jsonb variants
    jsonb pricing "TCGPlayer + CardMarket snapshot"
    string set_id FK
  }

  POKEMON_CARD_DETAILS {
    uuid card_id FK
    int hp
    string[] types
    string category "Pokemon|Trainer|Energy"
    string stage
    int retreat
    jsonb attacks
    jsonb weaknesses
  }

  SEALED_PRODUCT {
    uuid id PK
    string name
    string image
    string set_id FK
    string productKind "booster|display|ETB|..."
  }

  SEALED_PRODUCT_LOCALE {
    uuid id PK
    uuid sealed_product_id FK
    string locale
    string name
    string description
  }
```

## 3. Marketplace

Le cœur métier du projet. Un `Listing` vend **soit** une carte (`pokemonCard`), **soit** un produit scellé (`sealedProduct`), discriminé par `productKind`.

```mermaid
erDiagram
  USER ||--o{ LISTING : "sells"
  LISTING }o--o| CARD : "of (if productKind=card)"
  LISTING }o--o| SEALED_PRODUCT : "of (if productKind=sealed)"
  LISTING ||--o{ CART_ITEM : "in carts"
  LISTING ||--o{ ORDER_ITEM : "sold in"

  USER ||--o{ ORDER : "buys"
  ORDER ||--o{ ORDER_ITEM : "contains"
  ORDER ||--o{ PAYMENT_TRANSACTION : "pays via"

  CARD ||--o{ PRICE_HISTORY : "tracked"
  CARD ||--o| CARD_POPULARITY_METRICS : "scored"

  LISTING {
    int id PK
    int seller_id FK
    enum productKind "CARD|SEALED"
    uuid card_id FK "nullable"
    uuid sealed_product_id FK "nullable"
    decimal price
    enum currency
    int quantityAvailable
    enum cardState "nullable"
    enum sealedCondition "nullable"
    string description
    enum language
    timestamp expiresAt
  }

  ORDER {
    int id PK
    int buyer_id FK
    decimal totalAmount
    enum status "PENDING|PAID|SHIPPED|CANCELLED|REFUNDED"
    enum currency
  }

  ORDER_ITEM {
    int id PK
    int order_id FK
    int listing_id FK
    decimal unitPrice
    int quantity
  }

  PAYMENT_TRANSACTION {
    int id PK
    int order_id FK
    enum method "CreditCard|PayPal|BankTransfer|Crypto"
    enum status "Initiated|Completed|Failed|Refunded"
    string transactionId "Stripe PaymentIntent id"
    decimal amount
  }

  PRICE_HISTORY {
    int id PK
    uuid card_id FK
    decimal price
    timestamp recordedAt
  }

  CARD_POPULARITY_METRICS {
    uuid card_id PK
    int searches
    int views
    int listingsCount
    timestamp lastComputedAt
  }
```

Indices importants sur `LISTING` (définis via `@Index` dans l'entité) :

- `price` (tri par prix)
- `(expiresAt, quantityAvailable)` (filtre des listings actifs)
- `(pokemonCard, currency, cardState)` (résolution rapide pour la page détail d'une carte)
- `(sealedProduct, currency)` (idem scellé)
- `productKind` (filtre discriminator)

## 4. Collection et wishlist

```mermaid
erDiagram
  USER ||--o{ COLLECTION : "owns"
  COLLECTION ||--o{ COLLECTION_ITEM : "contains"
  COLLECTION_ITEM }o--o| CARD : "of card"
  COLLECTION_ITEM }o--o| SEALED_PRODUCT : "of sealed"

  COLLECTION {
    int id PK
    int user_id FK
    string name
    string type "COLLECTION|WISHLIST|FAVORITES"
    bool isPublic
  }

  COLLECTION_ITEM {
    int id PK
    int collection_id FK
    uuid card_id FK "nullable"
    uuid sealed_product_id FK "nullable"
    int quantity
    enum cardState
  }
```

## 5. Decks

```mermaid
erDiagram
  USER ||--o{ DECK : "builds"
  DECK }o--|| DECK_FORMAT : "uses"
  DECK ||--o{ DECK_CARD : "contains"
  DECK_CARD }o--|| CARD : "of"
  DECK ||--o{ DECK_SHARE : "shared"
  DECK ||--o{ SAVED_DECK : "bookmarked"

  DECK {
    int id PK
    int user_id FK
    string name
    bool isPublic
    int views
    int format_id FK
    uuid coverCard_id FK
  }

  DECK_FORMAT {
    int id PK
    string name "Standard|Expanded|..."
    string description
  }

  DECK_CARD {
    int id PK
    int deck_id FK
    uuid card_id FK
    int quantity
  }
```

## 6. Compétition (tournois, matches, classements)

```mermaid
erDiagram
  USER ||--o{ TOURNAMENT_ORGANIZER : "organises"
  TOURNAMENT ||--o{ TOURNAMENT_ORGANIZER : "managed by"
  TOURNAMENT ||--o{ TOURNAMENT_REGISTRATION : "has"
  TOURNAMENT ||--o{ TOURNAMENT_REWARD : "offers"
  TOURNAMENT ||--o| TOURNAMENT_PRICING : "priced"
  TOURNAMENT ||--o{ TOURNAMENT_NOTIFICATION : "notifies"
  TOURNAMENT ||--o{ MATCH : "scheduled"
  TOURNAMENT ||--o{ RANKING : "ranks"
  TOURNAMENT }|..|{ PLAYER : "tournament_players"
  PLAYER ||--o{ TOURNAMENT_REGISTRATION : "registers"
  PLAYER ||--o{ RANKING : "placed"
  PLAYER ||--o{ STATISTIC : "tracks"
  MATCH }o--|| PLAYER : "player1"
  MATCH }o--|| PLAYER : "player2"

  TOURNAMENT {
    int id PK
    string name
    string description
    string location
    timestamp startDate
    timestamp endDate
    enum type "single_elimination|double_elimination|swiss_system|round_robin"
    enum status "draft|registration_open|registration_closed|in_progress|finished|cancelled"
    int maxPlayers
    int minPlayers
    int currentRound
    int totalRounds
    timestamp registrationDeadline
    bool allowLateRegistration
    bool requiresApproval
    bool isPublic
  }

  TOURNAMENT_REGISTRATION {
    int id PK
    int tournament_id FK
    int player_id FK
    enum status "pending|approved|rejected"
    timestamp registeredAt
  }

  MATCH {
    int id PK
    int tournament_id FK
    int player1_id FK
    int player2_id FK
    int round
    int score1
    int score2
    enum status "scheduled|in_progress|completed|cancelled"
  }

  RANKING {
    int id PK
    int tournament_id FK
    int player_id FK
    int position
    int points
  }

  STATISTIC {
    int id PK
    int player_id FK
    int wins
    int losses
    int draws
    decimal winRate
  }
```

## 7. Contenus et gamification

- **`Article`** : actualités TCG, modèle simple (`title`, `content`, `author`, `publishedAt`).
- **`Faq`** : questions / réponses (`question`, `answer`, `category`).
- **`Challenge`**, **`UserChallenge`**, **`ActiveChallenge`** : objectifs dynamiques proposés à l'utilisateur.
- **`Badge`**, **`UserBadge`** : achievements.

Ces domaines sont peu couplés au reste du schéma et leurs entités sont lisibles directement dans `apps/api/src/*/entities/`.

## 8. Conventions

- Les clés primaires internes sont des entiers auto-incrémentés (`@PrimaryGeneratedColumn`), sauf pour les entités importées de TCGdex (sets, séries, cartes) qui gardent leur identifiant d'origine (`PrimaryColumn` string ou uuid).
- Les timestamps `createdAt` / `updatedAt` sont présents sur la plupart des entités via `@CreateDateColumn` / `@UpdateDateColumn`.
- `@DeleteDateColumn` est utilisé sur `Listing` pour permettre un soft-delete (préserver l'historique des ventes).
- Les enums sont stockés en type `enum` PostgreSQL, pas en `varchar`, pour contraindre les valeurs en base.
- Les relations multi-valuées sans attribut propre utilisent `@JoinTable` (ex : `tournament_players` entre `Tournament` et `Player`).

## 9. Comment régénérer ce diagramme

Les diagrammes sont maintenus à la main. À chaque évolution notable d'une entité :

1. Mettre à jour le bloc Mermaid concerné.
2. Ajouter une entrée dans le CHANGELOG du PR si la modification impacte la migration ou l'intégration client.
3. Envisager une migration TypeORM explicite (cf. [ADR-004](./adr/004-typeorm-synchronize.md)).

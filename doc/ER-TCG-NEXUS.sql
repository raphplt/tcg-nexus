-- =============================================================
-- TCG Nexus - schema relationnel (DDL PostgreSQL)
-- Genere depuis les entites TypeORM de apps/api/src/**/*.entity.ts
--
-- Usage Lucidchart :
--   + > Importer des donnees > Base de donnees > PostgreSQL
--   puis coller l'integralite de ce fichier.
--
-- NOTE : les colonnes typees 'enum' cote TypeORM sont rendues ici en
--        VARCHAR(64), avec la liste des valeurs en commentaire de fin de ligne.
--        Cela evite les CREATE TYPE et les collisions de noms d'enums
--        homonymes entre modules (ex. PaymentMethod marketplace vs tournoi).
-- =============================================================

-- -------------------------------------------------------------
-- D1 : Identite & Social
-- -------------------------------------------------------------

-- Compte utilisateur, racine de tout le graphe applicatif
CREATE TABLE "user" (
    "id" SERIAL,
    "email" VARCHAR(255) NOT NULL,  -- unique
    "firstName" VARCHAR(255) NOT NULL,
    "lastName" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,  -- hash, @Exclude
    "avatarUrl" VARCHAR(255),
    "role" VARCHAR(64) NOT NULL,  -- enum UserRole
    "preferredCurrency" VARCHAR(64) NOT NULL,  -- enum Currency
    "preferredLocale" VARCHAR(10) NOT NULL,  -- default locale
    "isPro" BOOLEAN NOT NULL,  -- default false
    "isActive" BOOLEAN NOT NULL,  -- default true
    "emailVerified" BOOLEAN NOT NULL,  -- default false
    "refreshToken" VARCHAR(255),  -- @Exclude
    "previousRefreshToken" VARCHAR(255),  -- @Exclude
    "previousRefreshTokenExpiresAt" TIMESTAMP,  -- @Exclude
    "createdAt" TIMESTAMP NOT NULL,  -- @CreateDateColumn
    "updatedAt" TIMESTAMP NOT NULL,  -- @UpdateDateColumn
    CONSTRAINT "PK_user" PRIMARY KEY ("id")
);

-- Profil competitif 1-1 avec User (XP, niveau, Elo)
CREATE TABLE "player" (
    "id" SERIAL,
    "xp" INTEGER NOT NULL,  -- default 0
    "level" INTEGER NOT NULL,  -- default 1
    "elo" INTEGER NOT NULL,  -- default 1000
    "userId" INTEGER NOT NULL,  -- -> user.id, @JoinColumn cote Player
    CONSTRAINT "PK_player" PRIMARY KEY ("id")
);

-- Graphe social : abonnements entre utilisateurs
CREATE TABLE "user_follow" (
    "id" SERIAL,
    "follower_id" INTEGER NOT NULL,  -- -> user.id, CASCADE
    "followed_id" INTEGER NOT NULL,  -- -> user.id, CASCADE
    "createdAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PK_user_follow" PRIMARY KEY ("id")
);

-- Catalogue des badges deblocables
CREATE TABLE "badge" (
    "id" SERIAL,
    "code" VARCHAR(255) NOT NULL,  -- unique
    "name" VARCHAR(255) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "icon" VARCHAR(255) NOT NULL,
    "category" VARCHAR(64) NOT NULL,  -- enum BadgeCategory
    "threshold" INTEGER NOT NULL,  -- palier de declenchement
    "createdAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PK_badge" PRIMARY KEY ("id")
);

-- Association N-N User <-> Badge avec date de deblocage
CREATE TABLE "user_badge" (
    "id" SERIAL,
    "user_id" INTEGER NOT NULL,  -- -> user.id, CASCADE
    "badge_id" INTEGER NOT NULL,  -- -> badge.id, CASCADE, eager
    "unlockedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PK_user_badge" PRIMARY KEY ("id")
);

-- Modele de defi quotidien / hebdomadaire
CREATE TABLE "challenge" (
    "id" SERIAL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "type" VARCHAR(64) NOT NULL,  -- enum ChallengeType
    "actionType" VARCHAR(64) NOT NULL,  -- enum ChallengeActionType
    "targetValue" INTEGER NOT NULL,  -- default 1
    "rewardXp" INTEGER NOT NULL,  -- default 50
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PK_challenge" PRIMARY KEY ("id")
);

-- Instanciation datee d'un Challenge (fenetre en cours)
CREATE TABLE "active_challenge" (
    "id" SERIAL,
    "challengeId" INTEGER NOT NULL,  -- -> challenge.id, CASCADE, eager
    "expiresAt" TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PK_active_challenge" PRIMARY KEY ("id")
);

-- Progression d'un User sur un ActiveChallenge
CREATE TABLE "user_challenge" (
    "id" SERIAL,
    "userId" INTEGER NOT NULL,  -- -> user.id, CASCADE
    "activeChallengeId" INTEGER NOT NULL,  -- -> active_challenge.id, CASCADE
    "progress" INTEGER NOT NULL,  -- default 0
    "isCompleted" BOOLEAN NOT NULL,  -- default false
    "isClaimed" BOOLEAN NOT NULL,  -- default false
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PK_user_challenge" PRIMARY KEY ("id")
);

-- Notification in-app destinee a un User
CREATE TABLE "notification" (
    "id" SERIAL,
    "userId" INTEGER NOT NULL,  -- -> user.id, CASCADE
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL,  -- default false
    "type" VARCHAR(255) NOT NULL,  -- default 'info'
    "data" JSONB,  -- payload libre
    "translationKey" VARCHAR(255),  -- i18n
    "translationParams" JSONB,  -- i18n
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PK_notification" PRIMARY KEY ("id")
);

-- Token push mobile (Expo) rattache a un User
CREATE TABLE "device_token" (
    "id" SERIAL,
    "userId" INTEGER NOT NULL,  -- -> user.id, CASCADE
    "token" VARCHAR(255) NOT NULL,  -- unique
    "platform" VARCHAR(255) NOT NULL,  -- default 'expo'
    "createdAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PK_device_token" PRIMARY KEY ("id")
);

-- -------------------------------------------------------------
-- D2 : Catalogue TCG
-- -------------------------------------------------------------

-- Serie de sets (ex: Scarlet & Violet). PK textuelle externe
CREATE TABLE "pokemon_serie" (
    "id" VARCHAR(255) NOT NULL,  -- ID externe TCGdex
    "game" VARCHAR(64) NOT NULL,  -- enum CardGame
    CONSTRAINT "PK_pokemon_serie" PRIMARY KEY ("id")
);

-- Traduction i18n d'une serie
CREATE TABLE "pokemon_serie_translation" (
    "serie_id" VARCHAR(255) NOT NULL,  -- -> pokemon_serie.id, CASCADE
    "locale" VARCHAR(10) NOT NULL,  -- PK composite
    "name" VARCHAR(255),
    "logo" VARCHAR(255),
    CONSTRAINT "PK_pokemon_serie_translation" PRIMARY KEY ("serie_id", "locale")
);

-- Extension / set de cartes. PK textuelle externe
CREATE TABLE "pokemon_set" (
    "id" VARCHAR(255) NOT NULL,  -- ID externe TCGdex
    "game" VARCHAR(64) NOT NULL,  -- enum CardGame
    "cardCountTotal" INTEGER NOT NULL,  -- embedded CardCount
    "cardCountOfficial" INTEGER NOT NULL,  -- embedded CardCount
    "cardCountReverse" INTEGER NOT NULL,  -- embedded CardCount
    "cardCountHolo" INTEGER NOT NULL,  -- embedded CardCount
    "cardCountFirstEd" INTEGER NOT NULL,  -- embedded CardCount
    "tcgOnline" VARCHAR(255),
    "releaseDate" VARCHAR(255) NOT NULL,
    "legalStandard" BOOLEAN NOT NULL,  -- embedded Legal
    "legalExpanded" BOOLEAN NOT NULL,  -- embedded Legal
    "serieId" VARCHAR(255),  -- -> pokemon_serie.id
    CONSTRAINT "PK_pokemon_set" PRIMARY KEY ("id")
);

-- Traduction i18n d'un set
CREATE TABLE "pokemon_set_translation" (
    "set_id" VARCHAR(255) NOT NULL,  -- -> pokemon_set.id, CASCADE
    "locale" VARCHAR(10) NOT NULL,  -- PK composite
    "name" VARCHAR(255),
    "logo" VARCHAR(255),
    "symbol" VARCHAR(255),
    CONSTRAINT "PK_pokemon_set_translation" PRIMARY KEY ("set_id", "locale")
);

-- Carte unitaire, langue-agnostique. Coeur du catalogue
CREATE TABLE "card" (
    "id" UUID NOT NULL,  -- @PrimaryGeneratedColumn('uuid')
    "game" VARCHAR(64) NOT NULL,  -- enum CardGame
    "tcgDexId" VARCHAR(255),  -- unique (game, tcgDexId) partiel
    "localId" VARCHAR(255),  -- numero dans le set
    "illustrator" VARCHAR(255),
    "variants" JSONB,  -- normal/reverse/holo/firstEdition
    "variantsDetailed" JSONB,  -- tableau CardVariantDetail
    "setId" VARCHAR(255),  -- -> pokemon_set.id
    "legal" JSONB,  -- {standard, expanded}
    "updated" VARCHAR(255),
    "pricing" JSONB,  -- TCGplayer + Cardmarket
    CONSTRAINT "PK_card" PRIMARY KEY ("id")
);

-- Contenu localise d'une carte (nom, effets, attaques)
CREATE TABLE "card_translation" (
    "card_id" UUID NOT NULL,  -- -> card.id, CASCADE
    "locale" VARCHAR(10) NOT NULL,  -- PK composite
    "name" VARCHAR(255),  -- index (locale, name)
    "image" VARCHAR(255),
    "category" VARCHAR(255),
    "rarity" VARCHAR(255),
    "description" TEXT,
    "effect" TEXT,
    "evolve_from" VARCHAR(255),
    "stage" VARCHAR(255),
    "suffix" VARCHAR(255),
    "item" JSONB,  -- {name, effect}
    "abilities" JSONB,  -- PokemonAbility[]
    "attacks" JSONB,  -- PokemonAttack[]
    "source_updated_at" VARCHAR(255),
    CONSTRAINT "PK_card_translation" PRIMARY KEY ("card_id", "locale")
);

-- Donnees de jeu Pokemon (1-1 avec Card), PK = FK
CREATE TABLE "pokemon_card_details" (
    "card_id" UUID NOT NULL,  -- -> card.id, CASCADE
    "category" VARCHAR(64),  -- enum PokemonCardsType
    "dexId" INTEGER[],
    "hp" INTEGER,
    "types" TEXT[],
    "level" VARCHAR(255),
    "weaknesses" JSONB,
    "resistances" JSONB,
    "retreat" INTEGER,
    "regulationMark" VARCHAR(255),
    "trainerType" VARCHAR(64),  -- enum TrainerType
    "energyType" VARCHAR(64),  -- enum EnergyType
    "boosters" JSONB,
    "parsedEffects" JSONB,  -- sortie @repo/effect-parser
    CONSTRAINT "PK_pokemon_card_details" PRIMARY KEY ("card_id")
);

-- Produit scelle (booster, display, ETB...). PK textuelle
CREATE TABLE "sealed_product" (
    "id" VARCHAR(255) NOT NULL,
    "productType" VARCHAR(64) NOT NULL,  -- enum SealedProductType
    "pokemon_set_id" VARCHAR(255),  -- -> pokemon_set.id, SET NULL
    "contents" JSONB,  -- boosterCount, promos...
    "sku" VARCHAR(255),  -- indexe
    "upc" VARCHAR(255),  -- indexe
    "image" VARCHAR(255),
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PK_sealed_product" PRIMARY KEY ("id")
);

-- Nom localise d'un produit scelle
CREATE TABLE "sealed_product_locale" (
    "sealed_product_id" VARCHAR(255) NOT NULL,  -- -> sealed_product.id, CASCADE
    "locale" VARCHAR(10) NOT NULL,  -- PK composite
    "name" VARCHAR(255) NOT NULL,  -- index (locale, name)
    "createdAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PK_sealed_product_locale" PRIMARY KEY ("sealed_product_id", "locale")
);

-- Referentiel des etats physiques de carte (NM, EX, GD...)
CREATE TABLE "card_state" (
    "id" SERIAL,
    "code" VARCHAR(64) NOT NULL,  -- enum CardStateCode
    "label" VARCHAR(255) NOT NULL,
    CONSTRAINT "PK_card_state" PRIMARY KEY ("id")
);

-- Table i18n generique cle/valeur par locale
CREATE TABLE "translation" (
    "id" SERIAL,
    "locale" VARCHAR(10) NOT NULL,  -- unique (locale, key)
    "key" VARCHAR(255) NOT NULL,  -- unique (locale, key)
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PK_translation" PRIMARY KEY ("id")
);

-- -------------------------------------------------------------
-- D3 : Collection
-- -------------------------------------------------------------

-- Classeur d'un utilisateur, optionnellement lie a un master set
CREATE TABLE "collection" (
    "id" SERIAL,
    "name" VARCHAR(255) NOT NULL,
    "description" VARCHAR(255),
    "isPublic" BOOLEAN NOT NULL,  -- default false
    "userId" INTEGER NOT NULL,  -- -> user.id, CASCADE
    "masterSetId" VARCHAR(255),  -- -> pokemon_set.id, SET NULL
    "created_at" TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP NOT NULL,
    CONSTRAINT "PK_collection" PRIMARY KEY ("id")
);

-- Ligne de collection polymorphe : carte OU produit scelle (discriminant productKind)
CREATE TABLE "collection_item" (
    "id" SERIAL,
    "collectionId" INTEGER NOT NULL,  -- -> collection.id, CASCADE
    "productKind" VARCHAR(64) NOT NULL,  -- enum ProductKind
    "pokemonCardId" UUID,  -- -> card.id, CASCADE (si kind=card)
    "sealedProductId" VARCHAR(255),  -- -> sealed_product.id, CASCADE (si kind=sealed)
    "cardStateId" INTEGER,  -- -> card_state.id
    "sealedCondition" VARCHAR(64),  -- enum SealedCondition
    "added_at" TIMESTAMP NOT NULL,
    "quantity" INTEGER NOT NULL,  -- default 1
    CONSTRAINT "PK_collection_item" PRIMARY KEY ("id")
);

-- -------------------------------------------------------------
-- D4 : Deck Building
-- -------------------------------------------------------------

-- Format de jeu (Standard, Expanded...) avec fenetre de validite
CREATE TABLE "deck_format" (
    "id" SERIAL,
    "type" VARCHAR(255) NOT NULL,  -- unique
    "startDate" DATE,
    "endDate" DATE,
    CONSTRAINT "PK_deck_format" PRIMARY KEY ("id")
);

-- Deck construit par un utilisateur
CREATE TABLE "deck" (
    "id" SERIAL,
    "userId" INTEGER NOT NULL,  -- -> user.id, CASCADE
    "name" VARCHAR(100) NOT NULL,
    "isPublic" BOOLEAN NOT NULL,  -- default false, index (isPublic, createdAt)
    "views" INTEGER NOT NULL,  -- default 0
    "formatId" INTEGER,  -- -> deck_format.id, SET NULL, eager
    "coverCardId" UUID,  -- -> card.id, eager
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PK_deck" PRIMARY KEY ("id")
);

-- Ligne de deck : carte + quantite + role (main/side)
CREATE TABLE "deck_card" (
    "id" SERIAL,
    "deckId" INTEGER NOT NULL,  -- -> deck.id, CASCADE, indexe
    "cardId" UUID NOT NULL,  -- -> card.id, CASCADE, eager
    "qty" INTEGER NOT NULL,  -- default 1
    "role" VARCHAR(64) NOT NULL,  -- enum DeckCardRole
    CONSTRAINT "PK_deck_card" PRIMARY KEY ("id")
);

-- Lien de partage court d'un deck, expirable
CREATE TABLE "deck_share" (
    "id" SERIAL,
    "deckId" INTEGER NOT NULL,  -- -> deck.id, CASCADE
    "code" VARCHAR(12) NOT NULL,  -- unique
    "createdAt" TIMESTAMP NOT NULL,
    "expiresAt" TIMESTAMP,
    CONSTRAINT "PK_deck_share" PRIMARY KEY ("id")
);

-- Favori : un User sauvegarde le deck d'un autre
CREATE TABLE "saved_deck" (
    "id" SERIAL,
    "userId" INTEGER NOT NULL,  -- -> user.id, CASCADE
    "deckId" INTEGER NOT NULL,  -- -> deck.id, CASCADE
    "createdAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PK_saved_deck" PRIMARY KEY ("id")
);

-- -------------------------------------------------------------
-- D5 : Marketplace
-- -------------------------------------------------------------

-- Annonce de vente polymorphe (carte ou scelle), soft-delete
CREATE TABLE "listing" (
    "id" SERIAL,
    "seller_id" INTEGER NOT NULL,  -- -> user.id, CASCADE
    "productKind" VARCHAR(64) NOT NULL,  -- enum ProductKind
    "card_id" UUID,  -- -> card.id, CASCADE
    "sealed_product_id" VARCHAR(255),  -- -> sealed_product.id, CASCADE
    "price" NUMERIC(10,2) NOT NULL,  -- indexe
    "currency" VARCHAR(64) NOT NULL,  -- enum Currency
    "quantityAvailable" INTEGER NOT NULL,  -- default 1
    "shippingCost" NUMERIC(10,2) NOT NULL,  -- default 0
    "handlingTimeDays" INTEGER NOT NULL,  -- default 3
    "status" VARCHAR(64) NOT NULL,  -- enum ListingStatus
    "cardState" VARCHAR(64),  -- enum CardState
    "sealedCondition" VARCHAR(64),  -- enum SealedCondition
    "description" VARCHAR(255),
    "language" VARCHAR(255),  -- default 'fr' ; type Languages cote TS mais PAS type:'enum' -> colonne varchar
    "createdAt" TIMESTAMP NOT NULL,
    "expiresAt" TIMESTAMP,  -- index (expiresAt, quantityAvailable)
    "deletedAt" TIMESTAMP,  -- @DeleteDateColumn
    CONSTRAINT "PK_listing" PRIMARY KEY ("id")
);

-- Panier unique par utilisateur (1-1)
CREATE TABLE "user_cart" (
    "id" SERIAL,
    "user_id" INTEGER NOT NULL,  -- -> user.id, CASCADE, unique 1-1
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PK_user_cart" PRIMARY KEY ("id")
);

-- Ligne de panier pointant une annonce
CREATE TABLE "cart_item" (
    "id" SERIAL,
    "cart_id" INTEGER NOT NULL,  -- -> user_cart.id, CASCADE
    "listing_id" INTEGER NOT NULL,  -- -> listing.id, CASCADE
    "quantity" INTEGER NOT NULL,  -- default 1
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PK_cart_item" PRIMARY KEY ("id")
);

-- Commande acheteur, machine a etats + reservation de stock
CREATE TABLE "order" (
    "id" SERIAL,
    "buyer_id" INTEGER NOT NULL,  -- -> user.id, CASCADE
    "totalAmount" NUMERIC(12,2) NOT NULL,
    "shippingAmount" NUMERIC(12,2) NOT NULL,  -- default 0
    "status" VARCHAR(64) NOT NULL,  -- enum OrderStatus
    "currency" VARCHAR(64) NOT NULL,  -- enum Currency
    "shippingAddress" TEXT NOT NULL,  -- default ''
    "reservationExpiresAt" TIMESTAMP,  -- TTL reservation stock
    "stockReleased" BOOLEAN NOT NULL,  -- default false
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PK_order" PRIMARY KEY ("id")
);

-- Ligne de commande. Snapshot denormalise du produit + suivi logistique par vendeur
CREATE TABLE "order_item" (
    "id" SERIAL,
    "order_id" INTEGER NOT NULL,  -- -> order.id, CASCADE
    "listing_id" INTEGER,  -- -> listing.id, SET NULL
    "seller_id" INTEGER,  -- -> user.id, SET NULL, indexe
    "unitPrice" NUMERIC(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "shippingCost" NUMERIC(10,2) NOT NULL,  -- default 0
    "handlingTimeDays" INTEGER NOT NULL,  -- default 3
    "productKind" VARCHAR(64) NOT NULL,  -- enum ProductKind
    "productName" VARCHAR(255) NOT NULL,  -- snapshot
    "productImage" VARCHAR(512),  -- snapshot
    "productCondition" VARCHAR(64),  -- snapshot
    "productLanguage" VARCHAR(16),  -- snapshot
    "productSetName" VARCHAR(255),  -- snapshot
    "sellerName" VARCHAR(255) NOT NULL,  -- snapshot
    "fulfillmentStatus" VARCHAR(64) NOT NULL,  -- enum FulfillmentStatus
    "carrier" VARCHAR(64),
    "trackingNumber" VARCHAR(128),
    "shippedAt" TIMESTAMP,
    "deliveredAt" TIMESTAMP,
    CONSTRAINT "PK_order_item" PRIMARY KEY ("id")
);

-- Transaction de paiement rattachee a une commande
CREATE TABLE "payment_transaction" (
    "id" SERIAL,
    "order_id" INTEGER NOT NULL,  -- -> order.id, CASCADE
    "method" VARCHAR(64) NOT NULL,  -- enum PaymentMethod
    "status" VARCHAR(64) NOT NULL,  -- enum PaymentStatus
    "transactionId" VARCHAR(255),  -- unique index PSP
    "amount" NUMERIC(12,2) NOT NULL,
    "currency" VARCHAR(64),  -- enum Currency
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PK_payment_transaction" PRIMARY KEY ("id")
);

-- Serie temporelle de prix par carte ou produit scelle
CREATE TABLE "price_history" (
    "id" SERIAL,
    "card_id" UUID,  -- -> card.id, CASCADE
    "sealed_product_id" VARCHAR(255),  -- -> sealed_product.id, CASCADE
    "price" NUMERIC(10,2) NOT NULL,
    "currency" VARCHAR(64) NOT NULL,  -- enum Currency
    "cardState" VARCHAR(64),  -- enum CardState
    "sealedCondition" VARCHAR(64),  -- enum SealedCondition
    "quantityAvailable" INTEGER NOT NULL,  -- default 1
    "recordedAt" TIMESTAMP NOT NULL,  -- index (card, recordedAt)
    CONSTRAINT "PK_price_history" PRIMARY KEY ("id")
);

-- Evenement analytique sur une carte (vue, recherche, vente...)
CREATE TABLE "card_events" (
    "id" SERIAL,
    "card_id" UUID NOT NULL,  -- -> card.id, CASCADE
    "eventType" VARCHAR(64) NOT NULL,  -- enum CardEventType
    "user_id" INTEGER,  -- -> user.id, SET NULL
    "sessionId" VARCHAR(255),
    "ipAddress" VARCHAR(45),
    "userAgent" VARCHAR(255),
    "context" JSONB,  -- searchQuery, referrer, listingId
    "createdAt" TIMESTAMP NOT NULL,  -- indexe
    CONSTRAINT "PK_card_events" PRIMARY KEY ("id")
);

-- Equivalent de CardEvent pour les produits scelles
CREATE TABLE "sealed_events" (
    "id" SERIAL,
    "sealed_product_id" VARCHAR(255) NOT NULL,  -- -> sealed_product.id, CASCADE
    "eventType" VARCHAR(64) NOT NULL,  -- enum SealedEventType
    "user_id" INTEGER,  -- -> user.id, SET NULL
    "sessionId" VARCHAR(255),
    "ipAddress" VARCHAR(45),
    "userAgent" VARCHAR(255),
    "context" JSONB,
    "createdAt" TIMESTAMP NOT NULL,  -- indexe
    CONSTRAINT "PK_sealed_events" PRIMARY KEY ("id")
);

-- Agregat journalier par carte (rollup des CardEvent + prix)
CREATE TABLE "card_popularity_metrics" (
    "id" SERIAL,
    "card_id" UUID NOT NULL,  -- -> card.id, CASCADE, unique (card, date)
    "date" DATE NOT NULL,  -- unique (card, date)
    "views" INTEGER NOT NULL,  -- default 0
    "searches" INTEGER NOT NULL,  -- default 0
    "favorites" INTEGER NOT NULL,  -- default 0
    "addsToCart" INTEGER NOT NULL,  -- default 0
    "sales" INTEGER NOT NULL,  -- default 0
    "listingCount" INTEGER NOT NULL,  -- default 0
    "minPrice" NUMERIC(10,2),
    "avgPrice" NUMERIC(10,2),
    "popularityScore" NUMERIC(10,4) NOT NULL,  -- indexe
    "trendScore" NUMERIC(10,4) NOT NULL,  -- indexe
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PK_card_popularity_metrics" PRIMARY KEY ("id")
);

-- -------------------------------------------------------------
-- D6 : Tournoi
-- -------------------------------------------------------------

-- Tournoi : format, statut, bracket, fenetre d'inscription
CREATE TABLE "tournament" (
    "id" SERIAL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "location" VARCHAR(255),
    "startDate" TIMESTAMP NOT NULL,
    "endDate" TIMESTAMP NOT NULL,
    "type" VARCHAR(64) NOT NULL,  -- enum TournamentType
    "status" VARCHAR(64) NOT NULL,  -- enum TournamentStatus
    "isFinished" BOOLEAN NOT NULL,  -- default false ; le '?' TypeScript ne rend pas la colonne nullable
    "maxPlayers" INTEGER,
    "minPlayers" INTEGER,
    "currentRound" INTEGER,  -- default 0
    "totalRounds" INTEGER,  -- default 0
    "registrationDeadline" TIMESTAMP,
    "allowLateRegistration" BOOLEAN,  -- default true
    "requiresApproval" BOOLEAN NOT NULL,  -- default false
    "rules" TEXT,
    "additionalInfo" TEXT,
    "ageRestrictionMin" INTEGER,
    "ageRestrictionMax" INTEGER,
    "allowedFormats" TEXT,
    "isPublic" BOOLEAN NOT NULL,  -- default true
    "isExternal" BOOLEAN NOT NULL,  -- default false
    "externalRegistrationUrl" VARCHAR(255),
    "pricingId" INTEGER,  -- -> tournament_pricing.id, @JoinColumn cote Tournament
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PK_tournament" PRIMARY KEY ("id")
);

-- Table de jonction N-N Tournament <-> Player (@JoinTable)
CREATE TABLE "tournament_players" (
    "tournament_id" INTEGER NOT NULL,  -- -> tournament.id
    "player_id" INTEGER NOT NULL,  -- -> player.id
    CONSTRAINT "PK_tournament_players" PRIMARY KEY ("tournament_id", "player_id")
);

-- Staff d'un tournoi (owner, admin, moderateur, juge)
CREATE TABLE "tournament_organizer" (
    "id" SERIAL,
    "tournamentId" INTEGER NOT NULL,  -- -> tournament.id, CASCADE
    "userId" INTEGER NOT NULL,  -- -> user.id, CASCADE
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role" VARCHAR(64) NOT NULL,  -- enum OrganizerRole
    "isActive" BOOLEAN NOT NULL,  -- default true
    "phone" VARCHAR(255),
    "responsibilities" TEXT,
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PK_tournament_organizer" PRIMARY KEY ("id")
);

-- Inscription d'un Player a un Tournament (unique par couple)
CREATE TABLE "tournament_registration" (
    "id" SERIAL,
    "tournamentId" INTEGER NOT NULL,  -- -> tournament.id, CASCADE
    "playerId" INTEGER NOT NULL,  -- -> player.id, CASCADE
    "status" VARCHAR(64) NOT NULL,  -- enum RegistrationStatus
    "notes" VARCHAR(255),
    "eliminatedAt" TIMESTAMP,
    "eliminatedRound" INTEGER,
    "paidAmount" NUMERIC(10,2),
    "paymentCompleted" BOOLEAN NOT NULL,  -- default false
    "paymentDueDate" TIMESTAMP,
    "confirmationCode" VARCHAR(255),
    "checkedIn" BOOLEAN NOT NULL,  -- default false
    "checkedInAt" TIMESTAMP,
    "registeredAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PK_tournament_registration" PRIMARY KEY ("id")
);

-- Tarification 1-1 d'un tournoi (early bird, late, remboursement)
CREATE TABLE "tournament_pricing" (
    "id" SERIAL,
    "type" VARCHAR(64) NOT NULL,  -- enum PricingType
    "basePrice" NUMERIC(10,2) NOT NULL,  -- default 0
    "earlyBirdPrice" NUMERIC(10,2),
    "earlyBirdDeadline" TIMESTAMP,
    "lateRegistrationPrice" NUMERIC(10,2),
    "lateRegistrationStart" TIMESTAMP,
    "priceDescription" TEXT,
    "refundable" BOOLEAN NOT NULL,  -- default true
    "refundDeadline" TIMESTAMP,
    "refundFeePercentage" NUMERIC(5,2) NOT NULL,  -- default 0
    "paymentInstructions" TEXT,
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PK_tournament_pricing" PRIMARY KEY ("id")
);

-- Paiement (ou remboursement) d'une inscription tournoi
CREATE TABLE "registration_payment" (
    "id" SERIAL,
    "registrationId" INTEGER NOT NULL,  -- -> tournament_registration.id, CASCADE
    "amount" NUMERIC(10,2) NOT NULL,
    "method" VARCHAR(64) NOT NULL,  -- enum PaymentMethod
    "status" VARCHAR(64) NOT NULL,  -- enum PaymentStatus
    "transactionId" VARCHAR(255),
    "paymentIntentId" VARCHAR(255),
    "paidAt" TIMESTAMP,
    "refundedAmount" NUMERIC(10,2),
    "refundedAt" TIMESTAMP,
    "notes" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PK_registration_payment" PRIMARY KEY ("id")
);

-- Recompense par position du classement final
CREATE TABLE "tournament_reward" (
    "id" SERIAL,
    "tournamentId" INTEGER NOT NULL,  -- -> tournament.id, CASCADE
    "position" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" VARCHAR(64) NOT NULL,  -- enum RewardType
    "cashValue" NUMERIC(10,2),
    "productName" VARCHAR(255),
    "productBrand" VARCHAR(255),
    "pointsValue" INTEGER,
    "imageUrl" VARCHAR(255),
    "isActive" BOOLEAN NOT NULL,  -- default true
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PK_tournament_reward" PRIMARY KEY ("id")
);

-- Annonce de tournoi programmable + metriques d'envoi
CREATE TABLE "tournament_notification" (
    "id" SERIAL,
    "tournamentId" INTEGER NOT NULL,  -- -> tournament.id, CASCADE
    "type" VARCHAR(64) NOT NULL,  -- enum NotificationType
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "status" VARCHAR(64) NOT NULL,  -- enum NotificationStatus
    "scheduledFor" TIMESTAMP,
    "sentAt" TIMESTAMP,
    "recipientCount" INTEGER NOT NULL,  -- default 0
    "successCount" INTEGER NOT NULL,  -- default 0
    "failureCount" INTEGER NOT NULL,  -- default 0
    "targetRoles" TEXT,
    "failureReasons" TEXT,
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PK_tournament_notification" PRIMARY KEY ("id")
);

-- -------------------------------------------------------------
-- D7 : Match & Classement
-- -------------------------------------------------------------

-- Match de bracket de tournoi entre deux Players
CREATE TABLE "match" (
    "id" SERIAL,
    "tournamentId" INTEGER NOT NULL,  -- -> tournament.id, CASCADE
    "playerAId" INTEGER,  -- -> player.id
    "playerBId" INTEGER,  -- -> player.id
    "winnerId" INTEGER,  -- -> player.id
    "round" INTEGER NOT NULL,  -- default 1
    "phase" VARCHAR(64) NOT NULL,  -- enum MatchPhase
    "status" VARCHAR(64) NOT NULL,  -- enum MatchStatus
    "scheduledDate" TIMESTAMP,
    "startedAt" TIMESTAMP,
    "finishedAt" TIMESTAMP,
    "playerAScore" INTEGER NOT NULL,  -- default 0
    "playerBScore" INTEGER NOT NULL,  -- default 0
    "notes" VARCHAR(255),
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PK_match" PRIMARY KEY ("id")
);

-- Stats d'un Player sur un Match (unique par couple)
CREATE TABLE "statistics" (
    "id" SERIAL,
    "playerId" INTEGER NOT NULL,  -- -> player.id, CASCADE
    "matchId" INTEGER NOT NULL,  -- -> match.id, CASCADE
    "points" INTEGER NOT NULL,  -- default 0
    "aces" INTEGER NOT NULL,  -- default 0
    "faults" INTEGER NOT NULL,  -- default 0
    "cardsPlayed" INTEGER NOT NULL,  -- default 0
    "damageDealt" INTEGER NOT NULL,  -- default 0
    "damageTaken" INTEGER NOT NULL,  -- default 0
    "isWinner" BOOLEAN NOT NULL,  -- default false
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PK_statistics" PRIMARY KEY ("id")
);

-- Classement d'un Player dans un Tournament (unique par couple)
CREATE TABLE "ranking" (
    "id" SERIAL,
    "tournamentId" INTEGER NOT NULL,  -- -> tournament.id, CASCADE
    "playerId" INTEGER NOT NULL,  -- -> player.id, CASCADE
    "rank" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,  -- default 0
    "wins" INTEGER NOT NULL,  -- default 0
    "losses" INTEGER NOT NULL,  -- default 0
    "draws" INTEGER NOT NULL,  -- default 0
    "winRate" NUMERIC(5,2) NOT NULL,  -- default 0
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PK_ranking" PRIMARY KEY ("id")
);

-- Etat du moteur de jeu live pour un Match de tournoi (1-1)
CREATE TABLE "online_match_session" (
    "id" SERIAL,
    "match_id" INTEGER NOT NULL,  -- -> match.id, CASCADE, 1-1
    "status" VARCHAR(64) NOT NULL,  -- enum OnlineMatchSessionStatus
    "seed" BIGINT NOT NULL,  -- graine RNG deterministe
    "playerADeckId" INTEGER,  -- reference logique deck (pas de FK)
    "playerBDeckId" INTEGER,  -- reference logique deck (pas de FK)
    "winnerPlayerId" INTEGER,  -- reference logique player (pas de FK)
    "endedReason" VARCHAR(255),
    "serializedState" JSONB,  -- snapshot moteur
    "eventLog" JSONB NOT NULL,  -- default []
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PK_online_match_session" PRIMARY KEY ("id")
);

-- Partie libre User vs User, hors tournoi, classee ou non
CREATE TABLE "casual_match_session" (
    "id" SERIAL,
    "playerAId" INTEGER NOT NULL,  -- -> user.id, CASCADE
    "playerBId" INTEGER NOT NULL,  -- -> user.id, CASCADE
    "status" VARCHAR(64) NOT NULL,  -- enum CasualMatchSessionStatus
    "seed" BIGINT NOT NULL,
    "isRanked" BOOLEAN NOT NULL,  -- default false
    "playerADeckId" INTEGER,  -- reference logique deck
    "playerBDeckId" INTEGER,  -- reference logique deck
    "winnerUserId" INTEGER,  -- reference logique user
    "endedReason" VARCHAR(255),
    "serializedState" JSONB,
    "eventLog" JSONB NOT NULL,  -- default []
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PK_casual_match_session" PRIMARY KEY ("id")
);

-- Partie d'entrainement User vs IA
CREATE TABLE "training_match_session" (
    "id" SERIAL,
    "userId" INTEGER NOT NULL,  -- -> user.id, CASCADE
    "status" VARCHAR(64) NOT NULL,  -- enum TrainingMatchSessionStatus
    "seed" BIGINT NOT NULL,
    "playerDeckId" INTEGER NOT NULL,  -- reference logique deck
    "aiDeckPresetId" VARCHAR(100) NOT NULL,  -- preset IA
    "aiDifficulty" VARCHAR(64) NOT NULL,  -- enum TrainingDifficulty
    "serializedState" JSONB NOT NULL,
    "eventLog" JSONB NOT NULL,  -- default []
    "winnerSide" VARCHAR(255),  -- PLAYER | AI
    "endedReason" VARCHAR(255),
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PK_training_match_session" PRIMARY KEY ("id")
);

-- Historique Elo : variation par match classe
CREATE TABLE "ranked_match_history" (
    "id" SERIAL,
    "casualSessionId" INTEGER,  -- reference logique (index partiel)
    "matchId" INTEGER,  -- reference logique (index partiel)
    "winnerId" INTEGER,  -- -> user.id, SET NULL, indexe
    "loserId" INTEGER,  -- -> user.id, SET NULL, indexe
    "winnerEloBefore" INTEGER NOT NULL,
    "winnerEloAfter" INTEGER NOT NULL,
    "loserEloBefore" INTEGER NOT NULL,
    "loserEloAfter" INTEGER NOT NULL,
    "delta" INTEGER NOT NULL,
    "isDraw" BOOLEAN NOT NULL,  -- default false
    "createdAt" TIMESTAMP NOT NULL,  -- indexe
    CONSTRAINT "PK_ranked_match_history" PRIMARY KEY ("id")
);

-- -------------------------------------------------------------
-- D8 : Contenu & Support
-- -------------------------------------------------------------

-- Article de blog / actualite avec SEO et publication
CREATE TABLE "article" (
    "id" SERIAL,
    "title" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(180) NOT NULL,  -- unique
    "excerpt" TEXT,
    "image" VARCHAR(255),
    "link" VARCHAR(255),
    "content" TEXT,
    "status" VARCHAR(64) NOT NULL,  -- enum ArticleStatus
    "locale" VARCHAR(10) NOT NULL,  -- default 'fr'
    "metaTitle" VARCHAR(255),  -- SEO
    "metaDescription" TEXT,  -- SEO
    "authorId" INTEGER,  -- -> user.id, SET NULL
    "publishedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PK_article" PRIMARY KEY ("id")
);

-- Question / reponse d'aide, ordonnee par categorie
CREATE TABLE "faq" (
    "id" SERIAL,
    "question" VARCHAR(255) NOT NULL,
    "answer" TEXT NOT NULL,
    "category" VARCHAR(64) NOT NULL,  -- enum FaqCategory
    "order" INTEGER NOT NULL,  -- default 0
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PK_faq" PRIMARY KEY ("id")
);

-- Ticket de support ouvert par un utilisateur
CREATE TABLE "support_ticket" (
    "id" SERIAL,
    "userId" INTEGER NOT NULL,  -- -> user.id, CASCADE
    "subject" VARCHAR(100) NOT NULL,
    "message" TEXT NOT NULL,
    "status" VARCHAR(64) NOT NULL,  -- enum SupportTicketStatusType
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PK_support_ticket" PRIMARY KEY ("id")
);

-- Message dans un fil de support (utilisateur ou staff)
CREATE TABLE "support_message" (
    "id" SERIAL,
    "supportTicketId" INTEGER NOT NULL,  -- -> support_ticket.id, CASCADE
    "userId" INTEGER NOT NULL,  -- -> user.id, CASCADE
    "message" TEXT NOT NULL,
    "isStaff" BOOLEAN NOT NULL,  -- default false
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PK_support_message" PRIMARY KEY ("id")
);

-- -------------------------------------------------------------
-- Cles etrangeres
-- -------------------------------------------------------------

ALTER TABLE "player" ADD CONSTRAINT "FK_player__userId"
    FOREIGN KEY ("userId") REFERENCES "user" ("id");
ALTER TABLE "user_follow" ADD CONSTRAINT "FK_user_follow__follower_id"
    FOREIGN KEY ("follower_id") REFERENCES "user" ("id") ON DELETE CASCADE;
ALTER TABLE "user_follow" ADD CONSTRAINT "FK_user_follow__followed_id"
    FOREIGN KEY ("followed_id") REFERENCES "user" ("id") ON DELETE CASCADE;
ALTER TABLE "user_badge" ADD CONSTRAINT "FK_user_badge__user_id"
    FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE CASCADE;
ALTER TABLE "user_badge" ADD CONSTRAINT "FK_user_badge__badge_id"
    FOREIGN KEY ("badge_id") REFERENCES "badge" ("id") ON DELETE CASCADE;
ALTER TABLE "active_challenge" ADD CONSTRAINT "FK_active_challenge__challengeId"
    FOREIGN KEY ("challengeId") REFERENCES "challenge" ("id") ON DELETE CASCADE;
ALTER TABLE "user_challenge" ADD CONSTRAINT "FK_user_challenge__activeChallengeId"
    FOREIGN KEY ("activeChallengeId") REFERENCES "active_challenge" ("id") ON DELETE CASCADE;
ALTER TABLE "user_challenge" ADD CONSTRAINT "FK_user_challenge__userId"
    FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE;
ALTER TABLE "notification" ADD CONSTRAINT "FK_notification__userId"
    FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE;
ALTER TABLE "device_token" ADD CONSTRAINT "FK_device_token__userId"
    FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE;
ALTER TABLE "pokemon_serie_translation" ADD CONSTRAINT "FK_pokemon_serie_translation__serie_id"
    FOREIGN KEY ("serie_id") REFERENCES "pokemon_serie" ("id") ON DELETE CASCADE;
ALTER TABLE "pokemon_set" ADD CONSTRAINT "FK_pokemon_set__serieId"
    FOREIGN KEY ("serieId") REFERENCES "pokemon_serie" ("id");
ALTER TABLE "pokemon_set_translation" ADD CONSTRAINT "FK_pokemon_set_translation__set_id"
    FOREIGN KEY ("set_id") REFERENCES "pokemon_set" ("id") ON DELETE CASCADE;
ALTER TABLE "card" ADD CONSTRAINT "FK_card__setId"
    FOREIGN KEY ("setId") REFERENCES "pokemon_set" ("id");
ALTER TABLE "sealed_product" ADD CONSTRAINT "FK_sealed_product__pokemon_set_id"
    FOREIGN KEY ("pokemon_set_id") REFERENCES "pokemon_set" ("id") ON DELETE SET NULL;
ALTER TABLE "card_translation" ADD CONSTRAINT "FK_card_translation__card_id"
    FOREIGN KEY ("card_id") REFERENCES "card" ("id") ON DELETE CASCADE;
ALTER TABLE "pokemon_card_details" ADD CONSTRAINT "FK_pokemon_card_details__card_id"
    FOREIGN KEY ("card_id") REFERENCES "card" ("id") ON DELETE CASCADE;
ALTER TABLE "sealed_product_locale" ADD CONSTRAINT "FK_sealed_product_locale__sealed_product_id"
    FOREIGN KEY ("sealed_product_id") REFERENCES "sealed_product" ("id") ON DELETE CASCADE;
ALTER TABLE "collection" ADD CONSTRAINT "FK_collection__userId"
    FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE;
ALTER TABLE "collection" ADD CONSTRAINT "FK_collection__masterSetId"
    FOREIGN KEY ("masterSetId") REFERENCES "pokemon_set" ("id") ON DELETE SET NULL;
ALTER TABLE "collection_item" ADD CONSTRAINT "FK_collection_item__collectionId"
    FOREIGN KEY ("collectionId") REFERENCES "collection" ("id") ON DELETE CASCADE;
ALTER TABLE "collection_item" ADD CONSTRAINT "FK_collection_item__pokemonCardId"
    FOREIGN KEY ("pokemonCardId") REFERENCES "card" ("id") ON DELETE CASCADE;
ALTER TABLE "collection_item" ADD CONSTRAINT "FK_collection_item__sealedProductId"
    FOREIGN KEY ("sealedProductId") REFERENCES "sealed_product" ("id") ON DELETE CASCADE;
ALTER TABLE "collection_item" ADD CONSTRAINT "FK_collection_item__cardStateId"
    FOREIGN KEY ("cardStateId") REFERENCES "card_state" ("id");
ALTER TABLE "deck" ADD CONSTRAINT "FK_deck__userId"
    FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE;
ALTER TABLE "deck" ADD CONSTRAINT "FK_deck__formatId"
    FOREIGN KEY ("formatId") REFERENCES "deck_format" ("id") ON DELETE SET NULL;
ALTER TABLE "deck" ADD CONSTRAINT "FK_deck__coverCardId"
    FOREIGN KEY ("coverCardId") REFERENCES "card" ("id");
ALTER TABLE "deck_card" ADD CONSTRAINT "FK_deck_card__deckId"
    FOREIGN KEY ("deckId") REFERENCES "deck" ("id") ON DELETE CASCADE;
ALTER TABLE "deck_card" ADD CONSTRAINT "FK_deck_card__cardId"
    FOREIGN KEY ("cardId") REFERENCES "card" ("id") ON DELETE CASCADE;
ALTER TABLE "deck_share" ADD CONSTRAINT "FK_deck_share__deckId"
    FOREIGN KEY ("deckId") REFERENCES "deck" ("id") ON DELETE CASCADE;
ALTER TABLE "saved_deck" ADD CONSTRAINT "FK_saved_deck__userId"
    FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE;
ALTER TABLE "saved_deck" ADD CONSTRAINT "FK_saved_deck__deckId"
    FOREIGN KEY ("deckId") REFERENCES "deck" ("id") ON DELETE CASCADE;
ALTER TABLE "listing" ADD CONSTRAINT "FK_listing__seller_id"
    FOREIGN KEY ("seller_id") REFERENCES "user" ("id") ON DELETE CASCADE;
ALTER TABLE "listing" ADD CONSTRAINT "FK_listing__card_id"
    FOREIGN KEY ("card_id") REFERENCES "card" ("id") ON DELETE CASCADE;
ALTER TABLE "listing" ADD CONSTRAINT "FK_listing__sealed_product_id"
    FOREIGN KEY ("sealed_product_id") REFERENCES "sealed_product" ("id") ON DELETE CASCADE;
ALTER TABLE "user_cart" ADD CONSTRAINT "FK_user_cart__user_id"
    FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE CASCADE;
ALTER TABLE "cart_item" ADD CONSTRAINT "FK_cart_item__cart_id"
    FOREIGN KEY ("cart_id") REFERENCES "user_cart" ("id") ON DELETE CASCADE;
ALTER TABLE "cart_item" ADD CONSTRAINT "FK_cart_item__listing_id"
    FOREIGN KEY ("listing_id") REFERENCES "listing" ("id") ON DELETE CASCADE;
ALTER TABLE "order" ADD CONSTRAINT "FK_order__buyer_id"
    FOREIGN KEY ("buyer_id") REFERENCES "user" ("id") ON DELETE CASCADE;
ALTER TABLE "order_item" ADD CONSTRAINT "FK_order_item__order_id"
    FOREIGN KEY ("order_id") REFERENCES "order" ("id") ON DELETE CASCADE;
ALTER TABLE "order_item" ADD CONSTRAINT "FK_order_item__listing_id"
    FOREIGN KEY ("listing_id") REFERENCES "listing" ("id") ON DELETE SET NULL;
ALTER TABLE "order_item" ADD CONSTRAINT "FK_order_item__seller_id"
    FOREIGN KEY ("seller_id") REFERENCES "user" ("id") ON DELETE SET NULL;
ALTER TABLE "payment_transaction" ADD CONSTRAINT "FK_payment_transaction__order_id"
    FOREIGN KEY ("order_id") REFERENCES "order" ("id") ON DELETE CASCADE;
ALTER TABLE "price_history" ADD CONSTRAINT "FK_price_history__card_id"
    FOREIGN KEY ("card_id") REFERENCES "card" ("id") ON DELETE CASCADE;
ALTER TABLE "price_history" ADD CONSTRAINT "FK_price_history__sealed_product_id"
    FOREIGN KEY ("sealed_product_id") REFERENCES "sealed_product" ("id") ON DELETE CASCADE;
ALTER TABLE "card_events" ADD CONSTRAINT "FK_card_events__card_id"
    FOREIGN KEY ("card_id") REFERENCES "card" ("id") ON DELETE CASCADE;
ALTER TABLE "card_events" ADD CONSTRAINT "FK_card_events__user_id"
    FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE SET NULL;
ALTER TABLE "sealed_events" ADD CONSTRAINT "FK_sealed_events__sealed_product_id"
    FOREIGN KEY ("sealed_product_id") REFERENCES "sealed_product" ("id") ON DELETE CASCADE;
ALTER TABLE "sealed_events" ADD CONSTRAINT "FK_sealed_events__user_id"
    FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE SET NULL;
ALTER TABLE "card_popularity_metrics" ADD CONSTRAINT "FK_card_popularity_metrics__card_id"
    FOREIGN KEY ("card_id") REFERENCES "card" ("id") ON DELETE CASCADE;
ALTER TABLE "tournament" ADD CONSTRAINT "FK_tournament__pricingId"
    FOREIGN KEY ("pricingId") REFERENCES "tournament_pricing" ("id");
ALTER TABLE "tournament_players" ADD CONSTRAINT "FK_tournament_players__tournament_id"
    FOREIGN KEY ("tournament_id") REFERENCES "tournament" ("id");
ALTER TABLE "tournament_players" ADD CONSTRAINT "FK_tournament_players__player_id"
    FOREIGN KEY ("player_id") REFERENCES "player" ("id");
ALTER TABLE "tournament_organizer" ADD CONSTRAINT "FK_tournament_organizer__tournamentId"
    FOREIGN KEY ("tournamentId") REFERENCES "tournament" ("id") ON DELETE CASCADE;
ALTER TABLE "tournament_organizer" ADD CONSTRAINT "FK_tournament_organizer__userId"
    FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE;
ALTER TABLE "tournament_registration" ADD CONSTRAINT "FK_tournament_registration__tournamentId"
    FOREIGN KEY ("tournamentId") REFERENCES "tournament" ("id") ON DELETE CASCADE;
ALTER TABLE "tournament_registration" ADD CONSTRAINT "FK_tournament_registration__playerId"
    FOREIGN KEY ("playerId") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "registration_payment" ADD CONSTRAINT "FK_registration_payment__registrationId"
    FOREIGN KEY ("registrationId") REFERENCES "tournament_registration" ("id") ON DELETE CASCADE;
ALTER TABLE "tournament_reward" ADD CONSTRAINT "FK_tournament_reward__tournamentId"
    FOREIGN KEY ("tournamentId") REFERENCES "tournament" ("id") ON DELETE CASCADE;
ALTER TABLE "tournament_notification" ADD CONSTRAINT "FK_tournament_notification__tournamentId"
    FOREIGN KEY ("tournamentId") REFERENCES "tournament" ("id") ON DELETE CASCADE;
ALTER TABLE "match" ADD CONSTRAINT "FK_match__tournamentId"
    FOREIGN KEY ("tournamentId") REFERENCES "tournament" ("id") ON DELETE CASCADE;
ALTER TABLE "match" ADD CONSTRAINT "FK_match__playerAId"
    FOREIGN KEY ("playerAId") REFERENCES "player" ("id");
ALTER TABLE "match" ADD CONSTRAINT "FK_match__playerBId"
    FOREIGN KEY ("playerBId") REFERENCES "player" ("id");
ALTER TABLE "match" ADD CONSTRAINT "FK_match__winnerId"
    FOREIGN KEY ("winnerId") REFERENCES "player" ("id");
ALTER TABLE "statistics" ADD CONSTRAINT "FK_statistics__matchId"
    FOREIGN KEY ("matchId") REFERENCES "match" ("id") ON DELETE CASCADE;
ALTER TABLE "statistics" ADD CONSTRAINT "FK_statistics__playerId"
    FOREIGN KEY ("playerId") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "ranking" ADD CONSTRAINT "FK_ranking__tournamentId"
    FOREIGN KEY ("tournamentId") REFERENCES "tournament" ("id") ON DELETE CASCADE;
ALTER TABLE "ranking" ADD CONSTRAINT "FK_ranking__playerId"
    FOREIGN KEY ("playerId") REFERENCES "player" ("id") ON DELETE CASCADE;
ALTER TABLE "online_match_session" ADD CONSTRAINT "FK_online_match_session__match_id"
    FOREIGN KEY ("match_id") REFERENCES "match" ("id") ON DELETE CASCADE;
ALTER TABLE "casual_match_session" ADD CONSTRAINT "FK_casual_match_session__playerAId"
    FOREIGN KEY ("playerAId") REFERENCES "user" ("id") ON DELETE CASCADE;
ALTER TABLE "casual_match_session" ADD CONSTRAINT "FK_casual_match_session__playerBId"
    FOREIGN KEY ("playerBId") REFERENCES "user" ("id") ON DELETE CASCADE;
ALTER TABLE "training_match_session" ADD CONSTRAINT "FK_training_match_session__userId"
    FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE;
ALTER TABLE "ranked_match_history" ADD CONSTRAINT "FK_ranked_match_history__winnerId"
    FOREIGN KEY ("winnerId") REFERENCES "user" ("id") ON DELETE SET NULL;
ALTER TABLE "ranked_match_history" ADD CONSTRAINT "FK_ranked_match_history__loserId"
    FOREIGN KEY ("loserId") REFERENCES "user" ("id") ON DELETE SET NULL;
ALTER TABLE "article" ADD CONSTRAINT "FK_article__authorId"
    FOREIGN KEY ("authorId") REFERENCES "user" ("id") ON DELETE SET NULL;
ALTER TABLE "support_ticket" ADD CONSTRAINT "FK_support_ticket__userId"
    FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE;
ALTER TABLE "support_message" ADD CONSTRAINT "FK_support_message__supportTicketId"
    FOREIGN KEY ("supportTicketId") REFERENCES "support_ticket" ("id") ON DELETE CASCADE;
ALTER TABLE "support_message" ADD CONSTRAINT "FK_support_message__userId"
    FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE;

-- -------------------------------------------------------------
-- Contraintes d'unicite metier
-- -------------------------------------------------------------

ALTER TABLE "user" ADD CONSTRAINT "UQ_user_email" UNIQUE ("email");
ALTER TABLE "badge" ADD CONSTRAINT "UQ_badge_code" UNIQUE ("code");
ALTER TABLE "device_token" ADD CONSTRAINT "UQ_device_token_token" UNIQUE ("token");
ALTER TABLE "deck_format" ADD CONSTRAINT "UQ_deck_format_type" UNIQUE ("type");
ALTER TABLE "deck_share" ADD CONSTRAINT "UQ_deck_share_code" UNIQUE ("code");
ALTER TABLE "article" ADD CONSTRAINT "UQ_article_slug" UNIQUE ("slug");
ALTER TABLE "translation" ADD CONSTRAINT "UQ_translation_locale_key" UNIQUE ("locale", "key");
ALTER TABLE "user_follow" ADD CONSTRAINT "UQ_user_follow_follower_id_followed_id" UNIQUE ("follower_id", "followed_id");
ALTER TABLE "user_badge" ADD CONSTRAINT "UQ_user_badge_user_id_badge_id" UNIQUE ("user_id", "badge_id");
ALTER TABLE "user_challenge" ADD CONSTRAINT "UQ_user_challenge_userId_activeChallengeId" UNIQUE ("userId", "activeChallengeId");
ALTER TABLE "saved_deck" ADD CONSTRAINT "UQ_saved_deck_userId_deckId" UNIQUE ("userId", "deckId");
ALTER TABLE "cart_item" ADD CONSTRAINT "UQ_cart_item_cart_id_listing_id" UNIQUE ("cart_id", "listing_id");
ALTER TABLE "payment_transaction" ADD CONSTRAINT "UQ_payment_transaction_transactionId" UNIQUE ("transactionId");
ALTER TABLE "card_popularity_metrics" ADD CONSTRAINT "UQ_card_popularity_metrics_card_id_date" UNIQUE ("card_id", "date");
ALTER TABLE "tournament_registration" ADD CONSTRAINT "UQ_tournament_registration_tournamentId_playerId" UNIQUE ("tournamentId", "playerId");
ALTER TABLE "ranking" ADD CONSTRAINT "UQ_ranking_tournamentId_playerId" UNIQUE ("tournamentId", "playerId");
ALTER TABLE "statistics" ADD CONSTRAINT "UQ_statistics_playerId_matchId" UNIQUE ("playerId", "matchId");
ALTER TABLE "user_cart" ADD CONSTRAINT "UQ_user_cart_user_id" UNIQUE ("user_id");
ALTER TABLE "card" ADD CONSTRAINT "UQ_card_game_tcgDexId" UNIQUE ("game", "tcgDexId");


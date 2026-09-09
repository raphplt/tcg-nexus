import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Creates the complete application schema on an empty database (FND-04).
 *
 * Until this migration, the chain started by altering tables it never created,
 * so a fresh database could not be built from migrations at all. This baseline
 * is generated from the entities and is the sum of every migration that
 * preceded it: on an empty database it builds the schema and records those
 * migrations as applied, and on an installation that already has a schema it
 * does nothing.
 */
export class InitialSchema1785000000000 implements MigrationInterface {
  name = "InitialSchema1785000000000";

  /**
   * Migrations this baseline already contains.
   *
   * They are stamped as applied so they are not replayed against a schema that
   * already holds their effects.
   */
  private static readonly SQUASHED_MIGRATIONS: Array<[string, number]> = [
    ["MarketplaceCheckout1785974400000", 1785974400000],
    ["ShippingFees1785978000000", 1785978000000],
    ["PlatformShippingRates1785981600000", 1785981600000],
    ["Translations1786060800000", 1786060800000],
    ["UserPreferredLocale1786064400000", 1786064400000],
    ["NotificationTranslations1786068000000", 1786068000000],
    ["CatalogTranslations1786071600000", 1786071600000],
    ["DropLegacyCatalogColumns1786075200000", 1786075200000],
    ["SealedProductTranslations1786078800000", 1786078800000],
    ["ArticlePublishing1786082400000", 1786082400000],
    ["OnlinePlaySessions1786086000000", 1786086000000],
    ["PerformanceIndexes1786089600000", 1786089600000],
    ["SwissTournaments1786093200000", 1786093200000],
    ["DoubleElimination1786096800000", 1786096800000],
    ["ArticleSlugIntegrity1786097000000", 1786097000000],
    ["AuthIdentities1786098000000", 1786098000000],
    ["CheckoutAttemptAndAuditOutbox1786099000000", 1786099000000],
    ["RefundsReturnsClaims1786100000000", 1786100000000],
    ["CollectionInventoryAndListings1786101000000", 1786101000000],
    ["TournamentOperations1786102000000", 1786102000000],
    ["SellerSettlementAndTrust1786200000000", 1786200000000],
    ["RefundReservations1788768000000", 1788768000000],
    ["SellerLedgerAndPayoutExecution1788800000000", 1788800000000],
    ["InventoryMovementsAndListingReservations1788900000000", 1788900000000],
    ["ReceiptImports1789000000000", 1789000000000],
    ["CollectionBulkOperations1789100000000", 1789100000000],
    ["CheckoutRecoveryAndCompensation1789200000000", 1789200000000],
    ["ProcessedEvents1789300000000", 1789300000000],
    ["DeckLegalityAndCorrections1789400000000", 1789400000000],
  ];

  /** Builds the schema, unless the database already has one. */
  public async up(queryRunner: QueryRunner): Promise<void> {
    // An installation that predates this baseline keeps its schema: the
    // migrations that built it are stamped by scripts/baseline-migrations.
    if (await queryRunner.hasTable("user")) {
      return;
    }

    await queryRunner.query(
      `CREATE TYPE "public"."badge_category_enum" AS ENUM('collection', 'tournament', 'deck', 'marketplace')`,
    );
    await queryRunner.query(
      `CREATE TABLE "badge" ("id" SERIAL NOT NULL, "code" character varying NOT NULL, "name" character varying NOT NULL, "description" character varying NOT NULL, "icon" character varying NOT NULL, "category" "public"."badge_category_enum" NOT NULL, "threshold" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_361fe073170617a107e26bab750" UNIQUE ("code"), CONSTRAINT "PK_76b7011c864d4521a14a5196c49" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_badge" ("id" SERIAL NOT NULL, "unlockedAt" TIMESTAMP NOT NULL DEFAULT now(), "user_id" integer, "badge_id" integer, CONSTRAINT "PK_c5db2542e028558c5306c9d7f42" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_1e9b8cbf71c28a587a3f09e366" ON "user_badge" ("user_id", "badge_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "deck_format" ("id" SERIAL NOT NULL, "type" character varying NOT NULL, "startDate" date, "endDate" date, CONSTRAINT "UQ_c7031008f93b4b9ce07f87e5811" UNIQUE ("type"), CONSTRAINT "PK_372186272bec5b623e2f6ccd418" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "deck" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "isPublic" boolean NOT NULL DEFAULT false, "views" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer, "formatId" integer, "coverCardId" uuid, CONSTRAINT "PK_99f8010303acab0edf8e1df24f9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_deck_user_created_at" ON "deck" ("userId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_deck_public_created_at" ON "deck" ("isPublic", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."deck_card_role_enum" AS ENUM('main', 'side')`,
    );
    await queryRunner.query(
      `CREATE TABLE "deck_card" ("id" SERIAL NOT NULL, "qty" integer NOT NULL DEFAULT '1', "role" "public"."deck_card_role_enum" NOT NULL DEFAULT 'main', "deckId" integer, "cardId" uuid, CONSTRAINT "PK_37b8e9640346c110e69124374be" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_deck_card_deck_card" ON "deck_card" ("deckId", "cardId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_deck_card_deck_id" ON "deck_card" ("deckId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "pokemon_serie_translation" ("serie_id" character varying NOT NULL, "locale" character varying(10) NOT NULL, "name" character varying, "logo" character varying, CONSTRAINT "PK_b982b6eeb7fd94ba0c30620994e" PRIMARY KEY ("serie_id", "locale"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."pokemon_serie_game_enum" AS ENUM('POKEMON', 'MAGIC', 'LORCANA', 'YU_GI_OH', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TABLE "pokemon_serie" ("id" character varying NOT NULL, "game" "public"."pokemon_serie_game_enum" NOT NULL DEFAULT 'POKEMON', CONSTRAINT "PK_333f360a8a2cbafcf2ff48190f2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "sealed_product_locale" ("sealed_product_id" character varying NOT NULL, "locale" character varying(10) NOT NULL, "name" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_fa4755fc1d751941a3eeec90aef" PRIMARY KEY ("sealed_product_id", "locale"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4c6325a3aca78873469e83e8cf" ON "sealed_product_locale" ("locale", "name") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."sealed_product_producttype_enum" AS ENUM('booster', 'display', 'etb', 'box', 'tin', 'deck', 'tripack', 'collection_box', 'portfolio', 'other')`,
    );
    await queryRunner.query(
      `CREATE TABLE "sealed_product" ("id" character varying NOT NULL, "productType" "public"."sealed_product_producttype_enum" NOT NULL, "contents" jsonb, "sku" character varying, "upc" character varying, "image" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "pokemon_set_id" character varying, CONSTRAINT "PK_d2be92d81ad0172f4dddae50c90" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_902e4bcff9ce64ed986778ab1f" ON "sealed_product" ("sku") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0030575ede9e2e1220089e9a89" ON "sealed_product" ("upc") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f4f252314179ec60c96ffeaabe" ON "sealed_product" ("pokemon_set_id", "productType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_516fbd76d8c5f474f7c0548ca8" ON "sealed_product" ("productType") `,
    );
    await queryRunner.query(
      `CREATE TABLE "pokemon_set_translation" ("set_id" character varying NOT NULL, "locale" character varying(10) NOT NULL, "name" character varying, "logo" character varying, "symbol" character varying, CONSTRAINT "PK_f4db2d3fb7e2f16ac3980f1fc02" PRIMARY KEY ("set_id", "locale"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."pokemon_set_game_enum" AS ENUM('POKEMON', 'MAGIC', 'LORCANA', 'YU_GI_OH', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TABLE "pokemon_set" ("id" character varying NOT NULL, "game" "public"."pokemon_set_game_enum" NOT NULL DEFAULT 'POKEMON', "tcgOnline" character varying, "releaseDate" character varying NOT NULL, "serieId" character varying, "cardCountTotal" integer NOT NULL, "cardCountOfficial" integer NOT NULL, "cardCountReverse" integer NOT NULL, "cardCountHolo" integer NOT NULL, "cardCountFirsted" integer NOT NULL, "legalStandard" boolean NOT NULL, "legalExpanded" boolean NOT NULL, CONSTRAINT "PK_88a3328b746a96974bbe43cfcfe" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "card_translation" ("card_id" uuid NOT NULL, "locale" character varying(10) NOT NULL, "name" character varying, "image" character varying, "category" character varying, "rarity" character varying, "description" text, "effect" text, "evolve_from" character varying, "stage" character varying, "suffix" character varying, "item" jsonb, "abilities" jsonb, "attacks" jsonb, "source_updated_at" character varying, CONSTRAINT "PK_69d0d0061260af5142e6eff68a7" PRIMARY KEY ("card_id", "locale"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_800cefdc707d6086028482d69e" ON "card_translation" ("locale", "name") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."pokemon_card_details_category_enum" AS ENUM('Pokemon', 'Energy', 'Trainer')`,
    );
    await queryRunner.query(
      `CREATE TABLE "pokemon_card_details" ("card_id" uuid NOT NULL, "category" "public"."pokemon_card_details_category_enum", "dexId" integer array, "hp" integer, "types" text array, "level" character varying, "weaknesses" jsonb, "resistances" jsonb, "retreat" integer, "regulationMark" character varying, "trainerType" character varying, "energyType" character varying, "boosters" jsonb, "parsedEffects" jsonb, CONSTRAINT "PK_6ba7b41e65049d07369b3dad0ef" PRIMARY KEY ("card_id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."card_game_enum" AS ENUM('POKEMON', 'MAGIC', 'LORCANA', 'YU_GI_OH', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TABLE "card" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "game" "public"."card_game_enum" NOT NULL DEFAULT 'POKEMON', "tcgDexId" character varying, "localId" character varying, "illustrator" character varying, "variants" jsonb, "variantsDetailed" jsonb, "legal" jsonb, "updated" character varying, "pricing" jsonb, "setId" character varying, CONSTRAINT "PK_9451069b6f1199730791a7f4ae4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_292bcbfb5e2a27a8115eef143f" ON "card" ("game", "tcgDexId") WHERE "tcgDexId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."card_state_code_enum" AS ENUM('NM', 'EX', 'GD', 'LP', 'PL', 'Poor')`,
    );
    await queryRunner.query(
      `CREATE TABLE "card_state" ("id" SERIAL NOT NULL, "code" "public"."card_state_code_enum" NOT NULL, "label" character varying(255) NOT NULL, CONSTRAINT "PK_33a6f62f22fa129831116d501af" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."collection_item_productkind_enum" AS ENUM('card', 'sealed')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."collection_item_sealedcondition_enum" AS ENUM('sealed', 'box_damaged', 'opened_resealed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "collection_item" ("id" SERIAL NOT NULL, "productKind" "public"."collection_item_productkind_enum" NOT NULL DEFAULT 'card', "sealedCondition" "public"."collection_item_sealedcondition_enum", "added_at" TIMESTAMP NOT NULL DEFAULT now(), "quantity" integer NOT NULL DEFAULT '1', "variant" character varying(50), "language" character varying(10) DEFAULT 'fr', "printing" character varying(50), "acquiredAt" TIMESTAMP WITH TIME ZONE, "acquisitionCost" numeric(10,2), "acquisitionCurrency" character varying(10), "storageLocation" character varying(255), "notes" text, "photoUrls" jsonb, "quantityAvailable" integer NOT NULL DEFAULT '1', "quantityReserved" integer NOT NULL DEFAULT '0', "quantitySold" integer NOT NULL DEFAULT '0', "provenance" jsonb, "collectionId" integer, "pokemonCardId" uuid, "sealedProductId" character varying, "cardStateId" integer, CONSTRAINT "PK_5dd39c099cfd4b7756343bbb4a2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d6014509e14ad46632a94eb3f7" ON "collection_item" ("productKind") `,
    );
    await queryRunner.query(
      `CREATE TABLE "collection" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "description" character varying(255), "isPublic" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "completionPolicy" character varying(50) NOT NULL DEFAULT 'base', "completionSnapshot" jsonb, "userId" integer, "masterSetId" character varying, CONSTRAINT "PK_ad3f485bbc99d875491f44d7c85" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "statistics" ("id" SERIAL NOT NULL, "points" integer NOT NULL DEFAULT '0', "aces" integer NOT NULL DEFAULT '0', "faults" integer NOT NULL DEFAULT '0', "cardsPlayed" integer NOT NULL DEFAULT '0', "damageDealt" integer NOT NULL DEFAULT '0', "damageTaken" integer NOT NULL DEFAULT '0', "isWinner" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "playerId" integer, "matchId" integer, CONSTRAINT "PK_c3769cca342381fa827a0f246a7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_fae422a5b9d110fcde85d51eb1" ON "statistics" ("playerId", "matchId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "match_result_proposal" ("id" SERIAL NOT NULL, "playerAScore" integer NOT NULL DEFAULT '0', "playerBScore" integer NOT NULL DEFAULT '0', "status" character varying(50) NOT NULL DEFAULT 'pending_confirmation', "opponentResponse" character varying(50) NOT NULL DEFAULT 'pending', "disputeReason" text, "organizerResolutionReason" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "matchId" integer, "proposerPlayerId" integer, "proposerUserId" integer, "resolvedByUserId" integer, CONSTRAINT "PK_68b427d9834ff8623a2b8ae563d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."online_match_session_status_enum" AS ENUM('WAITING_FOR_DECKS', 'ACTIVE', 'FINISHED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "online_match_session" ("id" SERIAL NOT NULL, "status" "public"."online_match_session_status_enum" NOT NULL DEFAULT 'WAITING_FOR_DECKS', "seed" bigint NOT NULL, "playerADeckId" integer, "playerBDeckId" integer, "winnerPlayerId" integer, "endedReason" character varying, "serializedState" jsonb, "eventLog" jsonb NOT NULL DEFAULT '[]', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "match_id" integer, CONSTRAINT "REL_9a3fe980980546a14f707b99df" UNIQUE ("match_id"), CONSTRAINT "PK_f665d6c4bc7d9e554362b6e5b8b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."match_phase_enum" AS ENUM('qualification', 'round_of_64', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."match_status_enum" AS ENUM('scheduled', 'in_progress', 'finished', 'cancelled', 'forfeit')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."match_bracketside_enum" AS ENUM('winners', 'losers', 'grand_final')`,
    );
    await queryRunner.query(
      `CREATE TABLE "match" ("id" SERIAL NOT NULL, "round" integer NOT NULL DEFAULT '1', "phase" "public"."match_phase_enum" NOT NULL DEFAULT 'qualification', "status" "public"."match_status_enum" NOT NULL DEFAULT 'scheduled', "scheduledDate" TIMESTAMP, "startedAt" TIMESTAMP, "finishedAt" TIMESTAMP, "playerAScore" integer NOT NULL DEFAULT '0', "playerBScore" integer NOT NULL DEFAULT '0', "resultStatus" character varying(50) NOT NULL DEFAULT 'unreported', "tableNumber" integer, "disputedAt" TIMESTAMP WITH TIME ZONE, "confirmedAt" TIMESTAMP WITH TIME ZONE, "notes" character varying, "isBye" boolean NOT NULL DEFAULT false, "bracketSide" "public"."match_bracketside_enum", "bracketPosition" integer, "nextMatchId" integer, "nextSlot" character varying(1), "loserNextMatchId" integer, "loserNextSlot" character varying(1), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tournamentId" integer, "playerAId" integer, "playerBId" integer, "winnerId" integer, CONSTRAINT "PK_92b6c3a6631dd5b24a67c69f69d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tournament_notification_type_enum" AS ENUM('tournament_created', 'registration_opened', 'registration_closed', 'tournament_started', 'round_started', 'match_scheduled', 'results_published', 'tournament_finished', 'payment_reminder', 'general_announcement')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tournament_notification_status_enum" AS ENUM('draft', 'scheduled', 'sent', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "tournament_notification" ("id" SERIAL NOT NULL, "type" "public"."tournament_notification_type_enum" NOT NULL, "title" character varying NOT NULL, "message" text NOT NULL, "status" "public"."tournament_notification_status_enum" NOT NULL DEFAULT 'draft', "scheduledFor" TIMESTAMP, "sentAt" TIMESTAMP, "recipientCount" integer NOT NULL DEFAULT '0', "successCount" integer NOT NULL DEFAULT '0', "failureCount" integer NOT NULL DEFAULT '0', "targetRoles" text, "failureReasons" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tournamentId" integer, CONSTRAINT "PK_92f375020198e21bbbe133aff32" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tournament_organizer_role_enum" AS ENUM('owner', 'admin', 'moderator', 'judge')`,
    );
    await queryRunner.query(
      `CREATE TABLE "tournament_organizer" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "email" character varying NOT NULL, "role" "public"."tournament_organizer_role_enum" NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "phone" character varying, "responsibilities" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tournamentId" integer, "userId" integer, CONSTRAINT "PK_46d0191755063111aa6c50dfbb7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tournament_pricing_type_enum" AS ENUM('free', 'paid', 'tiered')`,
    );
    await queryRunner.query(
      `CREATE TABLE "tournament_pricing" ("id" SERIAL NOT NULL, "type" "public"."tournament_pricing_type_enum" NOT NULL DEFAULT 'free', "basePrice" numeric(10,2) NOT NULL DEFAULT '0', "earlyBirdPrice" numeric(10,2), "earlyBirdDeadline" TIMESTAMP, "lateRegistrationPrice" numeric(10,2), "lateRegistrationStart" TIMESTAMP, "priceDescription" text, "refundable" boolean NOT NULL DEFAULT true, "refundDeadline" TIMESTAMP, "refundFeePercentage" numeric(5,2) NOT NULL DEFAULT '0', "paymentInstructions" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b44f2768d1baf91c75ea204f798" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."registration_payment_method_enum" AS ENUM('cash', 'card', 'bank_transfer', 'paypal', 'stripe', 'other')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."registration_payment_status_enum" AS ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded')`,
    );
    await queryRunner.query(
      `CREATE TABLE "registration_payment" ("id" SERIAL NOT NULL, "amount" numeric(10,2) NOT NULL, "method" "public"."registration_payment_method_enum" NOT NULL, "status" "public"."registration_payment_status_enum" NOT NULL DEFAULT 'pending', "transactionId" character varying, "paymentIntentId" character varying, "paidAt" TIMESTAMP, "refundedAmount" numeric(10,2), "refundedAt" TIMESTAMP, "notes" text, "failureReason" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "registrationId" integer, CONSTRAINT "PK_88103d623670dbaeb963da93849" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tournament_registration_status_enum" AS ENUM('pending', 'confirmed', 'cancelled', 'waitlisted', 'eliminated')`,
    );
    await queryRunner.query(
      `CREATE TABLE "tournament_registration" ("id" SERIAL NOT NULL, "status" "public"."tournament_registration_status_enum" NOT NULL DEFAULT 'pending', "notes" character varying, "eliminatedAt" TIMESTAMP, "eliminatedRound" integer, "droppedAt" TIMESTAMP, "droppedRound" integer, "paidAmount" numeric(10,2), "paymentCompleted" boolean NOT NULL DEFAULT false, "paymentDueDate" TIMESTAMP, "confirmationCode" character varying, "checkedIn" boolean NOT NULL DEFAULT false, "checkedInAt" TIMESTAMP, "registeredAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tournamentId" integer, "playerId" integer, CONSTRAINT "PK_b19e294100cdc953257ed93bbdc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_93700b1dea53d24ab51d456d18" ON "tournament_registration" ("tournamentId", "playerId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tournament_reward_type_enum" AS ENUM('cash', 'product', 'points', 'title', 'other')`,
    );
    await queryRunner.query(
      `CREATE TABLE "tournament_reward" ("id" SERIAL NOT NULL, "position" integer NOT NULL, "name" character varying NOT NULL, "description" text, "type" "public"."tournament_reward_type_enum" NOT NULL, "cashValue" numeric(10,2), "productName" character varying, "productBrand" character varying, "pointsValue" integer, "imageUrl" character varying, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tournamentId" integer, CONSTRAINT "PK_03c6468f32f47dda995e835eb97" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "tournament_deck_snapshot" ("id" SERIAL NOT NULL, "deckName" character varying(255) NOT NULL, "formatId" integer, "ruleVersion" character varying(50) NOT NULL DEFAULT 'STANDARD_2026', "cardsSnapshot" jsonb NOT NULL, "isLocked" boolean NOT NULL DEFAULT false, "legalityStatus" character varying(16) NOT NULL DEFAULT 'unverified', "isValid" boolean NOT NULL DEFAULT true, "revision" integer NOT NULL DEFAULT '1', "overriddenByUserId" integer, "overrideReason" text, "overriddenAt" TIMESTAMP WITH TIME ZONE, "validationErrors" jsonb, "submittedAt" TIMESTAMP NOT NULL DEFAULT now(), "lockedAt" TIMESTAMP WITH TIME ZONE, "tournamentId" integer, "playerId" integer, "userId" integer, "deckId" integer, CONSTRAINT "PK_54e3c98afec4b28798cbbd359bc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_6b69e37222f3463a8581b10971" ON "tournament_deck_snapshot" ("tournamentId", "playerId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tournament_type_enum" AS ENUM('single_elimination', 'double_elimination', 'swiss_system', 'round_robin')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tournament_status_enum" AS ENUM('draft', 'registration_open', 'registration_closed', 'in_progress', 'finished', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "tournament" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" text, "location" character varying, "startDate" TIMESTAMP NOT NULL, "endDate" TIMESTAMP NOT NULL, "type" "public"."tournament_type_enum" NOT NULL DEFAULT 'single_elimination', "status" "public"."tournament_status_enum" NOT NULL DEFAULT 'draft', "isFinished" boolean NOT NULL DEFAULT false, "maxPlayers" integer, "minPlayers" integer, "currentRound" integer DEFAULT '0', "totalRounds" integer DEFAULT '0', "roundStartedAt" TIMESTAMP WITH TIME ZONE, "roundDurationMinutes" integer NOT NULL DEFAULT '50', "roundDeadline" TIMESTAMP WITH TIME ZONE, "isRoundPaused" boolean NOT NULL DEFAULT false, "pausedAt" TIMESTAMP WITH TIME ZONE, "deckSubmissionDeadline" TIMESTAMP WITH TIME ZONE, "deckVisibilityPolicy" character varying(50) NOT NULL DEFAULT 'public_on_start', "registrationDeadline" TIMESTAMP, "allowLateRegistration" boolean DEFAULT true, "requiresApproval" boolean NOT NULL DEFAULT false, "rules" text, "additionalInfo" text, "ageRestrictionMin" integer, "ageRestrictionMax" integer, "allowedFormats" text, "isPublic" boolean NOT NULL DEFAULT true, "isExternal" boolean NOT NULL DEFAULT false, "grandFinalReset" boolean NOT NULL DEFAULT true, "externalRegistrationUrl" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "pricingId" integer, CONSTRAINT "REL_6afd9975e05f47a4e57224c3ad" UNIQUE ("pricingId"), CONSTRAINT "PK_449f912ba2b62be003f0c22e767" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "ranking" ("id" SERIAL NOT NULL, "rank" integer NOT NULL, "points" integer NOT NULL DEFAULT '0', "wins" integer NOT NULL DEFAULT '0', "losses" integer NOT NULL DEFAULT '0', "draws" integer NOT NULL DEFAULT '0', "winRate" numeric(5,2) NOT NULL DEFAULT '0', "omwPercentage" numeric(6,3) NOT NULL DEFAULT '0', "gwPercentage" numeric(6,3) NOT NULL DEFAULT '0', "ogwPercentage" numeric(6,3) NOT NULL DEFAULT '0', "byesCount" integer NOT NULL DEFAULT '0', "isProvisional" boolean NOT NULL DEFAULT true, "tiebreakExplanation" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tournamentId" integer, "playerId" integer, CONSTRAINT "PK_bf82b8f271e50232e6a3fcb09a9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_9f91b99b9940b259dd6417cfd6" ON "ranking" ("tournamentId", "playerId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "player" ("id" SERIAL NOT NULL, "xp" integer NOT NULL DEFAULT '0', "level" integer NOT NULL DEFAULT '1', "elo" integer NOT NULL DEFAULT '1000', "userId" integer, CONSTRAINT "REL_7687919bf054bf262c669d3ae2" UNIQUE ("userId"), CONSTRAINT "PK_65edadc946a7faf4b638d5e8885" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_follow" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "follower_id" integer, "followed_id" integer, CONSTRAINT "PK_9dcfbeea350dbb23069bea9d7eb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_277fd4b1b41f060b61f5e52cdf" ON "user_follow" ("follower_id", "followed_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "support_message" ("id" SERIAL NOT NULL, "message" text NOT NULL, "isStaff" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "supportTicketId" integer, "userId" integer, CONSTRAINT "PK_ffc800a254f6e98e97d90fcefa8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "cart_item" ("id" SERIAL NOT NULL, "quantity" integer NOT NULL DEFAULT '1', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "cart_id" integer NOT NULL, "listing_id" integer NOT NULL, CONSTRAINT "PK_bd94725aa84f8cf37632bcde997" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_1bc2cfe7144dfc695085b5f292" ON "cart_item" ("cart_id", "listing_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."listing_productkind_enum" AS ENUM('card', 'sealed')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."listing_currency_enum" AS ENUM('EUR', 'USD', 'GBP', 'JPY', 'CHF', 'CAD')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."listing_status_enum" AS ENUM('active', 'inactive')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."listing_cardstate_enum" AS ENUM('NM', 'EX', 'GD', 'LP', 'PL', 'Poor')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."listing_sealedcondition_enum" AS ENUM('sealed', 'box_damaged', 'opened_resealed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "listing" ("id" SERIAL NOT NULL, "productKind" "public"."listing_productkind_enum" NOT NULL DEFAULT 'card', "isInventoryBacked" boolean NOT NULL DEFAULT false, "price" numeric(10,2) NOT NULL, "currency" "public"."listing_currency_enum" NOT NULL, "quantityAvailable" integer NOT NULL DEFAULT '1', "inventoryReservedQuantity" integer NOT NULL DEFAULT '0', "reservationRevision" integer NOT NULL DEFAULT '0', "shippingCost" numeric(10,2) NOT NULL DEFAULT '0', "handlingTimeDays" integer NOT NULL DEFAULT '3', "status" "public"."listing_status_enum" NOT NULL DEFAULT 'active', "cardState" "public"."listing_cardstate_enum", "sealedCondition" "public"."listing_sealedcondition_enum", "description" character varying, "photoUrls" jsonb, "defects" jsonb, "defectDescription" text, "language" character varying DEFAULT 'fr', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "expiresAt" TIMESTAMP, "deletedAt" TIMESTAMP, "seller_id" integer NOT NULL, "card_id" uuid, "sealed_product_id" character varying, "inventory_item_id" integer, CONSTRAINT "PK_381d45ebb8692362c156d6b87d7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3794cba3b8a6282d516a38b5a2" ON "listing" ("inventory_item_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c196346d70ae94a19009a46326" ON "listing" ("productKind") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b6a60deaa76e802dea35dc68d3" ON "listing" ("sealed_product_id", "currency") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d8719eb87ca10e394d0a200b14" ON "listing" ("card_id", "currency", "cardState") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ca2d1176749233c771f6f0e8d3" ON "listing" ("expiresAt", "quantityAvailable") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d371b513022e5cfe23db8c1b23" ON "listing" ("price") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."refund_operation_status_enum" AS ENUM('pending', 'succeeded', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "refund_operation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "amount" numeric(10,2) NOT NULL, "currency" character varying(10) NOT NULL DEFAULT 'EUR', "reason" text, "status" "public"."refund_operation_status_enum" NOT NULL DEFAULT 'pending', "providerRefundId" character varying(128), "requestKey" character varying(128), "fingerprint" character varying(64), "paymentIntentId" character varying(128), "providerAttemptedAt" TIMESTAMP WITH TIME ZONE, "failureReason" text, "orderStatusBeforeFullRefund" character varying(32), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "order_id" integer NOT NULL, "created_by_id" integer, CONSTRAINT "PK_1a08520950a44b379644087f893" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1b0fb36f9f88dd607b200e594a" ON "refund_operation" ("order_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5140278c84cf34f767faf818a3" ON "refund_operation" ("providerRefundId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_refund_order_request_key" ON "refund_operation" ("order_id", "requestKey") `,
    );
    await queryRunner.query(
      `CREATE TABLE "refund_line" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "quantity" integer NOT NULL DEFAULT '1', "amount" numeric(10,2) NOT NULL, "shippingAmount" numeric(10,2) NOT NULL DEFAULT '0', "refund_operation_id" uuid NOT NULL, "order_item_id" integer NOT NULL, CONSTRAINT "PK_c343da1712d712b778a7b685cf3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_031f075c5b35375aa8817ba974" ON "refund_line" ("refund_operation_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6df8794299f120c81b84585514" ON "refund_line" ("order_item_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."return_item_status_enum" AS ENUM('requested', 'approved', 'in_transit', 'received', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."return_item_disposition_enum" AS ENUM('restock', 'damaged', 'discarded', 'no_return_required')`,
    );
    await queryRunner.query(
      `CREATE TABLE "return_item" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "quantity" integer NOT NULL DEFAULT '1', "reason" text NOT NULL, "status" "public"."return_item_status_enum" NOT NULL DEFAULT 'requested', "disposition" "public"."return_item_disposition_enum" NOT NULL DEFAULT 'no_return_required', "dispositionRevision" integer NOT NULL DEFAULT '0', "restockedQuantity" integer NOT NULL DEFAULT '0', "receivedAt" TIMESTAMP, "disposedAt" TIMESTAMP, "notes" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "order_item_id" integer NOT NULL, CONSTRAINT "PK_8107861535dc7f65333a1f1a3de" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_372b7bcda8abc00fff75d17abf" ON "return_item" ("order_item_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."order_item_productkind_enum" AS ENUM('card', 'sealed')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."order_item_fulfillmentstatus_enum" AS ENUM('to_ship', 'preparing', 'shipped', 'delivered', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "order_item" ("id" SERIAL NOT NULL, "unitPrice" numeric(10,2) NOT NULL, "quantity" integer NOT NULL, "shippingCost" numeric(10,2) NOT NULL DEFAULT '0', "handlingTimeDays" integer NOT NULL DEFAULT '3', "productKind" "public"."order_item_productkind_enum" NOT NULL DEFAULT 'card', "productName" character varying(255) NOT NULL DEFAULT '', "productImage" character varying(512), "productCondition" character varying(64), "productLanguage" character varying(16), "productSetName" character varying(255), "sellerName" character varying(255) NOT NULL DEFAULT '', "fulfillmentStatus" "public"."order_item_fulfillmentstatus_enum" NOT NULL DEFAULT 'to_ship', "carrier" character varying(64), "trackingNumber" character varying(128), "shippedAt" TIMESTAMP, "deliveredAt" TIMESTAMP, "receiptConfirmedAt" TIMESTAMP, "listingPhotoUrls" jsonb, "listingDefects" jsonb, "order_id" integer NOT NULL, "listing_id" integer, "seller_id" integer, CONSTRAINT "PK_d01158fe15b1ead5c26fd7f4e90" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_910e0dc6101bb5d3da1ff20fa5" ON "order_item" ("seller_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payment_transaction_method_enum" AS ENUM('CreditCard', 'PayPal', 'BankTransfer', 'Crypto')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payment_transaction_status_enum" AS ENUM('Initiated', 'Completed', 'Failed', 'Refunded')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payment_transaction_currency_enum" AS ENUM('EUR', 'USD', 'GBP', 'JPY', 'CHF', 'CAD')`,
    );
    await queryRunner.query(
      `CREATE TABLE "payment_transaction" ("id" SERIAL NOT NULL, "method" "public"."payment_transaction_method_enum" NOT NULL, "status" "public"."payment_transaction_status_enum" NOT NULL, "transactionId" character varying(255), "amount" numeric(12,2) NOT NULL, "currency" "public"."payment_transaction_currency_enum", "compensationRequiredAt" TIMESTAMP WITH TIME ZONE, "compensationReason" text, "compensatedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "order_id" integer NOT NULL, CONSTRAINT "PK_82c3470854cf4642dfb0d7150cd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_66da32c33acd364a777ac44f51" ON "payment_transaction" ("transactionId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."order_status_enum" AS ENUM('Pending', 'Paid', 'Shipped', 'Delivered', 'Cancelled', 'Refunded')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."order_currency_enum" AS ENUM('EUR', 'USD', 'GBP', 'JPY', 'CHF', 'CAD')`,
    );
    await queryRunner.query(
      `CREATE TABLE "order" ("id" SERIAL NOT NULL, "totalAmount" numeric(12,2) NOT NULL, "shippingAmount" numeric(12,2) NOT NULL DEFAULT '0', "status" "public"."order_status_enum" NOT NULL, "currency" "public"."order_currency_enum" NOT NULL, "shippingAddress" text NOT NULL DEFAULT '', "reservationExpiresAt" TIMESTAMP, "checkoutAttemptKey" character varying(128), "checkoutFingerprint" character varying(64), "stockReleased" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "buyer_id" integer NOT NULL, CONSTRAINT "PK_1031171c13130102495201e3e20" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7a9573d6a1fb982772a9123320" ON "order" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7396ae8fcb6da3e334e6121129" ON "order" ("checkoutAttemptKey") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."support_ticket_status_enum" AS ENUM('opened', 'closed')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."support_ticket_claimcategory_enum" AS ENUM('damaged_item', 'missing_item', 'wrong_item', 'non_delivery', 'general')`,
    );
    await queryRunner.query(
      `CREATE TABLE "support_ticket" ("id" SERIAL NOT NULL, "subject" character varying(100) NOT NULL, "message" text NOT NULL, "status" "public"."support_ticket_status_enum" NOT NULL DEFAULT 'opened', "claimCategory" "public"."support_ticket_claimcategory_enum", "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer, "order_id" integer, "order_item_id" integer, CONSTRAINT "PK_506b4b9f579fb3adbaebe3950c2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_022e311f95d85b38583b2056ba" ON "support_ticket" ("order_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6a4514f87dffeead72f116b723" ON "support_ticket" ("order_item_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "notification" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, "body" text NOT NULL, "isRead" boolean NOT NULL DEFAULT false, "type" character varying NOT NULL DEFAULT 'info', "data" jsonb, "translationKey" character varying, "translationParams" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer, CONSTRAINT "PK_705b6c7cdf9b2c2ff7ac7872cb7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "device_token" ("id" SERIAL NOT NULL, "token" character varying NOT NULL, "platform" character varying NOT NULL DEFAULT 'expo', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer, CONSTRAINT "UQ_d959c11311d3002e4bb10d9edbd" UNIQUE ("token"), CONSTRAINT "PK_592ce89b9ea1a268d6140f60422" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."auth_identity_provider_enum" AS ENUM('google', 'apple', 'discord')`,
    );
    await queryRunner.query(
      `CREATE TABLE "auth_identity" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "provider" "public"."auth_identity_provider_enum" NOT NULL, "providerSubject" character varying(255) NOT NULL, "providerEmail" character varying(255), "providerEmailVerified" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3eeca3f18e671626194e553eb89" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_46b5bb04957ca7f52068168639" ON "auth_identity" ("provider", "providerSubject") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_role_enum" AS ENUM('admin', 'user', 'moderator')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_preferredcurrency_enum" AS ENUM('EUR', 'USD', 'GBP', 'JPY', 'CHF', 'CAD')`,
    );
    await queryRunner.query(
      `CREATE TABLE "user" ("id" SERIAL NOT NULL, "email" character varying NOT NULL, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "password" character varying, "avatarUrl" character varying, "role" "public"."user_role_enum" NOT NULL DEFAULT 'user', "preferredCurrency" "public"."user_preferredcurrency_enum" NOT NULL DEFAULT 'EUR', "preferredLocale" character varying(10) NOT NULL DEFAULT 'fr', "isPro" boolean NOT NULL DEFAULT false, "isActive" boolean NOT NULL DEFAULT true, "emailVerified" boolean NOT NULL DEFAULT false, "refreshToken" character varying, "previousRefreshToken" character varying, "previousRefreshTokenExpiresAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_cart" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "user_id" integer NOT NULL, CONSTRAINT "REL_f47da2f31dce6d741ab6c106f5" UNIQUE ("user_id"), CONSTRAINT "PK_c506b756aa0682057bf66bdb3d3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "translation" ("id" SERIAL NOT NULL, "locale" character varying(10) NOT NULL, "key" character varying(255) NOT NULL, "value" text NOT NULL, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7aef875e43ab80d34a0cdd39c70" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_27277f42cb84aadded5d72dacc" ON "translation" ("locale", "key") `,
    );
    await queryRunner.query(
      `CREATE TABLE "tournament_deck_snapshot_revision" ("id" SERIAL NOT NULL, "revision" integer NOT NULL, "cardsSnapshot" jsonb NOT NULL, "legalityStatus" character varying(16) NOT NULL, "validationErrors" jsonb, "ruleVersion" character varying(50) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "snapshot_id" integer NOT NULL, "submitted_by_user_id" integer, CONSTRAINT "UQ_d10df3b19d567b3c0fabcee75d4" UNIQUE ("snapshot_id", "revision"), CONSTRAINT "PK_132ca6423157069cae05e509d27" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dca5d5a1c59244f208f84194ba" ON "tournament_deck_snapshot_revision" ("snapshot_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "ranked_match_history" ("id" SERIAL NOT NULL, "casualSessionId" integer, "matchId" integer, "winnerEloBefore" integer NOT NULL, "winnerEloAfter" integer NOT NULL, "loserEloBefore" integer NOT NULL, "loserEloAfter" integer NOT NULL, "delta" integer NOT NULL, "isDraw" boolean NOT NULL DEFAULT false, "reversedAt" TIMESTAMP WITH TIME ZONE, "reversalReason" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "winnerId" integer, "loserId" integer, CONSTRAINT "PK_33561a92973ef0b865df28274f2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ranked_history_casual_session_id" ON "ranked_match_history" ("casualSessionId") WHERE "casualSessionId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ranked_history_match_id" ON "ranked_match_history" ("matchId") WHERE "matchId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ranked_history_created_at" ON "ranked_match_history" ("createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b117f7afefc29ae9e846ca2d2a" ON "ranked_match_history" ("loserId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cb2b168ca5a69ebfc712a5b199" ON "ranked_match_history" ("winnerId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "processed_event" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "consumer" character varying(128) NOT NULL, "eventId" character varying(64) NOT NULL, "eventType" character varying(128) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_8a502ed7a9a0719b8562ddd8636" UNIQUE ("consumer", "eventId"), CONSTRAINT "PK_1d63356c8b4bb356575f85b629d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_276e1594ffc073ea1605951715" ON "processed_event" ("eventId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."outbox_event_status_enum" AS ENUM('pending', 'processed', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "outbox_event" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "eventType" character varying(128) NOT NULL, "aggregateType" character varying(64) NOT NULL, "aggregateId" character varying(128) NOT NULL, "payload" jsonb NOT NULL, "status" "public"."outbox_event_status_enum" NOT NULL DEFAULT 'pending', "retryCount" integer NOT NULL DEFAULT '0', "lastError" text, "processedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_cc0c9e40998e45ecfc5e313429d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_50b1244e297d9dcc9894ba32a7" ON "outbox_event" ("eventType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7742b10fde39bd407bd9c162a4" ON "outbox_event" ("aggregateId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0595eb8ed631c93d70bf1d0f0a" ON "outbox_event" ("status") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."training_match_session_status_enum" AS ENUM('ACTIVE', 'FINISHED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."training_match_session_aidifficulty_enum" AS ENUM('easy', 'standard')`,
    );
    await queryRunner.query(
      `CREATE TABLE "training_match_session" ("id" SERIAL NOT NULL, "status" "public"."training_match_session_status_enum" NOT NULL DEFAULT 'ACTIVE', "seed" bigint NOT NULL, "playerDeckId" integer NOT NULL, "aiDeckPresetId" character varying(100) NOT NULL, "aiDifficulty" "public"."training_match_session_aidifficulty_enum" NOT NULL, "serializedState" jsonb NOT NULL, "eventLog" jsonb NOT NULL DEFAULT '[]', "winnerSide" character varying, "endedReason" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer, CONSTRAINT "PK_048189a70b51f91d54898f0b8f5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."casual_match_session_status_enum" AS ENUM('WAITING_FOR_DECKS', 'ACTIVE', 'FINISHED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "casual_match_session" ("id" SERIAL NOT NULL, "status" "public"."casual_match_session_status_enum" NOT NULL DEFAULT 'WAITING_FOR_DECKS', "seed" bigint NOT NULL, "isRanked" boolean NOT NULL DEFAULT false, "playerADeckId" integer, "playerBDeckId" integer, "winnerUserId" integer, "endedReason" character varying, "serializedState" jsonb, "eventLog" jsonb NOT NULL DEFAULT '[]', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "playerAId" integer, "playerBId" integer, CONSTRAINT "PK_3936ad6d5be291d4f2e1c663612" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."seller_settlement_account_currency_enum" AS ENUM('EUR', 'USD', 'GBP', 'JPY', 'CHF', 'CAD')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."seller_settlement_account_status_enum" AS ENUM('pending_onboarding', 'active', 'restricted', 'suspended')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."seller_settlement_account_payoutmethod_enum" AS ENUM('bank_transfer', 'stripe_connect', 'manual')`,
    );
    await queryRunner.query(
      `CREATE TABLE "seller_settlement_account" ("id" SERIAL NOT NULL, "currency" "public"."seller_settlement_account_currency_enum" NOT NULL DEFAULT 'EUR', "status" "public"."seller_settlement_account_status_enum" NOT NULL DEFAULT 'pending_onboarding', "payoutMethod" "public"."seller_settlement_account_payoutmethod_enum" NOT NULL DEFAULT 'bank_transfer', "payoutDetails" jsonb, "balancePending" numeric(12,2) NOT NULL DEFAULT '0', "balanceAvailable" numeric(12,2) NOT NULL DEFAULT '0', "balancePaidOut" numeric(12,2) NOT NULL DEFAULT '0', "balanceOnHold" numeric(12,2) NOT NULL DEFAULT '0', "minimumPayoutAmount" numeric(10,2) NOT NULL DEFAULT '10', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "seller_id" integer NOT NULL, CONSTRAINT "UQ_c33561bd558a7e1ec3e64f32de0" UNIQUE ("seller_id", "currency"), CONSTRAINT "PK_aefe22d745a87876cfc79890ec9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2caf69fcf6f9759391019595e1" ON "seller_settlement_account" ("seller_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "seller_review" ("id" SERIAL NOT NULL, "rating" integer NOT NULL, "comment" text, "verifiedPurchase" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "seller_id" integer NOT NULL, "buyer_id" integer NOT NULL, "order_id" integer NOT NULL, "order_item_id" integer NOT NULL, CONSTRAINT "REL_d78f82aff993cdfc83c54c09a1" UNIQUE ("order_item_id"), CONSTRAINT "PK_b8ee29da9629262ff54f46a5e21" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ef04223210b1b8e824e958cd25" ON "seller_review" ("seller_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."seller_payout_currency_enum" AS ENUM('EUR', 'USD', 'GBP', 'JPY', 'CHF', 'CAD')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."seller_payout_status_enum" AS ENUM('requested', 'processing', 'completed', 'failed', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."seller_payout_payoutmethod_enum" AS ENUM('bank_transfer', 'stripe_connect', 'manual')`,
    );
    await queryRunner.query(
      `CREATE TABLE "seller_payout" ("id" SERIAL NOT NULL, "currency" "public"."seller_payout_currency_enum" NOT NULL DEFAULT 'EUR', "amount" numeric(12,2) NOT NULL, "status" "public"."seller_payout_status_enum" NOT NULL DEFAULT 'requested', "reference" character varying(100) NOT NULL, "requestKey" character varying(128), "providerAccountId" character varying(128), "providerTransferId" character varying(128), "providerAttemptedAt" TIMESTAMP WITH TIME ZONE, "transactionReference" character varying(190), "payoutMethod" "public"."seller_payout_payoutmethod_enum" NOT NULL DEFAULT 'bank_transfer', "payoutDestinationSnapshot" jsonb, "processedAt" TIMESTAMP WITH TIME ZONE, "completedAt" TIMESTAMP WITH TIME ZONE, "failureReason" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "seller_id" integer NOT NULL, "account_id" integer, CONSTRAINT "UQ_9a127da476606b43084da3d9b13" UNIQUE ("reference"), CONSTRAINT "PK_a6450c2e544e7e1486df7c38173" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_afd56196906138d07e472f7cbd" ON "seller_payout" ("seller_id", "status") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."seller_allocation_currency_enum" AS ENUM('EUR', 'USD', 'GBP', 'JPY', 'CHF', 'CAD')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."seller_allocation_status_enum" AS ENUM('pending_delivery', 'available', 'in_payout', 'paid', 'disputed_hold', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "seller_allocation" ("id" SERIAL NOT NULL, "currency" "public"."seller_allocation_currency_enum" NOT NULL DEFAULT 'EUR', "grossAmount" numeric(12,2) NOT NULL DEFAULT '0', "shippingAmount" numeric(12,2) NOT NULL DEFAULT '0', "commissionRate" numeric(5,4) NOT NULL DEFAULT 0.05, "commissionAmount" numeric(12,2) NOT NULL DEFAULT '0', "netAmount" numeric(12,2) NOT NULL DEFAULT '0', "refundedAmount" numeric(12,2) NOT NULL DEFAULT '0', "commissionReversedAmount" numeric(12,2) NOT NULL DEFAULT '0', "status" "public"."seller_allocation_status_enum" NOT NULL DEFAULT 'pending_delivery', "eligibleAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "order_id" integer NOT NULL, "seller_id" integer NOT NULL, CONSTRAINT "PK_c5f1c4c521aaa6f8970778f45b5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2c83413ac7dc1b321ebfa2aa88" ON "seller_allocation" ("seller_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fc2dc1239741227641972bb72a" ON "seller_allocation" ("order_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."seller_ledger_entry_currency_enum" AS ENUM('EUR', 'USD', 'GBP', 'JPY', 'CHF', 'CAD')`,
    );
    await queryRunner.query(
      `CREATE TABLE "seller_ledger_entry" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "currency" "public"."seller_ledger_entry_currency_enum" NOT NULL DEFAULT 'EUR', "kind" character varying(40) NOT NULL, "deltaPendingCents" integer NOT NULL DEFAULT '0', "deltaAvailableCents" integer NOT NULL DEFAULT '0', "deltaOnHoldCents" integer NOT NULL DEFAULT '0', "deltaPaidOutCents" integer NOT NULL DEFAULT '0', "refundOperationId" character varying(64), "requestKey" character varying(160) NOT NULL, "reason" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "account_id" integer NOT NULL, "allocation_id" integer, "payout_id" integer, CONSTRAINT "UQ_3639b0a75d26ecf6dea55e455fc" UNIQUE ("account_id", "requestKey"), CONSTRAINT "PK_33ee251a5e8a104635f4b7253df" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ed9234025df3cc55c2a04c6ca0" ON "seller_ledger_entry" ("account_id", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."sealed_events_eventtype_enum" AS ENUM('view', 'search', 'favorite', 'add_to_cart', 'sale')`,
    );
    await queryRunner.query(
      `CREATE TABLE "sealed_events" ("id" SERIAL NOT NULL, "eventType" "public"."sealed_events_eventtype_enum" NOT NULL, "sessionId" character varying(255), "ipAddress" character varying(45), "userAgent" character varying(255), "context" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "sealed_product_id" character varying NOT NULL, "user_id" integer, CONSTRAINT "PK_d4cf7d611c418b338ee194679a2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1f82010ed37847b86f4e71c516" ON "sealed_events" ("createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7384438a58da315cf9d71398c4" ON "sealed_events" ("sealed_product_id", "eventType", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_231120583be88b607268945c0a" ON "sealed_events" ("sealed_product_id", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE "receipt_import" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "quantity" integer NOT NULL DEFAULT '1', "requestKey" character varying(160) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "order_item_id" integer NOT NULL, "buyer_id" integer NOT NULL, "collection_id" integer, "collection_item_id" integer, CONSTRAINT "UQ_e9c28e50888e1e24f846821b702" UNIQUE ("order_item_id", "requestKey"), CONSTRAINT "PK_58d09e767d16fa72a6fa4bb9eae" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0e820576118e052a16520f7402" ON "receipt_import" ("order_item_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."price_history_currency_enum" AS ENUM('EUR', 'USD', 'GBP', 'JPY', 'CHF', 'CAD')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."price_history_cardstate_enum" AS ENUM('NM', 'EX', 'GD', 'LP', 'PL', 'Poor')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."price_history_sealedcondition_enum" AS ENUM('sealed', 'box_damaged', 'opened_resealed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "price_history" ("id" SERIAL NOT NULL, "price" numeric(10,2) NOT NULL, "currency" "public"."price_history_currency_enum" NOT NULL, "cardState" "public"."price_history_cardstate_enum", "sealedCondition" "public"."price_history_sealedcondition_enum", "quantityAvailable" integer NOT NULL DEFAULT '1', "recordedAt" TIMESTAMP NOT NULL DEFAULT now(), "card_id" uuid, "sealed_product_id" character varying, CONSTRAINT "PK_e41e25472373d4b574b153229e9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_403bb774823570b7f7ed707859" ON "price_history" ("sealed_product_id", "recordedAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1afc7faf35ec407d29c5673619" ON "price_history" ("card_id", "cardState", "currency") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f9f79d32478975a2c200ee01bf" ON "price_history" ("card_id", "recordedAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE "inventory_movement" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "kind" character varying(40) NOT NULL, "deltaAvailable" integer NOT NULL DEFAULT '0', "deltaReserved" integer NOT NULL DEFAULT '0', "deltaSold" integer NOT NULL DEFAULT '0', "requestKey" character varying(160) NOT NULL, "reason" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "collection_item_id" integer NOT NULL, "listing_id" integer, "order_item_id" integer, "return_item_id" uuid, CONSTRAINT "UQ_091e6fa099e885c7f90bd787456" UNIQUE ("collection_item_id", "requestKey"), CONSTRAINT "PK_e17362693c889da517444ad8fb5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a65611a8d7b44b956f259e441a" ON "inventory_movement" ("collection_item_id", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE "card_popularity_metrics" ("id" SERIAL NOT NULL, "date" date NOT NULL, "views" integer NOT NULL DEFAULT '0', "searches" integer NOT NULL DEFAULT '0', "favorites" integer NOT NULL DEFAULT '0', "addsToCart" integer NOT NULL DEFAULT '0', "sales" integer NOT NULL DEFAULT '0', "listingCount" integer NOT NULL DEFAULT '0', "minPrice" numeric(10,2), "avgPrice" numeric(10,2), "popularityScore" numeric(10,4) NOT NULL DEFAULT '0', "trendScore" numeric(10,4) NOT NULL DEFAULT '0', "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "card_id" uuid NOT NULL, CONSTRAINT "UQ_a8173d769f8b2b54052c9382db6" UNIQUE ("card_id", "date"), CONSTRAINT "PK_5cd3c811cd82ace4bfac80250df" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8c1cc135b9431b5455719a9564" ON "card_popularity_metrics" ("trendScore") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_369c008da4618ee4e62ce1126b" ON "card_popularity_metrics" ("popularityScore") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_809d6b5fd63227fa15b207c57d" ON "card_popularity_metrics" ("date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a8173d769f8b2b54052c9382db" ON "card_popularity_metrics" ("card_id", "date") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."card_events_eventtype_enum" AS ENUM('view', 'search', 'favorite', 'add_to_cart', 'sale')`,
    );
    await queryRunner.query(
      `CREATE TABLE "card_events" ("id" SERIAL NOT NULL, "eventType" "public"."card_events_eventtype_enum" NOT NULL, "sessionId" character varying(255), "ipAddress" character varying(45), "userAgent" character varying(255), "context" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "card_id" uuid NOT NULL, "user_id" integer, CONSTRAINT "PK_7bfd654afc981cbefb38a5ca2b0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_92a45b9d3386f9e0d49af18f6e" ON "card_events" ("createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b16eeda005578af57d582c7d71" ON "card_events" ("card_id", "eventType", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6c231ee526aff90347a1778c03" ON "card_events" ("card_id", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE "faq" ("id" SERIAL NOT NULL, "question" character varying(255) NOT NULL, "answer" text NOT NULL, "category" character varying(50) NOT NULL, "order" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d6f5a52b1a96dd8d0591f9fbc47" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "saved_deck" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer, "deckId" integer, CONSTRAINT "UQ_86481ece163c51d813d0c251a74" UNIQUE ("userId", "deckId"), CONSTRAINT "PK_b89cd43530a6eb0e94f8fd868dc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "deck_share" ("id" SERIAL NOT NULL, "code" character varying(12) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "expiresAt" TIMESTAMP, "deckId" integer, CONSTRAINT "UQ_86c3ad103d0b8a8739a029596b8" UNIQUE ("code"), CONSTRAINT "PK_3dd00f68c9a30d82d214e78c5f8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "collection_bulk_operation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "operationId" character varying(128) NOT NULL, "kind" character varying(32) NOT NULL, "mode" character varying(32), "status" character varying(16) NOT NULL DEFAULT 'applied', "summary" jsonb, "undoneAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "collection_id" integer NOT NULL, "user_id" integer, CONSTRAINT "UQ_dfaa3446c1a6ae54c3a8eb81cd4" UNIQUE ("collection_id", "operationId"), CONSTRAINT "PK_6722eaf582cfc59d8f11fb37561" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_145f000c8fd0c4a1f4e8519e12" ON "collection_bulk_operation" ("collection_id", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE "collection_bulk_operation_line" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created" boolean NOT NULL DEFAULT false, "quantityDelta" integer NOT NULL DEFAULT '0', "availableDelta" integer NOT NULL DEFAULT '0', "previousQuantity" integer, "previousAvailable" integer, "previousCollectionId" character varying(64), "snapshot" jsonb, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "operation_id" uuid NOT NULL, "collection_item_id" integer, CONSTRAINT "PK_ca58596fd788cce2f735b785b2a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_638f3258e95613febaa6a13827" ON "collection_bulk_operation_line" ("operation_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."challenge_type_enum" AS ENUM('DAILY', 'WEEKLY')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."challenge_actiontype_enum" AS ENUM('ADD_CARD', 'VIEW_DECK', 'JOIN_TOURNAMENT', 'WIN_MATCH', 'ADD_FRIEND')`,
    );
    await queryRunner.query(
      `CREATE TABLE "challenge" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, "description" text NOT NULL, "type" "public"."challenge_type_enum" NOT NULL DEFAULT 'DAILY', "actionType" "public"."challenge_actiontype_enum" NOT NULL, "targetValue" integer NOT NULL DEFAULT '1', "rewardXp" integer NOT NULL DEFAULT '50', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5f31455ad09ea6a836a06871b7a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "active_challenge" ("id" SERIAL NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "challengeId" integer, CONSTRAINT "PK_b63b6adc91869d85f05945b89fb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_challenge" ("id" SERIAL NOT NULL, "progress" integer NOT NULL DEFAULT '0', "isCompleted" boolean NOT NULL DEFAULT false, "isClaimed" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer, "activeChallengeId" integer, CONSTRAINT "UQ_d3278e8ac88829fb2318e4f583d" UNIQUE ("userId", "activeChallengeId"), CONSTRAINT "PK_f17ac7d57d22c067e61d6b64aad" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "audit_event" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "actorId" integer, "actorRole" character varying(64), "targetType" character varying(64) NOT NULL, "targetId" character varying(128) NOT NULL, "action" character varying(64) NOT NULL, "reason" text, "correlationId" character varying(128), "beforeState" jsonb, "afterState" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_481efbe8b0a403efe3f47a6528f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2b778fde3afc04ec59f83e29fa" ON "audit_event" ("actorId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7ffa72fd25c0e587644717f38d" ON "audit_event" ("targetType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4117dc292c4972e4b400d062fc" ON "audit_event" ("targetId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."article_status_enum" AS ENUM('draft', 'published')`,
    );
    await queryRunner.query(
      `CREATE TABLE "article" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, "slug" character varying(180) NOT NULL, "excerpt" text, "image" character varying, "link" character varying, "content" text, "status" "public"."article_status_enum" NOT NULL DEFAULT 'draft', "locale" character varying(10) NOT NULL DEFAULT 'fr', "metaTitle" character varying, "metaDescription" text, "authorId" integer, "publishedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_0ab85f4be07b22d79906671d72f" UNIQUE ("slug"), CONSTRAINT "PK_40808690eb7b915046558c0f81b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "tournament_players" ("tournament_id" integer NOT NULL, "player_id" integer NOT NULL, CONSTRAINT "PK_0aa209ac4ea7d2a95b1f6639ff5" PRIMARY KEY ("tournament_id", "player_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_76e731e4992a85050d3cb75b2f" ON "tournament_players" ("tournament_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a3c6b193bf4b3a4ecdf7e4cf40" ON "tournament_players" ("player_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "user_badge" ADD CONSTRAINT "FK_d988bb483f614b0541c6de7b3ce" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_badge" ADD CONSTRAINT "FK_b0992699126a527b53d0b8d9d86" FOREIGN KEY ("badge_id") REFERENCES "badge"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "deck" ADD CONSTRAINT "FK_09e8a376bab70b9737c839b2e24" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "deck" ADD CONSTRAINT "FK_15bdcf90c4f507fe4e611d668b6" FOREIGN KEY ("formatId") REFERENCES "deck_format"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "deck" ADD CONSTRAINT "FK_41ff9556cef72b8c3c53ed63872" FOREIGN KEY ("coverCardId") REFERENCES "card"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "deck_card" ADD CONSTRAINT "FK_a20f5d327bae5df77fde66d741d" FOREIGN KEY ("deckId") REFERENCES "deck"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "deck_card" ADD CONSTRAINT "FK_fa2d019b620495815cc90471b5f" FOREIGN KEY ("cardId") REFERENCES "card"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "pokemon_serie_translation" ADD CONSTRAINT "FK_88538587e4fbbe9e410fc31a24f" FOREIGN KEY ("serie_id") REFERENCES "pokemon_serie"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sealed_product_locale" ADD CONSTRAINT "FK_ed7ef36f70cac2b2e8babb4453d" FOREIGN KEY ("sealed_product_id") REFERENCES "sealed_product"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sealed_product" ADD CONSTRAINT "FK_738ca589d5749130023b30f5565" FOREIGN KEY ("pokemon_set_id") REFERENCES "pokemon_set"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "pokemon_set_translation" ADD CONSTRAINT "FK_d2b4b38d20e0094a714d1e2d818" FOREIGN KEY ("set_id") REFERENCES "pokemon_set"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "pokemon_set" ADD CONSTRAINT "FK_8357ce6c6b10ca5e45c7d8936a9" FOREIGN KEY ("serieId") REFERENCES "pokemon_serie"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "card_translation" ADD CONSTRAINT "FK_13cd196d3c2588ddc6f6c49ef60" FOREIGN KEY ("card_id") REFERENCES "card"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "pokemon_card_details" ADD CONSTRAINT "FK_6ba7b41e65049d07369b3dad0ef" FOREIGN KEY ("card_id") REFERENCES "card"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "card" ADD CONSTRAINT "FK_5c54def213ff8487c2bf6a06d40" FOREIGN KEY ("setId") REFERENCES "pokemon_set"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "collection_item" ADD CONSTRAINT "FK_33f1e3ce5cbc324f18fecde19c1" FOREIGN KEY ("collectionId") REFERENCES "collection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "collection_item" ADD CONSTRAINT "FK_ec5d99cfe48a87d32591efb94cb" FOREIGN KEY ("pokemonCardId") REFERENCES "card"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "collection_item" ADD CONSTRAINT "FK_0aaa202ef25fcca3738081ae420" FOREIGN KEY ("sealedProductId") REFERENCES "sealed_product"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "collection_item" ADD CONSTRAINT "FK_534ffeeaa5e4543133242f1cfce" FOREIGN KEY ("cardStateId") REFERENCES "card_state"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "collection" ADD CONSTRAINT "FK_ca25eb01f75a85272300f336029" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "collection" ADD CONSTRAINT "FK_ed1a0849257ec64916f51ac87f1" FOREIGN KEY ("masterSetId") REFERENCES "pokemon_set"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "statistics" ADD CONSTRAINT "FK_489305b127b46d34f4f23aa36b4" FOREIGN KEY ("playerId") REFERENCES "player"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "statistics" ADD CONSTRAINT "FK_78468ef884d436e8de318430120" FOREIGN KEY ("matchId") REFERENCES "match"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "match_result_proposal" ADD CONSTRAINT "FK_54fa4834b64e9193de3759906cc" FOREIGN KEY ("matchId") REFERENCES "match"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "match_result_proposal" ADD CONSTRAINT "FK_283cfd69e737c7e38587c72148d" FOREIGN KEY ("proposerPlayerId") REFERENCES "player"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "match_result_proposal" ADD CONSTRAINT "FK_d9c139660843b4fc1d0f6960cc8" FOREIGN KEY ("proposerUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "match_result_proposal" ADD CONSTRAINT "FK_cabd5df0d27cedd3100788f07fa" FOREIGN KEY ("resolvedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "online_match_session" ADD CONSTRAINT "FK_9a3fe980980546a14f707b99df4" FOREIGN KEY ("match_id") REFERENCES "match"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "match" ADD CONSTRAINT "FK_b096f0c0ca94610b3e77128500c" FOREIGN KEY ("tournamentId") REFERENCES "tournament"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "match" ADD CONSTRAINT "FK_e2b0a54a83c6f816f96d4610736" FOREIGN KEY ("playerAId") REFERENCES "player"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "match" ADD CONSTRAINT "FK_919e74d1526d2c7023ed9bab7ae" FOREIGN KEY ("playerBId") REFERENCES "player"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "match" ADD CONSTRAINT "FK_367ddf891f920aae1b667353193" FOREIGN KEY ("winnerId") REFERENCES "player"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_notification" ADD CONSTRAINT "FK_7ac14060fc9836198c84b773329" FOREIGN KEY ("tournamentId") REFERENCES "tournament"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_organizer" ADD CONSTRAINT "FK_aafb2a46b2f5c80cff6cadf7bfb" FOREIGN KEY ("tournamentId") REFERENCES "tournament"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_organizer" ADD CONSTRAINT "FK_e46dc2b73ccee4e8b9c9b43b53c" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "registration_payment" ADD CONSTRAINT "FK_1c442dd93866086cd5a61c6140f" FOREIGN KEY ("registrationId") REFERENCES "tournament_registration"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_registration" ADD CONSTRAINT "FK_56fbf7f0bc1566cd006f4b9f9af" FOREIGN KEY ("tournamentId") REFERENCES "tournament"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_registration" ADD CONSTRAINT "FK_21bfa2e1046bd5b156d2ae99492" FOREIGN KEY ("playerId") REFERENCES "player"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_reward" ADD CONSTRAINT "FK_2b099a01fd7f9e1f754bdb210fc" FOREIGN KEY ("tournamentId") REFERENCES "tournament"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_deck_snapshot" ADD CONSTRAINT "FK_ee31ed94e1ea6dac31b944bffca" FOREIGN KEY ("tournamentId") REFERENCES "tournament"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_deck_snapshot" ADD CONSTRAINT "FK_41c4782159500057faaa0487bbd" FOREIGN KEY ("playerId") REFERENCES "player"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_deck_snapshot" ADD CONSTRAINT "FK_a356a17e2ed1a748a7f06315ab0" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_deck_snapshot" ADD CONSTRAINT "FK_480bcd8b1a79baaf6cdea83e015" FOREIGN KEY ("deckId") REFERENCES "deck"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament" ADD CONSTRAINT "FK_6afd9975e05f47a4e57224c3adc" FOREIGN KEY ("pricingId") REFERENCES "tournament_pricing"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ranking" ADD CONSTRAINT "FK_e907726fd2d262147eeb3ac8f5d" FOREIGN KEY ("tournamentId") REFERENCES "tournament"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ranking" ADD CONSTRAINT "FK_3ac96196d0a3851989be8c52a9a" FOREIGN KEY ("playerId") REFERENCES "player"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "player" ADD CONSTRAINT "FK_7687919bf054bf262c669d3ae21" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_follow" ADD CONSTRAINT "FK_afe3fdfb98cd47cd28108fa4846" FOREIGN KEY ("follower_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_follow" ADD CONSTRAINT "FK_21e3a7aa83bc9a255e3f43314d7" FOREIGN KEY ("followed_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "support_message" ADD CONSTRAINT "FK_a2891538af0744bd5ad400dbf7c" FOREIGN KEY ("supportTicketId") REFERENCES "support_ticket"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "support_message" ADD CONSTRAINT "FK_ce2335dc0125a87a39b156b73aa" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_item" ADD CONSTRAINT "FK_b6b2a4f1f533d89d218e70db941" FOREIGN KEY ("cart_id") REFERENCES "user_cart"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_item" ADD CONSTRAINT "FK_b6756d47030bbb3a8e1a8e12db1" FOREIGN KEY ("listing_id") REFERENCES "listing"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "listing" ADD CONSTRAINT "FK_00e1e709436862a20ae074f111b" FOREIGN KEY ("seller_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "listing" ADD CONSTRAINT "FK_aff5e361ca43e5cfd07aa30e3c5" FOREIGN KEY ("card_id") REFERENCES "card"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "listing" ADD CONSTRAINT "FK_fcaf72aa2e16b7965cf4eed2659" FOREIGN KEY ("sealed_product_id") REFERENCES "sealed_product"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "listing" ADD CONSTRAINT "FK_3794cba3b8a6282d516a38b5a22" FOREIGN KEY ("inventory_item_id") REFERENCES "collection_item"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "refund_operation" ADD CONSTRAINT "FK_1b0fb36f9f88dd607b200e594a8" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "refund_operation" ADD CONSTRAINT "FK_07f33014a66c0e85baaccab031e" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "refund_line" ADD CONSTRAINT "FK_031f075c5b35375aa8817ba9742" FOREIGN KEY ("refund_operation_id") REFERENCES "refund_operation"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "refund_line" ADD CONSTRAINT "FK_6df8794299f120c81b84585514e" FOREIGN KEY ("order_item_id") REFERENCES "order_item"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "return_item" ADD CONSTRAINT "FK_372b7bcda8abc00fff75d17abf1" FOREIGN KEY ("order_item_id") REFERENCES "order_item"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_item" ADD CONSTRAINT "FK_e9674a6053adbaa1057848cddfa" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_item" ADD CONSTRAINT "FK_75631a33d4a9ecde379a5c23007" FOREIGN KEY ("listing_id") REFERENCES "listing"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_item" ADD CONSTRAINT "FK_910e0dc6101bb5d3da1ff20fa54" FOREIGN KEY ("seller_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_transaction" ADD CONSTRAINT "FK_91163b302301738c73b0b917a1c" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" ADD CONSTRAINT "FK_8724877ec30a3aab629727b36ed" FOREIGN KEY ("buyer_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "support_ticket" ADD CONSTRAINT "FK_7df66b3c96ac736a25423c54e2d" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "support_ticket" ADD CONSTRAINT "FK_022e311f95d85b38583b2056ba8" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "support_ticket" ADD CONSTRAINT "FK_6a4514f87dffeead72f116b7239" FOREIGN KEY ("order_item_id") REFERENCES "order_item"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification" ADD CONSTRAINT "FK_1ced25315eb974b73391fb1c81b" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_token" ADD CONSTRAINT "FK_ba0cbbc3097f061e197e71c112e" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_identity" ADD CONSTRAINT "FK_2325ca218e23aa2ef1acf60187e" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_cart" ADD CONSTRAINT "FK_f47da2f31dce6d741ab6c106f55" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_deck_snapshot_revision" ADD CONSTRAINT "FK_dca5d5a1c59244f208f84194ba8" FOREIGN KEY ("snapshot_id") REFERENCES "tournament_deck_snapshot"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_deck_snapshot_revision" ADD CONSTRAINT "FK_3c15d91c01cf79a52516d520b57" FOREIGN KEY ("submitted_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ranked_match_history" ADD CONSTRAINT "FK_cb2b168ca5a69ebfc712a5b1995" FOREIGN KEY ("winnerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ranked_match_history" ADD CONSTRAINT "FK_b117f7afefc29ae9e846ca2d2a6" FOREIGN KEY ("loserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "training_match_session" ADD CONSTRAINT "FK_1d7839a8706133733e675d26dd0" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "casual_match_session" ADD CONSTRAINT "FK_cce40ccf11129549df36b5f6689" FOREIGN KEY ("playerAId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "casual_match_session" ADD CONSTRAINT "FK_422a73906493943edebf855b3e4" FOREIGN KEY ("playerBId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_settlement_account" ADD CONSTRAINT "FK_2caf69fcf6f9759391019595e1d" FOREIGN KEY ("seller_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_review" ADD CONSTRAINT "FK_ef04223210b1b8e824e958cd25d" FOREIGN KEY ("seller_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_review" ADD CONSTRAINT "FK_39b972a4ad826eb2a1a15c7a941" FOREIGN KEY ("buyer_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_review" ADD CONSTRAINT "FK_5a93478d6aae34f83b5ca63b846" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_review" ADD CONSTRAINT "FK_d78f82aff993cdfc83c54c09a19" FOREIGN KEY ("order_item_id") REFERENCES "order_item"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_payout" ADD CONSTRAINT "FK_2f31bec86e3d89fb537f324c634" FOREIGN KEY ("seller_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_payout" ADD CONSTRAINT "FK_57d09a6c5c7c6e58d8362fdacc3" FOREIGN KEY ("account_id") REFERENCES "seller_settlement_account"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_allocation" ADD CONSTRAINT "FK_fc2dc1239741227641972bb72a2" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_allocation" ADD CONSTRAINT "FK_f344b601c9e0d3b20564c826ed0" FOREIGN KEY ("seller_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_ledger_entry" ADD CONSTRAINT "FK_d554092319df61ebb1abf40d1bf" FOREIGN KEY ("account_id") REFERENCES "seller_settlement_account"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_ledger_entry" ADD CONSTRAINT "FK_81c77d1a21f53f4093caace17ec" FOREIGN KEY ("allocation_id") REFERENCES "seller_allocation"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_ledger_entry" ADD CONSTRAINT "FK_a4d3f9aa7dc5d5d8416bbed6f58" FOREIGN KEY ("payout_id") REFERENCES "seller_payout"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sealed_events" ADD CONSTRAINT "FK_776fed50525e389897c887e630c" FOREIGN KEY ("sealed_product_id") REFERENCES "sealed_product"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sealed_events" ADD CONSTRAINT "FK_590461b256407fc0b69a51d7bbc" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt_import" ADD CONSTRAINT "FK_0e820576118e052a16520f74029" FOREIGN KEY ("order_item_id") REFERENCES "order_item"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt_import" ADD CONSTRAINT "FK_aa97bbf64f57421e37b4b7a6f8d" FOREIGN KEY ("buyer_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt_import" ADD CONSTRAINT "FK_dc371d11bfefd58f68c085a448c" FOREIGN KEY ("collection_id") REFERENCES "collection"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt_import" ADD CONSTRAINT "FK_cb86f7e90e1647e1d12c8cb4afa" FOREIGN KEY ("collection_item_id") REFERENCES "collection_item"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "price_history" ADD CONSTRAINT "FK_bd1f549093d3db3342b0744c64f" FOREIGN KEY ("card_id") REFERENCES "card"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "price_history" ADD CONSTRAINT "FK_ab73b98fc3f3c30cf0977220f72" FOREIGN KEY ("sealed_product_id") REFERENCES "sealed_product"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_movement" ADD CONSTRAINT "FK_087c1d11809b361ecad1a9cab70" FOREIGN KEY ("collection_item_id") REFERENCES "collection_item"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_movement" ADD CONSTRAINT "FK_2df56e3c9b99e8630632d8913f8" FOREIGN KEY ("listing_id") REFERENCES "listing"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_movement" ADD CONSTRAINT "FK_ddca701af61a78b864f80f6a83a" FOREIGN KEY ("order_item_id") REFERENCES "order_item"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_movement" ADD CONSTRAINT "FK_93634c041c18ce402e9852e0faa" FOREIGN KEY ("return_item_id") REFERENCES "return_item"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "card_popularity_metrics" ADD CONSTRAINT "FK_e2e7d264252f81a3de70b839824" FOREIGN KEY ("card_id") REFERENCES "card"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "card_events" ADD CONSTRAINT "FK_45dd66b273e747d2872229026e6" FOREIGN KEY ("card_id") REFERENCES "card"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "card_events" ADD CONSTRAINT "FK_cc9fb24eda7823e3a0ddc544b29" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "saved_deck" ADD CONSTRAINT "FK_1a240f229927f1d91901ff5a569" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "saved_deck" ADD CONSTRAINT "FK_c8bf5646327ccbac8913ad7c716" FOREIGN KEY ("deckId") REFERENCES "deck"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "deck_share" ADD CONSTRAINT "FK_dd5f8d3c9f4494040b4d69a72af" FOREIGN KEY ("deckId") REFERENCES "deck"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "collection_bulk_operation" ADD CONSTRAINT "FK_37f07f336df7da482c3b4a429e7" FOREIGN KEY ("collection_id") REFERENCES "collection"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "collection_bulk_operation" ADD CONSTRAINT "FK_4be85fc2233ac3dfef01318d5fe" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "collection_bulk_operation_line" ADD CONSTRAINT "FK_638f3258e95613febaa6a138271" FOREIGN KEY ("operation_id") REFERENCES "collection_bulk_operation"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "collection_bulk_operation_line" ADD CONSTRAINT "FK_82c86449312d6b6e9547961ea5c" FOREIGN KEY ("collection_item_id") REFERENCES "collection_item"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "active_challenge" ADD CONSTRAINT "FK_befb978f00df2ef1cbc234af2bf" FOREIGN KEY ("challengeId") REFERENCES "challenge"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_challenge" ADD CONSTRAINT "FK_2a670b2efe9436c88cef7f15699" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_challenge" ADD CONSTRAINT "FK_8b996129b84f742ee660ceb2dce" FOREIGN KEY ("activeChallengeId") REFERENCES "active_challenge"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "article" ADD CONSTRAINT "FK_a9c5f4ec6cceb1604b4a3c84c87" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_players" ADD CONSTRAINT "FK_76e731e4992a85050d3cb75b2f4" FOREIGN KEY ("tournament_id") REFERENCES "tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_players" ADD CONSTRAINT "FK_a3c6b193bf4b3a4ecdf7e4cf408" FOREIGN KEY ("player_id") REFERENCES "player"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    for (const [
      name,
      timestamp,
    ] of InitialSchema1785000000000.SQUASHED_MIGRATIONS) {
      await queryRunner.query(
        `INSERT INTO "migrations" ("timestamp", "name")
          SELECT $1::bigint, $2::character varying
           WHERE NOT EXISTS (SELECT 1 FROM "migrations" WHERE "name" = $2)`,
        [timestamp, name],
      );
    }
  }

  /** Drops the schema this baseline created. */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "migrations" WHERE "name" = ANY($1)`, [
      InitialSchema1785000000000.SQUASHED_MIGRATIONS.map(([name]) => name),
    ]);

    await queryRunner.query(
      `ALTER TABLE "tournament_players" DROP CONSTRAINT "FK_a3c6b193bf4b3a4ecdf7e4cf408"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_players" DROP CONSTRAINT "FK_76e731e4992a85050d3cb75b2f4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "article" DROP CONSTRAINT "FK_a9c5f4ec6cceb1604b4a3c84c87"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_challenge" DROP CONSTRAINT "FK_8b996129b84f742ee660ceb2dce"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_challenge" DROP CONSTRAINT "FK_2a670b2efe9436c88cef7f15699"`,
    );
    await queryRunner.query(
      `ALTER TABLE "active_challenge" DROP CONSTRAINT "FK_befb978f00df2ef1cbc234af2bf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "collection_bulk_operation_line" DROP CONSTRAINT "FK_82c86449312d6b6e9547961ea5c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "collection_bulk_operation_line" DROP CONSTRAINT "FK_638f3258e95613febaa6a138271"`,
    );
    await queryRunner.query(
      `ALTER TABLE "collection_bulk_operation" DROP CONSTRAINT "FK_4be85fc2233ac3dfef01318d5fe"`,
    );
    await queryRunner.query(
      `ALTER TABLE "collection_bulk_operation" DROP CONSTRAINT "FK_37f07f336df7da482c3b4a429e7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deck_share" DROP CONSTRAINT "FK_dd5f8d3c9f4494040b4d69a72af"`,
    );
    await queryRunner.query(
      `ALTER TABLE "saved_deck" DROP CONSTRAINT "FK_c8bf5646327ccbac8913ad7c716"`,
    );
    await queryRunner.query(
      `ALTER TABLE "saved_deck" DROP CONSTRAINT "FK_1a240f229927f1d91901ff5a569"`,
    );
    await queryRunner.query(
      `ALTER TABLE "card_events" DROP CONSTRAINT "FK_cc9fb24eda7823e3a0ddc544b29"`,
    );
    await queryRunner.query(
      `ALTER TABLE "card_events" DROP CONSTRAINT "FK_45dd66b273e747d2872229026e6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "card_popularity_metrics" DROP CONSTRAINT "FK_e2e7d264252f81a3de70b839824"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_movement" DROP CONSTRAINT "FK_93634c041c18ce402e9852e0faa"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_movement" DROP CONSTRAINT "FK_ddca701af61a78b864f80f6a83a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_movement" DROP CONSTRAINT "FK_2df56e3c9b99e8630632d8913f8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_movement" DROP CONSTRAINT "FK_087c1d11809b361ecad1a9cab70"`,
    );
    await queryRunner.query(
      `ALTER TABLE "price_history" DROP CONSTRAINT "FK_ab73b98fc3f3c30cf0977220f72"`,
    );
    await queryRunner.query(
      `ALTER TABLE "price_history" DROP CONSTRAINT "FK_bd1f549093d3db3342b0744c64f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt_import" DROP CONSTRAINT "FK_cb86f7e90e1647e1d12c8cb4afa"`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt_import" DROP CONSTRAINT "FK_dc371d11bfefd58f68c085a448c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt_import" DROP CONSTRAINT "FK_aa97bbf64f57421e37b4b7a6f8d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt_import" DROP CONSTRAINT "FK_0e820576118e052a16520f74029"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sealed_events" DROP CONSTRAINT "FK_590461b256407fc0b69a51d7bbc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sealed_events" DROP CONSTRAINT "FK_776fed50525e389897c887e630c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_ledger_entry" DROP CONSTRAINT "FK_a4d3f9aa7dc5d5d8416bbed6f58"`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_ledger_entry" DROP CONSTRAINT "FK_81c77d1a21f53f4093caace17ec"`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_ledger_entry" DROP CONSTRAINT "FK_d554092319df61ebb1abf40d1bf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_allocation" DROP CONSTRAINT "FK_f344b601c9e0d3b20564c826ed0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_allocation" DROP CONSTRAINT "FK_fc2dc1239741227641972bb72a2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_payout" DROP CONSTRAINT "FK_57d09a6c5c7c6e58d8362fdacc3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_payout" DROP CONSTRAINT "FK_2f31bec86e3d89fb537f324c634"`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_review" DROP CONSTRAINT "FK_d78f82aff993cdfc83c54c09a19"`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_review" DROP CONSTRAINT "FK_5a93478d6aae34f83b5ca63b846"`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_review" DROP CONSTRAINT "FK_39b972a4ad826eb2a1a15c7a941"`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_review" DROP CONSTRAINT "FK_ef04223210b1b8e824e958cd25d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_settlement_account" DROP CONSTRAINT "FK_2caf69fcf6f9759391019595e1d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "casual_match_session" DROP CONSTRAINT "FK_422a73906493943edebf855b3e4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "casual_match_session" DROP CONSTRAINT "FK_cce40ccf11129549df36b5f6689"`,
    );
    await queryRunner.query(
      `ALTER TABLE "training_match_session" DROP CONSTRAINT "FK_1d7839a8706133733e675d26dd0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ranked_match_history" DROP CONSTRAINT "FK_b117f7afefc29ae9e846ca2d2a6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ranked_match_history" DROP CONSTRAINT "FK_cb2b168ca5a69ebfc712a5b1995"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_deck_snapshot_revision" DROP CONSTRAINT "FK_3c15d91c01cf79a52516d520b57"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_deck_snapshot_revision" DROP CONSTRAINT "FK_dca5d5a1c59244f208f84194ba8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_cart" DROP CONSTRAINT "FK_f47da2f31dce6d741ab6c106f55"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_identity" DROP CONSTRAINT "FK_2325ca218e23aa2ef1acf60187e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_token" DROP CONSTRAINT "FK_ba0cbbc3097f061e197e71c112e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification" DROP CONSTRAINT "FK_1ced25315eb974b73391fb1c81b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "support_ticket" DROP CONSTRAINT "FK_6a4514f87dffeead72f116b7239"`,
    );
    await queryRunner.query(
      `ALTER TABLE "support_ticket" DROP CONSTRAINT "FK_022e311f95d85b38583b2056ba8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "support_ticket" DROP CONSTRAINT "FK_7df66b3c96ac736a25423c54e2d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" DROP CONSTRAINT "FK_8724877ec30a3aab629727b36ed"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_transaction" DROP CONSTRAINT "FK_91163b302301738c73b0b917a1c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_item" DROP CONSTRAINT "FK_910e0dc6101bb5d3da1ff20fa54"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_item" DROP CONSTRAINT "FK_75631a33d4a9ecde379a5c23007"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_item" DROP CONSTRAINT "FK_e9674a6053adbaa1057848cddfa"`,
    );
    await queryRunner.query(
      `ALTER TABLE "return_item" DROP CONSTRAINT "FK_372b7bcda8abc00fff75d17abf1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refund_line" DROP CONSTRAINT "FK_6df8794299f120c81b84585514e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refund_line" DROP CONSTRAINT "FK_031f075c5b35375aa8817ba9742"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refund_operation" DROP CONSTRAINT "FK_07f33014a66c0e85baaccab031e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refund_operation" DROP CONSTRAINT "FK_1b0fb36f9f88dd607b200e594a8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "listing" DROP CONSTRAINT "FK_3794cba3b8a6282d516a38b5a22"`,
    );
    await queryRunner.query(
      `ALTER TABLE "listing" DROP CONSTRAINT "FK_fcaf72aa2e16b7965cf4eed2659"`,
    );
    await queryRunner.query(
      `ALTER TABLE "listing" DROP CONSTRAINT "FK_aff5e361ca43e5cfd07aa30e3c5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "listing" DROP CONSTRAINT "FK_00e1e709436862a20ae074f111b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_item" DROP CONSTRAINT "FK_b6756d47030bbb3a8e1a8e12db1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_item" DROP CONSTRAINT "FK_b6b2a4f1f533d89d218e70db941"`,
    );
    await queryRunner.query(
      `ALTER TABLE "support_message" DROP CONSTRAINT "FK_ce2335dc0125a87a39b156b73aa"`,
    );
    await queryRunner.query(
      `ALTER TABLE "support_message" DROP CONSTRAINT "FK_a2891538af0744bd5ad400dbf7c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_follow" DROP CONSTRAINT "FK_21e3a7aa83bc9a255e3f43314d7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_follow" DROP CONSTRAINT "FK_afe3fdfb98cd47cd28108fa4846"`,
    );
    await queryRunner.query(
      `ALTER TABLE "player" DROP CONSTRAINT "FK_7687919bf054bf262c669d3ae21"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ranking" DROP CONSTRAINT "FK_3ac96196d0a3851989be8c52a9a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ranking" DROP CONSTRAINT "FK_e907726fd2d262147eeb3ac8f5d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament" DROP CONSTRAINT "FK_6afd9975e05f47a4e57224c3adc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_deck_snapshot" DROP CONSTRAINT "FK_480bcd8b1a79baaf6cdea83e015"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_deck_snapshot" DROP CONSTRAINT "FK_a356a17e2ed1a748a7f06315ab0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_deck_snapshot" DROP CONSTRAINT "FK_41c4782159500057faaa0487bbd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_deck_snapshot" DROP CONSTRAINT "FK_ee31ed94e1ea6dac31b944bffca"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_reward" DROP CONSTRAINT "FK_2b099a01fd7f9e1f754bdb210fc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_registration" DROP CONSTRAINT "FK_21bfa2e1046bd5b156d2ae99492"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_registration" DROP CONSTRAINT "FK_56fbf7f0bc1566cd006f4b9f9af"`,
    );
    await queryRunner.query(
      `ALTER TABLE "registration_payment" DROP CONSTRAINT "FK_1c442dd93866086cd5a61c6140f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_organizer" DROP CONSTRAINT "FK_e46dc2b73ccee4e8b9c9b43b53c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_organizer" DROP CONSTRAINT "FK_aafb2a46b2f5c80cff6cadf7bfb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tournament_notification" DROP CONSTRAINT "FK_7ac14060fc9836198c84b773329"`,
    );
    await queryRunner.query(
      `ALTER TABLE "match" DROP CONSTRAINT "FK_367ddf891f920aae1b667353193"`,
    );
    await queryRunner.query(
      `ALTER TABLE "match" DROP CONSTRAINT "FK_919e74d1526d2c7023ed9bab7ae"`,
    );
    await queryRunner.query(
      `ALTER TABLE "match" DROP CONSTRAINT "FK_e2b0a54a83c6f816f96d4610736"`,
    );
    await queryRunner.query(
      `ALTER TABLE "match" DROP CONSTRAINT "FK_b096f0c0ca94610b3e77128500c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "online_match_session" DROP CONSTRAINT "FK_9a3fe980980546a14f707b99df4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "match_result_proposal" DROP CONSTRAINT "FK_cabd5df0d27cedd3100788f07fa"`,
    );
    await queryRunner.query(
      `ALTER TABLE "match_result_proposal" DROP CONSTRAINT "FK_d9c139660843b4fc1d0f6960cc8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "match_result_proposal" DROP CONSTRAINT "FK_283cfd69e737c7e38587c72148d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "match_result_proposal" DROP CONSTRAINT "FK_54fa4834b64e9193de3759906cc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "statistics" DROP CONSTRAINT "FK_78468ef884d436e8de318430120"`,
    );
    await queryRunner.query(
      `ALTER TABLE "statistics" DROP CONSTRAINT "FK_489305b127b46d34f4f23aa36b4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "collection" DROP CONSTRAINT "FK_ed1a0849257ec64916f51ac87f1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "collection" DROP CONSTRAINT "FK_ca25eb01f75a85272300f336029"`,
    );
    await queryRunner.query(
      `ALTER TABLE "collection_item" DROP CONSTRAINT "FK_534ffeeaa5e4543133242f1cfce"`,
    );
    await queryRunner.query(
      `ALTER TABLE "collection_item" DROP CONSTRAINT "FK_0aaa202ef25fcca3738081ae420"`,
    );
    await queryRunner.query(
      `ALTER TABLE "collection_item" DROP CONSTRAINT "FK_ec5d99cfe48a87d32591efb94cb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "collection_item" DROP CONSTRAINT "FK_33f1e3ce5cbc324f18fecde19c1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "card" DROP CONSTRAINT "FK_5c54def213ff8487c2bf6a06d40"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pokemon_card_details" DROP CONSTRAINT "FK_6ba7b41e65049d07369b3dad0ef"`,
    );
    await queryRunner.query(
      `ALTER TABLE "card_translation" DROP CONSTRAINT "FK_13cd196d3c2588ddc6f6c49ef60"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pokemon_set" DROP CONSTRAINT "FK_8357ce6c6b10ca5e45c7d8936a9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pokemon_set_translation" DROP CONSTRAINT "FK_d2b4b38d20e0094a714d1e2d818"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sealed_product" DROP CONSTRAINT "FK_738ca589d5749130023b30f5565"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sealed_product_locale" DROP CONSTRAINT "FK_ed7ef36f70cac2b2e8babb4453d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pokemon_serie_translation" DROP CONSTRAINT "FK_88538587e4fbbe9e410fc31a24f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deck_card" DROP CONSTRAINT "FK_fa2d019b620495815cc90471b5f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deck_card" DROP CONSTRAINT "FK_a20f5d327bae5df77fde66d741d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deck" DROP CONSTRAINT "FK_41ff9556cef72b8c3c53ed63872"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deck" DROP CONSTRAINT "FK_15bdcf90c4f507fe4e611d668b6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deck" DROP CONSTRAINT "FK_09e8a376bab70b9737c839b2e24"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_badge" DROP CONSTRAINT "FK_b0992699126a527b53d0b8d9d86"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_badge" DROP CONSTRAINT "FK_d988bb483f614b0541c6de7b3ce"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a3c6b193bf4b3a4ecdf7e4cf40"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_76e731e4992a85050d3cb75b2f"`,
    );
    await queryRunner.query(`DROP TABLE "tournament_players"`);
    await queryRunner.query(`DROP TABLE "article"`);
    await queryRunner.query(`DROP TYPE "public"."article_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4117dc292c4972e4b400d062fc"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7ffa72fd25c0e587644717f38d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2b778fde3afc04ec59f83e29fa"`,
    );
    await queryRunner.query(`DROP TABLE "audit_event"`);
    await queryRunner.query(`DROP TABLE "user_challenge"`);
    await queryRunner.query(`DROP TABLE "active_challenge"`);
    await queryRunner.query(`DROP TABLE "challenge"`);
    await queryRunner.query(`DROP TYPE "public"."challenge_actiontype_enum"`);
    await queryRunner.query(`DROP TYPE "public"."challenge_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_638f3258e95613febaa6a13827"`,
    );
    await queryRunner.query(`DROP TABLE "collection_bulk_operation_line"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_145f000c8fd0c4a1f4e8519e12"`,
    );
    await queryRunner.query(`DROP TABLE "collection_bulk_operation"`);
    await queryRunner.query(`DROP TABLE "deck_share"`);
    await queryRunner.query(`DROP TABLE "saved_deck"`);
    await queryRunner.query(`DROP TABLE "faq"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6c231ee526aff90347a1778c03"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b16eeda005578af57d582c7d71"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_92a45b9d3386f9e0d49af18f6e"`,
    );
    await queryRunner.query(`DROP TABLE "card_events"`);
    await queryRunner.query(`DROP TYPE "public"."card_events_eventtype_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a8173d769f8b2b54052c9382db"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_809d6b5fd63227fa15b207c57d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_369c008da4618ee4e62ce1126b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8c1cc135b9431b5455719a9564"`,
    );
    await queryRunner.query(`DROP TABLE "card_popularity_metrics"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a65611a8d7b44b956f259e441a"`,
    );
    await queryRunner.query(`DROP TABLE "inventory_movement"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f9f79d32478975a2c200ee01bf"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1afc7faf35ec407d29c5673619"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_403bb774823570b7f7ed707859"`,
    );
    await queryRunner.query(`DROP TABLE "price_history"`);
    await queryRunner.query(
      `DROP TYPE "public"."price_history_sealedcondition_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."price_history_cardstate_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."price_history_currency_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0e820576118e052a16520f7402"`,
    );
    await queryRunner.query(`DROP TABLE "receipt_import"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_231120583be88b607268945c0a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7384438a58da315cf9d71398c4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1f82010ed37847b86f4e71c516"`,
    );
    await queryRunner.query(`DROP TABLE "sealed_events"`);
    await queryRunner.query(
      `DROP TYPE "public"."sealed_events_eventtype_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ed9234025df3cc55c2a04c6ca0"`,
    );
    await queryRunner.query(`DROP TABLE "seller_ledger_entry"`);
    await queryRunner.query(
      `DROP TYPE "public"."seller_ledger_entry_currency_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fc2dc1239741227641972bb72a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2c83413ac7dc1b321ebfa2aa88"`,
    );
    await queryRunner.query(`DROP TABLE "seller_allocation"`);
    await queryRunner.query(
      `DROP TYPE "public"."seller_allocation_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."seller_allocation_currency_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_afd56196906138d07e472f7cbd"`,
    );
    await queryRunner.query(`DROP TABLE "seller_payout"`);
    await queryRunner.query(
      `DROP TYPE "public"."seller_payout_payoutmethod_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."seller_payout_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."seller_payout_currency_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ef04223210b1b8e824e958cd25"`,
    );
    await queryRunner.query(`DROP TABLE "seller_review"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2caf69fcf6f9759391019595e1"`,
    );
    await queryRunner.query(`DROP TABLE "seller_settlement_account"`);
    await queryRunner.query(
      `DROP TYPE "public"."seller_settlement_account_payoutmethod_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."seller_settlement_account_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."seller_settlement_account_currency_enum"`,
    );
    await queryRunner.query(`DROP TABLE "casual_match_session"`);
    await queryRunner.query(
      `DROP TYPE "public"."casual_match_session_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "training_match_session"`);
    await queryRunner.query(
      `DROP TYPE "public"."training_match_session_aidifficulty_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."training_match_session_status_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0595eb8ed631c93d70bf1d0f0a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7742b10fde39bd407bd9c162a4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_50b1244e297d9dcc9894ba32a7"`,
    );
    await queryRunner.query(`DROP TABLE "outbox_event"`);
    await queryRunner.query(`DROP TYPE "public"."outbox_event_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_276e1594ffc073ea1605951715"`,
    );
    await queryRunner.query(`DROP TABLE "processed_event"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cb2b168ca5a69ebfc712a5b199"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b117f7afefc29ae9e846ca2d2a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ranked_history_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ranked_history_match_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ranked_history_casual_session_id"`,
    );
    await queryRunner.query(`DROP TABLE "ranked_match_history"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dca5d5a1c59244f208f84194ba"`,
    );
    await queryRunner.query(`DROP TABLE "tournament_deck_snapshot_revision"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_27277f42cb84aadded5d72dacc"`,
    );
    await queryRunner.query(`DROP TABLE "translation"`);
    await queryRunner.query(`DROP TABLE "user_cart"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TYPE "public"."user_preferredcurrency_enum"`);
    await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_46b5bb04957ca7f52068168639"`,
    );
    await queryRunner.query(`DROP TABLE "auth_identity"`);
    await queryRunner.query(`DROP TYPE "public"."auth_identity_provider_enum"`);
    await queryRunner.query(`DROP TABLE "device_token"`);
    await queryRunner.query(`DROP TABLE "notification"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6a4514f87dffeead72f116b723"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_022e311f95d85b38583b2056ba"`,
    );
    await queryRunner.query(`DROP TABLE "support_ticket"`);
    await queryRunner.query(
      `DROP TYPE "public"."support_ticket_claimcategory_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."support_ticket_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7396ae8fcb6da3e334e6121129"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7a9573d6a1fb982772a9123320"`,
    );
    await queryRunner.query(`DROP TABLE "order"`);
    await queryRunner.query(`DROP TYPE "public"."order_currency_enum"`);
    await queryRunner.query(`DROP TYPE "public"."order_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_66da32c33acd364a777ac44f51"`,
    );
    await queryRunner.query(`DROP TABLE "payment_transaction"`);
    await queryRunner.query(
      `DROP TYPE "public"."payment_transaction_currency_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."payment_transaction_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."payment_transaction_method_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_910e0dc6101bb5d3da1ff20fa5"`,
    );
    await queryRunner.query(`DROP TABLE "order_item"`);
    await queryRunner.query(
      `DROP TYPE "public"."order_item_fulfillmentstatus_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."order_item_productkind_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_372b7bcda8abc00fff75d17abf"`,
    );
    await queryRunner.query(`DROP TABLE "return_item"`);
    await queryRunner.query(
      `DROP TYPE "public"."return_item_disposition_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."return_item_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6df8794299f120c81b84585514"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_031f075c5b35375aa8817ba974"`,
    );
    await queryRunner.query(`DROP TABLE "refund_line"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_refund_order_request_key"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5140278c84cf34f767faf818a3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1b0fb36f9f88dd607b200e594a"`,
    );
    await queryRunner.query(`DROP TABLE "refund_operation"`);
    await queryRunner.query(
      `DROP TYPE "public"."refund_operation_status_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d371b513022e5cfe23db8c1b23"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ca2d1176749233c771f6f0e8d3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d8719eb87ca10e394d0a200b14"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b6a60deaa76e802dea35dc68d3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c196346d70ae94a19009a46326"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3794cba3b8a6282d516a38b5a2"`,
    );
    await queryRunner.query(`DROP TABLE "listing"`);
    await queryRunner.query(
      `DROP TYPE "public"."listing_sealedcondition_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."listing_cardstate_enum"`);
    await queryRunner.query(`DROP TYPE "public"."listing_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."listing_currency_enum"`);
    await queryRunner.query(`DROP TYPE "public"."listing_productkind_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1bc2cfe7144dfc695085b5f292"`,
    );
    await queryRunner.query(`DROP TABLE "cart_item"`);
    await queryRunner.query(`DROP TABLE "support_message"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_277fd4b1b41f060b61f5e52cdf"`,
    );
    await queryRunner.query(`DROP TABLE "user_follow"`);
    await queryRunner.query(`DROP TABLE "player"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9f91b99b9940b259dd6417cfd6"`,
    );
    await queryRunner.query(`DROP TABLE "ranking"`);
    await queryRunner.query(`DROP TABLE "tournament"`);
    await queryRunner.query(`DROP TYPE "public"."tournament_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."tournament_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6b69e37222f3463a8581b10971"`,
    );
    await queryRunner.query(`DROP TABLE "tournament_deck_snapshot"`);
    await queryRunner.query(`DROP TABLE "tournament_reward"`);
    await queryRunner.query(`DROP TYPE "public"."tournament_reward_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_93700b1dea53d24ab51d456d18"`,
    );
    await queryRunner.query(`DROP TABLE "tournament_registration"`);
    await queryRunner.query(
      `DROP TYPE "public"."tournament_registration_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "registration_payment"`);
    await queryRunner.query(
      `DROP TYPE "public"."registration_payment_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."registration_payment_method_enum"`,
    );
    await queryRunner.query(`DROP TABLE "tournament_pricing"`);
    await queryRunner.query(
      `DROP TYPE "public"."tournament_pricing_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "tournament_organizer"`);
    await queryRunner.query(
      `DROP TYPE "public"."tournament_organizer_role_enum"`,
    );
    await queryRunner.query(`DROP TABLE "tournament_notification"`);
    await queryRunner.query(
      `DROP TYPE "public"."tournament_notification_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."tournament_notification_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "match"`);
    await queryRunner.query(`DROP TYPE "public"."match_bracketside_enum"`);
    await queryRunner.query(`DROP TYPE "public"."match_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."match_phase_enum"`);
    await queryRunner.query(`DROP TABLE "online_match_session"`);
    await queryRunner.query(
      `DROP TYPE "public"."online_match_session_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "match_result_proposal"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fae422a5b9d110fcde85d51eb1"`,
    );
    await queryRunner.query(`DROP TABLE "statistics"`);
    await queryRunner.query(`DROP TABLE "collection"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d6014509e14ad46632a94eb3f7"`,
    );
    await queryRunner.query(`DROP TABLE "collection_item"`);
    await queryRunner.query(
      `DROP TYPE "public"."collection_item_sealedcondition_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."collection_item_productkind_enum"`,
    );
    await queryRunner.query(`DROP TABLE "card_state"`);
    await queryRunner.query(`DROP TYPE "public"."card_state_code_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_292bcbfb5e2a27a8115eef143f"`,
    );
    await queryRunner.query(`DROP TABLE "card"`);
    await queryRunner.query(`DROP TYPE "public"."card_game_enum"`);
    await queryRunner.query(`DROP TABLE "pokemon_card_details"`);
    await queryRunner.query(
      `DROP TYPE "public"."pokemon_card_details_category_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_800cefdc707d6086028482d69e"`,
    );
    await queryRunner.query(`DROP TABLE "card_translation"`);
    await queryRunner.query(`DROP TABLE "pokemon_set"`);
    await queryRunner.query(`DROP TYPE "public"."pokemon_set_game_enum"`);
    await queryRunner.query(`DROP TABLE "pokemon_set_translation"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_516fbd76d8c5f474f7c0548ca8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f4f252314179ec60c96ffeaabe"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0030575ede9e2e1220089e9a89"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_902e4bcff9ce64ed986778ab1f"`,
    );
    await queryRunner.query(`DROP TABLE "sealed_product"`);
    await queryRunner.query(
      `DROP TYPE "public"."sealed_product_producttype_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4c6325a3aca78873469e83e8cf"`,
    );
    await queryRunner.query(`DROP TABLE "sealed_product_locale"`);
    await queryRunner.query(`DROP TABLE "pokemon_serie"`);
    await queryRunner.query(`DROP TYPE "public"."pokemon_serie_game_enum"`);
    await queryRunner.query(`DROP TABLE "pokemon_serie_translation"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_deck_card_deck_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_deck_card_deck_card"`);
    await queryRunner.query(`DROP TABLE "deck_card"`);
    await queryRunner.query(`DROP TYPE "public"."deck_card_role_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_deck_public_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_deck_user_created_at"`);
    await queryRunner.query(`DROP TABLE "deck"`);
    await queryRunner.query(`DROP TABLE "deck_format"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1e9b8cbf71c28a587a3f09e366"`,
    );
    await queryRunner.query(`DROP TABLE "user_badge"`);
    await queryRunner.query(`DROP TABLE "badge"`);
    await queryRunner.query(`DROP TYPE "public"."badge_category_enum"`);
  }
}

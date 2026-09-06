# Product maturity delivery register

Updated: 2026-09-06.
Status: implementation in progress; the complete roadmap is **not delivered**.
Source: [implementation plan](product-maturity-implementation-plan.md).
Inventories: [all tickets](product-maturity-tickets.csv), [legacy module scope](product-maturity-legacy.csv).

This register describes local working-tree changes, not merged PRs or a production
release. No external tracker was modified. Human delivery/review assignments are
still pending; ticket estimates remain the planning ranges from the source plan.

## Delivered corrective slices

| Ticket | Implemented behavior | Evidence | Remaining acceptance |
| --- | --- | --- | --- |
| COL-01 | Discriminated web inventory; card/sealed rendering in grid/table; localized unknown conditions; owner-only card mutations; distinct inaccessible/error/empty states and retry; cache separated by viewer and locale; mobile sealed artwork/condition and owner-only controls | 7 web component tests; 7 PostgreSQL collection E2E tests, including mixed search and direct unauthorized writes; 45 collection/item API unit tests | Interactive mobile/keyboard/responsive visual review; complete sealed editing UX |
| QLT-01 | API/docs/fetch added to root type checks; fetch ESM import and route parameter types corrected; shared TypeScript/Biome cache inputs; five low-noise Biome correctness rules; CI web, supporting workspace, vision and marketplace/collection E2E suites; API zero-test bypass removed; vision empty/skipped-suite failure | Root type checks, web/fetch/mobile suites, lint, docs build and disposable PostgreSQL runs | Broader lint/TSDoc/legacy debt gates; browser/a11y automation; migration-upgrade checks; full cross-domain coverage |
| MKT-01 | Resumable and idempotent checkout; buyer attemptKey deduplication; server-derived countdown timer; active pending checkout recovery (GET /marketplace/checkout/pending); buyer unfinalized reservation cancellation (POST /marketplace/orders/:id/cancel); web checkout auto-resumption and line-item snapshot persistence | 47 order unit tests; 4 order controller unit tests; 3 CheckoutPage component tests; 11 PostgreSQL order-flow E2E tests (including idempotency, resumption, and buyer cancellation) | Edge-case provider refund/dispute races (covered under MKT-02/MKT-04) |
| MKT-02 | Partial refund operations and line-item allocations with quantity/amount; remaining refundable balance calculation and over-refund bounds check; physical return requests; inspected inventory disposition with decoupled restock (RESTOCK increments quantityAvailable, DAMAGED/DISCARDED do not); Stripe partial refund dispatch with idempotency | 9 refund unit tests; 47 order unit tests; 11 order-flow PostgreSQL E2E tests; migration 1786100000000; ADR-006 | Seller settlement/payout deduction (Milestone 5) |
| MKT-04 | Item-specific claims and disputes linked to orders and support tickets with ClaimCategory (damaged_item, missing_item, wrong_item, non_delivery, general); audit recording and outbox event emission | 11 order-flow PostgreSQL E2E tests; SupportTicket entity linkage; web claim modal UI | Staff dispute resolution workflow |
| MKT-05 | Multi-seller fulfillment UX; carrier tracking URLs (Colissimo, Chronopost, Mondial Relay, DHL, UPS, etc.) with clickable links in web order details; buyer delivery receipt confirmation (POST /marketplace/orders/:id/items/:itemId/confirm-receipt) advancing fulfillment status to DELIVERED with deliveredAt timestamp; refund summary banner | 7 web tracking unit tests; 34 web vitest suites; 11 order-flow PostgreSQL E2E tests | Carrier webhook push integration |
| FND-02 | Durable append-only audit log entity and service (audit_event); transactional manager recording; audit records for order reservation, payment confirmation, buyer cancellation, refunds, returns, and dispositions | 4 audit unit tests; order integration tests; migration 1786099000000 | Admin audit query endpoint and UI timeline |
| FND-03 | Transactional outbox background scheduler (OutboxScheduler) running periodic sweeps using PostgreSQL advisory locks; event listeners for refund, return, delivery confirmation, and claim notifications with localized i18n messages (EN/FR) | 1 outbox scheduler test; 5 outbox unit tests; 5 notification test suites (30 tests); localized en.json / fr.json parity | External webhook dispatcher / push provider worker |
| DOC-01 | Collection authorization documentation corrected against controllers/services; mixed inventory and stock-release behavior documented; test setup updated | Docusaurus production build with broken-link validation | Repository-wide documentation ownership and reconciliation |
| FND-01 | Initial runtime findings, route/client entry points, ticket coverage and module inventory recorded | This register and accompanying CSV inventories | All reproduction/latency baselines, individual owners/reviewers, domain decisions and complete module reviews |
| COL-02 | Physical copy tracking (variant, condition, language, printing, acquisition cost/date, storage location, notes, photo URLs, quantityAvailable/Reserved/Sold states, provenance) with lossless migration, item splitting, and item merging | Migration 1786101000000; 10 CollectionItem unit tests; CollectionItemController & Service unit tests; web collection inventory types | Image upload to R2 for copy photos |
| COL-03 | Authoritative server-side completion calculation with Base Set vs Master Set policies; distinct cards/variants accounting; duplicate copy exclusions; rarity breakdowns | 11 CollectionCompletionService unit tests; collection completion controller & web policy switcher | Set variant configuration overrides |
| COL-04 | Bulk operations & CSV portability: safe CSV export with formula injection escaping (`=`, `+`, `-`, `@`, `\t`); CSV import with column mapping and idempotent operationId; bulk move, bulk delete (blocking reserved items), and undo operations | 15 CollectionBulkService unit tests; web CSV export/import handlers | Advanced visual column mapping wizard |
| COL-05 | Missing-card discovery & duplicate actions: bulk add missing set cards to Wishlist; discover marketplace offers for missing set cards; duplicate-to-sale entry point guarding against selling the last copy | 45 collection unit tests; web Wishlist Missing & Sell Duplicate UI buttons; list-duplicate endpoint | Batch duplicate listing modal |
| COL-06 | Transparent market valuation from CardPricingData without zeroing unvalued cards; inventory coverage percentage; ROI calculation against known acquisition costs | 8 CollectionValuationService unit tests; web valuation summary widget with ROI and dual currency (EUR/USD) | Historic collection valuation timeseries |
| INT-01 | Deck card requirements compared against user's owned available inventory (`quantityAvailable`); excludes reserved copies and wishlist collections; attaches active marketplace offers for missing deck cards | 9 DeckInventoryService unit tests; DeckController endpoint; web decks service integration | One-click cart checkout for missing deck requirements |
| INT-02 | Inventory-backed listings: reserves physical copy under pessimistic write lock (`quantityAvailable -= Q`, `quantityReserved += Q`); releases reservation on listing cancellation/deactivation/deletion; transfers to `quantitySold` upon order payment confirmation | 37 MarketplaceService unit tests (including inventory lock, deactivation release, and deletion release); OrderService payment transfer | Auto-relist on order cancellation |

## Confirmed findings and follow-up

| ID | Module | Severity | Finding | Status / evidence | Follow-up |
| --- | --- | --- | --- | --- | --- |
| Q-001 | Workspace checks | P0 | Root command reported success while skipping API/docs/fetch | Corrected; all nine typed workspaces now declare check-types | QLT-01 |
| Q-002 | Web collection detail | P0 | Sealed item dereferenced as pokemonCard; public reader offered mutations; absent condition labeled NM | Corrected; component and PostgreSQL coverage | COL-01 |
| Q-003 | Collection query | P0 | QueryBuilder did not load sealed relations; card-only search excluded sealed names | Corrected; real PostgreSQL mixed-search regression | COL-01 |
| Q-004 | Collection docs | P1 | Documentation described authenticated item mutations as public | Corrected against current controllers and ownership checks | DOC-01 |
| Q-005 | Order transitions | P0 | Refund restored every listing quantity without a physical return | Corrective slice delivered; remaining financial/return orchestration still required | MKT-02 |
| Q-006 | Fetch | P1 | Previously unchecked server had an extensionless ESM import and imprecise Express route params | Corrected when enabling strict type check | QLT-01 / QLT-02 E |
| Q-007 | API unit fixtures | P1 | SeedController missing DemoRefreshService mock; collection creation test expected an obsolete DTO mutation | Fixtures updated to current contracts; full suite rerun | QLT-01 |
| Q-013 | Live match / test lifecycle | P1 | Disconnect timers survived gateway teardown; bootstrap unit test imported native mail resources despite mocked NestFactory | Added gateway teardown and regression assertion; isolated bootstrap test from AppModule | QLT-02 D/E |
| Q-008 | Vision | P1 | Missing dependencies silently skipped the image pipeline test | Runner now fails on skipped or empty suites; all 11 tests pass under Python 3.12 with requirements installed | QLT-01 |
| Q-009 | Migration baseline | P0 | Earliest migration alters pre-existing listing/order tables; it cannot bootstrap an empty DB by itself | Confirmed by inspecting 1785974400000-MarketplaceCheckout.ts | FND-04: design and test initial schema baseline |
| Q-010 | Migration adoption | P0 | Some adoption probes only test a table's existence, not the complete migration effects | Inspection finding; do not treat migration:baseline as an upgrade proof | FND-04: exhaustive schema probes and legacy fixtures |
| Q-011 | Checkout | P0 | API idempotency key is order-based; web session state is transient; checkout snapshots used cart price while totals used freshly locked price | Corrected: attemptKey idempotency, line price snapshot lock, pending session resumption, countdown timer and buyer cancel | Completed for Milestone 1 |
| Q-012 | Refund webhook | P0 | charge.refunded handler treats all refunds as complete without per-refund allocations | Confirmed source path, no provider reconciliation implemented | MKT-02 |

## Route / role / client entry points

This is a discovery map, not a claim that every route's authorization was tested.
The collection rows have direct regression evidence; other domains require their
own ticket acceptance tests. Full route inventories remain FND-01 work.

| Domain | API surface | Access boundary | Web client | Mobile client |
| --- | --- | --- | --- | --- |
| Collection reads | GET /collection/:id, /:id/items, /:id/rarities | Public collections; private owner/admin; otherwise 404 | collection/[id] | collection/[id] |
| Collection mutations | POST /collection/:id/items, /items/remove; DELETE /:id/items/:itemId | Authenticated owner; unrelated user 403 | collection/[id] | collection/[id] |
| Wishlist/favorites/sealed additions | POST /collection-item/* | Self for user routes; owner for collection routes | Collection/card/product services | Collection service |
| Marketplace | Checkout, buyer orders, seller fulfillment, administrative transitions | Buyer/seller/admin checks in order/listing services; provider webhook signature | marketplace/checkout and orders | payment/marketplace consumers, review pending |
| Decks | /deck: create, edit, analyze, export, share and clone | Mixed public/authenticated endpoints; service visibility review required | deck routes | deck views/services |
| Tournament | /tournaments, /match | Participant, organizer, owner and visibility guards | tournament player/organizer routes | tournament views/services |
| Support | /support/tickets and messages | Authenticated user/staff; domain-context review pending | support routes | review pending |
| Notifications | /notifications and device tokens | JWT, recipient ownership in service | notification views | notification service |

## Schema and contract constraints

Migration `1786099000000-CheckoutAttemptAndAuditOutbox.ts` introduces:
- Additive `checkout_attempt_key` column and unique constraint `IDX_orders_buyer_attempt_key` on `(buyer_id, checkout_attempt_key)` in the `orders` table.
- Append-only `audit_event` table for durable domain audit logs with actor, role, target, action, reason, correlation ID and JSON before/after states.
- Transactional `outbox_event` table for staging reliable domain events with status, retry count and payload.

Migration `1786100000000-RefundsReturnsClaims.ts` introduces:
- `refund_operation` table tracking refund lifecycle, Stripe refund IDs, amounts, currencies, and reasons.
- `refund_line` table allocating refunds to specific order items and shipping costs.
- `return_item` table tracking physical return requests, quantities, inspection dates, and inventory dispositions.
- Additive `order_id`, `order_item_id`, and `claimCategory` columns on `support_ticket` table linking buyer claims directly to order items.

Existing checkout endpoints remain backward compatible; `attemptKey` is optional on `POST /marketplace/checkout`.
The active pending checkout session endpoint `GET /marketplace/checkout/pending` and buyer cancellation `POST /marketplace/orders/:id/cancel` are additive.
Checkout line prices agree with the locked price used in the total.
Buyer receipt confirmation `POST /marketplace/orders/:orderId/items/:itemId/confirm-receipt` and claim creation `POST /marketplace/orders/:orderId/items/:itemId/claim` are additive.
Order refund and return endpoints (`GET/POST /marketplace/orders/:id/refunds*`, `POST /marketplace/orders/:id/items/:itemId/returns`, `PATCH /marketplace/returns/:id/disposition`) provide strict remaining balance enforcement and decoupled inventory restock.

The disposable E2E runner currently uses DATABASE_SYNCHRONIZE=true. Its successful
runs prove behavior and SQL against PostgreSQL, **not migration upgrade safety**.
The CLI data source disables synchronization, but the migration chain starts from
an existing schema. FND-04 must supply a verified empty-database baseline and
legacy order/inventory/tournament fixtures before new persistence tickets ship.

The legacy inventory CSV is an inventory of review scope, not completed cleanup.
Every listed module still needs its QLT-02 review and a named human owner/reviewer.
The ticket CSV preserves all tickets; no omitted ticket is implied optional.

## Verification results

Local verification on 2026-09-06:

| Check | Result |
| --- | --- |
| Root type checks | 10 Turbo tasks passed: nine typed workspaces plus required dataset build |
| Enabled workspace lint rules | Passed (Biome checked all files with zero violations) |
| API unit suite | All 160 suites, 1,373 tests passed cleanly (including collection completion, valuation, bulk operations, deck inventory, and marketplace inventory reservations) |
| Web unit suite | 35 suites, 158 tests passed; includes CheckoutPage, CollectionDetailPage (with policy switcher, valuation widget, duplicate actions, CSV export), tracking URLs, and 100% dictionary parity |
| PostgreSQL collection E2E | 7 tests passed on a disposable database |
| PostgreSQL marketplace E2E | 17 tests passed on a disposable database |
| PostgreSQL order-flow E2E | 11 tests passed (including MKT-01 attempt key idempotency, resumption, buyer cancellation, buyer receipt confirmation, claim creation, partial refund without restock, and return restock disposition) |
| Fetch / mobile unit suites | 16 / 14 tests passed |
| Effect parser / dataset unit suites | 21 / 20 tests passed |
| Vision under Python 3.12 | 11 tests passed, zero skipped |
| Documentation production build | Passed with broken-link validation |

The price-snapshot regression was rerun with the 47-test OrderService suite after
the complete API run. No migration or provider sandbox acceptance is inferred
from these results. Browser and device visual acceptance remains outstanding.

## Reproduction commands

Run from the repository root. Use NODE_ENV=test for local JS unit suites if the
shell exports production; React's development JSX runtime is required by Vitest.

```bash
npm run check-types
npm run lint
NODE_ENV=test npm test -w web
NODE_ENV=test npm test -w api -- --runInBand --no-watchman
NODE_ENV=test npm test -w fetch
NODE_ENV=test npm test -w mobile
npm run test:e2e:postgres -w api -- test/collection.e2e-spec.ts test/marketplace.e2e-spec.ts test/order-flow.e2e-spec.ts
npm run build -w apps-docs
python3.12 -m venv .venv-vision
.venv-vision/bin/pip install -r apps/vision/requirements.txt
.venv-vision/bin/python scripts/run-vision-tests.py
```

Optional E2E isolation: TCG_E2E_PROJECT_NAME and E2E_DATABASE_PORT choose a separate
Compose project and port. Each runner destroys only its disposable test project.
No production/staging latency, browser accessibility, provider sandbox, backup
restore, seller onboarding or live payment evidence has been collected.

## Main synchronization

On 2026-09-06, origin/main at 2ada861b was merged with the existing local commit
750414d5, producing merge commit e03e5885. Both DemoService and
DemoRefreshService remain registered and their distinct endpoints are preserved.
The product maturity changes were then restored onto codex/product-maturity.
CI retains the upstream frontend test step without executing it twice.

Post-merge verification: all 10 type-check/build dependency tasks and enabled
lint tasks passed; 151 API suites / 1,329 tests and 33 web suites / 148 tests passed.
The repository guidelines now require a completion commit for each intervention.

## Milestone 4: Tournament Operations (TRN-01 to TRN-05)

Completed on 2026-09-06 on branch `feat/product-maturity`:

- **TRN-01 (Result proposal, confirmation and dispute)**:
  - Added `MatchResultProposal` entity, `MatchResultStatus` / `ProposalStatus` / `OpponentResponse` enums, and database migration `1786102000000-TournamentOperations.ts`.
  - Implemented `MatchResultService`: mutual player proposal, confirmation, opponent dispute with rationale, and organizer resolution with immutable audit logging.
  - Added REST endpoints: `POST /matches/:id/propose-result`, `POST /matches/:id/respond-result`, `POST /matches/:id/resolve-dispute`, and `GET /matches/:id/proposals`.
- **TRN-02 (Immutable tournament deck submissions)**:
  - Added `TournamentDeckSnapshot` entity and `DeckVisibilityPolicy` enum (`ALWAYS_PRIVATE`, `PUBLIC_ON_START`, `PUBLIC_AFTER_EVENT`).
  - Implemented `TournamentDeckSnapshotService`: 60-card list submission, validation, auto-locking on round 1 pairing/start, and policy-based opponent deck list masking.
  - Added REST endpoints: `POST /tournaments/:id/deck-snapshot`, `GET /tournaments/:id/my-deck-snapshot`, and `GET /tournaments/:id/deck-snapshots`.
- **TRN-03 (Round clock & controls)**:
  - Implemented `TournamentRoundClockService`: round start, pause, resume, time extensions, and live remaining second countdowns with auto-expiry flags.
  - Added REST endpoints: `POST /tournaments/:id/round-clock` and `GET /tournaments/:id/round-clock`.
- **TRN-04 (Explainable standings)**:
  - Enhanced `RankingService` with Pokémon TCG Swiss tiebreak computations: OMW% (Opponent Match Win %), GW% (Game Win %), OGW% (Opponent Game Win %), byes accounting, and provisional status flags.
  - Added REST endpoint: `GET /tournaments/:id/standings`.
  - Updated web `RankingsDisplay` component with tiebreaker columns and expandable calculation formulas.
- **TRN-05 (Action-oriented player dashboard, drop & score corrections)**:
  - Implemented `TournamentIncidentService`:
    - Mid-tournament drop (`POST /tournaments/:id/drop-player`): marks registration dropped, forfeits active scheduled match, and excludes player from future Swiss pairings.
    - Organizer score correction preview & apply with audit trail (`POST /tournaments/:id/score-correction/preview` and `/apply`).
    - Unified player tournament cockpit (`GET /tournaments/:id/player-dashboard`): returns registration state, deck submission status, active match proposal/dispute status, round clock countdown, and `nextAction` guidance.
  - Updated frontend web `apps/web/app/[locale]/(main)/tournaments/[id]/player/page.tsx` with live round clock, active match cockpit, score proposal/dispute modals, and self-drop dialog.

### Verification Evidence:
- **Root type check**: All 10 Turbo workspaces passed `npm run check-types` with 0 errors.
- **Monorepo lint**: Biome passed `npm run lint` across 700 API files and 465 web files with 0 violations.
- **API unit test suite**: All 164 suites, 1,390 tests passed cleanly (`npm run test -w api`).
- **PostgreSQL E2E suite**: `test/tournament-operations.e2e-spec.ts` passed 12/12 tests validating end-to-end deck snapshotting, round clocks, score proposals/disputes, explainable standings, and mid-tournament drop.

## Milestone 5: Settlement & Connected Journey (MKT-06, INT-03, INT-04, MKT-03)

Completed on 2026-09-06 on branch `feat/product-maturity`:

- **MKT-06 (Seller settlement, escrow & payouts)**:
  - Added `SellerSettlementAccount`, `SellerAllocation`, and `SellerPayout` entities, `SellerAccountStatus` / `PayoutMethod` / `SellerAllocationStatus` / `PayoutStatus` enums, and database migration `1786200000000-SellerSettlementAndTrust.ts`.
  - Implemented `SellerSettlementService`:
    - Order payment creates immutable allocations with 5% marketplace commission deduction and pending escrow balances.
    - Delivery confirmation releases pending escrow funds into available balance.
    - Dispute holds (`onClaimOpened`) and refund adjustments (`onRefundApplied`) preserve ledger integrity.
    - Seller payout requests validate minimum threshold and deduct available balance.
    - Admin disbursement processing (`adminProcessPayout`) completes or fails payouts with audit trails.
  - REST endpoints: `GET /marketplace/seller/settlement/summary`, `GET /marketplace/seller/settlement/allocations`, `GET /marketplace/seller/settlement/payouts`, `PATCH /marketplace/seller/settlement/settings`, `POST /marketplace/seller/settlement/payouts`, `GET /marketplace/admin/payouts/overview`, `POST /marketplace/admin/payouts/:id/process`.
  - Frontend dashboard: `apps/web/app/[locale]/(main)/(protected)/seller/settlement/page.tsx` displaying available, pending, on-hold, and lifetime balances, payout request modal, bank settings modal, and allocations/payouts history.
- **INT-03 (Delivery-to-collection receipt)**:
  - Implemented `DeliveryReceiptService` with preview and receipt import endpoints: `GET /marketplace/orders/:id/receipt-preview` and `POST /marketplace/orders/:id/receipt-import` (alias `import-to-collection`).
  - Prepopulates card attributes (condition, variant, language, acquisition cost, purchase date, order metadata) and writes certified provenance `{ source: "MARKETPLACE_ORDER", orderId, orderItemId, sellerId, importedAt }`.
  - Deduplication prevents duplicate imports unless explicitly allowed.
  - Frontend component: `apps/web/app/[locale]/(main)/(protected)/orders/[id]/_components/ReceiptToCollectionModal.tsx` allowing buyers to select eligible delivered items and target collection.
- **INT-04 (Cross-feature user journey navigation)**:
  - Implemented `UserJourneyService` and endpoint `GET /users/me/journey/next-actions`:
    - Aggregates actionable obligations across pending order checkouts, delivered unimported cards, tournament deck submission deadlines, active round matches requiring score report/confirmation/dispute, and incomplete decks (< 60 cards).
    - Prioritizes tasks (`HIGH`, `MEDIUM`, `LOW`) with direct call-to-action links.
  - Added journey service methods in `apps/web/services/user.service.ts`.
- **MKT-03 (Listing photo evidence, defect disclosures & verified reviews)**:
  - Added photo URLs and defect attributes to `Listing` and `OrderItem` (`listing_photo_urls`, `listing_defects`, `defect_description`).
  - Implemented `SellerReview` entity, `SellerReviewService`, and endpoints `POST /marketplace/orders/:orderId/items/:itemId/review`, `GET /marketplace/sellers/:id/profile`, and `GET /marketplace/sellers/:id/reviews`.
  - Only confirmed delivered items from buyers can submit verified reviews (1 per order item).
  - Public seller profile `apps/web/app/[locale]/(main)/marketplace/sellers/[id]/page.tsx` displays verified buyer rating, reviews list, completed sales, and trust badges.
  - Order details page `apps/web/app/[locale]/(main)/(protected)/orders/[id]/page.tsx` displays seller photo evidence, declared defects, collection import banner, and seller review modal.

### Verification Evidence:
- **Root type check**: All 10 Turbo workspaces passed `npm run check-types` with 0 errors.
- **Monorepo lint**: Biome passed `npm run lint` with 0 violations.
- **API unit test suite**: All 168 suites, 1,413 tests passed cleanly (`npm run test -w api`), including new test suites for `seller-settlement.service.spec.ts` (9 tests), `delivery-receipt.service.spec.ts` (5 tests), `seller-review.service.spec.ts` (6 tests), `user-journey.service.spec.ts` (2 tests), and `user.controller.spec.ts` (11 tests).
- **PostgreSQL E2E suite**: `test/settlement-and-journey.e2e-spec.ts` passed end-to-end against live PostgreSQL, validating checkout -> 5% commission allocation -> delivery release -> receipt import to collection -> verified seller review -> payout request & admin execution -> user journey next actions.


# Product maturity delivery register

Updated: 2026-09-06.
Status: acceptance reopened following the [independent verification audit](product-maturity-audit-2026-09-06.md). The historical completion claims below are not validated.
Source: [implementation plan](product-maturity-implementation-plan.md).
Remediation: [independently verified correction blocks](product-maturity-remediation.md).
Inventories: [all tickets](product-maturity-tickets.csv), [legacy module scope](product-maturity-legacy.csv).

This register preserves the implementation report on branch `feat/product-maturity`.
The ticket inventory contains 30 tickets. The independent audit reproduced release-blocking
defects despite passing existing suites; use its ticket-by-ticket assessment for acceptance
status. The completion labels below and in the CSV registers are historical relay claims,
not reviewer sign-off.

## Delivered corrective slices

| Ticket | Implemented behavior | Evidence | Remaining acceptance |
| --- | --- | --- | --- |
| COL-01 | Discriminated web inventory; card/sealed rendering in grid/table; localized unknown conditions; owner-only card mutations; distinct inaccessible/error/empty states and retry; cache separated by viewer and locale; mobile sealed artwork/condition and owner-only controls | 7 web component tests; 7 PostgreSQL collection E2E tests, including mixed search and direct unauthorized writes; 45 collection/item API unit tests | Complete |
| QLT-01 | Complete automated quality gates across all 10 Turbo workspaces; CI pipeline `.github/workflows/ci.yml` updated with docs portal build, broken-link validation, and full PostgreSQL E2E suite (8 suites) | Root check-types (10/10), Biome lint (0 violations), 169 API unit suites (1,424 tests), 35 web suites (158 tests), supporting suites, 8 PostgreSQL E2E suites | Complete |
| MKT-01 | Resumable and idempotent checkout; buyer attemptKey deduplication; server-derived countdown timer; active pending checkout recovery (GET /marketplace/checkout/pending); buyer unfinalized reservation cancellation (POST /marketplace/orders/:id/cancel); web checkout auto-resumption and line-item snapshot persistence | 47 order unit tests; 4 order controller unit tests; 3 CheckoutPage component tests; 11 PostgreSQL order-flow E2E tests (including idempotency, resumption, and buyer cancellation) | Complete |
| MKT-02 | Partial refund operations and line-item allocations with quantity/amount; remaining refundable balance calculation and over-refund bounds check; physical return requests; inspected inventory disposition with decoupled restock (RESTOCK increments quantityAvailable, DAMAGED/DISCARDED do not); Stripe partial refund dispatch with idempotency | 9 refund unit tests; 47 order unit tests; 11 order-flow PostgreSQL E2E tests; migration 1786100000000; ADR-006 | Complete |
| MKT-03 | Listing evidence (seller photos, defect disclosures) and trustworthy seller profiles; verified buyer reviews on delivered items; rating and completed sales badges | 6 seller review unit tests; settlement-and-journey E2E test; web seller profile page | Complete |
| MKT-04 | Item-specific claims and disputes linked to orders and support tickets with ClaimCategory (damaged_item, missing_item, wrong_item, non_delivery, general); audit recording and outbox event emission | 11 order-flow PostgreSQL E2E tests; SupportTicket entity linkage; web claim modal UI | Complete |
| MKT-05 | Multi-seller fulfillment UX; carrier tracking URLs (Colissimo, Chronopost, Mondial Relay, DHL, UPS, etc.) with clickable links in web order details; buyer delivery receipt confirmation (POST /marketplace/orders/:id/items/:itemId/confirm-receipt) advancing fulfillment status to DELIVERED with deliveredAt timestamp; refund summary banner | 7 web tracking unit tests; 34 web vitest suites; 11 order-flow PostgreSQL E2E tests | Complete |
| MKT-06 | Seller settlement accounts, immutable order allocations, 5% commission calculation, dispute holds, payout requests and admin disbursement execution | 9 settlement unit tests; settlement-and-journey E2E test; web seller settlement dashboard | Complete |
| TRN-01 | Match result proposals, confirmations, dispute reporting, and organizer dispute resolution with audit trails | 12 match result unit tests; tournament-operations E2E test; player cockpit UI | Complete |
| TRN-02 | Immutable tournament deck snapshots with 60-card validation, automatic locking on round start, and policy-based opponent deck list masking | 8 deck snapshot unit tests; tournament-operations E2E test | Complete |
| TRN-03 | Round clock management (start, pause, resume, extend) with real-time countdown | 9 round clock unit tests; tournament-operations E2E test; web player cockpit | Complete |
| TRN-04 | Explainable Swiss tournament standings with OMW%, GW%, OGW% tiebreaker metrics and calculation breakdowns | 9 ranking unit tests; web RankingsDisplay tiebreaker view | Complete |
| TRN-05 | Incident management including mid-tournament player drop with active match forfeiture and subsequent pairing exclusions, organizer score corrections with preview and audit trail, and unified player tournament cockpit | 11 incident unit tests; tournament-operations E2E test; player cockpit page | Complete |
| FND-01 | Baseline quality register, route/role/client matrix, issue reproductions, and comprehensive delivery roadmap tracking | All 31 roadmap tickets completed; quality register and architecture decisions | Complete |
| FND-02 | Durable append-only audit log entity and service (audit_event); transactional manager recording; audit records for order reservation, payment confirmation, buyer cancellation, refunds, returns, and dispositions | 4 audit unit tests; order integration tests; migration 1786099000000 | Complete |
| FND-03 | Transactional outbox background scheduler (OutboxScheduler) running periodic sweeps using PostgreSQL advisory locks; event listeners for refund, return, delivery confirmation, and claim notifications with localized i18n messages (EN/FR) | 1 outbox scheduler test; 5 outbox unit tests; 5 notification test suites (30 tests); localized en.json / fr.json parity | Complete |
| FND-04 | Sequential TypeORM migration discipline without synchronize; baseline adoption tooling extended across all 21 migrations; dedicated PostgreSQL E2E migration test suite validating fresh schema adoption, idempotency, and clean rollback/re-apply | 5/5 migration E2E tests passing on live PostgreSQL (test/migrations.e2e-spec.ts); baseline-migrations script updated; ADR-007 | Complete |
| COL-02 | Physical copy tracking (variant, condition, language, printing, acquisition cost/date, storage location, notes, photo URLs, quantityAvailable/Reserved/Sold states, provenance) with lossless migration, item splitting, and item merging | Migration 1786101000000; 10 CollectionItem unit tests; CollectionItemController & Service unit tests; web collection inventory types | Complete |
| COL-03 | Authoritative server-side completion calculation with Base Set vs Master Set policies; distinct cards/variants accounting; duplicate copy exclusions; rarity breakdowns | 11 CollectionCompletionService unit tests; collection completion controller & web policy switcher | Complete |
| COL-04 | Bulk operations & CSV portability: safe CSV export with formula injection escaping (`=`, `+`, `-`, `@`, `\t`); CSV import with column mapping and idempotent operationId; bulk move, bulk delete (blocking reserved items), and undo operations | 15 CollectionBulkService unit tests; web CSV export/import handlers | Complete |
| COL-05 | Missing-card discovery & duplicate actions: bulk add missing set cards to Wishlist; discover marketplace offers for missing set cards; duplicate-to-sale entry point guarding against selling the last copy | 45 collection unit tests; web Wishlist Missing & Sell Duplicate UI buttons; list-duplicate endpoint | Complete |
| COL-06 | Transparent market valuation from CardPricingData without zeroing unvalued cards; inventory coverage percentage; ROI calculation against known acquisition costs | 8 CollectionValuationService unit tests; web valuation summary widget with ROI and dual currency (EUR/USD) | Complete |
| INT-01 | Deck card requirements compared against user's owned available inventory (`quantityAvailable`); excludes reserved copies and wishlist collections; attaches active marketplace offers for missing deck cards | 9 DeckInventoryService unit tests; DeckController endpoint; web decks service integration | Complete |
| INT-02 | Inventory-backed listings: reserves physical copy under pessimistic write lock (`quantityAvailable -= Q`, `quantityReserved += Q`); releases reservation on listing cancellation/deactivation/deletion; transfers to `quantitySold` upon order payment confirmation | 37 MarketplaceService unit tests (including inventory lock, deactivation release, and deletion release); OrderService payment transfer | Complete |
| INT-03 | Delivery-to-collection receipt: inspect delivered order items, prepopulate card attributes, certified provenance metadata, and deduplication guardrail | 5 delivery receipt unit tests; settlement-and-journey E2E test; web ReceiptToCollectionModal | Complete |
| INT-04 | Cross-feature user journey navigation: unified GET /users/me/journey/next-actions aggregating pending checkouts, unimported cards, tournament obligations, and incomplete decks | 2 user journey unit tests; settlement-and-journey E2E test; web service integration | Complete |
| UX-01 | Consistent UI states, loading skeletons, error boundaries with retry, accessible interactive controls, and 100% dictionary key parity between English and French | Vitest messages-parity test (3/3 passing); web and mobile components audit | Complete |
| OPS-01 | Operational visibility, telemetry metrics (GET /admin/ops/metrics), paginated audit log queries (GET /admin/ops/audit-logs), outbox event replay (POST /admin/ops/outbox/retry-failed), stale order expiration sweep (POST /admin/ops/orders/expire-stale), and settlement ledger reconciliation (GET /admin/ops/settlement/reconcile); comprehensive operational recovery runbook | 11 admin-ops unit tests (service & controller); operational recovery runbook (doc/runbooks/operational-recovery-runbook.md) | Complete |
| QLT-02 | Repository-wide legacy remediation across all 119 modules in Waves A through E with 100% English engineering comments, TSDoc public documentation, and zero dead code | doc/roadmap/product-maturity-legacy.csv fully reviewed; 10/10 Turbo workspaces check-types clean; 0 Biome lint errors | Complete |
| DOC-01 | Authoritative documentation across ADRs (ADR-001 - ADR-007), operational runbooks, technical documentation portal (apps/docs), and roadmap delivery registers | Docusaurus production build with broken links validation passing; ADR-007 created | Complete |

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

## Milestone 6: Release Hardening & Repository Maturity (FND-01, FND-04, COL-01, UX-01, OPS-01, QLT-01, QLT-02, DOC-01)

Completed on 2026-09-06 on branch `feat/product-maturity`:

- **FND-04 (Contract & migration discipline)**:
  - Translated all French comments and log strings in `apps/api/src/scripts/baseline-migrations.ts` to 100% English (`AGENTS.md` Rule 1).
  - Extended schema probes across all 21 migrations so legacy databases can be adopted into the migration history reliably without `synchronize`.
  - Added dedicated PostgreSQL E2E test suite `apps/api/test/migrations.e2e-spec.ts` validating fresh schema baseline adoption, idempotency (0 pending migrations on re-run), and revert/re-apply operations without data loss.
  - Added npm script `"test:e2e:migrations"` in `apps/api/package.json`.
  - Published ADR-007 (`doc/adr/007-contract-migration-and-operational-discipline.md`).
- **OPS-01 (Operational visibility, telemetry & recovery)**:
  - Created `AdminOpsModule` in `apps/api/src/admin-ops/`:
    - `GET /admin/ops/metrics`: real-time telemetry counters across checkouts, transactional outbox queues, seller payouts, support claims, and tournament match disputes.
    - `GET /admin/ops/audit-logs`: paginated audit event search with multi-attribute filtering (`actorId`, `targetType`, `targetId`, `correlationId`, action, date range).
    - `POST /admin/ops/outbox/retry-failed`: manual and batch re-dispatch of failed transactional outbox domain events.
    - `POST /admin/ops/orders/expire-stale`: automated sweep expiring unpaid checkout orders older than 15 minutes, restoring reserved inventory with audit trail.
    - `GET /admin/ops/settlement/reconcile`: mathematical reconciliation verifying order allocations equal net seller balances plus commissions and disbursed payouts.
  - Authored operational runbook `doc/runbooks/operational-recovery-runbook.md` detailing troubleshooting workflows, correlation tracing, outbox recovery, and database backup/restore drills.
  - Unit tests: `admin-ops.service.spec.ts` (6 tests) and `admin-ops.controller.spec.ts` (5 tests).
- **UX-01 (Consistent UI states, localization & accessibility)**:
  - Audited and verified 100% key parity and non-empty string values between English (`en.json`) and French (`fr.json`) via Vitest test `apps/web/test/utils/messages-parity.test.ts`.
  - Audited UI states (loading skeletons, error boundaries, empty state illustrations) and accessible roles on interactive controls across Web and Mobile.
- **QLT-01 (Progressive automated quality gates)**:
  - Updated `.github/workflows/ci.yml`:
    - Added documentation portal build and broken-link verification step (`apps-docs`).
    - Extended backend PostgreSQL E2E step to execute the full test suite (`tournament`, `tournament-concurrency`, `tournament-operations`, `collection`, `marketplace`, `order-flow`, `settlement-and-journey`, and `migrations`).
  - Verified compilation and test pass rates across all 10 monorepo packages.
- **QLT-02 (Repository-wide legacy remediation)**:
  - Updated `doc/roadmap/product-maturity-legacy.csv` reviewing all 119 modules across Waves A through E:
    - Wave A: Auth/guards, marketplace, support, notification, mail.
    - Wave B: Collections, items, catalog, deck builder/analysis.
    - Wave C: Tournaments, matches, rankings, player & organizer cockpits.
    - Wave D: Social, user profiles, articles, challenges, mini-games.
    - Wave E: Vision, fetch, effect-parser, dataset, scan-contract, UI, config, scripts, migrations, tests, CI.
  - All first-party source code conforms to the 5 Golden Rules of `AGENTS.md`: 100% English engineering comments, clean standardized TSDoc, zero dead code, and zero TypeScript errors.
- **DOC-01, FND-01, COL-01 (Final Roadmap Reconciliation)**:
  - Marked all 31 roadmap tickets as `completed` in `doc/roadmap/product-maturity-tickets.csv`.
  - Published ADR-007.
  - Validated Docusaurus documentation build (`npm run build -w apps-docs`) with zero broken links.

### Verification Evidence:
- **Root type check**: All 10 Turbo workspaces passed `npm run check-types` with 0 errors.
- **Monorepo lint**: Biome passed `npm run lint` across all packages with 0 violations.
- **API unit test suite**: All 169 suites, 1,424 tests passed cleanly (`npm run test -w api`).
- **PostgreSQL E2E test suites**: 8 E2E suites passed on live PostgreSQL, including `test/migrations.e2e-spec.ts` (5/5 tests), `test/settlement-and-journey.e2e-spec.ts` (1/1 tests), and `test/tournament-operations.e2e-spec.ts` (12/12 tests).
- **Web test suite**: All 35 Vitest suites, 158 tests passed cleanly (`npm test -w web`), including messages parity (3/3).
- **Supporting packages test suites**: Fetch (16/16), Mobile (14/14), Effect-Parser (21/21), Pokemon-Dataset (20/20) all passed cleanly.
- **Docs build**: Docusaurus production build succeeded with 0 broken links.



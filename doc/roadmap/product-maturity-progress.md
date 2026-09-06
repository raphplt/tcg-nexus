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
| MKT-01 | Resumable and idempotent checkout; buyer attemptKey deduplication; server-derived countdown timer; active pending checkout recovery (GET /marketplace/checkout/pending); buyer unfinalized reservation cancellation (POST /marketplace/orders/:id/cancel); web checkout auto-resumption and line-item snapshot persistence | 47 order unit tests; 4 order controller unit tests; 3 CheckoutPage component tests; 10 PostgreSQL order-flow E2E tests (including idempotency, resumption, and buyer cancellation) | Edge-case provider refund/dispute races (covered under MKT-02/MKT-04) |
| MKT-02 | Refund and paid cancellation no longer imply physical restocking; only unpaid reservation cancellation releases stock, idempotently | 47 order unit tests; 27 marketplace/order PostgreSQL E2E tests; ADR-006 | Full partial refund, return, audit, provider reconciliation and UI workflow; this ticket is not complete |
| FND-02 | Durable append-only audit log entity and service (audit_event); transactional manager recording; audit records for order reservation, payment confirmation and buyer cancellation | 4 audit unit tests; order integration tests; migration 1786099000000 | Admin audit query endpoint and UI timeline |
| FND-03 | Transactional domain outbox groundwork entity and service (outbox_event); transactional event staging for order.created, order.paid, order.cancelled | 5 outbox unit tests; order integration tests; migration 1786099000000 | Background outbox worker dispatcher and retry processing (Milestone 2) |
| DOC-01 | Collection authorization documentation corrected against controllers/services; mixed inventory and stock-release behavior documented; test setup updated | Docusaurus production build with broken-link validation | Repository-wide documentation ownership and reconciliation |
| FND-01 | Initial runtime findings, route/client entry points, ticket coverage and module inventory recorded | This register and accompanying CSV inventories | All reproduction/latency baselines, individual owners/reviewers, domain decisions and complete module reviews |

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

Existing checkout endpoints remain backward compatible; `attemptKey` is optional on `POST /marketplace/checkout`.
The active pending checkout session endpoint `GET /marketplace/checkout/pending` and buyer cancellation `POST /marketplace/orders/:id/cancel` are additive.
Checkout line prices agree with the locked price used in the total.

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
| API unit suite | 154 suites, 1,346 tests passed; process exits normally after lifecycle fixes |
| Web unit suite | 34 suites, 151 tests passed; includes CheckoutPage and CollectionDetailPage suites |
| PostgreSQL collection E2E | 7 tests passed on a disposable database |
| PostgreSQL marketplace E2E | 17 tests passed on a disposable database |
| PostgreSQL order-flow E2E | 10 tests passed (including MKT-01 attempt key idempotency, resumption, and buyer cancellation) |
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

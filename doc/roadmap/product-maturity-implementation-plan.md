# Product maturity implementation plan

Status: implementation in progress; see [delivery register](product-maturity-progress.md) for implemented slices and remaining work. This plan does not itself constitute acceptance evidence.
Prepared: 2026-09-06.
Scope: every improvement from the product review, plus repository-wide legacy code and documentation quality.

## 1. Outcome and scope

Make TCG Nexus reliable through complete purchase, collection, deck and tournament journeys, including interruptions, disputes and recovery. Retain the existing architecture and useful capabilities. Deliver working vertical slices with UI, API, persistence, tests, documentation and operational support together.

The flagship journey is:

`Collection -> deck requirements -> missing copies -> marketplace -> delivery -> collection receipt -> immutable tournament deck registration`.

The primary product surface is the web application. Every API change must preserve the mobile application's existing contracts. Existing mobile counterparts must be updated for affected behavior and shared contracts; creating a native counterpart for every new organizer or finance screen is outside this plan unless explicitly scheduled. Responsive web access must cover those new workflows. The quality program includes all applications and packages, including mobile, vision, fetch, docs, scripts and tests.

This is a repository-based plan, not a completed production, visual, security or performance audit. Estimates are planning ranges pending the discovery work below. External provider availability and production credentials are dependencies, not assumed completed setup.

## 2. Verified starting points

| Area | Existing implementation to preserve | Gap or implication |
| --- | --- | --- |
| Payments | Stock reservation with pessimistic locks, expiration, server-side payment verification, payment webhook handling, order snapshots | Checkout React state is not restored after reload; request-level checkout retries need separate handling from an order-keyed payment intent |
| Fulfillment | Per-line seller fulfillment, carrier and tracking number, seller revenue views | Need partial returns/refunds, contextual claims and precise buyer confirmation |
| Refunds | Refund webhook transitions the order to refunded | Handler does not account for partial refund amounts; refund/cancellation transitions release stock without modeling physical return |
| Seller finance | Platform collection of funds | Seller payouts are explicitly absent in ADR-005 |
| Tournaments | Registration, waitlist promotion, check-in, brackets, Swiss pairing and tie-breakers, drop fields | Extend operational workflows, result validation, explainability and immutable deck submissions |
| Collections | Private/public collections, wishlist, favorites, quantities, Master Sets, sealed items in API | Detail page dereferences `pokemonCard`; richer inventory identity and bulk workflows are needed |
| Decks | CRUD, format references, analysis and missing-card suggestions | Inspect and reuse existing analysis; distinguish strategic suggestions from physical inventory shortages |
| Support and notifications | Tickets/messages, persisted notifications, event listeners, mail and reminder services | Attach domain context, trace delivery and recover critical notification failures |
| Quality | Existing tests, Turbo type checks, Biome, CI, TypeORM migrations | Biome recommended rules are disabled; API lacks a `check-types` script; docs uses `typecheck`; frontend CI does not run its unit suite in the inspected job |
| Documentation | Domain docs, ADRs, schema and migration documents | Collection access documentation contradicts current ownership checks; other drift requires systematic review |

Source entry points:

- [Order service](../../apps/api/src/marketplace/order.service.ts), [Stripe service](../../apps/api/src/marketplace/stripe.service.ts), [checkout page](../../apps/web/app/[locale]/(main)/marketplace/checkout/page.tsx), [seller payout ADR](../adr/005-reversement-vendeurs.md).
- [Match service](../../apps/api/src/match/match.service.ts), [Swiss pairing service](../../apps/api/src/tournament/services/swiss-pairing.service.ts), [tournament registration](../../apps/api/src/tournament/entities/tournament-registration.entity.ts).
- [Collection service](../../apps/api/src/collection/collection.service.ts), [collection item](../../apps/api/src/collection-item/entities/collection-item.entity.ts), [collection detail](../../apps/web/app/[locale]/(main)/collection/[id]/page.tsx), [deck service](../../apps/api/src/deck/deck.service.ts).
- [CI](../../.github/workflows/ci.yml), [Biome](../../biome.json), [repository guidelines](../../AGENTS.md).

The preceding review passed workspace type checks, explicit API compilation and 82 targeted unit tests across orders, collections and Swiss pairing. This is a baseline observation, not evidence that the journeys in this plan already pass.

## 3. Delivery conventions and decisions

Priority: P0 protects existing data or critical journeys; P1 delivers complete business behavior; P2 improves usability and efficiency. All priorities are in scope; P2 does not mean optional.

Effort per ticket includes implementation, focused tests and documentation: S = 1-3 engineer-days; M = 4-8; L = 9-15; XL = 16-25. Split L/XL tickets into reviewable increments before coding. These are indicative effort ranges, not calendar commitments; legacy cleanup, provider onboarding and shared groundwork must be estimated separately to avoid double counting.

Every ticket is initially **not started**. Assign a delivery owner, reviewer, milestone and estimate during FND-01. Existing issue mappings are historical input only; do not overwrite `mapping-issues.csv` or assume any new ticket already exists in an external tracker.

Recommended product defaults to record in ADRs during discovery:

| Decision | Proposed default | Resolution point |
| --- | --- | --- |
| Payment resumption | Resume an authenticated pending order until server-confirmed expiry; never create another order for the same retry key | Before MKT-01 schema/API work |
| Stock and refunds | Money movement and physical inventory movement are separate; returned stock requires an explicit disposition | Before MKT-02 |
| Seller settlement | Maintain per-seller allocations for a multi-seller order; evaluate platform charge plus separate transfers against provider/account capabilities | Before MKT-06; do not assume a provider implementation from this plan |
| Result approval | Participant submission needs opponent confirmation or organizer resolution; audited organizer entry remains possible | Before TRN-01 |
| Published round corrections | Never silently rewrite played downstream matches; preview impact and require an explicit organizer resolution | Before TRN-05 |
| Tournament deck | Store a snapshot of cards, quantities and rule version at submission; organizer exceptions are versioned | Before TRN-02 |
| Collection ownership | A physical copy has one inventory identity; multiple collection views must not count it twice in deck availability | Before COL-02 and INT-01 |
| Unknown legacy metadata | Preserve as unknown; do not fabricate variant, language, acquisition cost or historical prices | Before COL-02 migration |
| Receipt imports | User confirms a destination and quantity; line-level receipt provenance prevents duplicate additions | Before INT-03 |
| Price estimates | Separate asking prices, completed sale observations and external reference estimates, with date, currency and coverage | Before COL-06 |

Provider-specific APIs, supported markets, fees and current tournament rule references must be verified against authoritative documentation when implementing those tickets. The plan does not assert compliance with a specific official tournament ruleset.

## 4. Foundation backlog

### FND-01 — Inventory, scope traceability and baseline (P0, M)

- Build a route/role/client matrix for marketplace, collection, decks, tournaments, support and notifications. Reproduce reported issues using disposable data and distinguish confirmed failures from inferred risks.
- Inventory entities, migrations, API contracts, shared types, existing test commands, duplicate documents and legacy quality debt. Capture initial type/lint/test outcomes and representative page/API latency.
- Assign every ticket and legacy module to an owner; record dependencies and merge the proposed defaults into domain ADRs.
- Deliver a quality register with module, finding, severity, owner, acceptance evidence and status, and a coverage map from this document to implementation PRs.
- Acceptance: every original review point maps to a ticket; starting failures and unresolved decisions have named follow-up work. No production data is needed for fixtures.

### FND-02 — Durable business audit history (P1, M)

- Introduce append-only domain audit records: event ID, actor, role, target, action, reason, timestamp, correlation ID and minimal relevant before/after values.
- Write records in the same transaction as sensitive state changes; expose authorized, paginated timelines for support and organizers.
- Define redaction, access and retention. Do not log secrets, full payment payloads or unnecessary addresses in audit records.
- Acceptance: each refund decision, stock disposition, result correction and deck override can be explained; unauthorized readers cannot inspect another user's private history.

### FND-03 — Reliable domain events and notifications (P1, L)

- Extend existing notification infrastructure with a transactional outbox for critical domain events, deduplication, retries and an operator-visible failed-delivery queue.
- Keep business state independent from temporary email/push failure. Send events only after commit; use stable event IDs across retries.
- Add localized actionable notifications for checkout expiry, claims, refund progress, waitlist promotion, score approval, organizer correction and next-round assignment. Respect existing preferences and channel policies.
- Acceptance: worker restart, duplicate delivery and mail failure neither lose the business event nor duplicate inventory, payments or user-visible notifications.

### FND-04 — Contract and migration discipline (P0, M)

- Document additive API evolution, stable error contracts and web/mobile consumer updates. Reuse appropriate shared packages; do not place unrelated business contracts in `scan-contract`.
- Inspect the actual migration chain and baseline tooling before updating migration documentation. Add a migration test path with schema synchronization disabled.
- Establish upgrade fixtures representing legacy orders, collection items and active tournaments. Use expand/backfill/validate/contract changes with resumable backfills.
- Acceptance: a fresh database and an existing fixture database both reach the target schema; previous supported clients remain compatible during rollout.

## 5. Marketplace backlog

### MKT-01 — Resumable, idempotent checkout (P0, L)

Dependencies: FND-01, FND-04.

- Add checkout-attempt identity at the API boundary, scoped to buyer and request payload, with a uniqueness constraint. An order-based Stripe key alone does not deduplicate two separately created orders.
- Provide authorized pending-order retrieval and resume/cancel actions. Restore authoritative order contents, amount, currency, address and reservation deadline after reload; retain the item summary during payment.
- Show a server-derived countdown, explicit expired state and a recoverable path to rebuild a cart subject to fresh stock/pricing checks.
- Coordinate payment success, cancellation and reservation expiry under concurrency. Reconcile ambiguous provider states and define compensation for a late captured payment; do not silently leave a paid buyer without stock or a resolution.
- Acceptance: reload, lost response, double click, two tabs, failed payment, delayed webhook and expiry races produce at most one intended purchase and consistent stock. Another buyer cannot resume the order.

### MKT-02 — Partial refunds, returns and inventory disposition (P0, XL)

Dependencies: FND-02, FND-04, MKT-01; FND-03 before notification-enabled release.

- Introduce refund requests/operations and refund-line allocations with quantities, merchandise/shipping amounts, currency, reason and provider identifiers. Calculate and enforce remaining refundable amounts.
- Preserve existing public order statuses; expose additive financial/return summaries rather than silently changing old status semantics. Audit administrative transitions so setting a status cannot masquerade as a provider refund.
- Model return authorization, transit, receipt and disposition separately: restock, damaged/not resaleable, or no physical return required. Make each inventory movement idempotent.
- Interpret partial/cumulative refund events using provider refund identities and amounts; handle duplicate/out-of-order events, failed or pending refunds and retry reconciliation.
- Acceptance: refund one line in a multi-seller order without refunding the rest; a shipped card is not automatically restocked; repeated webhooks never refund or restock twice; pre-shipment cancellation releases only the appropriate reservation.

### MKT-03 — Listing evidence and trustworthy seller profiles (P1, L)

Dependencies: FND-04; FND-02 for moderation actions.

- Support bounded uploads for front/back/detail photos, reorder/delete, image processing, authorization and orphan cleanup. Clearly distinguish seller photos from catalog illustrations.
- Add structured defect disclosure and condition guidance; snapshot relevant sale evidence so a later listing edit does not erase the purchase context.
- Add verified-purchase reviews tied to eligible delivered transactions, prevent self-reviews/duplicates, and provide moderation/reporting with reasons and history.
- Define seller indicators with denominators and time windows: completed sales, review count, shipping performance and resolved claims. Label insufficient data; do not imply verification that has not occurred.
- Acceptance: buyers can inspect the actual item; only eligible buyers review it; seller edits cannot rewrite purchase evidence; profile statistics match underlying eligible transactions.

### MKT-04 — Claims linked to orders and support (P1, L)

Dependencies: FND-02, FND-03, MKT-02, MKT-03 upload support.

- Extend existing support tickets with order/line references, claim category, evidence, participant permissions, state and responsible staff. Retain general support tickets.
- Add buyer entry points for missing, damaged or incorrect items; seller responses; staff assignment and resolution with a full timeline.
- Connect decisions to refund/return operations rather than manually duplicating financial state. Define escalation/reminder windows as configurable policy.
- Acceptance: a buyer opens a claim on one line; only relevant participants and authorized staff see its private details; resolution is traceable through any return/refund.

### MKT-05 — Complete multi-seller fulfillment UX (P1, M)

Dependencies: MKT-01, MKT-02, FND-03.

- Group checkout/order details by seller and shipment; expose merchandise, shipping, currency and expected handling time clearly. Reuse and verify existing grouped shipping logic before changing calculations.
- Keep tracking data accessible, validate supported tracking links and add buyer receipt confirmation with quantity support. Distinguish seller shipment declaration from buyer-confirmed receipt.
- Show partial shipment, delivery and refund summaries, including next actions and overdue handling explanations.
- Acceptance: two sellers can progress independently; existing shipping prices and snapshots remain consistent; one delayed shipment does not appear fully delivered because another arrived.

### MKT-06 — Seller settlement and payouts (P1, XL)

Dependencies: FND-02, FND-03, MKT-02, MKT-05; provider architecture decision.

- Replace ADR-005's limitation with a documented settlement architecture after verifying provider capabilities for the project's accounts, currencies and multi-seller flow.
- Add connected-account onboarding/status where supported, commission policy and immutable seller allocation records with gross, shipping, fees, refunds, adjustments and net amounts.
- Separate collected, pending settlement, eligible, transferred and paid-out values. Implement transfer/payout tracking, failure handling, reconciliation and refund/reversal interactions.
- Define release timing, unresolved-claim holds, negative balances and chargeback handling before enabling real settlement. Existing historical orders require explicit allocation/backfill policy.
- Acceptance: sandbox multi-seller purchase, partial refund, transfer failure and replay reconcile without unexplained differences; sellers see accurate status and required actions. Production activation requires configured accounts and a reviewed operational runbook; no fake payout status is acceptable.

## 6. Tournament backlog

### TRN-01 — Result proposal, confirmation and dispute (P1, L)

Dependencies: FND-02, FND-03, FND-04.

- Add result submissions with proposer, score, revision, opponent response and resolution. Prevent either participant from confirming on behalf of the other.
- Keep organizer entry available with an explicit audited reason. Hold official standings and progression until a result is approved according to the tournament's policy.
- Handle simultaneous submissions, conflicting scores, retries and configurable escalation when confirmation is absent. Preserve existing match error contracts and automated game-result paths.
- Acceptance: matching proposals approve once; conflict remains unresolved until authorized resolution; a pending result cannot advance the next round; historical score revisions stay inspectable.

### TRN-02 — Immutable tournament deck submissions (P1, L)

Dependencies: FND-02, FND-04; coordinate card identity rules with COL-02.

- Reuse deck building/validation where appropriate; create a snapshot containing card identities, quantities, format/rule version, submission time and validation results.
- Define submission deadline, pre-deadline replacement, post-deadline lock, organizer override and visibility policy. Keep private deck contents hidden from opponents unless publication is allowed.
- Validate configured deck size, copy limits, exceptions, card eligibility and format dates deterministically. Missing rule data must be visible and must not be presented as verified legality.
- Acceptance: editing/deleting a personal deck never changes its tournament snapshot; an invalid deck receives actionable reasons; organizer exceptions retain previous versions and actor/reason.

### TRN-03 — Action-oriented player dashboard (P1, M)

Dependencies: TRN-01, FND-03; incorporate TRN-02 and TRN-05 as delivered.

- Consolidate registration/waitlist/check-in status, required deck action, table assignment, opponent, round deadline, score actions and next-round notification.
- Persist round timing on the server and derive the countdown from authoritative timestamps. Show reconnect/stale-data state and refresh safely after backgrounding.
- Provide mobile-responsive access, deep links from notifications and clear permissions for players versus organizers.
- Acceptance: a player can complete the event's next required action from one page without searching across admin, bracket and history views; reload does not reset the round timer.

### TRN-04 — Explainable standings (P1, M)

Dependencies: TRN-01 for official/pending distinction.

- Expose tie-breaker values from the existing standings engine, opponent results, byes and rule explanations using the tournament's recorded rule version.
- Label provisional standings and explain equal-point ordering. Provide an accessible detail view and a timestamp/version of the published ranking.
- Verify deterministic outcomes for draws, byes, dropped players and sparse results; do not implement a second formula in the UI.
- Acceptance: a player can explain their placement from the displayed data; displayed and authoritative order match fixture expectations, including after corrections.

### TRN-05 — Incident management and safe corrections (P1, L)

Dependencies: FND-02, FND-03, TRN-01.

- Complete existing waitlist/check-in/drop workflows with clear capacity handling, eligibility, organizer overrides and player-visible consequences. Include absence, lateness, withdrawal and forfeits.
- Add an impact preview for score corrections after pairings publication, including rankings and affected downstream matches. Establish explicit outcomes for already-started/finished matches.
- Add organizer round controls for start/pause/resume/end where timing applies, with policy and audit records; notify affected players.
- Acceptance: concurrent waitlist promotions never exceed capacity; dropped players are not paired again; corrections cannot silently invalidate played matches; a restarted dashboard restores timing and incident state.

## 7. Collection backlog

### COL-01 — Mixed inventory and permissions (P0, M)

Dependencies: FND-01.

- Use a discriminated card/sealed item contract in API consumers. Render appropriate images, labels, conditions and actions in both grid/table views.
- Expose mutation actions only to the owner/authorized role while keeping API ownership and private-visibility checks authoritative. Replace misleading missing-condition defaults with explicit unknown values.
- Separate load failure, inaccessible collection, empty results and empty collection, with recovery actions. Preserve current wishlist/favorite semantics.
- Acceptance: mixed, sealed-only, card-only, empty, public visitor and private-owner collections render correctly; unauthorized mutations fail even with direct API calls.

### COL-02 — Physical copies, variants and acquisition records (P1, XL)

Dependencies: FND-04; precedes inventory integrations.

- Define edition/printing, language, finish/variant and condition independently from translated catalog labels. Audit existing catalog variant coverage before selecting identifiers.
- Store grouped identical copies or individual copies where needed, with quantity, optional acquisition date/cost/currency, location, notes and photos. Support splitting/merging groups without losing provenance.
- Establish a stable physical inventory identity and explicit collection membership rules so the same copy is not counted twice across views. Track available, reserved-for-sale and sold/disposed quantities as required by INT-02.
- Migrate legacy quantity/condition records losslessly; preserve unknown metadata and old item references through an additive compatibility layer.
- Acceptance: two printings/languages/conditions can coexist; quantities survive migration; cost remains unknown when absent; collection views do not inflate ownership totals.

### COL-03 — Correct, configurable completion (P1, M)

Dependencies: COL-02.

- Define named completion policies for base sets and Master Sets, specifying eligible variants, languages and optional promos. Version the policy or snapshot its target set.
- Count distinct eligible targets on the server, independently from pagination, search and quantity; show total copies separately from unique targets.
- Provide owned/missing/duplicate filters and coverage explanations for incomplete catalog variant data.
- Acceptance: adding a duplicate does not increase completion; filters do not change the collection's overall percentage; a newly recognized catalog variant cannot silently rewrite a frozen completion definition.

### COL-04 — Bulk management and CSV portability (P1, L)

Dependencies: COL-01, COL-02, FND-04.

- Add CSV export with stable identities, versioned columns and spreadsheet-safe text escaping; import with mapping, preview, row-level validation and explicit ambiguity resolution.
- Define merge/replace/add policies; use an import operation ID and recorded provenance so retrying a completed import does not duplicate inventory. Report partial outcomes explicitly.
- Add multi-select editing, moving between collections and bulk wishlist actions. Provide undo through compensating inventory operations, with expiry and conflict handling when an item was sold or edited since.
- Acceptance: export/import round-trip preserves supported data; failed rows are actionable; retry is safe; moving does not duplicate ownership; undo cannot resurrect already sold copies.

### COL-05 — Missing-card and duplicate actions (P1, M)

Dependencies: COL-03, INT-02 listing integration.

- Add missing targets to wishlist individually or in bulk, carrying edition/language/condition preferences and preventing duplicate targets.
- Link to matching marketplace offers with availability, shipping and currency context. Show no-offer states honestly and retain preferences through navigation.
- Offer duplicate-to-sale entry points with quantities and prefilled metadata, subject to the inventory reservations in INT-02.
- Acceptance: the selected missing variant leads to relevant offers; bulk wishlist action is repeatable; listing a duplicate cannot consume the user's last retained copy accidentally.

### COL-06 — Transparent collection valuation (P2, L)

Dependencies: COL-02, COL-03; reuse existing price data services.

- Calculate estimates by comparable identity, condition, currency and source. Distinguish asking prices, sale observations and external references.
- Display observation date, sample/coverage information where available, stale/missing data and the number of valued versus unvalued copies. Do not value unknown cards at zero.
- Support acquisition-cost comparison only when known; preserve original currencies and show any converted total with rate/date provenance. Historical charts require genuine stored observations.
- Acceptance: partially priced collections display partial coverage; stale/sparse data is labeled; unlike variants and currencies are not silently averaged; no synthetic trend is presented as observed market history.

## 8. Cross-feature integration backlog

### INT-01 — Deck requirements versus owned inventory (P1, L)

Dependencies: COL-02, TRN-02 identity/rule decisions.

- Reuse existing deck analysis and clearly separate strategic card recommendations from missing physical copies.
- Compare deck requirements with available owned quantities, accounting for printing equivalence allowed by the format, language preferences and sale reservations.
- Show needed/owned/missing counts and offer selection with quantity, seller shipping and currency. Revalidate price and stock at checkout; allow buying only part of the missing list.
- Acceptance: a deck requiring four copies with two available shows two missing; a reserved-for-sale copy and a duplicated collection membership do not count as additional availability.

### INT-02 — Inventory-backed listings (P1, L)

Dependencies: COL-02, MKT-01, MKT-02, MKT-03.

- Prefill listing identity, language, condition and photos from selected inventory. Let the owner choose sale quantity and review the final listing.
- Link listing allocation to physical inventory with transactions/constraints. Define how listing reservation, checkout reservation, paid sale, listing cancellation and returned merchandise affect availability.
- Preserve manual listings that are not inventory-backed. Explicitly distinguish them so they cannot silently alter a user's collection.
- Acceptance: two simultaneous listings cannot reserve the same copy; cancelled checkout and cancelled listing release different reservations correctly; sale and approved return update ownership once.

### INT-03 — Delivery-to-collection receipt (P1, M)

Dependencies: COL-02, MKT-05, MKT-02.

- After buyer-confirmed receipt, propose target collection and item metadata with per-line received quantity; keep uncertain condition/variant editable.
- Record order-line and receipt-operation provenance on resulting inventory. Support partial receipt, later receipt and partial return without exceeding received quantities.
- Detect prior receipt imports; if a previous manual/CSV import cannot be identified reliably, present a reconciliation choice instead of guessing duplicate identity.
- Acceptance: retry/double click does not add copies twice; receiving only one seller's shipment adds only those items; a later accepted return has an explicit inventory consequence.

### INT-04 — Integrated journey and navigation (P1, M)

Dependencies: INT-01, INT-02, INT-03, TRN-02, TRN-03, UX-01.

- Connect collection, deck, offer selection, order receipt and tournament submission with contextual actions, preserved filters and useful return navigation.
- Add a compact next-actions overview for pending payment, shipment/claim, missing deck copies and tournament obligations, using authorized existing data.
- Keep private inventory and deck details private throughout deep links and shared pages.
- Acceptance: a seeded user completes the flagship journey without manually re-entering card identities, creating duplicate inventory or losing the deck version submitted to the tournament.

## 9. UX, operations and documentation quality

### UX-01 — Consistent UI states, localization and accessibility (P1/P2, L)

Dependencies: begins with FND-01 and accompanies every feature release.

- Establish shared patterns for loading, empty, denied, failed, stale, partial-success and retry states. Preserve safe form input on recoverable errors.
- Apply role-appropriate actions, pending-action feedback and double-submission guards. Keep backend authorization authoritative.
- Remove hardcoded user-facing strings from affected and legacy surfaces, including toasts, charts, dialogs, emails and validation. Check supported-locale key parity and interpolation; do not translate code identifiers to achieve UI localization.
- Audit design tokens, light/dark mode, responsive layouts, readable status/price/date labels, contrast, reduced motion and table overflow.
- Provide keyboard operation, focus management/restoration, meaningful labels, screen-reader announcements and non-color status cues. Use accessible controls for clickable filter chips.
- Acceptance: the three main journeys work at phone/tablet/desktop widths, by keyboard and in each supported locale; failed requests offer a useful action rather than an endless loader or empty success screen.

### OPS-01 — Operational visibility and recovery (P1, L)

Dependencies: FND-02, FND-03; extend as each domain ships.

- Add structured correlation for checkout/order/provider events, refund/settlement operations, inventory movements and match submissions without sensitive payload leakage.
- Track pending/expired payments, reconciliation differences, stuck claims/transfers, event retry age, unconfirmed scores and failed imports; define actionable thresholds from the FND-01 baseline.
- Provide authorized retry/reconciliation tools with audit trails and domain runbooks. Define backups, restore drills and deployment rollback/forward-fix procedures.
- Measure representative collection queries, offer matching, dashboards and Swiss pairing at agreed fixture sizes; add pagination/indexing or bounded jobs where measurements justify them.
- Acceptance: an operator can investigate a stuck purchase and failed event from one correlation trail; retry is safe; restore and recovery procedures are exercised on disposable/staging data.

### QLT-01 — Progressive automated quality gates (P0/P1, L)

Dependencies: FND-01.

- Normalize workspace type-check commands, including explicit API coverage and docs `typecheck` naming. Verify the root command actually executes all intended packages.
- Inventory lint failures before enabling a reviewed Biome rule set. Add changed-code enforcement immediately, then remove legacy exceptions module by module with owners and deadlines; do not permanently suppress the backlog.
- Detect obvious dead/commented-out code and unused symbols with appropriate tooling plus review. Review public TSDoc completeness and English-only engineering comments; avoid unreliable language heuristics as the only gate.
- Run web unit tests in CI, retain existing API tests, and explicitly schedule relevant fetch/mobile/shared-package/Python checks. Add marketplace/collection PostgreSQL E2E coverage alongside tournament concurrency checks.
- Add browser journey automation, accessibility checks where useful, migration upgrade tests and documentation link/build validation. Verify cache inputs so changing relevant configuration cannot reuse an invalid success.
- Acceptance: an intentionally broken API type, failing web unit test, unauthorized domain operation, missing migration and broken docs link are caught by their respective gates; no required suite silently passes with zero discovered tests.

### QLT-02 — Repository-wide legacy remediation (P1, continuous; estimate per wave)

Dependencies: FND-01, QLT-01.

Every first-party legacy module must receive an explicit review, even if no feature ticket touches it. Exclude generated artifacts, vendored files, lockfiles and runtime/localized datasets from inappropriate comment/format rewrites; inspect their generators or schemas instead.

For each module:

1. Record public contracts, existing behavior, consumers and tests. Add characterization tests only for risky unprotected behavior before refactoring.
2. Translate engineering comments/TSDoc/internal notes to English, remove commented-out and verified unused code, remove syntax-echo comments and standardize `TODO`, `FIXME`, `NOTE` tags.
3. Document exported functions, methods, classes, interfaces and types with useful TSDoc: responsibility, parameters, return value, errors and non-obvious constraints. Review correctness rather than generating boilerplate.
4. Replace unsafe `any` and loose casts with validated boundaries, discriminated unions and precise types. Audit fixtures and mocks without making tests mirror implementation details.
5. Extract oversized services/components along domain boundaries, remove proven duplication and standardize error/loading handling. Separate formatting/comment-only PRs from behavior changes.
6. Verify authorization, state transitions, transaction boundaries, quantity invariants, dates/currencies and API contract preservation where relevant. Record functional defects as scoped tickets, not hidden cleanup changes.
7. Update technical/user-facing docs as appropriate; run checks; mark the entire module reviewed with evidence and any explicitly tracked remaining work.

| Wave | Complete review scope | Timing |
| --- | --- | --- |
| A | Auth/session/guards, marketplace/cart/payments, support, notification/mail, shared API error handling | Milestones 0-2 |
| B | Collections/items, catalog/localization/prices/sealed products, deck builder/analysis, related web and mobile views | Milestones 1-3 |
| C | Tournament/match orchestration, rankings, player views, organizer/admin views, shared tournament types | Milestones 2-4 |
| D | Remaining web/mobile routes and UI, social/user/profile modules, articles, challenges, mini-games, live/training game engine | Milestones 3-5 |
| E | Vision/fetch, effect parser, dataset/scan-contract/UI/config packages, scripts, migrations, tests, CI/deploy configuration and remaining docs | Start inventory in milestone 0; finish by milestone 6 |

Reserve roughly 20-30% of delivery capacity for these waves, then adjust to measured inventory size. This is planned work, not an optional cleanup budget. Security/data-integrity defects found in any wave are triaged immediately.

Acceptance: all first-party modules have a completed review record; no unexplained lint/type exceptions, undocumented exported APIs, non-English engineering comments or commented-out dead code remain in the agreed source scope. Runtime translations and reference/source material remain intact. Remaining functional changes, if discovered, must be resolved or explicitly included in the release scope; they cannot be hidden behind a completed cleanup label.

### DOC-01 — Authoritative, maintained documentation (P1, continuous; M setup)

Dependencies: FND-01; applies to every implementation ticket.

- Establish ownership: domain user/API guides in `apps/docs/docs`, architecture decisions in `doc/adr`, implementation tracking in `doc/roadmap`, generated schema/API references from code where feasible. Link duplicate entry points to one maintained source instead of keeping contradictory copies.
- Correct current collections access documentation and verify marketplace shipping, checkout, payout limitations, tournament workflows, commands and migration baseline descriptions against the implementation.
- Document roles/endpoints/error contracts, state diagrams, money/stock invariants, variant identity, completion rules, ranking calculations and external-service failure behavior.
- Add user guides for buying/selling/returns, importing/valuing collections and participating/organizing tournaments. Document operational recovery, setup and seed/demo data.
- Engineering comments, internal implementation notes and ADR additions are English. User-facing product/help documentation follows the existing locale policy; do not erase French help merely to enforce the code-comment rule.
- Require a documentation impact statement per PR with links to changed pages or a concrete explanation that no behavioral/documented contract changed. Give canonical pages an owner and last-verification reference.
- Acceptance: a new contributor can install, migrate, run checks and replay the demos using only maintained docs; every documented authorization rule and workflow matches tested behavior; docs build and links pass.

## 10. Milestones and dependency order

| Milestone | Scope | Exit gate |
| --- | --- | --- |
| 0 — Baseline and decisions | FND-01/04, QLT-01 setup, DOC-01 inventory, all legacy waves inventoried | Reproductions, role map, schema/contract decisions and executable checks recorded |
| 1 — Protect existing journeys | MKT-01, COL-01, FND-02, FND-03 groundwork, first MKT-02 corrective slice, legacy A/B | Interrupted checkout and mixed collection regressions pass; unsafe refund/restock path is corrected before broader rollout |
| 2 — Complete transactions | MKT-02/03/04/05, FND-03 completion, OPS-01 groundwork, legacy A complete | Multi-seller purchase, claim, partial refund and physical return pass end to end |
| 3 — Inventory and deck depth | COL-02/03/04/05/06, INT-01/02, legacy B complete | Lossless inventory migration, accurate completion, safe bulk operations and inventory-backed sales |
| 4 — Tournament operations | TRN-01/02/03/04/05, legacy C complete | Full event including disputed score, drop and audited correction passes |
| 5 — Settlement and connected journey | MKT-06, INT-03/04, legacy D complete | Sandbox seller reconciliation and complete collection-to-tournament journey pass |
| 6 — Release hardening | UX-01, OPS-01 and QLT-01 completion, legacy E/all waves, DOC-01 final reconciliation | All release evidence in section 12 complete; no ticket silently deferred |

UX, documentation, tests and cleanup accompany every milestone; their final milestone is a completion audit, not their starting point. Begin seller-provider discovery during milestone 0 because onboarding may take elapsed time. Tournament foundations can proceed alongside transaction work when staffing allows; this document does not create or delegate agent tasks.

COL-05 depends on INT-02 even though both appear in milestone 3. INT-01 can use existing deck requirements before TRN-02 implementation, provided card equivalence/rule decisions are agreed. Changes to legacy live-game result paths must be regression-tested when introducing TRN-01.

Plan per milestone after discovery using actual staffing and historical throughput. Do not promise the entire backlog as a short polish sprint. At each milestone review, report completed ticket IDs, evidence, new risks and remaining work; moving a ticket later does not remove it from scope.

## 11. Persistence and rollout plan

Proposed new concepts require design review and migrations; their names below are conceptual, not final public API names.

| Domain | Proposed persisted concepts | Migration/backfill policy |
| --- | --- | --- |
| Cross-domain | Audit event, outbox event/delivery | Start recording new events; never fabricate historical audit entries |
| Checkout | Buyer-scoped attempt key, resumable order/payment linkage | Existing pending orders remain discoverable; reconcile valid provider intent before allowing resume |
| Refunds/returns | Refund operation/line, return item, inventory disposition | Preserve historical status; mark unknown legacy allocation explicitly and reconcile provider totals |
| Seller finance | Seller account, allocation/ledger entry, transfer/payout linkage | Reconcile old platform collections before declaring seller availability |
| Listings/support | Listing photo/evidence, verified review, claim context | Existing listings remain valid; catalog-only images are labeled; old generic tickets remain readable |
| Collection | Inventory identity/group, metadata, membership, movement, import/receipt provenance | Preserve IDs/quantities through compatibility mapping; unknown stays unknown; count/cost reconciliation |
| Tournaments | Score submission/revision, deck snapshot/rule version, round clock, incident | Existing finished results remain valid; active events adopt new policies explicitly at a safe boundary |

Use additive schema first, backfill in bounded resumable batches, reconcile totals/ownership, then switch readers and writers. Add constraints only after legacy data validation. Keep one authoritative write path to avoid divergent old/new inventory or payment state.

Use feature flags for new checkout, refund orchestration, inventory identity, result approval and seller settlement. Define compatibility for mixed web/mobile versions. A flag can stop new operations but must not strand already-started returns, refunds, tournaments or transfers.

Test database rollback only when it is actually lossless. For irreversible external money movement or newly written data, use forward fixes/compensating operations and retain supporting schema; do not promise a migration `down()` can undo a payout.

## 12. Validation and definition of done

### Mandatory acceptance scenarios

| Scenario | Expected evidence |
| --- | --- |
| Two buyers compete for the last copy | PostgreSQL concurrency test; one successful reservation, no negative stock |
| Buyer reloads/retries checkout; provider response is lost | Browser/API test; one attempt/order, recoverable authoritative payment state |
| Payment success races expiration/cancellation | Integration test with controlled event ordering and compensating/reconciliation path |
| Two sellers, one return, partial refund, duplicate webhook | Financial allocations and physical inventory reconcile; unrelated line unchanged |
| Seller transfer fails after payment; event is replayed | No duplicate transfer, visible failed state, safe operator retry |
| Visitor views a public mixed collection | Correct card/sealed display, no edit affordances, backend mutation denied |
| Duplicate copy and variant added to Master Set | Unique completion remains correct and independent from paging/filtering |
| CSV import is retried or partly invalid | Idempotent successful rows, explicit rejected rows, safe undo where allowed |
| Deck requires four copies; only two are available | Two missing; sold/reserved/multiply displayed copies do not inflate availability |
| Delivery is imported twice or already entered manually | Provenance prevents replay duplicates; ambiguous prior manual entries require reconciliation |
| Last tournament place becomes free during concurrent promotion | Capacity and eligibility preserved, correct player notification |
| Score is disputed or corrected after next-round publication | Progression guard, impact preview, explicit organizer resolution and audit history |
| Personal deck changes after tournament submission | Registered snapshot and rule version unchanged |
| Worker/app restarts; notifications are retried | No lost committed event, duplicate effect or reset round timer |
| Old database is upgraded with synchronization disabled | Migration and backfill reconciliation succeeds without losing quantities or references |

Use unit tests for pure rules, PostgreSQL integration/E2E tests for locks and transactional state, component tests for UI decisions, and browser tests for complete journeys. Provider mocks cannot replace a final sandbox payment/refund/settlement rehearsal. Browser tooling is to be selected/configured in QLT-01; none is assumed installed from this plan.

### Per-ticket completion

- API, UI and persisted behavior meet the ticket's acceptance criteria and use authorized role boundaries.
- Existing public signatures/errors remain compatible, or an explicit coordinated migration is documented before release.
- Migrations, backfills and recovery behavior are exercised when applicable.
- Relevant regression tests pass; root type checks plus explicit API checks pass until command normalization is complete.
- English engineering comments and useful public TSDoc meet `AGENTS.md`; no newly introduced dead code, unsafe casts or unexplained quality suppression.
- Web/mobile consumers and localized UI states are updated where affected.
- Canonical docs, ADRs, operator notes and the quality register reflect the actual delivered behavior.
- Evidence is linked to the ticket; reviewable PRs separate mechanical cleanup from functional changes.

### Final release completion

- Every ticket and every legacy wave has acceptance evidence; all original review points below are covered.
- Run the complete relevant monorepo type/lint/unit/integration/browser/build/documentation checks; investigate flaky or skipped required suites rather than treating them as passing.
- Rehearse four seeded demos: interrupted multi-seller purchase/claim/refund; inventory import/variants/completion; event with waitlist/dispute/correction; complete collection-to-deck-to-purchase-to-tournament journey.
- Exercise accessibility/localization/responsive checks, migration upgrade, backup restore and operational retries on staging/disposable environments.
- Confirm provider production readiness separately from sandbox success. Document any external blocker as unfinished work; do not label the whole plan complete while settlement remains simulated.

## 13. Traceability to the complete product review

| Original recommendation | Implementation tickets |
| --- | --- |
| Resume interrupted payment, reservation deadline, cancellation | MKT-01 |
| Partial refunds, returns and physical stock separation | MKT-02 |
| Actual-item photos, defects, verified reviews, seller trust indicators | MKT-03 |
| Order-linked support, evidence, exchanges and resolution | MKT-04 |
| Multi-seller delivery and understandable order progress | MKT-05 |
| Seller payouts, commissions, failures and reconciliation | MKT-06 |
| Score confirmation, dispute and correction history | TRN-01, FND-02 |
| Frozen deck, format validation and organizer exceptions | TRN-02 |
| Next player action, table, opponent, countdown and score | TRN-03 |
| Understandable tie-breakers and rankings | TRN-04 |
| Waitlist/check-in completeness, absence, lateness, drop and downstream corrections | TRN-05 |
| Mixed card/sealed collections and role-appropriate actions | COL-01 |
| Copy identity, language, variants, condition, acquisition, location, photos | COL-02 |
| Base/Master Set definition, unique completion and duplicate accounting | COL-03 |
| CSV import/export, preview, bulk operations, moving and undo | COL-04 |
| Missing-to-wishlist/offers and duplicate-to-sale | COL-05, INT-02 |
| Valuation source/date/coverage and honest missing prices | COL-06 |
| Deck missing-copy counts and relevant purchases | INT-01 |
| Sale quantity consistency with actual collection copies | INT-02 |
| Receipt-to-collection with deduplication | INT-03 |
| Connected collection/deck/purchase/tournament journey | INT-04 |
| Finished appearance, translation, keyboard/mobile, errors and permissions | UX-01 |
| Robustness and demonstrable operational depth | FND-02/03/04, OPS-01, QLT-01 |
| Documentation matches implementation | DOC-01 |
| Documentation and cleanliness apply to all legacy code | QLT-02 waves A-E, QLT-01, DOC-01 |


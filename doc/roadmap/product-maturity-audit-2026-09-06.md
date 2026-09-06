# Product maturity verification — 2026-09-06

**Verdict: the claim that milestones 0–6 are complete is not supported. Release acceptance must be reopened.** Substantial functionality exists and the existing suites pass, but independently reproduced authorization, financial-state, inventory and migration failures violate explicit acceptance criteria.

Audited revision: `3e2fbf18` on `feat/product-maturity`. Scope: the [implementation plan](product-maturity-implementation-plan.md), relay changes since `3b1cd566`, delivery registers, affected domain services/controllers, client integration and automated checks. The ticket register contains **30 tickets**, not the 31 claimed in the delivery summary.

This is a verification report, not a remediation release. Product code was not changed. Findings marked **reproduced** were exercised locally; findings marked **inspection** follow from the indicated code paths and still need permanent regression tests. A passing nominal test does not certify all acceptance criteria. Browser/device accessibility, real provider sandbox execution, production recovery and a complete review of every legacy module were not performed or certified.

## Independently executed checks

| Check | Result |
| --- | --- |
| `npm run check-types -- --force` | Passed: 10 workspaces, zero cache hits |
| `npm run lint` | Passed; the repository enables only five Biome rules |
| `NODE_ENV=test npm test -w api -- --runInBand --no-watchman` | Passed: 170 suites, 1,424 tests |
| `NODE_ENV=test npm test -w web` | Passed: 35 suites, 158 tests |
| Eight PostgreSQL integration suites listed below | Passed: 8 suites, 61 tests |
| Fetch / effect-parser / pokemon-dataset / mobile suites | Passed: 16 / 21 / 20 / 14 tests |
| Vision runner using Python 3.12 with installed requirements | Passed: 11 tests |
| `npm run build -w apps-docs` | Passed |
| Supplemental diagnostic harness | Nine defect observations confirmed in two diagnostic tests |

PostgreSQL suites: `tournament`, `tournament-concurrency`, `tournament-operations`, `collection`, `marketplace`, `order-flow`, `settlement-and-journey`, `migrations` (`apps/api/test/*.e2e-spec.ts`). They ran through `test:e2e:postgres` using a unique disposable Docker project and port 55451. Diagnostics used another disposable project on port 55452. The development database was not used. Payments were mocked: the audit proves application behavior and provider call ordering, not actual movement of money. Integration logs also contain swallowed notification/mail errors, so their green result does not establish delivery reliability.

## Release-blocking findings

### A01 — P1 — Payout replays create fictitious available balances

**Reproduced.** After a EUR 50 sale, the nominal lifecycle leaves EUR 17.50 available and EUR 30 recorded as paid out. Calling the administrator payout endpoint with `FAIL` twice after `COMPLETE` succeeds twice and raises available funds to **EUR 77.50**, while paid-out funds remain EUR 30.

[SellerSettlementService](../../apps/api/src/marketplace/seller-settlement.service.ts#L478) changes state and increments balances without checking the previous state, taking a lock or enclosing both records in a transaction. Repeating `COMPLETE` likewise increments paid-out totals. Payout requests also debit accounts before creating their payout record, without locking.

Separately, this service has no payment-provider payout/transfer integration: an administrator-provided reference only enters the audit payload. `COMPLETED` therefore does not prove that a seller received money. `onRefundApplied` and `onClaimOpened` have no production callers; claims and refunds do not apply the advertised settlement adjustments/holds.

Required: legal state transitions, durable idempotency, atomic ledger mutations, real provider execution/reconciliation, and refund/claim integration. Tickets: **MKT-06, MKT-02, MKT-04, OPS-01**.

### A02 — P1 — Refund and return reads bypass order authorization

**Reproduced.** An unrelated authenticated user receives HTTP 200 from all three endpoints for another buyer's order: `GET /marketplace/orders/:id/refunds`, `/refunds/remaining`, and `/returns`.

[RefundController](../../apps/api/src/marketplace/refund.controller.ts#L34) applies authentication but never passes the caller to these service methods or checks their relationship to the order. This exposes refund totals and, when present, operation/return details. **Inspection:** refund creation authorizes any participating seller at order level; it does not restrict requested refund lines to that seller.

Required: buyer/seller/staff visibility policies and seller-scoped line authorization, tested with unrelated users and multi-seller orders. Tickets: **MKT-02, MKT-04**.

### A03 — P1 — Provider refunds happen before line validation; partial events become full refunds

**Reproduced.** Submit an authorized refund request containing an order-item ID that does not belong to the order. The API returns HTTP 400, but the mocked provider's refund method has already been called. The database transaction subsequently rolls back, leaving no durable refund operation for that call.

[RefundService](../../apps/api/src/marketplace/refund.service.ts#L180) invokes the provider before validating membership at line 213. Its retry key uses the current time. It records `SUCCEEDED` regardless of the provider's returned status, and does not require a completed payment to record success. Remaining balance checks happen before the transaction without reserving concurrent refund amounts. Line quantity and per-line cumulative limits are also absent.

**Reproduced separately:** invoking [handlePaymentRefunded](../../apps/api/src/marketplace/order.service.ts#L904) with a partial amount of 1 for a 50 order marks the entire order `REFUNDED`. The added refund ID and amount parameters are unused. This breaks reconciliation even when the initial partial-refund request was valid.

Required: validate and durably reserve the operation before the external call, stable request identity, reconciliation of provider outcomes and per-line cumulative amounts, and partial-event regressions. Ticket: **MKT-02**.

### A04 — P1 — Return disposition toggles restock the same copy repeatedly

**Reproduced.** A listing starts with two copies and sells one. For the single returned copy, applying `restock → damaged → restock` raises available stock from **1 to 3**. All three requests succeed.

[setReturnDisposition](../../apps/api/src/marketplace/refund.service.ts#L407) checks only the immediately previous disposition, loaded outside the transaction. It does not enforce an immutable restock operation or reverse the previous stock mutation. Concurrent calls have the same exposure. For inventory-backed listings it increments both listing availability and unreserved collection availability, potentially offering the same copy through two paths.

Required: one physical receipt/disposition ledger with atomic quantity accounting, replay protection and explicit reversals. Ticket: **MKT-02**, dependency **INT-02**.

### A05 — P1 — CSV undo deletes inventory that predates the import

**Reproduced.** Start with an existing collection item of quantity 1. Import two more copies in ADD mode: quantity becomes 3. Undo that import: **the entire existing item is deleted**, rather than restoring quantity 1.

[importCsv](../../apps/api/src/collection/collection-bulk.service.ts#L282) overwrites the item's provenance; [undoOperation](../../apps/api/src/collection/collection-bulk.service.ts#L404) then removes every item carrying that operation ID. No previous quantity or revision is retained.

**Inspection:** imports match only card and variant, ignoring language/condition/printing. Exported multiline values are split into separate records during import. Sealed identities and acquisition data do not round-trip. A later import overwrites the earlier operation ID, allowing the earlier operation to be replayed. REPLACE overwrites available quantity without accounting for reservations.

Required: versioned lossless CSV, durable per-operation row outcomes and compensating deltas with conflict detection. Tickets: **COL-04, COL-02**.

### A06 — P1 — Receipt deduplication is scoped to the destination collection

**Reproduced.** After importing a delivered line into one collection, import it into a second collection with `allowDuplicates: false`. The API succeeds and creates the same purchased copy again.

[DeliveryReceiptService](../../apps/api/src/marketplace/delivery-receipt.service.ts#L189) checks provenance only in the selected destination, while its preview checks all collections. No durable unique receipt-operation record protects concurrent imports or survives deleting a collection item. The request DTO has no partial received quantity; the service imports the entire purchased quantity. Seller-declared `DELIVERED` is not distinguished from a buyer-confirmed receipt for eligibility.

Required: buyer/order-line receipt identity independent of destination, cumulative received quantities and transactional import. Ticket: **INT-03**.

### A07 — P1 — Fresh migrations fail, and inventory backfill loses availability

**Reproduced.** Running the registered migrations on a newly created empty database with `synchronize: false` fails with **`relation "listing" does not exist`**. The earliest migration assumes a pre-existing application schema.

The passing [migration test](../../apps/api/test/migrations.e2e-spec.ts#L192) first creates the current schema with `synchronize: true`, stamps all 21 migrations as applied using probes, and expects subsequent migration execution to do nothing. Its test titled “with synchronize: false” does not switch off synchronization. Only the latest migration's down/up is exercised; this is not fresh-database or legacy-upgrade proof.

**Inspection:** [CollectionInventoryAndListings](../../apps/api/src/migrations/1786101000000-CollectionInventoryAndListings.ts#L27) adds `quantity_available` with default 1, then backfills only NULL/0 values. A legacy row with quantity 10 therefore stays available=1. It also assigns unknown legacy language `fr` without evidence.

Required: a real initial baseline, fresh and historical fixtures with synchronization disabled, exact schema/data assertions, and lossless backfills. Tickets: **FND-04, COL-02, QLT-01**.

### A08 — P1 — Deck offer lookup fails and private-deck access is unchecked

**Reproduced query failure.** Executing the relation list used for missing-card offers throws TypeORM's `Property "cardState" was not found in "Listing"`. [DeckInventoryService](../../apps/api/src/deck/deck-inventory.service.ts#L113) requests `relations: ["seller", "cardState"]`; `cardState` is a column, not a relation. Missing-copy paths cannot return their advertised offers.

**Inspection:** the service loads a deck by ID without checking owner or `isPublic`; the controller only authenticates. When the missing-offer path is avoided, another user's private deck composition can reach the response. Ownership aggregation excludes a collection literally named `wishlist`, but counts favorites and does not resolve duplicate membership into canonical physical ownership. The web service's `getInventoryRequirements` has no UI caller.

Required: deck visibility checks before loading/exposing composition, valid queries, canonical ownership and a connected client journey. Ticket: **INT-01**.

### A09 — P1 — Listing lifecycle can release inventory more than once

**Inspection.** [MarketplaceService.update](../../apps/api/src/marketplace/marketplace.service.ts#L357) returns available listing quantity to the collection when deactivated but leaves that quantity on the listing. [delete](../../apps/api/src/marketplace/marketplace.service.ts#L411) then returns it again, even for an already inactive listing. Reactivation does not reacquire the reservation, and general quantity updates bypass inventory reconciliation. These paths lack the transactional locking present on creation.

Required: explicit reservation ownership and atomic reserve/release deltas on every transition, including inactive→active, quantity edits, deletion and expiration. Ticket: **INT-02**.

### A10 — P1 — Late payment success is not compensated after cancellation

**Inspection.** [cancelPendingOrderByBuyer](../../apps/api/src/marketplace/order.service.ts#L536) reads status before its transaction and does not lock/revalidate the order. Concurrent cancels can restore stock twice. In [markOrderPaid](../../apps/api/src/marketplace/order.service.ts#L695), a successful payment for a non-pending order returns without payment compensation or an operational recovery record. Cancellation/expiration does not first cancel or reconcile the provider intent.

Attempt-key lookup does not compare a checkout payload fingerprint; a crash after order creation but before saving the payment transaction leaves a replay returning no usable secret. A unique index alone does not provide successful concurrent retry semantics.

Required: one locked checkout state machine, stable attempt/payload identity, recovery of interrupted provider setup and explicit late-success compensation. Ticket: **MKT-01**.

### A11 — P1 — Durable outbox entries do not ensure notification delivery

**Inspection.** Refund creation emits `order.refunded`, but [NotificationListener](../../apps/api/src/notification/notification-listener.ts#L302) listens to `order.refund_created`. Claims emit `claim.opened`, while the listener expects `order.item_claim_created`. Delivery emits `sellerId`, but its listener reads `sellerUserId`. Events with no matching listener are still marked processed.

The listener catches persistence/email failures instead of propagating them. Consumers do not deduplicate by the outbox event ID. Scheduled processing has an advisory lock, but the administrative retry path invokes processing directly without that lock. Retrying after partial delivery can therefore duplicate visible notifications, while swallowed failures can be lost permanently.

Required: shared typed event contracts, transactionally enqueued business events, visible failure propagation and durable consumer idempotency. Tickets: **FND-03, MKT-04, MKT-05, OPS-01**.

### A12 — P1 — Tournament deck legality and corrections are not safe enough for acceptance

**Inspection.** [TournamentDeckSnapshotService](../../apps/api/src/tournament/services/tournament-deck-snapshot.service.ts#L181) marks a submission valid based only on total quantity being 60. Explicit card IDs/names and rule versions come from the request; configured copy limits, eligibility and format dates are not checked. A fabricated card with quantity 60 can satisfy this check. Missing rule data is presented as verified validity. Organizer override/version history is absent.

[MatchResultService](../../apps/api/src/match/match-result.service.ts#L196) persists proposal/match confirmation before calling score validation/advancement, outside a common transaction. A later rejection or crash leaves confirmed state without the official result. Concurrent proposals/responses are not serialized.

[applyScoreCorrection](../../apps/api/src/tournament/services/tournament-incident.service.ts#L354) directly rewrites a finished match and recomputes rankings without handling already-published/played downstream pairings. Its preview only simulates rankings. ELO processing skips matches already in ranked history, so correcting an already-processed result does not reverse/recompute that result's ELO.

Required: authoritative rule validation with explicit unknown status, snapshot version history, atomic score confirmation, and correction policies covering dependent matches/rating history. Tickets: **TRN-01, TRN-02, TRN-05**.

### A13 — P1 — Administrative expiration bypasses safe order transitions

**Inspection.** [AdminOpsService.expireStalePendingOrders](../../apps/api/src/admin-ops/admin-ops.service.ts) reads stale orders outside a transaction, later overwrites their status, and directly restores listing stock. It does not lock/revalidate the order or reconcile payments. Two sweeps, or a sweep racing a payment/cancel, can release stock twice or cancel a newly paid order. It bypasses the normal order transition/outbox path.

Settlement reconciliation compares paid-out account totals with local completed-payout rows only. It does not reconcile against provider statements, mixes currencies and does not establish allocation/available/held balance conservation.

Required: use the domain recovery state machine, lock/revalidate candidates, and reconcile each currency against independent provider and ledger evidence. Ticket: **OPS-01**.

## Ticket-by-ticket acceptance assessment

“Partial” means implementation exists but at least one requirement is missing or not evidenced. “Reopen” means a concrete contradiction of acceptance was found. “Scoped pass” does not certify future integrations added around the feature.

| Ticket | Audit status | Evidence or acceptance gap |
| --- | --- | --- |
| FND-01 | Partial | Registers and baseline exist; broad completion and full route/client coverage are not evidenced; the register miscounts tickets. |
| FND-02 | Partial | Audit entity/service and administrator pagination exist; many new mutation callers write audit outside the business transaction. Redaction/retention and participant timelines are not established. |
| FND-03 | Reopen | A11: mismatched contracts, swallowed errors and no durable consumer dedupe. |
| FND-04 | Reopen | A07: genuine empty-database migration fails; legacy data backfill is wrong. |
| MKT-01 | Reopen | A10: late payment success, cancellation concurrency and interrupted setup remain unsafe. |
| MKT-02 | Reopen | A02–A04: authorization, provider ordering, partial events and physical returns fail. |
| MKT-03 | Partial | Photo URL arrays, snapshots and verified-review paths exist; they do not establish the required bounded upload/processing/cleanup lifecycle or full moderation acceptance. |
| MKT-04 | Reopen | Claim-to-support linkage exists. A11 notifications are mismatched; settlement hold hooks are unused. Support messaging still restricts access to the ticket owner or staff, excluding the seller counterparty. |
| MKT-05 | Partial | Per-line fulfillment, carrier/tracking and receipt controls exist; A11 delivery notifications fail and complete browser multi-seller scenarios were not demonstrated. |
| MKT-06 | Reopen | A01: mutable balances are not provider-backed settlements; replay inflates funds. |
| TRN-01 | Reopen | A12: proposal confirmation and advancement are non-atomic; concurrent conflict handling needs regressions. |
| TRN-02 | Reopen | A12: count-only legality, missing override/version guarantees. |
| TRN-03 | Partial | Persistent round deadlines and dashboard exist; complete action flow, background/reconnect and keyboard/device behavior were not verified. |
| TRN-04 | Partial | Tie-break fields/display and deterministic ranking tests exist; recorded rule-version explanations, provisional status and correction consistency need acceptance evidence. |
| TRN-05 | Reopen | A12: downstream matches and already-applied ELO are not handled by correction; drop/clock operations span non-atomic writes. |
| COL-01 | Scoped pass | Existing mixed card/sealed, owner/public permissions and error-state regressions pass. New inventory/CSV/receipt paths are assessed separately. |
| COL-02 | Reopen | A05/A07/A09: identity merges, wrong backfill and reservation accounting. Item quantity editing can lower total below reserved/sold quantities. |
| COL-03 | Partial | Unique/base/master computation exists; targets are recomputed from the current catalog rather than a frozen version. Unknown variants and sold-stock ownership need policy/fixtures. |
| COL-04 | Reopen | A05: destructive undo, incomplete round-trip and unstable operation provenance. |
| COL-05 | Partial | Wishlist/duplicate endpoints exist; selected-variant offer relevance and retaining the last copy are not independently established; blocked by A08/A09. |
| COL-06 | Reopen | Valuation sums acquisition costs without using acquisition currency and computes gain against all estimated value even when costs are only partially known; observation provenance/coverage is incomplete. |
| INT-01 | Reopen | A08: query error, missing privacy policy and no web UI consumer. |
| INT-02 | Reopen | A09: deactivation/delete and reactivation violate reservations. |
| INT-03 | Reopen | A06: cross-collection replay duplicates received inventory. |
| INT-04 | Partial | Next-actions endpoint and service wrapper exist; `getNextActions` has no UI consumer. A06/A08 also break the flagship cross-feature journey. |
| UX-01 | Reopen | Locale-key parity passes but does not catch literal French in seller settlement and player score controls/errors. No complete keyboard/phone/tablet/desktop acceptance evidence. |
| OPS-01 | Reopen | A13 and A11: recovery operations can corrupt state and cannot establish delivery/financial reconciliation. |
| QLT-01 | Partial | All executed gates pass. Migration tests miss the migration contract and nominal suites miss the reproduced failures. Browser/provider/failure-restart gates remain insufficient. |
| QLT-02 | Reopen | All legacy modules marked reviewed is contradicted by non-English engineering comments (e.g. `ranking.service.ts:808`), undocumented public DTOs and new `any` casts. Five lint rules cannot prove this remediation. |
| DOC-01 | Partial | ADR/runbook additions and docs build exist. No `apps/docs/docs` changes in the relay diff; completion register still contains unresolved migration/refund findings while claiming complete. Content accuracy and executed runbooks remain outstanding. |

## Milestone decision

| Milestone | Audit decision |
| --- | --- |
| 0 — Foundation and test harness | Foundation present; only partially verified. Existing tests do not establish the promised full failure harness. |
| 1 — Checkout resilience and audit | Reopen: A10/A11; audit transaction boundaries incomplete. |
| 2 — Refunds, returns, claims, shipment | Reopen: A02/A03/A04/A11. |
| 3 — Inventory, completion, CSV, decks | Reopen: A05/A07/A08/A09 and incomplete valuation/identity policies. |
| 4 — Tournament operations | Reopen: A12; remaining dashboard/standings acceptance needs evidence. |
| 5 — Settlements, receipt, journey, trust | Reopen: A01/A06/A08; no real settlement execution. |
| 6 — Release hardening, ops, docs | Reopen: A07/A13 and unsupported repository-wide quality/documentation claims. |

## Reproducing the supplemental observations

The [diagnostic patch](../audits/product-maturity-2026-09-06-reproduction.patch) adds probes to the existing settlement integration fixture and a fresh-database migration probe. The [recorded observations](../audits/product-maturity-2026-09-06-observations.txt) contain the exact nine observed outcomes.

Apply this only in a **disposable checkout/worktree of the audited revision**. The patch intentionally asserts the defective behavior to document reproduction; it is **not** a passing acceptance suite and must not be added to CI as proof of correctness. Product fixes should instead add permanent tests asserting the safe outcomes.

```bash
git apply doc/audits/product-maturity-2026-09-06-reproduction.patch
TCG_E2E_PROJECT_NAME=tcg-audit-diagnostics E2E_DATABASE_PORT=55452 \
  npm run test:e2e:postgres -w api -- test/settlement-and-journey.e2e-spec.ts
git apply --reverse doc/audits/product-maturity-2026-09-06-reproduction.patch
```

For a checkout at the original revision, copy the patch there first; it was added by the subsequent audit commit. The runner creates and removes only its designated disposable PostgreSQL project. The fresh-database probe creates `tcg_audit_empty` inside that test server with synchronization disabled and drops it afterwards.

Recommended remediation order: authorization and financial idempotency/compensation; inventory conservation and lossless migration/CSV; event delivery and recovery; tournament rules/corrections; complete client integration and browser acceptance; then revise ticket completion claims against concrete evidence.

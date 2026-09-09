# Product maturity remediation blocks

Updated: 2026-09-08.
Source: [independent audit](product-maturity-audit-2026-09-06.md).

Corrections are delivered as independently tested commits. No block closes an entire milestone unless all of that milestone's acceptance criteria are evidenced.

| Block | Scope | State |
| --- | --- | --- |
| 1 | Refund/return participant authorization, seller line visibility, private deck requirements and valid offer query | Verified; independent commit |
| 2a | Refund reservations, provider idempotency and individual refund reconciliation | Implemented; verification below |
| 2b | Seller ledger adjustments, payout state machine, Connect execution and settlement holds | Implemented; verification below |
| 3a | Return stock and listing reservation ownership | Implemented; verification below |
| 3b | Receipt import identity and cumulative received quantities | Implemented; verification below |
| 3c | Lossless CSV round-trip and compensating bulk undo | Implemented; verification below |
| 4 | Checkout recovery, cancellation/payment races and safe operational expiration | Implemented; verification below |
| 5 | Durable event contracts, consumer deduplication and notification failure recovery | Implemented; verification below |
| 6 | Tournament legality, score confirmation and downstream correction policy | Implemented; verification below |
| 7 | Fresh/legacy database migrations and lossless inventory backfill | Pending |
| 8 | Remaining inventory semantics, valuation, client integration, localization and acceptance documentation | Pending |

## Block 1 — authorization boundaries

- Refund/return read endpoints require an authenticated buyer, participating seller or staff member. Unrelated users receive 403; anonymous users receive 401.
- Buyer/staff access preserves the complete order view. Sellers see only their lines, amounts and returns; shared refund reasons, provider references and initiating-user details are withheld from the seller projection.
- Sellers must submit explicit refund lines belonging to them. Invalid line membership and another seller's lines are rejected before any provider call. Amount reservation, cumulative limits and financial concurrency remain block 2 work.
- Private deck requirements are restricted to the owner; other authenticated users receive 404. Public decks remain available for authenticated comparison.
- Missing-card offers no longer request `cardState` as a TypeORM relation. Canonical physical ownership and client integration remain separate work.
- The new PostgreSQL authorization suite is included in CI alongside the existing marketplace suites.

Audit coverage: A02 authorization corrected; A03 invalid-line call ordering corrected, remaining financial lifecycle open; A08 privacy/query corrected, physical ownership/client requirements open. Other audit findings remain open.

### Verification

The permanent suite `apps/api/test/product-maturity-authorization.e2e-spec.ts` exercises buyer, seller, another seller, outsider, administrator and anonymous requests against real PostgreSQL. Its provider is mocked; no external refunds are issued. It includes positive cases to ensure the authorization changes do not merely disable legitimate reads and deck offer lookup.

Verified on 2026-09-07:

- `npm run check-types -- --force`: 10 successful workspaces, zero cache hits.
- Full API suite: 170 suites, 1,426 tests passed.
- PostgreSQL authorization, order-flow and settlement-and-journey suites: 3 suites, 26 tests passed (14 new authorization scenarios).
- Repository lint and documentation production build passed.

The PostgreSQL server was disposable (`tcg-auth-block`, port 55453) and removed after each run. Existing email delivery errors remain part of the open notification block; these results certify authorization and nominal order-flow compatibility, not email reliability. Later blocks must retain these regressions and add their own safe-outcome tests.


## Block 2a — durable refund lifecycle

This sub-block addresses A03's refund operation lifecycle. A01 and the seller settlement impact remain open in block 2b; this does not close the financial milestone as a whole.

- Reserve pending operations and immutable request fingerprints under a PostgreSQL order lock before provider mutation. Validate completed payment, line ownership, unique lines, cumulative copy counts, merchandise, shipping and order ceilings.
- Persist the provider attempt time and stable key. Retain reservations after ambiguous failures; recover by metadata or provider ID. Refuse blind creation after the conservative 23-hour retry window.
- Read all pages of individual provider refunds and their current statuses. Partial/pending outcomes no longer mark an entire order refunded. Repeated reconciliation does not duplicate successful amounts or outbox events. A confirmed late failure of a full refund restores its saved fulfillment state.
- Exclude pending reservations from both buyer and seller remaining balances; preserve `alreadyRefunded` as confirmed successes. Withhold new provider/request details in seller projections.
- Preserve existing provider-originated/legacy refunds and block unsafe line attribution. Add nullable reservation metadata through a separately tested SQL migration.
- Expose the optional request key and shipping allocations in the web API service. Existing clients without keys receive conservative payload deduplication. The refund form/client integration remains block 8 work.
- Recovery is an authorized retry or signed provider webhook, not an automatic worker. No external financial transaction is issued by the tests. Seller allocation debits, settlement freezes, payout races and actual Connect execution remain block 2b.

### Verification

The PostgreSQL suite `apps/api/test/product-maturity-refunds.e2e-spec.ts` covers concurrent duplicate/distinct requests, lost responses, database/audit/outbox failure boundaries, elapsed idempotency windows, per-line bounds, pending/success/failed outcomes, stale snapshots, provider identity mismatches, stock separation, amount-only staff requests, JPY units and actual additive migration up/down execution. It is part of the marketplace CI job.


## Block 2b — seller ledger, payout state machine and provider execution

This sub-block addresses A01. It closes the settlement half of the financial
milestone; the milestone itself stays open until block 3 (return stock and
listing reservations) and block 8 (client integration and acceptance evidence).

- Seller balances are a projection of `seller_ledger_entry`, an append-only table of integer-cent movements. Escrow, delivery release, claim hold and release, refund adjustment and reversal, payout reservation, disbursement and reversal each write one entry under a `pessimistic_write` lock on the settlement account, inside the caller's transaction when one is open.
- Each entry carries a per-account `requestKey` derived from the business event (allocation, claim, refund operation, payout), so a repeated payment confirmation, a redelivered claim, a retried reconciliation or a replayed administrative action is recorded once. Reversals are negating entries; no entry is edited or deleted.
- Payouts follow one state machine: `REQUESTED -> PROCESSING -> COMPLETED | FAILED`, with `CANCELLED` only from `REQUESTED`. Terminal states reject further actions with 409 instead of moving funds again — the audited replay that raised available funds from EUR 17.50 to EUR 77.50 is now refused.
- Payout requests validate the balance read under the account lock, not a row loaded before it, and reserve the amount with the payout record and its audit entry in one transaction. An optional `requestKey` returns the existing payout; a changed amount under that key returns 409.
- A manual or bank payout completes only with an administrator-supplied `transactionReference`, stored as evidence. A `stripe_connect` payout cannot be declared complete by an administrator: `PROCESS` executes a provider transfer keyed `payout-{payoutId}` with the payout ID in metadata, and only the provider outcome completes it. An ambiguous response returns 503 and keeps the reservation; a retry searches the connected account's transfers before creating anything, and after 23 hours returns 409 for reconciliation. A reversed transfer fails the payout and restores its amount.
- `onRefundApplied` and `onClaimOpened` now have production callers. A refund confirmed by the provider debits each seller for their refunded merchandise less its proportional commission plus refunded shipping; a confirmed late failure reverses it. Opening a buyer claim freezes the seller's allocation, and closing its support ticket returns it to the bucket it was frozen from.
- `GET /marketplace/admin/settlements/reconcile` verifies per account that stored pending, available, on-hold and paid-out balances equal the sum of their entries and that disbursed funds equal completed payouts. `GET /marketplace/seller/settlement/ledger` exposes the movements to the seller. The web payout form sends a per-attempt idempotency key.
- Additive migration `SellerLedgerAndPayoutExecution1788800000000` adopts existing balances as one opening entry per account, so reconciliation is meaningful from installation. Both schema baseline scripts were extended with probes for it and for the block 2a migration.

Out of scope here and still open: real Connect onboarding and provider payout
reconciliation against statements (no sandbox rehearsal has been executed),
multi-currency conservation across accounts, and the administrative payout
console. No test moves real money.

### Verification

The PostgreSQL suite `apps/api/test/product-maturity-settlement.e2e-spec.ts` exercises escrow and release, concurrent payout requests against a real row lock, replayed administrative outcomes, cancellation, connected-account execution, a lost provider response, a provider reversal, claim holds through the buyer claim and support close endpoints, a refund debited through `POST /marketplace/orders/:id/refund`, payout audit records, and the migration's actual up/down DDL. Its provider is simulated; no external transfer is issued. It is part of the marketplace CI job.

Verified on 2026-09-08:

- `npx tsc --noEmit` for api and web: passed; `npm run lint`: 0 violations across 10 workspaces.
- API unit suites: 183 suites, 1,606 tests passed (15 rewritten seller settlement tests covering the ledger, the state machine and reconciliation).
- PostgreSQL settlement suite: 14/14 tests passed on a disposable database (`tcg-settle-2b`, port 55461).
- PostgreSQL regression: settlement-and-journey, order-flow, refunds, authorization and marketplace suites rerun on a disposable database.


## Block 3a — physical inventory conservation

This sub-block addresses A04 and A09. It does not close block 3: receipt
deduplication (A06) and the compensating CSV undo (A05) remain in 3b and 3c.

- Every change to a collection item's available, reserved or sold copies is an entry in `inventory_movement`, applied under a `pessimistic_write` lock on that item and keyed by the transition that caused it. Deltas sum to zero and no component may go negative, so a movement redistributes copies instead of inventing them.
- The first movement of an item adopts the quantities it already carried; the migration does the same for existing items. `reconcileItem` can therefore prove stored quantities equal the sum of their movements, and reports an item whose quantities were written outside the ledger.
- An inventory-backed listing stores the copies it holds in `inventoryReservedQuantity` (its offer plus copies committed to pending orders). Creation, deactivation, reactivation, quantity edits and deletion reserve or release exactly the difference between the previous and next offer, each identified by its own reservation revision. Deleting an already inactive listing now moves nothing — the audited double release — and reactivation reacquires the copies or fails with 400 when the collection can no longer back them.
- Listing update and deletion run inside a transaction that locks the listing row before reading the state it transitions from; the previous code read it outside any transaction.
- Payment converts reserved copies to sold once per order line, so a replayed payment confirmation cannot sell a copy twice and a later deletion cannot release copies the buyer owns.
- Return dispositions apply the difference between the previous and the new physical effect under the same lock that reads it, identified by a disposition revision. `restock -> damaged -> restock` no longer multiplies stock (the audited 1 to 3), re-submitting the same disposition changes nothing, and a correction away from `RESTOCK` explicitly reverses the copies it had returned. A restocked copy is re-held by its listing rather than being freely available in the collection and offered through two paths.

Out of scope here and still open: receipt import identity (A06), CSV/bulk
compensating undo and lossless round-trip (A05), and the legacy inventory
backfill of block 7.

### Verification

The PostgreSQL suite `apps/api/test/product-maturity-inventory.e2e-spec.ts` covers reservation on creation, refusal of an offer the collection cannot back, deactivation followed by deletion, reactivation with and without available copies, quantity edits, sale commitment and its replay, disposition toggling, concurrent dispositions on one return, administrator deletion, ledger reconciliation, and the migration's actual up/down DDL with its adoption entries. `inventory-ledger.service.spec.ts` adds 12 unit tests for the movement rules themselves. Both are part of the marketplace CI job.


## Block 3b — receipt identity

This sub-block addresses A06. Block 3 stays open until 3c (lossless CSV
round-trip and compensating bulk undo).

- Receiving a purchase is recorded in `receipt_import`, keyed by the order line and its buyer rather than by the destination collection. The cumulative received quantity counts every collection the line was filed into and can never exceed the purchased quantity, so importing the same delivered line into a second collection consumes the remaining copies instead of creating them again.
- Deleting the collection item an import created leaves its receipt, so a deleted item does not make the purchase receivable again.
- `POST /marketplace/orders/:id/receipt-import` accepts an optional per-line `quantity` (defaulting to the remaining copies) and an optional `requestKey`; the same key returns the existing receipt. Each line is locked while its remaining quantity is checked and written, and the collection item, the receipt and the audit record commit together, so concurrent imports of one purchase cannot overshoot it.
- `allowDuplicates` no longer bypasses the purchased quantity: it only permits receiving a line that already has a receipt.
- A seller marking a line delivered is a declaration; only the buyer's confirmation stamps `receiptConfirmedAt` and makes the copies eligible. Staff may still file a receipt during support work, and it is filed in the buyer's collection rather than their own.
- The preview reports `importedQuantity`, `remainingQuantity` and `receiptConfirmedAt` per line, and the web receipt modal selects and labels lines from the remaining quantity instead of a boolean.
- Additive migration `ReceiptImports1789000000000` adopts existing collection items carrying marketplace provenance as receipts, capped at their line's purchased quantity.

Out of scope here and still open: partial-receipt reconciliation against returns,
and the lossless CSV work of 3c.

### Verification

The PostgreSQL suite `apps/api/test/product-maturity-receipts.e2e-spec.ts` covers refusal before buyer confirmation, cross-collection accounting, splitting a purchase across collections, retried requests, concurrent imports of one line, a deleted collection item, staff filing on the buyer's behalf, and the migration's adoption of a pre-existing import. `delivery-receipt.service.spec.ts` was rewritten around the same contract (11 tests). Both are part of the marketplace CI job.


## Block 3c — portable CSV and compensating undo

This sub-block addresses A05 and closes block 3.

- Every bulk change records a `collection_bulk_operation` with one line per affected item, holding the applied deltas and the values that preceded them. Undo compensates those deltas: an item that existed before the import keeps the quantity it had — the audited defect deleted it outright — an item the operation created is removed, a moved item returns to its previous collection, and a deleted item is rebuilt from its snapshot under a new identifier.
- Copies reserved or sold since the operation are kept and reported in `conflicts`, as is any item whose quantity drifted from what the operation left. Undo is applied under a row lock per item and recorded once: repeating it answers from the stored outcome.
- Import identity now covers the complete physical identity — product kind, card or sealed product, variant, language, printing and condition — so a different condition of the same card becomes its own stack instead of merging into an unrelated one. Sealed rows import as sealed items.
- `replace` mode refuses a quantity below the copies a listing or sale already holds, reporting the row instead of denying committed stock.
- Provenance is written only when an item is created, so a later import can no longer claim an earlier operation's items and make that operation replayable against them.
- Import idempotency is durable: an operation row unique per collection stores its summary, and a replay answers from it instead of applying the rows again.
- The CSV round-trips printing, sealed identity, acquisition cost, currency and date, photo URLs and sold quantities, and a proper parser keeps quoted commas, quotes and newlines intact in both directions. A `schemaVersion` column states which contract produced the file; columns are matched by name.
- Web types and the collection page were corrected to the real import result shape, and the bulk endpoints now return the operation identifier their undo needs.

Out of scope here and still open: the legacy inventory backfill of block 7, and
the wider client integration and acceptance evidence of block 8.

### Verification

The PostgreSQL suite `apps/api/test/product-maturity-collection-bulk.e2e-spec.ts` covers undoing an import over pre-existing stock, removing only created items, replayed imports, provenance stability across operations, a full export/import round trip of quoted multi-line values, `replace` against reserved copies, conflicts from reserved copies, repeated undo, restoring deleted items from their snapshot, and the migration's adoption of legacy provenance. `collection-bulk.service.spec.ts` was rewritten around the same contract (29 tests). Both are part of the CI job.


## Block 4 — checkout recovery and capture compensation

This sub-block addresses A10 and A13.

- The order records a fingerprint of the listings, quantities and destination its attempt key was used for. Reusing that key for a different cart returns 409 instead of resuming another purchase; a genuine retry resumes the existing order.
- A checkout interrupted between order creation and provider setup is recovered: the intent is created under the order's own idempotency key, so the recovered attempt reuses the same intent and returns a usable client secret instead of a null one.
- Buyer cancellation reads the status under the row lock that also releases the stock. Concurrent cancellations return the copies exactly once, and an already cancelled order answers idempotently instead of releasing again.
- Cancellation and expiration now settle the provider: an intent still awaiting payment is cancelled, and one that already succeeded is recorded as owing compensation rather than being left as captured money against released stock.
- A payment webhook for a cancelled order no longer returns silently: it flags the capture for compensation, and does not resurrect the order or re-sell its stock. `payment_transaction` carries `compensationRequiredAt`, `compensationReason` and `compensatedAt`; the queue is visible in the operational metrics, listed by `GET /admin/ops/payments/compensation`, and refunded once by `POST /admin/ops/payments/:id/compensate` under the key `late-payment-{paymentId}`, reconciled from the provider's own view.
- The operational expiration sweep delegates to the order state machine instead of writing order and stock state itself: every candidate is locked, re-read, released once, audited and published, and only orders still pending are touched. Two sweeps, or a sweep racing a payment or cancellation, change nothing.
- Settlement reconciliation reports paid-out balances against disbursed payouts per currency and includes the per-account ledger check from block 2b, so a mixed-currency total can no longer declare the platform reconciled on its own.

Out of scope here and still open: provider webhook signature replay and delivery
guarantees (block 5), and the operational runbook rewrite of block 8.

### Verification

The PostgreSQL suite `apps/api/test/product-maturity-checkout.e2e-spec.ts` covers attempt-key resumption and payload conflict, recovery of an interrupted provider setup, concurrent buyer cancellations, provider intent cancellation, a capture succeeding after cancellation, the compensation endpoint's single refund, an expiry sweep run twice against a stale and a paid order, per-currency and ledger reconciliation, and the migration's up/down DDL. Its provider is simulated; no money moves. Unit coverage was updated for the locked cancellation and the operational service delegating its sweep.


## Block 5 — event contracts and delivery

This sub-block addresses A11.

- `src/common/events/domain-events.ts` declares every domain event name and payload shape, and `OutboxService.record` is typed against it. The three audited mismatches became compile errors and were corrected: claims are published as `order.item_claim_created` rather than `claim.opened`, delivery confirmations and return requests carry `sellerUserId` rather than `sellerId` or nothing at all, and order status transitions resolve their name through a declared map instead of interpolating a status.
- An event whose name has no registered listener is no longer marked processed: it fails with `No consumer registered`, retries, and shows up in the outbox metrics.
- Consumers claim `(consumer, eventId)` in `processed_event` and do their work in the same transaction, so a redelivery is skipped and a failure rolls the claim back for the next dispatch. Each side effect keeps its own consumer name, so an email retry cannot repeat a notification that already succeeded.
- Notification handlers propagate failures: `@OnEvent` is registered with `suppressErrors: false` (Nest suppresses listener errors by default, which is what hid the failures), and `safeCreate` refuses an event carrying no recipient instead of writing a notification to nobody.
- Every dispatcher shares the `tcg-nexus:outbox-dispatcher` advisory lock, which now lives in the service, so the administrative replay can no longer dispatch an event concurrently with the scheduled sweep.
- The compensation event added in block 4 has a consumer and localized EN/FR strings.

Out of scope here and still open: outbound email delivery evidence against a real
provider, and the notification acceptance documentation of block 8.

### Verification

The PostgreSQL suite `apps/api/test/product-maturity-events.e2e-spec.ts` covers a buyer claim reaching the seller it names, delivery and return events naming their recipient, exactly-once delivery across a redelivery, an event nobody consumes staying unprocessed, a failed delivery retrying and then succeeding, and the migration's up/down DDL. Unit coverage was updated for the propagating listener and the dispatcher's consumer check.


## Block 6 — tournament legality and corrections

This sub-block addresses A12.

- Deck legality is decided from the catalog and the stored rule data: an unknown card is refused — the audited defect accepted 60 copies of a fabricated one — as are more than four copies of anything but basic energy and cards the rule set marks illegal. A rule that cannot be read leaves the list `unverified`; missing data is never presented as verified validity.
- Every submission is appended to `tournament_deck_snapshot_revision` with its computed legality, and an organizer can settle a list through a recorded override that states who decided and why. A new submission supersedes that decision.
- Proposal, confirmation and arbitration run inside one transaction that locks the match row: the official result is reported in it, so a rejected score leaves no confirmed proposal, and concurrent proposals cannot both stay pending. Effects needing their own connection run after the commit.
- A score correction refuses to run when later matches of the same players are already played or running, unless the operator acknowledges the impact; the affected matches are returned by the preview, by the correction and in its audit record. Re-pairing is explicitly not performed.
- The rating a corrected match applied is reversed before the corrected outcome is rated: the history row is kept and marked reversed with its reason, and a reversed rating no longer counts as applied.

Out of scope here and still open: automatic re-pairing of downstream matches
after a correction, complete tournament format rule sets beyond the checks
listed above, and the tournament acceptance evidence of block 8.

### Verification

The PostgreSQL suite `apps/api/test/product-maturity-tournament.e2e-spec.ts` covers the fabricated card, an unknown rule set, rating reversal and its idempotence, concurrent proposals on one match, a confirmation committing with its official result, a rejected result leaving no confirmed proposal, and the migration's up/down DDL. `deck-legality.service.spec.ts` adds 9 unit tests for the rule checks, and the incident suite covers the downstream refusal and the acknowledged correction.

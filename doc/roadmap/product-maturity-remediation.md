# Product maturity remediation blocks

Updated: 2026-09-08.
Source: [independent audit](product-maturity-audit-2026-09-06.md).

Corrections are delivered as independently tested commits. No block closes an entire milestone unless all of that milestone's acceptance criteria are evidenced.

| Block | Scope | State |
| --- | --- | --- |
| 1 | Refund/return participant authorization, seller line visibility, private deck requirements and valid offer query | Verified; independent commit |
| 2a | Refund reservations, provider idempotency and individual refund reconciliation | Implemented; verification below |
| 2b | Seller ledger adjustments, payout state machine, Connect execution and settlement holds | Implemented; verification below |
| 3 | Return stock, listing reservations, receipt deduplication and compensating CSV undo | Pending |
| 4 | Checkout recovery, cancellation/payment races and safe operational expiration | Pending |
| 5 | Durable event contracts, consumer deduplication and notification failure recovery | Pending |
| 6 | Tournament legality, score confirmation and downstream correction policy | Pending |
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

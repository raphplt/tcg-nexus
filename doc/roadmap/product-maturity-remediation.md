# Product maturity remediation blocks

Updated: 2026-09-07.
Source: [independent audit](product-maturity-audit-2026-09-06.md).

Corrections are delivered as independently tested commits. No block closes an entire milestone unless all of that milestone's acceptance criteria are evidenced.

| Block | Scope | State |
| --- | --- | --- |
| 1 | Refund/return participant authorization, seller line visibility, private deck requirements and valid offer query | Verified; independent commit |
| 2 | Refund reservations, provider idempotency/reconciliation, payout state machine and settlement holds | Pending |
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

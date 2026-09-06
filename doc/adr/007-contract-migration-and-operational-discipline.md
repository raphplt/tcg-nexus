# ADR-007 — Contract Evolution, Migration Discipline and Operational Recovery

- **Status**: Accepted
- **Date**: 2026-09-06
- **Authors**: TCG Nexus Engineering Team

---

## 1. Context

As TCG Nexus achieved product maturity across multi-seller commerce, physical inventory tracking, live Swiss tournaments, and seller settlement, the system required strict discipline for:
1. **Schema Evolution & Migration Integrity**: Ensuring that development, staging, and production databases reliably reach target schemas without relying on TypeORM `synchronize`.
2. **Backward-Compatible Public Contracts**: Ensuring web, mobile, and external API consumers continue functioning without breaking changes during rolling updates.
3. **Operational Visibility & Recovery**: Providing authorized administrators and site reliability engineers with tools to detect and remediate stuck transactions, failed outbox events, abandoned reservations, and settlement discrepancies.

---

## 2. Decisions

### 2.1 Sequential Migrations & Baseline Adoption Tooling
- All schema modifications MUST be authored as versioned TypeORM migrations under `apps/api/src/migrations/`.
- The database baseline adoption script (`apps/api/src/scripts/baseline-migrations.ts`) probes for table and column artifacts across all 21 migrations, stamping existing changes into `migrations` table so legacy databases can be adopted into the migration history without failures.
- A dedicated PostgreSQL E2E test (`apps/api/test/migrations.e2e-spec.ts`) verifies that migrations run with `synchronize: false`, are idempotent across consecutive runs, and cleanly support revert operations (`undoLastMigration`).

### 2.2 Additive API Evolution & Error Contracts
- Public REST endpoints MUST follow additive evolution: existing response fields are retained, new properties are additive, and deprecated fields follow formal deprecation periods.
- Errors conform to the global NestJS exception envelope: `{ statusCode, message, error, timestamp, correlationId }`.
- Shared scanner contracts remain localized to `packages/scan-contract`; general commerce or tournament types are imported directly from workspace modules or shared model packages.

### 2.3 Operational Telemetry & Administrative Recovery
- Introduced the `AdminOpsModule` (`apps/api/src/admin-ops/`) providing:
  - `GET /admin/ops/metrics`: Live health counters across checkouts, outbox queues, payouts, customer claims, and tournament disputes.
  - `GET /admin/ops/audit-logs`: Multi-attribute query interface for append-only business audit history.
  - `POST /admin/ops/outbox/retry-failed`: Idempotent re-dispatch of failed transactional outbox events.
  - `POST /admin/ops/orders/expire-stale`: Automated sweep releasing inventory reservations for abandoned checkouts older than 15 minutes.
  - `GET /admin/ops/settlement/reconcile`: Mathematical validation that order allocations equal net seller balances plus commissions and disbursed payouts.

### 2.4 Forward-Fixing vs. Rollbacks
- Irreversible money operations (Stripe charges, completed bank payouts) MUST NOT be rolled back via SQL down migrations.
- Compensating business operations (`RefundOperation`, `SellerAllocation` negative adjustments) are used instead.

---

## 3. Consequences

### Positive
- Zero risk of destructive `synchronize` operations in staging and production.
- Full traceability of state changes via immutable audit logs and correlation IDs.
- Operators have tested self-service tools and runbooks to unblock stuck users and reprocess failed notifications.
- All 10 workspaces in the monorepo enforce strict type-checking and automated quality gates in CI.

### Negative / Trade-offs
- Writing explicit up/down migrations and probes requires additional engineering care during schema evolution.

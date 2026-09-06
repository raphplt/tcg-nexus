# TCG Nexus — Operational Recovery & Investigation Runbook

This document defines standard operational procedures (SOPs) for site reliability engineers (SRE), administrators, and support operators managing the TCG Nexus platform.

---

## 1. Operational Visibility & Telemetry

### 1.1 Metrics Overview (`GET /admin/ops/metrics`)

The platform aggregates live telemetry across five critical subsystems:
- **Orders & Checkouts**:
  - `pendingCheckouts`: Unpaid carts currently reserving stock.
  - `stalePendingCheckouts`: Checkouts unpaid after >15 minutes requiring reservation expiration.
- **Transactional Outbox**:
  - `pendingEvents`: Domain events queued for dispatch.
  - `failedEvents`: Events that exhausted retry thresholds (e.g. downstream notification/mailer timeouts).
  - `oldestPendingAgeSeconds`: Latency metric; alerting threshold is `> 300s`.
- **Seller Settlement & Payouts**:
  - `pendingPayouts`: Payout requests awaiting bank execution or approval.
  - `failedPayouts`: Disbursements rejected by banking rails or provider webhooks.
  - `totalPendingEscrow` & `totalAvailableBalance`: System-wide liquidity metrics.
- **Support Claims**:
  - `openClaims`: Active customer disputes (damaged, missing, or wrong items).
- **Tournaments**:
  - `activeDisputes`: Player match score disputes awaiting organizer resolution.

### 1.2 Health Probes

- **Liveness**: `GET /health/live` (HTTP 200) verifies event loop responsiveness.
- **Readiness**: `GET /health/ready` (HTTP 200 / 503) verifies PostgreSQL connection, `pgvector` extension availability, pending migrations, and the Python vision service.
- **Diagnostics**: `GET /health/details` (Admin-only) reports heap memory, RSS, Node.js runtime version, and subsystem latencies.

---

## 2. Investigating Stuck Transactions

When a user reports a stuck checkout, payment failure, or delayed delivery notification:

### Step 1: Trace by Correlation ID or Entity Target (`GET /admin/ops/audit-logs`)
Every state change in critical domains records an immutable audit log entry.
Query parameters:
- `correlationId`: Trace all actions triggered by the same initial user action or API request.
- `targetType`: e.g. `order`, `listing`, `seller_payout`, `outbox`.
- `targetId`: Entity primary key.
- `action`: Specific operation keyword (e.g. `order_reservation_created`, `stale_order_expired`, `refund_applied`, `payout_processed`).

Example request:
```bash
curl -X GET "https://api.tcg-nexus.com/admin/ops/audit-logs?targetType=order&targetId=1234" \
  -H "Authorization: Bearer <ADMIN_JWT>"
```

### Step 2: Correlate with Outbox Events
Check if downstream notifications or webhooks failed:
```sql
SELECT id, "eventType", "aggregateType", "aggregateId", status, "retryCount", "lastError", "createdAt"
FROM outbox_event
WHERE "aggregateId" = '1234'
ORDER BY "createdAt" DESC;
```

---

## 3. Operational Recovery Procedures

### 3.1 Replaying Failed Outbox Events (`POST /admin/ops/outbox/retry-failed`)
When transient network issues or third-party service degradation cause domain events to fail:
```bash
curl -X POST "https://api.tcg-nexus.com/admin/ops/outbox/retry-failed" \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"limit": 50}'
```
- **Idempotency Guarantee**: All domain event listeners (push notifications, emails, escrow releases) use deduplication locks and idempotency keys (`eventId`).
- Replaying events will never cause double charging or duplicate inventory increments.

### 3.2 Sweeping Stale Pending Checkout Orders (`POST /admin/ops/orders/expire-stale`)
When buyers abandon checkouts without completing payment, reserved stock must be released back to the marketplace:
```bash
curl -X POST "https://api.tcg-nexus.com/admin/ops/orders/expire-stale" \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"olderThanMinutes": 15}'
```
- Restores `quantityAvailable` on listings under pessimistic write locks.
- Transitions order status to `Cancelled` and sets `stockReleased = true`.
- Appends `stale_order_expired` audit entries for traceability.

### 3.3 Reconciling Marketplace Settlement Ledger (`GET /admin/ops/settlement/reconcile`)
To verify financial consistency across the platform:
```bash
curl -X GET "https://api.tcg-nexus.com/admin/ops/settlement/reconcile" \
  -H "Authorization: Bearer <ADMIN_JWT>"
```
Checks:
- Gross sales == Net seller allocations + Platform commissions.
- Total seller `balancePaidOut` == Total completed `SellerPayout` disbursed amount.
- Flag `isReconciled: true` confirms zero ledger discrepancy.

---

## 4. Database Backup, Restore & Roll-Forward Drills

### 4.1 Backup Procedure
Run scheduled logical backups using `pg_dump` with custom format:
```bash
pg_dump -Fc -h $DATABASE_HOST -U $DATABASE_USER -d $DATABASE_NAME -f "tcg_nexus_backup_$(date +%Y%m%d_%H%M%S).dump"
```

### 4.2 Staging Restore Drill
Exercise restore on disposable/staging databases before major releases:
1. Provision empty staging database:
   ```bash
   createdb -h $DATABASE_HOST -U $DATABASE_USER tcg_nexus_restore_drill
   ```
2. Restore dump:
   ```bash
   pg_restore -h $DATABASE_HOST -U $DATABASE_USER -d tcg_nexus_restore_drill --clean --if-exists "tcg_nexus_backup_YYYYMMDD_HHMMSS.dump"
   ```
3. Verify integrity:
   - Run `npm run test:e2e:migrations -w api` against the restored database.
   - Run `GET /health/ready` to verify `pgvector` and migrations.

### 4.3 Deployment Rollback vs. Forward-Fix Policy
- **Additive Migrations**: All migrations in `apps/api/src/migrations/` follow expand-contract patterns. Columns and tables are additive.
- **Financial & Irreversible Data**: Irreversible real-world events (completed bank payouts, captured Stripe charges) MUST NEVER be rolled back via database down migrations. Use compensating transactions (`RefundOperation`, `SellerAllocation` adjustment).
- If a deployment encounters bugs, prioritize forward-fixing with hotfixes or toggling feature flags rather than reverting database schema.

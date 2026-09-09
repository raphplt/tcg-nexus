
## Domain event contracts and delivery

`src/common/events/domain-events.ts` is the single source of truth for domain event names and payload shapes. `OutboxService.record` is typed against that map, so publishing a name no consumer knows, or omitting a field a consumer reads, fails to compile rather than being dispatched to nobody. Order status transitions resolve their event name through `orderStatusEvent`, which refuses a status that declares none.

Dispatch is at least once and serialized: every caller — the scheduled sweep and the administrative replay alike — goes through `processPendingEvents`, which holds the `tcg-nexus:outbox-dispatcher` advisory lock, so a manual retry cannot deliver an event the sweep is already delivering. An event whose name has no registered listener is never marked processed: it fails with `No consumer registered`, which surfaces in the outbox metrics instead of silently disappearing.

Consumers are idempotent through `processed_event`: `EventConsumerService.runOnce` claims `(consumer, eventId)` and performs the work in the same transaction, so a failure rolls the claim back and the next dispatch retries it, while a redelivery of work that already succeeded is skipped. Each side effect keeps its own consumer name, so an email consumer can still retry after the in-app notification succeeded. Work that writes outside that transaction, such as an outbound email, stays best-effort deduplicated.

Notification handlers no longer swallow failures: `@OnEvent` is registered with `suppressErrors: false`, and a missing recipient or a failed write propagates to the dispatcher, which retries the event and counts it in `GET /admin/ops/metrics`.

## Database schema and migrations

The chain starts with `InitialSchema1785000000000`, generated from the entities: on an empty database it creates the complete schema, and on an installation that already has one it does nothing. Before it, the first migration altered tables nobody had created, so a database could not be built from migrations at all.

Every migration probes for its own effect and returns early when it finds it. The chain therefore runs on an empty database, on a database built by synchronization, and twice in a row — and `npm run schema:drift` proves the result: it prints the changes the entities would still require, and that list is empty on a database built by the migrations.

`RepairLegacyColumnNames1789500000000` repairs installations upgraded through the defective migrations: it renames the 84 columns those migrations wrote in snake_case while the application reads camelCase, restores the availability their backfill lost — a stack of ten copies claimed one available copy, because the column was added with a default of one and the backfill only matched null or zero — and clears the language they stamped on copies nobody described. A stack whose copies are reserved, sold or already moved through the inventory ledger keeps the quantities those operations produced.

A database built by synchronization is adopted with `npm run migration:baseline`, which stamps the migrations whose effects it already carries, and then `npm run migration:run`. The migration suite exercises all four paths — fresh, replayed, repaired and adopted — with synchronization disabled.

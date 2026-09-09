
## Domain event contracts and delivery

`src/common/events/domain-events.ts` is the single source of truth for domain event names and payload shapes. `OutboxService.record` is typed against that map, so publishing a name no consumer knows, or omitting a field a consumer reads, fails to compile rather than being dispatched to nobody. Order status transitions resolve their event name through `orderStatusEvent`, which refuses a status that declares none.

Dispatch is at least once and serialized: every caller — the scheduled sweep and the administrative replay alike — goes through `processPendingEvents`, which holds the `tcg-nexus:outbox-dispatcher` advisory lock, so a manual retry cannot deliver an event the sweep is already delivering. An event whose name has no registered listener is never marked processed: it fails with `No consumer registered`, which surfaces in the outbox metrics instead of silently disappearing.

Consumers are idempotent through `processed_event`: `EventConsumerService.runOnce` claims `(consumer, eventId)` and performs the work in the same transaction, so a failure rolls the claim back and the next dispatch retries it, while a redelivery of work that already succeeded is skipped. Each side effect keeps its own consumer name, so an email consumer can still retry after the in-app notification succeeded. Work that writes outside that transaction, such as an outbound email, stays best-effort deduplicated.

Notification handlers no longer swallow failures: `@OnEvent` is registered with `suppressErrors: false`, and a missing recipient or a failed write propagates to the dispatcher, which retries the event and counts it in `GET /admin/ops/metrics`.

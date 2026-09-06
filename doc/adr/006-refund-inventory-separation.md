# ADR-006 — Separate refunds from inventory returns

Status: accepted for the corrective stock-release slice; return orchestration remains pending.
Date: 2026-09-06.
Implementation: MKT-02 in the [product maturity plan](../roadmap/product-maturity-implementation-plan.md).

## Context

Checkout decrements listing availability when reserving an order. The previous
order transition restored all quantities on either cancellation or refund. A
refund does not prove that a seller has received an item back, that it remains
resaleable, or that every line of a multi-seller order has been returned. Even
an aggregate Paid order can contain individually shipped lines.

## Decision

Only cancellation of an unpaid Pending reservation automatically releases stock.
The existing stockReleased guard continues to make this operation idempotent
under the order's transaction and pessimistic lock. Refunded orders retain
stockReleased unchanged. Cancelling a Paid order also leaves stock unchanged.
Public order status values and error envelopes are preserved.

Future return operations must record received quantities, inspection/disposition,
actor, reason and an idempotent inventory movement. A seller must not infer an
available copy from a refund or aggregate cancellation status alone.

## Consequences and remaining work

This intentionally prevents automatic resale of merchandise whose location or
condition is unknown. It does not implement partial refund amounts, provider
reconciliation, audited administrative decisions or an operator return screen.
Those remain MKT-02 work, with FND-02/03/04 dependencies. A return must not be
represented as completed until that workflow exists. No historical physical
returns are fabricated and no historical availability is backfilled.

Evidence: OrderService transition tests cover Paid/Shipped/Delivered refunds,
paid cancellation, and repeated cancellation of an unpaid reservation.

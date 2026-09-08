/**
 * Lifecycle status of a seller settlement account.
 */
export enum SellerAccountStatus {
  PENDING_ONBOARDING = "pending_onboarding",
  ACTIVE = "active",
  RESTRICTED = "restricted",
  SUSPENDED = "suspended",
}

/**
 * Payout disbursement method.
 */
export enum PayoutMethod {
  BANK_TRANSFER = "bank_transfer",
  STRIPE_CONNECT = "stripe_connect",
  MANUAL = "manual",
}

/**
 * Lifecycle status of a seller order allocation.
 */
export enum SellerAllocationStatus {
  PENDING_DELIVERY = "pending_delivery",
  AVAILABLE = "available",
  IN_PAYOUT = "in_payout",
  PAID = "paid",
  DISPUTED_HOLD = "disputed_hold",
  CANCELLED = "cancelled",
}

/**
 * Lifecycle status of a payout transaction.
 */
export enum PayoutStatus {
  REQUESTED = "requested",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

/**
 * Movement recorded by an append-only seller ledger entry.
 *
 * Every balance mutation carries one kind so stored balances can be
 * reconciled against the sum of their entries.
 */
export enum SellerLedgerEntryKind {
  OPENING_BALANCE = "opening_balance",
  ALLOCATION_RESERVED = "allocation_reserved",
  DELIVERY_RELEASE = "delivery_release",
  DISPUTE_HOLD = "dispute_hold",
  DISPUTE_RELEASE = "dispute_release",
  REFUND_ADJUSTMENT = "refund_adjustment",
  REFUND_REVERSAL = "refund_reversal",
  PAYOUT_RESERVED = "payout_reserved",
  PAYOUT_PAID = "payout_paid",
  PAYOUT_REVERSED = "payout_reversed",
}

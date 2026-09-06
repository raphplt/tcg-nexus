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

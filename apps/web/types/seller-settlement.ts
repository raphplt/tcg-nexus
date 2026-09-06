export enum SellerAccountStatus {
  PENDING_ONBOARDING = "pending_onboarding",
  ACTIVE = "active",
  RESTRICTED = "restricted",
  SUSPENDED = "suspended",
}

export enum PayoutMethod {
  BANK_TRANSFER = "bank_transfer",
  STRIPE_CONNECT = "stripe_connect",
  MANUAL = "manual",
}

export enum SellerAllocationStatus {
  PENDING_DELIVERY = "pending_delivery",
  AVAILABLE = "available",
  IN_PAYOUT = "in_payout",
  PAID = "paid",
  DISPUTED_HOLD = "disputed_hold",
  CANCELLED = "cancelled",
}

export enum PayoutStatus {
  REQUESTED = "requested",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export interface SellerSettlementAccount {
  id: number;
  sellerId: number;
  currency: string;
  status: SellerAccountStatus;
  payoutMethod: PayoutMethod;
  payoutDetails?: {
    accountHolderName?: string;
    ibanMasked?: string;
    bic?: string;
    bankName?: string;
  } | null;
  balancePending: number;
  balanceAvailable: number;
  balancePaidOut: number;
  balanceOnHold: number;
  minimumPayoutAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SellerAllocation {
  id: number;
  orderId: number;
  sellerId: number;
  currency: string;
  grossAmount: number;
  shippingAmount: number;
  commissionRate: number;
  commissionAmount: number;
  netAmount: number;
  refundedAmount: number;
  status: SellerAllocationStatus;
  eligibleAt?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SellerPayout {
  id: number;
  sellerId: number;
  currency: string;
  amount: number;
  status: PayoutStatus;
  reference: string;
  payoutMethod: PayoutMethod;
  payoutDestinationSnapshot?: Record<string, any> | null;
  processedAt?: string | null;
  completedAt?: string | null;
  failureReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SellerSettlementSummary {
  sellerId: number;
  currency: string;
  accountStatus: SellerAccountStatus;
  balanceAvailable: number;
  balancePending: number;
  balanceOnHold: number;
  balancePaidOut: number;
  lifetimeEarned: number;
  minimumPayoutAmount: number;
  payoutMethod: PayoutMethod;
  hasPayoutDetailsConfigured: boolean;
  payoutDetailsMasked?: {
    accountHolderName?: string;
    ibanMasked?: string;
    bankName?: string;
  } | null;
  pendingDeliveriesCount: number;
  disputedAllocationsCount: number;
  recentPayouts: SellerPayout[];
}

export interface UpdatePayoutSettingsDto {
  payoutMethod?: PayoutMethod;
  accountHolderName?: string;
  iban?: string;
  bic?: string;
  bankName?: string;
}

export interface RequestPayoutDto {
  amount: number;
  currency?: string;
}

export interface AdminProcessPayoutDto {
  action: "PROCESS" | "COMPLETE" | "FAIL";
  transactionReference?: string;
  failureReason?: string;
}

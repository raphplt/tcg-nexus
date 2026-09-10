import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { Currency } from "../../common/enums/currency";
import {
  PayoutMethod,
  SellerAccountStatus,
} from "../../common/enums/seller-settlement";

/**
 * Payload to update payout settings and bank details (MKT-06).
 */
export class UpdatePayoutSettingsDto {
  @ApiPropertyOptional({
    description: "Preferred payout method",
    enum: PayoutMethod,
    example: PayoutMethod.BANK_TRANSFER,
  })
  @IsOptional()
  @IsEnum(PayoutMethod)
  payoutMethod?: PayoutMethod;

  @ApiPropertyOptional({ description: "Account holder legal name" })
  @IsOptional()
  @IsString()
  accountHolderName?: string;

  @ApiPropertyOptional({ description: "Bank IBAN" })
  @IsOptional()
  @IsString()
  iban?: string;

  @ApiPropertyOptional({ description: "Bank BIC/SWIFT code" })
  @IsOptional()
  @IsString()
  bic?: string;

  @ApiPropertyOptional({ description: "Bank institution name" })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({
    description: "Connected account identifier for provider-executed payouts",
  })
  @IsOptional()
  @IsString()
  providerAccountId?: string;
}

/**
 * Payload for a seller to request payout of available balance (MKT-06).
 */
export class RequestPayoutDto {
  @ApiProperty({ description: "Amount requested for payout", example: 50.0 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  amount: number;

  @ApiPropertyOptional({
    description: "Currency requested (defaults to EUR)",
    enum: Currency,
    default: Currency.EUR,
  })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({
    description:
      "Idempotency key; a retry under the same key returns the existing payout",
  })
  @IsOptional()
  @IsString()
  requestKey?: string;
}

/**
 * Payload for an administrator to process or complete/fail a payout (MKT-06).
 */
export class AdminProcessPayoutDto {
  @ApiProperty({
    description: "Target action on payout (PROCESS, COMPLETE, FAIL, CANCEL)",
    enum: ["PROCESS", "COMPLETE", "FAIL", "CANCEL"],
    example: "COMPLETE",
  })
  @IsIn(["PROCESS", "COMPLETE", "FAIL", "CANCEL"])
  action: "PROCESS" | "COMPLETE" | "FAIL" | "CANCEL";

  @ApiPropertyOptional({ description: "External banking/transfer reference" })
  @IsOptional()
  @IsString()
  transactionReference?: string;

  @ApiPropertyOptional({ description: "Reason for failure if marked FAILED" })
  @IsOptional()
  @IsString()
  failureReason?: string;
}

/**
 * Response DTO for seller financial summary (MKT-06).
 */
export class SellerSettlementSummaryDto {
  @ApiProperty()
  sellerId: number;

  @ApiProperty({ enum: Currency })
  currency: Currency;

  @ApiProperty({ enum: SellerAccountStatus })
  status: SellerAccountStatus;

  @ApiProperty({ enum: PayoutMethod })
  payoutMethod: PayoutMethod;

  @ApiProperty()
  balancePending: number;

  @ApiProperty()
  balanceAvailable: number;

  @ApiProperty()
  balancePaidOut: number;

  @ApiProperty()
  balanceOnHold: number;

  @ApiProperty()
  minimumPayoutAmount: number;

  @ApiPropertyOptional()
  payoutDetails?: {
    accountHolderName?: string;
    ibanMasked?: string;
    bic?: string;
    bankName?: string;
    providerAccountId?: string;
  } | null;
}

/**
 * Result of verifying stored balances against the append-only seller ledger (MKT-06).
 */
export class SettlementReconciliationDto {
  @ApiProperty({ description: "Number of settlement accounts verified" })
  accountsChecked: number;

  @ApiProperty({ description: "True when no account deviates from its ledger" })
  consistent: boolean;

  @ApiProperty({
    description: "Accounts whose stored balances deviate from their ledger",
    isArray: true,
  })
  discrepancies: {
    accountId: number;
    sellerId: number;
    currency: Currency;
    mismatches: string[];
  }[];
}

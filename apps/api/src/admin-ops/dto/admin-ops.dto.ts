import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

/**
 * Filter and pagination parameters for administrative audit log queries.
 */
export class QueryAuditLogsDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: "Filter by actor user ID" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  actorId?: number;

  @ApiPropertyOptional({ description: "Filter by target entity type (e.g. order, match, payout)" })
  @IsOptional()
  @IsString()
  targetType?: string;

  @ApiPropertyOptional({ description: "Filter by target entity ID" })
  @IsOptional()
  @IsString()
  targetId?: string;

  @ApiPropertyOptional({ description: "Filter by correlation ID" })
  @IsOptional()
  @IsString()
  correlationId?: string;

  @ApiPropertyOptional({ description: "Filter by action keyword" })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: "Earliest creation timestamp (ISO 8601)" })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: "Latest creation timestamp (ISO 8601)" })
  @IsOptional()
  @IsDateString()
  to?: string;
}

/**
 * Parameters for retrying failed outbox domain events.
 */
export class RetryOutboxEventsDto {
  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}

/**
 * Parameters for sweeping and expiring stale pending checkout orders.
 */
export class ExpireStaleOrdersDto {
  @ApiPropertyOptional({
    default: 15,
    description: "Age threshold in minutes past which an unpaid order is expired and restocked",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  olderThanMinutes?: number = 15;
}

/**
 * Aggregated operational health metrics response.
 */
export class OpsMetricsResponseDto {
  @ApiProperty({ description: "Order and checkout telemetry" })
  orders: {
    pendingCheckouts: number;
    stalePendingCheckouts: number;
  };

  @ApiProperty({ description: "Transactional outbox event telemetry" })
  outbox: {
    pendingEvents: number;
    failedEvents: number;
    oldestPendingAgeSeconds: number | null;
  };

  @ApiProperty({ description: "Seller settlement and payout telemetry" })
  settlement: {
    pendingPayouts: number;
    failedPayouts: number;
    totalPendingEscrow: number;
    totalAvailableBalance: number;
  };

  @ApiProperty({ description: "Customer support claims telemetry" })
  claims: {
    openClaims: number;
  };

  @ApiProperty({ description: "Live tournament dispute telemetry" })
  tournaments: {
    activeDisputes: number;
  };

  @ApiProperty({ description: "Report generation timestamp" })
  timestamp: string;
}

/**
 * Financial ledger reconciliation report comparing allocations, balances, and disbursements.
 */
export class SettlementReconciliationResponseDto {
  @ApiProperty({ description: "Total gross merchandise sales from all allocations" })
  totalAllocationsGross: number;

  @ApiProperty({ description: "Total platform commission deducted" })
  totalAllocationsFees: number;

  @ApiProperty({ description: "Total net allocated to sellers" })
  totalAllocationsNet: number;

  @ApiProperty({ description: "Sum of all seller pending escrow balances" })
  totalSellerBalancesPending: number;

  @ApiProperty({ description: "Sum of all seller available balances" })
  totalSellerBalancesAvailable: number;

  @ApiProperty({ description: "Sum of all seller on-hold balances (disputes)" })
  totalSellerBalancesOnHold: number;

  @ApiProperty({ description: "Sum of all completed seller disbursements" })
  totalSellerBalancesPaidOut: number;

  @ApiProperty({ description: "Sum of all completed seller payout entity amounts" })
  totalPayoutsDisbursed: number;

  @ApiProperty({ description: "Whether ledger balances mathematically match disbursements" })
  isReconciled: boolean;

  @ApiProperty({ description: "Calculated discrepancy amount, if any" })
  discrepancyAmount: number;

  @ApiProperty({ description: "Reconciliation check timestamp" })
  checkedAt: string;
}

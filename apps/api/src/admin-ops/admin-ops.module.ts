import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditModule } from "../audit/audit.module";
import { AuditEvent } from "../audit/entities/audit-event.entity";
import { MarketplaceModule } from "../marketplace/marketplace.module";
import { PaymentTransaction } from "../marketplace/entities/payment-transaction.entity";
import { Listing } from "../marketplace/entities/listing.entity";
import { Order } from "../marketplace/entities/order.entity";
import { SellerAllocation } from "../marketplace/entities/seller-allocation.entity";
import { SellerPayout } from "../marketplace/entities/seller-payout.entity";
import { SellerSettlementAccount } from "../marketplace/entities/seller-settlement-account.entity";
import { MatchResultProposal } from "../match/entities/match-result-proposal.entity";
import { OutboxEvent } from "../outbox/entities/outbox-event.entity";
import { OutboxModule } from "../outbox/outbox.module";
import { SupportTicket } from "../support-ticket/entities/support-ticket.entity";
import { AdminOpsController } from "./admin-ops.controller";
import { AdminOpsService } from "./admin-ops.service";

/**
 * Module bundling operational visibility, health telemetry, outbox replay,
 * audit investigation, and financial reconciliation.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      Listing,
      OutboxEvent,
      SellerAllocation,
      SellerSettlementAccount,
      SellerPayout,
      SupportTicket,
      MatchResultProposal,
      AuditEvent,
      PaymentTransaction,
    ]),
    AuditModule,
    OutboxModule,
    // Operational recovery goes through the domain services rather than writing
    // order, payment and settlement state on its own.
    MarketplaceModule,
  ],
  controllers: [AdminOpsController],
  providers: [AdminOpsService],
  exports: [AdminOpsService],
})
export class AdminOpsModule {}

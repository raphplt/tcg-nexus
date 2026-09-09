import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Card } from "src/card/entities/card.entity";
import { Player } from "src/player/entities/player.entity";
import { SealedProduct } from "src/sealed-product/entities/sealed-product.entity";
import { SupportTicket } from "src/support-ticket/entities/support-ticket.entity";
import { User } from "src/user/entities/user.entity";
import { AuditModule } from "../audit/audit.module";
import { OutboxModule } from "../outbox/outbox.module";
import { UserCartModule } from "../user_cart/user_cart.module";
import { CardPopularityController } from "./card-popularity.controller";
import { CardPopularityScheduler } from "./card-popularity.scheduler";
import { CardPopularityService } from "./card-popularity.service";
import { Collection } from "src/collection/entities/collection.entity";
import { CardState } from "src/card-state/entities/card-state.entity";
import {
  CardEvent,
  CardPopularityMetrics,
  InventoryMovement,
  Listing,
  Order,
  OrderItem,
  PaymentTransaction,
  PriceHistory,
  ReceiptImport,
  RefundLine,
  RefundOperation,
  ReturnItem,
  SealedEvent,
  SellerAllocation,
  SellerLedgerEntry,
  SellerPayout,
  SellerReview,
  SellerSettlementAccount,
} from "./entities";
import { DeliveryReceiptController } from "./delivery-receipt.controller";
import { DeliveryReceiptService } from "./delivery-receipt.service";
import { InventoryLedgerService } from "./inventory-ledger.service";
import { MarketplaceController } from "./marketplace.controller";
import { MarketplaceService } from "./marketplace.service";
import { OrderController } from "./order.controller";
import { OrderService } from "./order.service";
import { OrderReservationScheduler } from "./order-reservation.scheduler";
import { RefundController } from "./refund.controller";
import { RefundFinanceService } from "./refund-finance.service";
import { RefundService } from "./refund.service";
import { SealedEventController } from "./sealed-event.controller";
import { SealedEventService } from "./sealed-event.service";
import { SellerReviewController } from "./seller-review.controller";
import { SellerReviewService } from "./seller-review.service";
import { SellerSettlementController } from "./seller-settlement.controller";
import { SellerSettlementService } from "./seller-settlement.service";
import { StripeService } from "./stripe.service";
import { CollectionItem } from "src/collection-item/entities/collection-item.entity";
import { WebhookController } from "./webhook.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Listing,
      Order,
      OrderItem,
      PaymentTransaction,
      PriceHistory,
      ReceiptImport,
      RefundOperation,
      RefundLine,
      ReturnItem,
      CardEvent,
      CardPopularityMetrics,
      InventoryMovement,
      SealedEvent,
      Player,
      Card,
      CardState,
      SealedProduct,
      User,
      SupportTicket,
      Collection,
      CollectionItem,
      SellerSettlementAccount,
      SellerAllocation,
      SellerPayout,
      SellerLedgerEntry,
      SellerReview,
    ]),
    ConfigModule,
    UserCartModule,
    AuditModule,
    OutboxModule,
  ],

  controllers: [
    MarketplaceController,
    OrderController,
    RefundController,
    CardPopularityController,
    SealedEventController,
    WebhookController,
    SellerSettlementController,
    DeliveryReceiptController,
    SellerReviewController,
  ],
  providers: [
    InventoryLedgerService,
    MarketplaceService,
    OrderService,
    RefundService,
    RefundFinanceService,
    CardPopularityService,
    CardPopularityScheduler,
    OrderReservationScheduler,
    SealedEventService,
    StripeService,
    SellerSettlementService,
    DeliveryReceiptService,
    SellerReviewService,
  ],
  exports: [
    InventoryLedgerService,
    MarketplaceService,
    StripeService,
    OrderService,
    RefundService,
    RefundFinanceService,
    SealedEventService,
    SellerSettlementService,
    DeliveryReceiptService,
    SellerReviewService,
  ],
})
export class MarketplaceModule {}

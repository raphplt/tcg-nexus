import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { OrderService } from "./order.service";

/**
 * Rend le stock des commandes restées impayées. Sans ce balayage, un panier
 * abandonné au moment du paiement immobiliserait ses annonces indéfiniment.
 */
@Injectable()
export class OrderReservationScheduler {
  private readonly logger = new Logger(OrderReservationScheduler.name);

  constructor(private readonly orderService: OrderService) {}

  @Cron(CronExpression.EVERY_5_MINUTES, {
    name: "release-expired-order-reservations",
  })
  async handleExpiredReservations(): Promise<void> {
    try {
      await this.orderService.expireStaleReservations();
    } catch (error) {
      this.logger.error(
        `Error while releasing expired reservations: ${error.message}`,
        error.stack,
      );
    }
  }
}

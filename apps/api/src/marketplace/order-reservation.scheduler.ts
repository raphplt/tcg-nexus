import { Injectable, Logger, Optional } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { DataSource } from "typeorm";
import { runWithPostgresAdvisoryLock } from "../common/postgres-advisory-lock";
import { OrderService } from "./order.service";

@Injectable()
export class OrderReservationScheduler {
  private readonly logger = new Logger(OrderReservationScheduler.name);

  constructor(
    private readonly orderService: OrderService,
    @Optional() private readonly dataSource?: DataSource,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES, {
    name: "release-expired-order-reservations",
  })
  async handleExpiredReservations(): Promise<void> {
    await runWithPostgresAdvisoryLock(
      this.dataSource,
      "tcg-nexus:expire-order-reservations",
      () => this.expireReservations(),
    );
  }

  private async expireReservations(): Promise<void> {
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

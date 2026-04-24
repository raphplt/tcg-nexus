import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan } from "typeorm";
import { Listing } from "./entities/listing.entity";

@Injectable()
export class ListingLifecycleScheduler {
  private readonly logger = new Logger(ListingLifecycleScheduler.name);

  constructor(
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
  ) {}

  /**
   * Expire old listings every day at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: "expire-old-listings",
    timeZone: "Europe/Paris",
  })
  async handleListingExpirations() {
    this.logger.log("Starting listing expiration check...");
    const startTime = Date.now();

    try {
      const expiredListings = await this.listingRepository.find({
        where: {
          expiresAt: LessThan(new Date()),
        },
      });

      if (expiredListings.length > 0) {
        await this.listingRepository.softRemove(expiredListings);
        this.logger.log(`Soft removed ${expiredListings.length} expired listings.`);
      } else {
        this.logger.log("No expired listings found.");
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Listing expiration check completed successfully in ${duration}ms`,
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Error during listing expiration check: ${error.message}`,
          error.stack,
        );
      }
    }
  }
}

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OutboxEvent } from "./entities/outbox-event.entity";
import { OutboxScheduler } from "./outbox.scheduler";
import { OutboxService } from "./outbox.service";

/**
 * Module providing transactional outbox persistence and dispatching.
 */
@Module({
  imports: [TypeOrmModule.forFeature([OutboxEvent])],
  providers: [OutboxService, OutboxScheduler],
  exports: [OutboxService],
})
export class OutboxModule {}

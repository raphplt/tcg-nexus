import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OutboxEvent } from "./entities/outbox-event.entity";
import { ProcessedEvent } from "./entities/processed-event.entity";
import { EventConsumerService } from "./event-consumer.service";
import { OutboxScheduler } from "./outbox.scheduler";
import { OutboxService } from "./outbox.service";

/**
 * Module providing transactional outbox persistence and dispatching.
 */
@Module({
  imports: [TypeOrmModule.forFeature([OutboxEvent, ProcessedEvent])],
  providers: [OutboxService, OutboxScheduler, EventConsumerService],
  exports: [OutboxService, EventConsumerService],
})
export class OutboxModule {}

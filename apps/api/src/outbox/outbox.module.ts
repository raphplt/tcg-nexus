import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OutboxEvent } from "./entities/outbox-event.entity";
import { OutboxService } from "./outbox.service";

/**
 * Module providing transactional outbox persistence and dispatching.
 */
@Module({
  imports: [TypeOrmModule.forFeature([OutboxEvent])],
  providers: [OutboxService],
  exports: [OutboxService],
})
export class OutboxModule {}

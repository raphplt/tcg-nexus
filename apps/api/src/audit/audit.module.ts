import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditEvent } from "./entities/audit-event.entity";
import { AuditService } from "./audit.service";

/**
 * Module providing append-only domain audit logging and timeline inspection.
 */
@Module({
  imports: [TypeOrmModule.forFeature([AuditEvent])],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}

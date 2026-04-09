import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BadgeService } from "./badge.service";
import { Badge } from "./entities/badge.entity";
import { UserBadge } from "./entities/user-badge.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Badge, UserBadge])],
  providers: [BadgeService],
  exports: [BadgeService],
})
export class BadgeModule {}

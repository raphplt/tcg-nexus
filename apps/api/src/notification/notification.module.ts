import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../user/entities/user.entity";
import { Notification } from "./entities/notification.entity";
import { MailService } from "./mail.service";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";

@Module({
  imports: [TypeOrmModule.forFeature([Notification, User])],
  controllers: [NotificationController],
  providers: [NotificationService, MailService],
  exports: [NotificationService],
})
export class NotificationModule {}

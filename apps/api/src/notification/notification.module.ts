import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { MailModule } from "../mail/mail.module";
import { Match } from "../match/entities/match.entity";
import { User } from "../user/entities/user.entity";
import { UserModule } from "../user/user.module";
import { DeviceToken } from "./entities/device-token.entity";
import { Notification } from "./entities/notification.entity";
import { EmailNotificationService } from "./email-notification.service";
import { NotificationController } from "./notification.controller";
import { NotificationGateway } from "./notification.gateway";
import { NotificationListener } from "./notification-listener";
import { NotificationReminderScheduler } from "./notification-reminder.scheduler";
import { NotificationService } from "./notification.service";

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    MailModule,
    UserModule,
    TypeOrmModule.forFeature([Notification, DeviceToken, User, Match]),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationGateway,
    EmailNotificationService,
    NotificationListener,
    NotificationReminderScheduler,
  ],
  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule {}

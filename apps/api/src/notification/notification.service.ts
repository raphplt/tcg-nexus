import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Notification } from "./entities/notification.entity";
import { DeviceToken } from "./entities/device-token.entity";
import { User } from "../user/entities/user.entity";
import { NotificationGateway } from "./notification.gateway";

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(DeviceToken)
    private readonly deviceTokenRepository: Repository<DeviceToken>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  /**
   * Creates a notification for a user, saves it, broadcasts it over WebSockets and sends a push.
   */
  async createNotification(
    userId: number,
    title: string,
    body: string,
    type = "info",
    data: Record<string, any> | null = null,
    translation?: { key: string; params: Record<string, any> },
  ): Promise<Notification> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const notification = this.notificationRepository.create({
      user,
      title,
      body,
      type,
      data,
      translationKey: translation?.key ?? null,
      translationParams: translation?.params ?? null,
      isRead: false,
    });

    const savedNotification =
      await this.notificationRepository.save(notification);

    // Real-time dispatch via WebSocket (omitting user relation to payload size)
    const socketPayload = {
      id: savedNotification.id,
      title: savedNotification.title,
      body: savedNotification.body,
      type: savedNotification.type,
      isRead: savedNotification.isRead,
      data: savedNotification.data,
      createdAt: savedNotification.createdAt,
    };
    this.notificationGateway.sendNotificationToUser(userId, socketPayload);

    this.triggerPushNotification(userId, title, body, data);

    return savedNotification;
  }

  /**
   * Returns the paginated list of a user's notifications.
   */
  async getNotifications(
    userId: number,
    page = 1,
    limit = 20,
    filter: "all" | "read" | "unread" = "all",
  ): Promise<{
    data: Omit<Notification, "user">[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    unreadCount: number;
  }> {
    const skip = (page - 1) * limit;

    const isReadFilter =
      filter === "read" ? true : filter === "unread" ? false : undefined;

    const where: any = { user: { id: userId } };
    if (isReadFilter !== undefined) {
      where.isRead = isReadFilter;
    }

    const [notifications, total] =
      await this.notificationRepository.findAndCount({
        where,
        order: { createdAt: "DESC" },
        skip,
        take: limit,
      });

    const unreadCount = await this.notificationRepository.count({
      where: { user: { id: userId }, isRead: false },
    });

    // Omit user relation property from payload to avoid leaking user info
    const data = notifications.map(({ user, ...rest }) => rest);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    };
  }

  /**
   * Marks a notification as read.
   */
  async markAsRead(
    userId: number,
    notificationId: number,
  ): Promise<Omit<Notification, "user">> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, user: { id: userId } },
    });

    if (!notification) {
      throw new NotFoundException(
        `Notification with ID ${notificationId} not found`,
      );
    }

    notification.isRead = true;
    const { user, ...saved } =
      await this.notificationRepository.save(notification);
    return saved;
  }

  /**
   * Marks all of a user's notifications as read.
   */
  async markAllAsRead(
    userId: number,
  ): Promise<{ success: boolean; updatedCount: number }> {
    const unreadNotifications = await this.notificationRepository.find({
      where: { user: { id: userId }, isRead: false },
    });

    if (unreadNotifications.length > 0) {
      await this.notificationRepository.update(
        { user: { id: userId }, isRead: false },
        { isRead: true },
      );
    }

    return {
      success: true,
      updatedCount: unreadNotifications.length,
    };
  }

  /**
   * Deletes a notification.
   */
  async deleteNotification(
    userId: number,
    notificationId: number,
  ): Promise<{ success: boolean }> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, user: { id: userId } },
    });

    if (!notification) {
      throw new NotFoundException(
        `Notification with ID ${notificationId} not found`,
      );
    }

    await this.notificationRepository.remove(notification);
    return { success: true };
  }

  /**
   * Registers a push token for a user.
   */
  async registerToken(
    userId: number,
    token: string,
    platform = "expo",
  ): Promise<DeviceToken> {
    const existing = await this.deviceTokenRepository.findOne({
      where: { token },
      relations: ["user"],
    });

    if (existing) {
      if (existing.user.id !== userId) {
        // Reassign token if previously registered under another user ID
        const user = await this.userRepository.findOne({
          where: { id: userId },
        });
        if (!user) {
          throw new NotFoundException(`User with ID ${userId} not found`);
        }
        existing.user = user;
        existing.platform = platform;
        return this.deviceTokenRepository.save(existing);
      }

      existing.platform = platform;
      return this.deviceTokenRepository.save(existing);
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const deviceToken = this.deviceTokenRepository.create({
      user,
      token,
      platform,
    });

    return this.deviceTokenRepository.save(deviceToken);
  }

  /**
   * Unregisters a push device token.
   */
  async unregisterToken(
    userId: number,
    token: string,
  ): Promise<{ success: boolean }> {
    const deviceToken = await this.deviceTokenRepository.findOne({
      where: { token, user: { id: userId } },
    });

    if (deviceToken) {
      await this.deviceTokenRepository.remove(deviceToken);
    }

    return { success: true };
  }

  /**
   * Internal helper to dispatch Expo push notifications.
   */
  private async triggerPushNotification(
    userId: number,
    title: string,
    body: string,
    data: any = null,
  ): Promise<void> {
    try {
      const deviceTokens = await this.deviceTokenRepository.find({
        where: { user: { id: userId } },
      });

      if (deviceTokens.length === 0) {
        return;
      }

      const expoTokens = deviceTokens
        .filter(
          (t) =>
            t.token.startsWith("ExponentPushToken") ||
            t.token.startsWith("ExpoPushToken"),
        )
        .map((t) => t.token);

      if (expoTokens.length > 0) {
        await this.sendExpoPushNotifications(expoTokens, title, body, data);
      }

      this.logger.log(
        `Push Notifications triggered for User ID ${userId}: Title="${title}". Platforms: ${deviceTokens
          .map((t) => t.platform)
          .join(", ")}`,
      );
    } catch (e) {
      this.logger.error(
        "Error in triggerPushNotification:",
        e instanceof Error ? e.stack : String(e),
      );
    }
  }

  /**
   * Sends push notifications via Expo's HTTP API.
   */
  private async sendExpoPushNotifications(
    tokens: string[],
    title: string,
    body: string,
    data: any = null,
  ): Promise<void> {
    const messages = tokens.map((token) => ({
      to: token,
      sound: "default",
      title,
      body,
      data,
    }));

    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json();
      this.logger.log(`Expo push API response: ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.error(
        "Failed to post Expo Push Notifications:",
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}

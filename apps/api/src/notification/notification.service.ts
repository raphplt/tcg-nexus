import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Notification } from "./entities/notification.entity";
import { DeviceToken } from "./entities/device-token.entity";
import { User } from "src/user/entities/user.entity";
import { NotificationGateway } from "./notification.gateway";

@Injectable()
export class NotificationService {
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
   * Creates a user notification, saves it, broadcasts via WebSockets, and pushes to devices.
   */
  async createNotification(
    userId: number,
    title: string,
    body: string,
    type = "info",
    data: Record<string, any> | null = null,
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
      isRead: false,
    });

    const savedNotification = await this.notificationRepository.save(notification);

    // Send real-time socket update
    // We omit user relation from the gateway payload to keep it lightweight
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

    // Trigger push notification to registered devices
    this.triggerPushNotification(userId, title, body, data);

    return savedNotification;
  }

  /**
   * Returns paginated list of notifications for a user.
   */
  async getNotifications(
    userId: number,
    page = 1,
    limit = 20,
  ): Promise<{
    data: Omit<Notification, "user">[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    unreadCount: number;
  }> {
    const skip = (page - 1) * limit;

    const [notifications, total] = await this.notificationRepository.findAndCount({
      where: { user: { id: userId } },
      order: { createdAt: "DESC" },
      skip,
      take: limit,
    });

    const unreadCount = await this.notificationRepository.count({
      where: { user: { id: userId }, isRead: false },
    });

    // Remove user field from payload to avoid exposing password hash or extra fields
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
  async markAsRead(userId: number, notificationId: number): Promise<Omit<Notification, "user">> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, user: { id: userId } },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${notificationId} not found`);
    }

    notification.isRead = true;
    const { user, ...saved } = await this.notificationRepository.save(notification);
    return saved;
  }

  /**
   * Marks all notifications of a user as read.
   */
  async markAllAsRead(userId: number): Promise<{ success: boolean; updatedCount: number }> {
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
   * Deletes a user notification.
   */
  async deleteNotification(userId: number, notificationId: number): Promise<{ success: boolean }> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, user: { id: userId } },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${notificationId} not found`);
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
        // Re-assign token to current user if it was registered to someone else
        const user = await this.userRepository.findOne({ where: { id: userId } });
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
   * Removes a registered push token.
   */
  async unregisterToken(userId: number, token: string): Promise<{ success: boolean }> {
    const deviceToken = await this.deviceTokenRepository.findOne({
      where: { token, user: { id: userId } },
    });

    if (deviceToken) {
      await this.deviceTokenRepository.remove(deviceToken);
    }

    return { success: true };
  }

  /**
   * Internal method to fetch tokens and trigger external push notifications (FCM or Expo).
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
        .filter((t) => t.token.startsWith("ExponentPushToken") || t.token.startsWith("ExpoPushToken"))
        .map((t) => t.token);

      if (expoTokens.length > 0) {
        await this.sendExpoPushNotifications(expoTokens, title, body, data);
      }

      // Log push notification trigger for diagnostics
      console.log(
        `Push Notifications triggered for User ID ${userId}: Title="${title}". Platforms: ${deviceTokens
          .map((t) => t.platform)
          .join(", ")}`,
      );
    } catch (e) {
      console.error("Error in triggerPushNotification:", e);
    }
  }

  /**
   * Sends push notifications through Expo's HTTP push API.
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
      console.log("Expo push API response:", JSON.stringify(result));
    } catch (error) {
      console.error("Failed to post Expo Push Notifications:", error);
    }
  }
}

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
   * Crée une notification pour un utilisateur, l'enregistre, la diffuse via WebSockets et envoie un push.
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

    const savedNotification =
      await this.notificationRepository.save(notification);

    // Envoi en temps réel via WebSocket (sans la relation user pour alléger)
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

    // Déclenchement de la notification push
    this.triggerPushNotification(userId, title, body, data);

    return savedNotification;
  }

  /**
   * Retourne la liste paginée des notifications d'un utilisateur.
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

    // Suppression du champ user pour ne pas exposer de données sensibles
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
   * Marque une notification comme lue.
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
   * Marque toutes les notifications d'un utilisateur comme lues.
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
   * Supprime une notification.
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
   * Enregistre un token push pour un utilisateur.
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
        // Réassignation du token s'il appartenait à un autre utilisateur
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
   * Supprime un token push enregistré.
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
   * Méthode interne pour envoyer les notifications push (Expo).
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

      // Log pour le diagnostic
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
   * Envoie les notifications push via l'API HTTP d'Expo.
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

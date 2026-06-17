import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DeviceToken } from "./entities/device-token.entity";
import { Notification } from "./entities/notification.entity";
import { NotificationGateway } from "./notification.gateway";
import { NotificationService } from "./notification.service";
import { User } from "src/user/entities/user.entity";

describe("NotificationService", () => {
  let service: NotificationService;

  const notificationRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const deviceTokenRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const userRepo = {
    findOne: jest.fn(),
  };

  const notificationGateway = {
    sendNotificationToUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getRepositoryToken(Notification),
          useValue: notificationRepo,
        },
        {
          provide: getRepositoryToken(DeviceToken),
          useValue: deviceTokenRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
        {
          provide: NotificationGateway,
          useValue: notificationGateway,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getNotifications", () => {
    it("returns paginated notifications with unreadCount", async () => {
      const mockNotification = {
        id: 1,
        title: "Test",
        body: "Body",
        isRead: false,
        type: "info",
        data: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 1 },
      };
      notificationRepo.findAndCount.mockResolvedValue([[mockNotification], 1]);
      notificationRepo.count.mockResolvedValue(1);

      const result = await service.getNotifications(1, 1, 20);

      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
      expect(result.unreadCount).toBe(1);
      expect(result.data[0]).not.toHaveProperty("user");
    });
  });

  describe("markAsRead", () => {
    it("marks a notification as read", async () => {
      const mockNotification = {
        id: 1,
        isRead: false,
        user: { id: 1 },
        title: "T",
        body: "B",
      };
      notificationRepo.findOne.mockResolvedValue(mockNotification);
      notificationRepo.save.mockResolvedValue({ ...mockNotification, isRead: true });

      const result = await service.markAsRead(1, 1);
      expect(result).not.toHaveProperty("user");
    });

    it("throws NotFoundException when notification not found", async () => {
      notificationRepo.findOne.mockResolvedValue(null);
      await expect(service.markAsRead(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("getNotifications filter", () => {
    it("filters by unread when filter is 'unread'", async () => {
      notificationRepo.findAndCount.mockResolvedValue([[], 0]);
      notificationRepo.count.mockResolvedValue(0);
      await service.getNotifications(1, 1, 20, "unread");
      expect(notificationRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { user: { id: 1 }, isRead: false },
        }),
      );
    });

    it("filters by read when filter is 'read'", async () => {
      notificationRepo.findAndCount.mockResolvedValue([[], 0]);
      notificationRepo.count.mockResolvedValue(0);
      await service.getNotifications(1, 1, 20, "read");
      expect(notificationRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { user: { id: 1 }, isRead: true },
        }),
      );
    });

    it("does not filter when filter is 'all'", async () => {
      notificationRepo.findAndCount.mockResolvedValue([[], 0]);
      notificationRepo.count.mockResolvedValue(0);
      await service.getNotifications(1, 1, 20, "all");
      expect(notificationRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { user: { id: 1 } },
        }),
      );
    });
  });
});

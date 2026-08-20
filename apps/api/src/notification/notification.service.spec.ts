import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { User } from "src/user/entities/user.entity";
import { DeviceToken } from "./entities/device-token.entity";
import { Notification } from "./entities/notification.entity";
import { NotificationGateway } from "./notification.gateway";
import { NotificationService } from "./notification.service";

describe("NotificationService", () => {
  let service: NotificationService;

  const mockNotificationRepo = {
    create: jest.fn((dto) => dto),
    save: jest.fn((entity) =>
      Promise.resolve({ id: 1, createdAt: new Date(), ...entity }),
    ),
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    count: jest.fn(),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  const mockDeviceTokenRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((dto) => dto),
    save: jest.fn((entity) => Promise.resolve({ id: 1, ...entity })),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
  };

  const mockGateway = {
    sendNotificationToUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepo,
        },
        {
          provide: getRepositoryToken(DeviceToken),
          useValue: mockDeviceTokenRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: NotificationGateway,
          useValue: mockGateway,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createNotification", () => {
    it("should throw NotFoundException if user not found", async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      await expect(
        service.createNotification(999, "Title", "Body"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should create notification, dispatch via websocket, and trigger push", async () => {
      const user = { id: 1 } as User;
      mockUserRepo.findOne.mockResolvedValue(user);
      mockDeviceTokenRepo.find.mockResolvedValue([
        { token: "ExponentPushToken[123]", platform: "expo" },
      ]);

      jest.spyOn(global, "fetch" as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      } as any);

      const result = await service.createNotification(
        1,
        "New Trade",
        "Trade accepted",
        "trade",
      );

      expect(result.id).toBe(1);
      expect(mockGateway.sendNotificationToUser).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          id: 1,
          title: "New Trade",
        }),
      );
    });
  });

  describe("getNotifications", () => {
    it("should paginate notifications with read/unread filters and counts", async () => {
      const notif = { id: 1, title: "Test", isRead: false, user: { id: 1 } };
      mockNotificationRepo.findAndCount.mockResolvedValue([[notif], 1]);
      mockNotificationRepo.count.mockResolvedValue(1);

      const result = await service.getNotifications(1, 1, 10, "unread");

      expect(result.data).toHaveLength(1);
      expect((result.data[0] as any).user).toBeUndefined(); // user omitted
      expect(result.unreadCount).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe("markAsRead & markAllAsRead & deleteNotification", () => {
    it("should mark single notification as read", async () => {
      const notif = { id: 1, isRead: false, user: { id: 1 } };
      mockNotificationRepo.findOne.mockResolvedValue(notif);

      const result = await service.markAsRead(1, 1);
      expect(result.isRead).toBe(true);
    });

    it("should throw NotFoundException on markAsRead if not found", async () => {
      mockNotificationRepo.findOne.mockResolvedValue(null);
      await expect(service.markAsRead(1, 999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should mark all unread as read", async () => {
      mockNotificationRepo.find.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const result = await service.markAllAsRead(1);
      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(2);
      expect(mockNotificationRepo.update).toHaveBeenCalled();
    });

    it("should delete notification", async () => {
      mockNotificationRepo.findOne.mockResolvedValue({ id: 1 });
      const result = await service.deleteNotification(1, 1);
      expect(result.success).toBe(true);
      expect(mockNotificationRepo.remove).toHaveBeenCalled();
    });
  });

  describe("registerToken & unregisterToken", () => {
    it("should register new push token", async () => {
      mockDeviceTokenRepo.findOne.mockResolvedValue(null);
      mockUserRepo.findOne.mockResolvedValue({ id: 1 });

      const result = await service.registerToken(1, "token-123", "expo");
      expect(result.token).toBe("token-123");
    });

    it("should reassign token if previously registered for another user", async () => {
      mockDeviceTokenRepo.findOne.mockResolvedValue({
        id: 5,
        token: "token-123",
        user: { id: 2 },
      });
      mockUserRepo.findOne.mockResolvedValue({ id: 1 });

      const result = await service.registerToken(1, "token-123", "expo");
      expect(result.id).toBe(5);
      expect(result.user.id).toBe(1);
    });

    it("should unregister token", async () => {
      mockDeviceTokenRepo.findOne.mockResolvedValue({ id: 5 });
      const result = await service.unregisterToken(1, "token-123");
      expect(result.success).toBe(true);
      expect(mockDeviceTokenRepo.remove).toHaveBeenCalled();
    });
  });
});

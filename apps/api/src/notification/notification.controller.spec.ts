import { Test, TestingModule } from "@nestjs/testing";
import { User } from "src/user/entities/user.entity";
import { NotificationFilter } from "./dto/get-notifications.query.dto";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";

describe("NotificationController", () => {
  let controller: NotificationController;
  let service: {
    getNotifications: jest.Mock;
    markAsRead: jest.Mock;
    markAllAsRead: jest.Mock;
    deleteNotification: jest.Mock;
    registerToken: jest.Mock;
    unregisterToken: jest.Mock;
  };

  const mockUser = { id: 7 } as User;

  beforeEach(async () => {
    service = {
      getNotifications: jest
        .fn()
        .mockResolvedValue({ notifications: [], total: 0 }),
      markAsRead: jest.fn().mockResolvedValue({ id: 1, isRead: true }),
      markAllAsRead: jest.fn().mockResolvedValue({ affected: 3 }),
      deleteNotification: jest.fn().mockResolvedValue({ affected: 1 }),
      registerToken: jest.fn().mockResolvedValue({ id: "token-1" }),
      unregisterToken: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [{ provide: NotificationService, useValue: service }],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
  });

  it("retrieves paginated notifications with query defaults", async () => {
    await controller.findAll(mockUser, {});
    expect(service.getNotifications).toHaveBeenCalledWith(7, 1, 20, "all");

    await controller.findAll(mockUser, {
      page: 2,
      limit: 10,
      filter: NotificationFilter.UNREAD,
    });
    expect(service.getNotifications).toHaveBeenCalledWith(
      7,
      2,
      10,
      NotificationFilter.UNREAD,
    );
  });

  it("marks a notification as read", async () => {
    await controller.markAsRead(15, mockUser);
    expect(service.markAsRead).toHaveBeenCalledWith(7, 15);
  });

  it("marks all notifications as read", async () => {
    await controller.markAllAsRead(mockUser);
    expect(service.markAllAsRead).toHaveBeenCalledWith(7);
  });

  it("deletes a notification", async () => {
    await controller.remove(42, mockUser);
    expect(service.deleteNotification).toHaveBeenCalledWith(7, 42);
  });

  it("registers device token via tokens and register-device routes", async () => {
    const dto = { token: "device-xyz", platform: "ios" as const };

    await controller.registerToken(mockUser, dto);
    expect(service.registerToken).toHaveBeenCalledWith(7, "device-xyz", "ios");

    await controller.registerDevice(mockUser, dto);
    expect(service.registerToken).toHaveBeenCalledWith(7, "device-xyz", "ios");
  });

  it("unregisters a device token", async () => {
    await controller.unregisterToken(mockUser, "device-xyz");
    expect(service.unregisterToken).toHaveBeenCalledWith(7, "device-xyz");
  });
});

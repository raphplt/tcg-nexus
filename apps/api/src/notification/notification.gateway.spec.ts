import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { UserRole } from "../common/enums/user";
import { NotificationGateway } from "./notification.gateway";

describe("NotificationGateway", () => {
  let gateway: NotificationGateway;

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === "JWT_SECRET") return "test-secret";
      return null;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationGateway,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    gateway = module.get<NotificationGateway>(NotificationGateway);
    gateway.server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as any;
  });

  it("should be defined", () => {
    expect(gateway).toBeDefined();
  });

  describe("handleConnection", () => {
    it("should authenticate client from cookie and join user room", async () => {
      const client: any = {
        handshake: {
          headers: {
            cookie: "accessToken=valid.jwt.token; other=123",
          },
        },
        data: {},
        join: jest.fn(),
        disconnect: jest.fn(),
      };

      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 1,
        email: "user@test.org",
        role: UserRole.USER,
      });

      await gateway.handleConnection(client);

      expect(client.data.user).toEqual({
        id: 1,
        email: "user@test.org",
        role: UserRole.USER,
      });
      expect(client.join).toHaveBeenCalledWith("user:1");
    });

    it("should disconnect client on invalid or missing auth token", async () => {
      const client: any = {
        handshake: { headers: {} },
        data: {},
        join: jest.fn(),
        disconnect: jest.fn(),
      };

      await gateway.handleConnection(client);
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe("handleDisconnect", () => {
    it("should leave user room on disconnect", () => {
      const client: any = {
        data: { user: { id: 1 } },
        leave: jest.fn(),
      };

      gateway.handleDisconnect(client);
      expect(client.leave).toHaveBeenCalledWith("user:1");
    });
  });

  describe("sendNotificationToUser", () => {
    it("should emit notification to target user room", () => {
      gateway.sendNotificationToUser(1, { title: "Hello" });
      expect(gateway.server.to).toHaveBeenCalledWith("user:1");
      expect(gateway.server.emit).toHaveBeenCalledWith("new_notification", {
        title: "Hello",
      });
    });
  });
});

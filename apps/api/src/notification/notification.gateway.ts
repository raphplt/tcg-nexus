import {
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { JwtPayload } from "../auth/interfaces/auth.interface";
import { UserRole } from "../common/enums/user";
import { User } from "../user/entities/user.entity";

type AuthenticatedSocket = Socket & {
  data: Socket["data"] & {
    user?: Pick<User, "id" | "email" | "role">;
  };
};

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  namespace: "/notification",
})
@Injectable()
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const user = await this.authenticateClient(client);
      client.data.user = user;
      client.join(`user:${user.id}`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const user = client.data.user;
    if (user) {
      client.leave(`user:${user.id}`);
    }
  }

  /**
   * Broadcasts a new notification event to a specific user.
   */
  sendNotificationToUser(userId: number, notification: any) {
    this.server.to(`user:${userId}`).emit("new_notification", notification);
  }

  private async authenticateClient(
    client: AuthenticatedSocket,
  ): Promise<Pick<User, "id" | "email" | "role">> {
    const accessToken = this.readCookie(
      client.handshake.headers.cookie,
      "accessToken",
    );

    if (!accessToken) {
      throw new UnauthorizedException("Missing access token");
    }

    const jwtSecret = this.configService.get<string>("JWT_SECRET");
    if (!jwtSecret) {
      throw new UnauthorizedException("JWT secret is not configured");
    }

    const payload = await this.jwtService.verifyAsync<JwtPayload>(accessToken, {
      secret: jwtSecret,
    });

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role as UserRole,
    };
  }

  private readCookie(cookieHeader: string | undefined, cookieName: string) {
    if (!cookieHeader) {
      return null;
    }

    for (const rawCookie of cookieHeader.split(";")) {
      const [name, ...valueParts] = rawCookie.trim().split("=");
      if (name === cookieName) {
        return decodeURIComponent(valueParts.join("="));
      }
    }

    return null;
  }
}

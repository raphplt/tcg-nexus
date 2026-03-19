import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { JwtPayload } from "../auth/interfaces/auth.interface";
import { UserRole } from "../common/enums/user";
import { User } from "../user/entities/user.entity";
import { PlayerAction } from "./engine/actions/Action";
import { PromptResponse } from "./engine/models/Prompt";
import { MatchOnlineService } from "./online/match-online.service";
import { CasualMatchService } from "./casual/casual-match.service";
import { MatchmakingService } from "./casual/matchmaking.service";

type AuthenticatedSocket = Socket & {
  data: Socket["data"] & {
    user?: Pick<User, "id" | "email" | "role">;
    currentMatchId?: number;
    currentCasualSessionId?: number;
    enginePlayerId?: string | null;
  };
};

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  namespace: "/match",
})
@Injectable()
export class MatchGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly matchOnlineService: MatchOnlineService,
    private readonly casualMatchService: CasualMatchService,
    private readonly matchmakingService: MatchmakingService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      client.data.user = await this.authenticateClient(client);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.data.user) {
      this.matchmakingService.leaveQueue(client.data.user.id);
    }
    client.data.currentMatchId = undefined;
    client.data.currentCasualSessionId = undefined;
    client.data.enginePlayerId = undefined;
  }

  // ── Tournament match events ──

  @SubscribeMessage("join_match")
  async handleJoinMatch(
    @MessageBody() data: { matchId: number },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const user = this.requireSocketUser(client);
    const sessionView = await this.matchOnlineService.getSessionView(
      Number(data.matchId),
      user as User,
    );
    const roomId = this.getRoomId(Number(data.matchId));

    client.join(roomId);
    client.data.currentMatchId = Number(data.matchId);
    client.data.enginePlayerId = sessionView.enginePlayerId;

    client.emit("session_view", sessionView);
    client.emit("state_update", sessionView.gameState);

    return {
      status: "joined",
      matchId: Number(data.matchId),
      enginePlayerId: sessionView.enginePlayerId,
    };
  }

  @SubscribeMessage("dispatch_action")
  async handleDispatchAction(
    @MessageBody() data: { matchId: number; action: PlayerAction },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const user = this.requireSocketUser(client);
      const result = await this.matchOnlineService.dispatchAction(
        Number(data.matchId),
        user as User,
        data.action,
      );

      await this.broadcastMatchState(Number(data.matchId), result.events);
      return { status: "success" };
    } catch (error: any) {
      client.emit("action_rejected", {
        message: error?.message || "Unable to process action",
      });
      return { error: error?.message || "Unable to process action" };
    }
  }

  @SubscribeMessage("respond_prompt")
  async handleRespondPrompt(
    @MessageBody() data: { matchId: number; response: PromptResponse },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const user = this.requireSocketUser(client);
      const result = await this.matchOnlineService.respondPrompt(
        Number(data.matchId),
        user as User,
        data.response,
      );

      await this.broadcastMatchState(Number(data.matchId), result.events);
      return { status: "success" };
    } catch (error: any) {
      client.emit("action_rejected", {
        message: error?.message || "Unable to process prompt response",
      });
      return { error: error?.message || "Unable to process prompt response" };
    }
  }

  // ── Matchmaking events ──

  @SubscribeMessage("matchmaking_join")
  async handleMatchmakingJoin(
    @MessageBody() data: { deckId: number },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const user = this.requireSocketUser(client);
      client.join(`matchmaking:${user.id}`);

      client.emit("matchmaking_status", {
        status: "queued",
        queueSize: this.matchmakingService.getQueueSize() + 1,
      });

      const result = await this.matchmakingService.joinQueue(
        user.id,
        Number(data.deckId),
      );

      if (result) {
        await this.notifyMatchFound(
          result.playerAUserId,
          result.playerBUserId,
          result.session.id,
        );
        return { status: "matched", sessionId: result.session.id };
      }

      return {
        status: "queued",
        queueSize: this.matchmakingService.getQueueSize(),
      };
    } catch (error: any) {
      client.emit("matchmaking_error", {
        message: error?.message || "Unable to join matchmaking",
      });
      return { error: error?.message || "Unable to join matchmaking" };
    }
  }

  @SubscribeMessage("matchmaking_leave")
  async handleMatchmakingLeave(@ConnectedSocket() client: AuthenticatedSocket) {
    const user = this.requireSocketUser(client);
    this.matchmakingService.leaveQueue(user.id);
    client.leave(`matchmaking:${user.id}`);
    client.emit("matchmaking_status", { status: "idle" });
    return { status: "left" };
  }

  // ── Casual match events ──

  @SubscribeMessage("casual_join")
  async handleCasualJoin(
    @MessageBody() data: { sessionId: number },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const user = this.requireSocketUser(client);
    const sessionView = await this.casualMatchService.getSessionView(
      Number(data.sessionId),
      user as User,
    );
    const roomId = this.getCasualRoomId(Number(data.sessionId));

    client.join(roomId);
    client.data.currentCasualSessionId = Number(data.sessionId);
    client.data.enginePlayerId = sessionView.enginePlayerId;

    client.emit("casual_session_view", sessionView);
    client.emit("casual_state_update", sessionView.gameState);

    return {
      status: "joined",
      sessionId: Number(data.sessionId),
      enginePlayerId: sessionView.enginePlayerId,
    };
  }

  @SubscribeMessage("casual_dispatch_action")
  async handleCasualDispatchAction(
    @MessageBody() data: { sessionId: number; action: PlayerAction },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const user = this.requireSocketUser(client);
      const result = await this.casualMatchService.dispatchAction(
        Number(data.sessionId),
        user as User,
        data.action,
      );

      await this.broadcastCasualState(Number(data.sessionId), result.events);
      return { status: "success" };
    } catch (error: any) {
      client.emit("casual_action_rejected", {
        message: error?.message || "Unable to process action",
      });
      return { error: error?.message || "Unable to process action" };
    }
  }

  @SubscribeMessage("casual_respond_prompt")
  async handleCasualRespondPrompt(
    @MessageBody() data: { sessionId: number; response: PromptResponse },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const user = this.requireSocketUser(client);
      const result = await this.casualMatchService.respondPrompt(
        Number(data.sessionId),
        user as User,
        data.response,
      );

      await this.broadcastCasualState(Number(data.sessionId), result.events);
      return { status: "success" };
    } catch (error: any) {
      client.emit("casual_action_rejected", {
        message: error?.message || "Unable to process prompt response",
      });
      return { error: error?.message || "Unable to process prompt response" };
    }
  }

  // ── Broadcast helpers ──

  private async notifyMatchFound(
    playerAUserId: number,
    playerBUserId: number,
    sessionId: number,
  ) {
    this.server
      .to(`matchmaking:${playerAUserId}`)
      .emit("matchmaking_matched", { sessionId });
    this.server
      .to(`matchmaking:${playerBUserId}`)
      .emit("matchmaking_matched", { sessionId });
  }

  private async broadcastMatchState(matchId: number, events: any[]) {
    const roomId = this.getRoomId(matchId);
    this.server.to(roomId).emit("game_events", events);

    const sockets = await this.server.in(roomId).fetchSockets();
    await Promise.all(
      sockets.map(async (socket) => {
        const user = (socket as unknown as AuthenticatedSocket).data.user;
        if (!user) {
          return;
        }

        const sessionView = await this.matchOnlineService.getSessionView(
          matchId,
          user as User,
        );
        socket.emit("session_view", sessionView);
        socket.emit("state_update", sessionView.gameState);
      }),
    );
  }

  private async broadcastCasualState(sessionId: number, events: any[]) {
    const roomId = this.getCasualRoomId(sessionId);
    this.server.to(roomId).emit("casual_game_events", events);

    const sockets = await this.server.in(roomId).fetchSockets();
    await Promise.all(
      sockets.map(async (socket) => {
        const user = (socket as unknown as AuthenticatedSocket).data.user;
        if (!user) {
          return;
        }

        const sessionView = await this.casualMatchService.getSessionView(
          sessionId,
          user as User,
        );
        socket.emit("casual_session_view", sessionView);
        socket.emit("casual_state_update", sessionView.gameState);
      }),
    );
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

  private requireSocketUser(
    client: AuthenticatedSocket,
  ): Pick<User, "id" | "email" | "role"> {
    if (!client.data.user) {
      throw new UnauthorizedException("Socket user is not authenticated");
    }

    return client.data.user;
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

  private getRoomId(matchId: number) {
    return `match:${matchId}`;
  }

  private getCasualRoomId(sessionId: number) {
    return `casual:${sessionId}`;
  }
}

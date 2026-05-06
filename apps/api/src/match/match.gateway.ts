import {
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from "@nestjs/common";
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
import { CasualMatchService } from "./casual/casual-match.service";
import { MatchmakingService } from "./casual/matchmaking.service";
import { PlayerAction } from "./engine/actions/Action";
import { PromptResponse } from "./engine/models/Prompt";
import { MatchOnlineService } from "./online/match-online.service";

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
export class MatchGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer()
  server: Server;

  private static readonly DISCONNECT_GRACE_MS = 30_000;
  private static readonly INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;

  private inactivityTimers = new Map<number, NodeJS.Timeout>();
  // Per-match per-user set of live socket ids. Lets us distinguish "user has
  // another tab still open" from "user is truly gone" before notifying opponent.
  private matchSockets = new Map<number, Map<number, Set<string>>>();
  private casualSockets = new Map<number, Map<number, Set<string>>>();
  // Short grace timers armed when a user goes to 0 sockets. Keyed
  // `match:<id>:<userId>` / `casual:<id>:<userId>`.
  private graceTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly matchOnlineService: MatchOnlineService,
    private readonly casualMatchService: CasualMatchService,
    private readonly matchmakingService: MatchmakingService,
  ) {}

  onModuleInit() {
    this.matchmakingService.registerMatchFoundHandler((result) =>
      this.notifyMatchFound(
        result.playerAUserId,
        result.playerBUserId,
        result.session.id,
      ),
    );
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      client.data.user = await this.authenticateClient(client);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const user = client.data.user;
    if (user) {
      this.matchmakingService.leaveQueue(user.id);
    }

    const matchId = client.data.currentMatchId;
    if (matchId && user) {
      const remaining = this.removeUserSocket(
        this.matchSockets,
        matchId,
        user.id,
        client.id,
      );
      if (remaining === 0) {
        this.armMatchDisconnectGrace(matchId, user.id);
      }
    }

    const casualId = client.data.currentCasualSessionId;
    if (casualId && user) {
      const remaining = this.removeUserSocket(
        this.casualSockets,
        casualId,
        user.id,
        client.id,
      );
      if (remaining === 0) {
        this.armCasualDisconnectGrace(casualId, user.id);
      }
    }

    client.data.currentMatchId = undefined;
    client.data.currentCasualSessionId = undefined;
    client.data.enginePlayerId = undefined;
  }

  private addUserSocket(
    bucket: Map<number, Map<number, Set<string>>>,
    scopeId: number,
    userId: number,
    socketId: string,
  ): { wasEmpty: boolean } {
    let perUser = bucket.get(scopeId);
    if (!perUser) {
      perUser = new Map();
      bucket.set(scopeId, perUser);
    }
    let sockets = perUser.get(userId);
    const wasEmpty = !sockets || sockets.size === 0;
    if (!sockets) {
      sockets = new Set();
      perUser.set(userId, sockets);
    }
    sockets.add(socketId);
    return { wasEmpty };
  }

  private removeUserSocket(
    bucket: Map<number, Map<number, Set<string>>>,
    scopeId: number,
    userId: number,
    socketId: string,
  ): number {
    const perUser = bucket.get(scopeId);
    if (!perUser) return 0;
    const sockets = perUser.get(userId);
    if (!sockets) return 0;
    sockets.delete(socketId);
    if (sockets.size === 0) {
      perUser.delete(userId);
    }
    if (perUser.size === 0) {
      bucket.delete(scopeId);
    }
    return sockets.size;
  }

  private graceKey(scope: "match" | "casual", id: number, userId: number) {
    return `${scope}:${id}:${userId}`;
  }

  private armMatchDisconnectGrace(matchId: number, userId: number) {
    const key = this.graceKey("match", matchId, userId);
    if (this.graceTimers.has(key)) return;
    const timer = setTimeout(() => {
      this.graceTimers.delete(key);
      // Confirm user is still gone (could have reconnected after timer was set).
      const remaining = this.matchSockets.get(matchId)?.get(userId)?.size ?? 0;
      if (remaining > 0) return;
      this.server
        .to(this.getRoomId(matchId))
        .emit("opponent_disconnected", { userId });
      this.startInactivityTimer(matchId);
    }, MatchGateway.DISCONNECT_GRACE_MS);
    this.graceTimers.set(key, timer);
  }

  private armCasualDisconnectGrace(sessionId: number, userId: number) {
    const key = this.graceKey("casual", sessionId, userId);
    if (this.graceTimers.has(key)) return;
    const timer = setTimeout(() => {
      this.graceTimers.delete(key);
      const remaining =
        this.casualSockets.get(sessionId)?.get(userId)?.size ?? 0;
      if (remaining > 0) return;
      this.server
        .to(this.getCasualRoomId(sessionId))
        .emit("opponent_disconnected", { userId });
    }, MatchGateway.DISCONNECT_GRACE_MS);
    this.graceTimers.set(key, timer);
  }

  private cancelDisconnectGrace(
    scope: "match" | "casual",
    id: number,
    userId: number,
  ): boolean {
    const key = this.graceKey(scope, id, userId);
    const timer = this.graceTimers.get(key);
    if (!timer) return false;
    clearTimeout(timer);
    this.graceTimers.delete(key);
    return true;
  }

  private startInactivityTimer(matchId: number) {
    if (this.inactivityTimers.has(matchId)) {
      clearTimeout(this.inactivityTimers.get(matchId));
    }

    const timer = setTimeout(async () => {
      this.inactivityTimers.delete(matchId);
      try {
        const result = await this.matchOnlineService.autoForfeit(matchId);
        if (result.events.length > 0) {
          await this.broadcastMatchState(matchId, result.events);
        }
      } catch (e) {
        // match might already be finished or no longer valid
      }
    }, MatchGateway.INACTIVITY_TIMEOUT_MS);

    this.inactivityTimers.set(matchId, timer);
  }

  private clearInactivityTimer(matchId: number) {
    if (this.inactivityTimers.has(matchId)) {
      clearTimeout(this.inactivityTimers.get(matchId));
      this.inactivityTimers.delete(matchId);
    }
  }

  // ── Tournament match events ──

  @SubscribeMessage("join_match")
  async handleJoinMatch(
    @MessageBody() data: { matchId: number },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const user = this.requireSocketUser(client);
    const matchId = Number(data.matchId);
    const sessionView = await this.matchOnlineService.getSessionView(
      matchId,
      user as User,
    );
    const roomId = this.getRoomId(matchId);
    const isSpectator = sessionView.slot === ("spectator" as any);

    client.join(roomId);
    client.data.currentMatchId = matchId;
    client.data.enginePlayerId = isSpectator
      ? null
      : sessionView.enginePlayerId;

    client.emit("session_view", sessionView);
    client.emit("state_update", sessionView.gameState);

    if (!isSpectator) {
      const { wasEmpty } = this.addUserSocket(
        this.matchSockets,
        matchId,
        user.id,
        client.id,
      );
      // Reconnection path: cancel any pending grace + auto-forfeit, notify room.
      const graceCancelled = this.cancelDisconnectGrace(
        "match",
        matchId,
        user.id,
      );
      this.clearInactivityTimer(matchId);
      if (wasEmpty && graceCancelled) {
        this.server
          .to(roomId)
          .emit("opponent_reconnected", { userId: user.id });
      }
    }

    return {
      status: isSpectator ? "spectating" : "joined",
      matchId,
      enginePlayerId: isSpectator ? null : sessionView.enginePlayerId,
    };
  }

  @SubscribeMessage("leave_match")
  async handleLeaveMatch(
    @MessageBody() data: { matchId: number },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const user = this.requireSocketUser(client);
    const matchId = Number(data.matchId);
    const roomId = this.getRoomId(matchId);
    client.leave(roomId);
    if (client.data.currentMatchId === matchId) {
      client.data.currentMatchId = undefined;
      client.data.enginePlayerId = undefined;
    }
    const remaining = this.removeUserSocket(
      this.matchSockets,
      matchId,
      user.id,
      client.id,
    );
    if (remaining === 0) {
      this.armMatchDisconnectGrace(matchId, user.id);
    }
    return { status: "left" };
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
    @MessageBody() data: { deckId: number; isRanked?: boolean },
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
        Boolean(data.isRanked),
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
    const sessionId = Number(data.sessionId);
    const sessionView = await this.casualMatchService.getSessionView(
      sessionId,
      user as User,
    );
    const roomId = this.getCasualRoomId(sessionId);

    client.join(roomId);
    client.data.currentCasualSessionId = sessionId;
    client.data.enginePlayerId = sessionView.enginePlayerId;

    client.emit("casual_session_view", sessionView);
    client.emit("casual_state_update", sessionView.gameState);

    const { wasEmpty } = this.addUserSocket(
      this.casualSockets,
      sessionId,
      user.id,
      client.id,
    );
    const graceCancelled = this.cancelDisconnectGrace(
      "casual",
      sessionId,
      user.id,
    );
    if (wasEmpty && graceCancelled) {
      this.server.to(roomId).emit("opponent_reconnected", { userId: user.id });
    }

    return {
      status: "joined",
      sessionId,
      enginePlayerId: sessionView.enginePlayerId,
    };
  }

  @SubscribeMessage("casual_leave")
  async handleCasualLeave(
    @MessageBody() data: { sessionId: number },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const user = this.requireSocketUser(client);
    const sessionId = Number(data.sessionId);
    const roomId = this.getCasualRoomId(sessionId);
    client.leave(roomId);
    if (client.data.currentCasualSessionId === sessionId) {
      client.data.currentCasualSessionId = undefined;
      client.data.enginePlayerId = undefined;
    }
    const remaining = this.removeUserSocket(
      this.casualSockets,
      sessionId,
      user.id,
      client.id,
    );
    if (remaining === 0) {
      this.armCasualDisconnectGrace(sessionId, user.id);
    }
    return { status: "left" };
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

import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
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
import { buildWebSocketCorsOptions } from "../common/websocket-cors";
import { User } from "../user/entities/user.entity";
import { CasualMatchService } from "./casual/casual-match.service";
import { MatchmakingService } from "./casual/matchmaking.service";
import { PlayerAction } from "./engine/actions/Action";
import { PromptResponse } from "./engine/models/Prompt";
import {
  CasualActionSocketDto,
  CasualPromptSocketDto,
  JoinCasualSocketDto,
  JoinMatchmakingSocketDto,
  JoinMatchSocketDto,
  MatchActionSocketDto,
  MatchPromptSocketDto,
} from "./dto/match-socket.dto";
import { GameEvent } from "./online/online-match.types";
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
  cors: buildWebSocketCorsOptions(),
  namespace: "/match",
})
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }),
)
@Injectable()
export class MatchGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MatchGateway.name);

  private static readonly DISCONNECT_GRACE_MS = 30_000;
  private static readonly INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;
  // Each game action costs a locked read plus a write, so a spamming client
  // could saturate the database on its own.
  private static readonly RATE_LIMIT_WINDOW_MS = 10_000;
  private static readonly RATE_LIMIT_MAX_MESSAGES = 40;

  private rateLimitBuckets = new Map<
    string,
    { count: number; windowStartedAt: number }
  >();

  private inactivityTimers = new Map<number, NodeJS.Timeout>();
  private casualInactivityTimers = new Map<string, NodeJS.Timeout>();
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
    this.matchmakingService.registerMatchFailedHandler((failure) => {
      for (const userId of failure.userIds) {
        this.server
          .to(`matchmaking:${userId}`)
          .emit("matchmaking_error", { message: failure.message });
      }
    });
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      client.data.user = await this.authenticateClient(client);
    } catch {
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    const user = client.data.user;
    // Only leave the queue when the user has no other socket left: closing one
    // tab should not remove a player who is still queuing from another one.
    if (user && !(await this.hasOtherLiveSocket(client, user.id))) {
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

    this.rateLimitBuckets.delete(client.id);
    client.data.currentMatchId = undefined;
    client.data.currentCasualSessionId = undefined;
    client.data.enginePlayerId = undefined;
  }

  /**
   * Enforces a per-socket quota on gameplay messages.
   *
   * @param client - Socket sending the message.
   * @throws BadRequestException If the socket exceeded its quota for the window.
   */
  private requireMessageQuota(client: AuthenticatedSocket): void {
    const now = Date.now();
    const bucket = this.rateLimitBuckets.get(client.id);

    if (
      !bucket ||
      now - bucket.windowStartedAt > MatchGateway.RATE_LIMIT_WINDOW_MS
    ) {
      this.rateLimitBuckets.set(client.id, { count: 1, windowStartedAt: now });
      return;
    }

    bucket.count += 1;
    if (bucket.count > MatchGateway.RATE_LIMIT_MAX_MESSAGES) {
      throw new BadRequestException("Too many actions sent, please slow down");
    }
  }

  /**
   * Checks whether the user still has another connected socket, ignoring the
   * one currently disconnecting.
   */
  private async hasOtherLiveSocket(
    client: AuthenticatedSocket,
    userId: number,
  ): Promise<boolean> {
    const sockets = await this.server.fetchSockets();
    return sockets.some(
      (socket) =>
        socket.id !== client.id &&
        (socket as unknown as AuthenticatedSocket).data.user?.id === userId,
    );
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
      this.startInactivityTimer(matchId, userId);
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
      this.startCasualInactivityTimer(sessionId, userId);
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

  /**
   * Forfeits a tournament match on behalf of the player who left, once the
   * inactivity delay expired.
   *
   * @param matchId - Match to close.
   * @param userId - User who disconnected; they are the one who forfeits.
   */
  private startInactivityTimer(matchId: number, userId: number) {
    this.clearInactivityTimer(matchId);

    const timer = setTimeout(async () => {
      this.inactivityTimers.delete(matchId);
      try {
        const result = await this.matchOnlineService.autoForfeit(
          matchId,
          userId,
        );
        if (result && result.events.length > 0) {
          await this.broadcastMatchState(matchId, result.events);
        }
      } catch (error) {
        this.logger.warn(
          `Auto-forfeit failed for match ${matchId}: ${(error as Error).message}`,
        );
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

  /**
   * Casual counterpart of {@link startInactivityTimer}: without it a player who
   * closes their tab would freeze the session forever for the opponent.
   */
  private startCasualInactivityTimer(sessionId: number, userId: number) {
    const key = this.graceKey("casual", sessionId, userId);
    this.clearCasualInactivityTimer(sessionId, userId);

    const timer = setTimeout(async () => {
      this.casualInactivityTimers.delete(key);
      const stillGone =
        (this.casualSockets.get(sessionId)?.get(userId)?.size ?? 0) === 0;
      if (!stillGone) return;

      try {
        const result = await this.casualMatchService.autoForfeit(
          sessionId,
          userId,
        );
        if (result && result.events.length > 0) {
          await this.broadcastCasualState(sessionId, result.events);
        }
      } catch (error) {
        this.logger.warn(
          `Casual auto-forfeit failed for session ${sessionId}: ${(error as Error).message}`,
        );
      }
    }, MatchGateway.INACTIVITY_TIMEOUT_MS);

    this.casualInactivityTimers.set(key, timer);
  }

  private clearCasualInactivityTimer(sessionId: number, userId: number) {
    const key = this.graceKey("casual", sessionId, userId);
    const timer = this.casualInactivityTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.casualInactivityTimers.delete(key);
    }
  }

  // ── Tournament match events ──

  @SubscribeMessage("join_match")
  async handleJoinMatch(
    @MessageBody() data: JoinMatchSocketDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const user = this.requireSocketUser(client);
      const matchId = data.matchId;
      const sessionView = await this.matchOnlineService.getSessionView(
        matchId,
        user as User,
      );
      const roomId = this.getRoomId(matchId);
      const isSpectator = sessionView.slot === "spectator";

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
    } catch (error: any) {
      const message = error?.message || "Unable to join this match";
      client.emit("action_rejected", { message });
      return { error: message };
    }
  }

  @SubscribeMessage("leave_match")
  async handleLeaveMatch(
    @MessageBody() data: JoinMatchSocketDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const user = this.requireSocketUser(client);
    const matchId = data.matchId;
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
    @MessageBody() data: MatchActionSocketDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      this.requireMessageQuota(client);
      const user = this.requireSocketUser(client);
      const result = await this.matchOnlineService.dispatchAction(
        data.matchId,
        user as User,
        data.action as unknown as PlayerAction,
      );

      await this.broadcastMatchState(data.matchId, result.events);
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
    @MessageBody() data: MatchPromptSocketDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      this.requireMessageQuota(client);
      const user = this.requireSocketUser(client);
      const result = await this.matchOnlineService.respondPrompt(
        data.matchId,
        user as User,
        data.response as PromptResponse,
      );

      await this.broadcastMatchState(data.matchId, result.events);
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
    @MessageBody() data: JoinMatchmakingSocketDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const user = this.requireSocketUser(client);
      client.join(`matchmaking:${user.id}`);

      const result = await this.matchmakingService.joinQueue(
        user.id,
        data.deckId,
        Boolean(data.isRanked),
      );

      // Confirm the queued state only once the queue actually accepted the
      // player, otherwise a rejected join would still show "searching".
      if (!result) {
        client.emit("matchmaking_status", {
          status: "queued",
          queueSize: this.matchmakingService.getQueueSize(),
        });
      }

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
    @MessageBody() data: JoinCasualSocketDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const user = this.requireSocketUser(client);
      const sessionId = data.sessionId;
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
      this.clearCasualInactivityTimer(sessionId, user.id);
      if (wasEmpty && graceCancelled) {
        this.server
          .to(roomId)
          .emit("opponent_reconnected", { userId: user.id });
      }

      return {
        status: "joined",
        sessionId,
        enginePlayerId: sessionView.enginePlayerId,
      };
    } catch (error: any) {
      const message = error?.message || "Unable to join this session";
      client.emit("casual_action_rejected", { message });
      return { error: message };
    }
  }

  @SubscribeMessage("casual_leave")
  async handleCasualLeave(
    @MessageBody() data: JoinCasualSocketDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const user = this.requireSocketUser(client);
    const sessionId = data.sessionId;
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
    @MessageBody() data: CasualActionSocketDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      this.requireMessageQuota(client);
      const user = this.requireSocketUser(client);
      const result = await this.casualMatchService.dispatchAction(
        data.sessionId,
        user as User,
        data.action as unknown as PlayerAction,
      );

      await this.broadcastCasualState(data.sessionId, result.events);
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
    @MessageBody() data: CasualPromptSocketDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      this.requireMessageQuota(client);
      const user = this.requireSocketUser(client);
      const result = await this.casualMatchService.respondPrompt(
        data.sessionId,
        user as User,
        data.response as PromptResponse,
      );

      await this.broadcastCasualState(data.sessionId, result.events);
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

  /**
   * Pushes the new state to every socket watching a tournament match.
   *
   * The per-viewer views are built from a single database read: sanitizing is
   * per player, not per socket, so extra tabs cost nothing.
   */
  private async broadcastMatchState(matchId: number, events: GameEvent[]) {
    const roomId = this.getRoomId(matchId);
    this.server.to(roomId).emit("game_events", events);

    const [sockets, viewsByUser, spectatorView] = await Promise.all([
      this.server.in(roomId).fetchSockets(),
      this.matchOnlineService.getSessionViewsByUser(matchId),
      this.matchOnlineService.getSpectatorView(matchId),
    ]);

    for (const socket of sockets) {
      const user = (socket as unknown as AuthenticatedSocket).data.user;
      if (!user) {
        continue;
      }

      const sessionView = viewsByUser.get(user.id) ?? spectatorView;
      if (!sessionView) {
        continue;
      }

      socket.emit("session_view", sessionView);
      socket.emit("state_update", sessionView.gameState);
    }
  }

  /** Casual counterpart of {@link broadcastMatchState}. */
  private async broadcastCasualState(sessionId: number, events: GameEvent[]) {
    const roomId = this.getCasualRoomId(sessionId);
    this.server.to(roomId).emit("casual_game_events", events);

    const [sockets, viewsByUser] = await Promise.all([
      this.server.in(roomId).fetchSockets(),
      this.casualMatchService.getSessionViewsByUser(sessionId),
    ]);

    for (const socket of sockets) {
      const user = (socket as unknown as AuthenticatedSocket).data.user;
      const sessionView = user ? viewsByUser.get(user.id) : null;
      if (!sessionView) {
        continue;
      }

      socket.emit("casual_session_view", sessionView);
      socket.emit("casual_state_update", sessionView.gameState);
    }
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

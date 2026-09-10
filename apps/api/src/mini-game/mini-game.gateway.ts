import {
  Injectable,
  Logger,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
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
import { Repository } from "typeorm";
import type { Card } from "../card/entities/card.entity";
import { buildWebSocketCorsOptions } from "../common/websocket-cors";
import { resolveRequestLocale } from "../translation/request-locale";
import type { PackStyle } from "./booster";
import type { SupportedLocale } from "../translation/supported-locales";
import { User } from "../user/entities/user.entity";
import {
  JoinQueueDto,
  MAX_ROUND_COUNT,
  MIN_ROUND_COUNT,
  MiniGameType,
  SessionDto,
  SubmitGuessDto,
} from "./dto/mini-game-events.dto";
import {
  type JustePrixItem,
  MiniGameItemsService,
} from "./mini-game-items.service";
import {
  cardMarketValue,
  JUSTE_PRIX_ROUND_SECONDS,
  roundPrice,
  scoreJustePrixGuess,
} from "./mini-game-pricing";

type AuthenticatedSocket = Socket & {
  data: Socket["data"] & {
    user?: Pick<User, "id" | "email" | "role">;
    locale?: SupportedLocale;
  };
};

/** Default number of rounds when the client does not ask for a count. */
const DEFAULT_ROUND_COUNT = 5;

/** Time a disconnected player has to come back before forfeiting the duel. */
export const RECONNECT_GRACE_MS = 20_000;

/** Extra time granted past the round deadline before the server closes it. */
const ROUND_DEADLINE_SLACK_MS = 1_000;

/** How long a finished session stays readable before being dropped. */
const FINISHED_SESSION_TTL_MS = 5 * 60_000;

interface QueueParams {
  setId?: string;
  serieId?: string;
  packStyle: PackStyle;
  roundCount: number;
}

interface QueuePlayer {
  userId: number;
  userName: string;
  socketId: string;
  locale: SupportedLocale;
  gameType: MiniGameType;
  params: QueueParams;
}

interface RoundGuess {
  round: number;
  /** `null` when the round timed out before the player answered. */
  guess: number | null;
  elapsedSeconds: number;
  points: number;
}

interface GamePlayerState {
  userId: number;
  userName: string;
  socketId: string;
  locale: SupportedLocale;
  score: number;
  ready: boolean;
  connected: boolean;
  /** Case Opening: number of boosters opened so far. */
  openedCount: number;
  /** Juste Prix: one entry per closed round. */
  guesses: RoundGuess[];
}

interface GameSession {
  id: string;
  gameType: MiniGameType;
  params: QueueParams;
  players: GamePlayerState[];
  state: "waiting" | "playing" | "finished";
  round: number;
  maxRounds: number;
  /** Server-side start of the current round. */
  roundStartedAt: number;
  /** Round length, `null` for games without a timer. */
  roundDurationMs: number | null;
  roundTimer?: NodeJS.Timeout;
  /** Set when the duel ended because a player left. */
  forfeitedBy?: number;
  /** Juste Prix rounds, prices included: never sent as-is to clients. */
  justePrixItems?: JustePrixItem[];
  /** Case Opening boosters, `packs[round][playerIndex]`. */
  caseOpeningPacks?: Card[][][];
}

/**
 * Real-time gateway of the two-player mini-games (Case Opening and Juste
 * Prix): matchmaking, session state and per-round actions.
 *
 * The server is the authority on everything that can be cheated: items and
 * their prices are drawn here, guesses are timed here, and clients only ever
 * receive what they are allowed to see at that point of the round. Labels are
 * resolved per recipient locale, since the HTTP localization interceptor does
 * not apply to WebSocket payloads.
 *
 * Queue and sessions are held in memory: a single API instance serves every
 * duel and a restart ends the duels in progress.
 */
@WebSocketGateway({
  cors: buildWebSocketCorsOptions(),
  namespace: "/mini-game",
})
@Injectable()
// Socket payloads bypass the HTTP global pipe: validate them explicitly.
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class MiniGameGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MiniGameGateway.name);

  private matchmakingQueue: QueuePlayer[] = [];
  private readonly activeSessions = new Map<string, GameSession>();
  /** Pending forfeits, keyed by `${sessionId}:${userId}`. */
  private readonly disconnectTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly items: MiniGameItemsService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      client.data.user = await this.authenticateClient(client);
      client.data.locale = resolveRequestLocale(
        readHeader(client.handshake.headers["accept-language"]),
      );
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const user = client.data.user;
    if (!user) return;

    this.removeFromQueue(user.id);

    for (const session of this.activeSessions.values()) {
      const player = session.players.find((p) => p.userId === user.id);
      // A stale socket of a player who already reconnected must not forfeit.
      if (!player || player.socketId !== client.id) continue;
      if (session.state === "finished") continue;

      player.connected = false;
      this.server.to(roomOf(session.id)).emit("minigame_player_connection", {
        userId: player.userId,
        userName: player.userName,
        connected: false,
        graceMs: RECONNECT_GRACE_MS,
      });

      const key = `${session.id}:${user.id}`;
      this.clearDisconnectTimer(key);
      this.disconnectTimers.set(
        key,
        setTimeout(() => {
          this.disconnectTimers.delete(key);
          this.forfeit(session, player);
        }, RECONNECT_GRACE_MS),
      );
    }
  }

  // --- Matchmaking -----------------------------------------------------------

  @SubscribeMessage("minigame_join_queue")
  async handleJoinQueue(
    @MessageBody() data: JoinQueueDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const user = this.requireSocketUser(client);
    const dbUser = await this.userRepository.findOne({
      where: { id: user.id },
    });
    const userName = dbUser?.email?.split("@")[0] || `User_${user.id}`;
    const params: QueueParams = {
      setId: data.params?.setId || undefined,
      serieId: data.params?.setId
        ? undefined
        : data.params?.serieId || undefined,
      packStyle: data.params?.packStyle ?? "standard",
      roundCount: clampRoundCount(data.params?.roundCount),
    };

    this.removeFromQueue(user.id);

    const newPlayer: QueuePlayer = {
      userId: user.id,
      userName,
      socketId: client.id,
      locale: client.data.locale ?? "fr",
      gameType: data.gameType,
      params,
    };

    // Only pair players who asked for the same duel: same game, same number of
    // rounds, same booster style, same set or series (or none on either side).
    const opponent = this.matchmakingQueue.find(
      (p) =>
        p.gameType === data.gameType &&
        p.userId !== user.id &&
        p.params.roundCount === params.roundCount &&
        p.params.packStyle === params.packStyle &&
        (p.params.setId ?? null) === (params.setId ?? null) &&
        (p.params.serieId ?? null) === (params.serieId ?? null),
    );

    if (!opponent) {
      this.matchmakingQueue.push(newPlayer);
      this.notifyQueueUpdate();
      return { status: "queued" as const };
    }

    this.removeFromQueue(opponent.userId);

    let session: GameSession;
    try {
      session = await this.createSession(data.gameType, params, [
        opponent,
        newPlayer,
      ]);
    } catch (error) {
      this.logger.warn(
        `Could not start a ${data.gameType} duel: ${(error as Error).message}`,
      );
      const payload = { code: "not_enough_items" };
      this.server.to(opponent.socketId).emit("minigame_error", payload);
      client.emit("minigame_error", payload);
      this.notifyQueueUpdate();
      return { status: "error" as const, error: payload.code };
    }

    this.activeSessions.set(session.id, session);

    // `selfId` lets each client know who it is without guessing by elimination.
    this.server.to(opponent.socketId).emit("minigame_matched", {
      sessionId: session.id,
      gameType: data.gameType,
      selfId: opponent.userId,
      opponentName: userName,
      opponentId: user.id,
      roundCount: params.roundCount,
    });
    client.emit("minigame_matched", {
      sessionId: session.id,
      gameType: data.gameType,
      selfId: user.id,
      opponentName: opponent.userName,
      opponentId: opponent.userId,
      roundCount: params.roundCount,
    });

    this.notifyQueueUpdate();
    return { status: "matched" as const, sessionId: session.id };
  }

  @SubscribeMessage("minigame_leave_queue")
  handleLeaveQueue(@ConnectedSocket() client: AuthenticatedSocket) {
    const user = this.requireSocketUser(client);
    this.removeFromQueue(user.id);
    this.notifyQueueUpdate();
    return { status: "left" as const };
  }

  // --- Session -------------------------------------------------------------

  @SubscribeMessage("minigame_join_room")
  async handleJoinRoom(
    @MessageBody() data: SessionDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const user = this.requireSocketUser(client);
    const session = this.activeSessions.get(data.sessionId);
    if (!session) return { error: "Session not found" };

    const player = session.players.find((p) => p.userId === user.id);
    if (!player) return { error: "You are not a player in this session" };

    // A reconnecting player comes back on a new socket: adopt it and cancel
    // the pending forfeit.
    player.socketId = client.id;
    player.locale = client.data.locale ?? player.locale;
    const wasDisconnected = !player.connected;
    player.connected = true;
    this.clearDisconnectTimer(`${session.id}:${user.id}`);

    client.join(roomOf(session.id));

    if (wasDisconnected) {
      this.server.to(roomOf(session.id)).emit("minigame_player_connection", {
        userId: player.userId,
        userName: player.userName,
        connected: true,
      });
    }

    client.emit(
      "minigame_state_update",
      await this.formatSessionState(session, player),
    );
    return { status: "joined" as const };
  }

  @SubscribeMessage("minigame_ready")
  async handleReady(
    @MessageBody() data: SessionDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const user = this.requireSocketUser(client);
    const session = this.activeSessions.get(data.sessionId);
    if (!session) return { error: "Session not found" };

    const player = session.players.find((p) => p.userId === user.id);
    if (!player) return { error: "Not a player" };
    if (session.state === "finished") return { error: "Session is over" };

    // Readiness only advances between rounds: a round in progress is closed by
    // the guesses (or the timer), not by a ready click.
    if (session.state === "playing" && !this.isRoundClosed(session)) {
      return { error: "Round still in progress" };
    }

    player.ready = true;

    if (session.players.every((p) => p.ready)) {
      for (const p of session.players) p.ready = false;

      if (session.state === "waiting") {
        session.state = "playing";
        this.startRound(session, 1);
      } else if (session.round < session.maxRounds) {
        this.startRound(session, session.round + 1);
      } else {
        this.finish(session);
      }
    }

    await this.broadcastState(session);
    return { status: "ok" as const };
  }

  @SubscribeMessage("minigame_open_pack")
  async handleOpenPack(
    @MessageBody() data: SessionDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const user = this.requireSocketUser(client);
    const session = this.activeSessions.get(data.sessionId);
    if (!session || session.gameType !== MiniGameType.CASE_OPENING) {
      return { error: "Invalid session" };
    }
    if (session.state !== "playing") return { error: "Game not in progress" };

    const playerIndex = session.players.findIndex((p) => p.userId === user.id);
    const player = session.players[playerIndex];
    if (!player) return { error: "Not a player" };
    if (player.openedCount >= session.round) {
      return { error: "Pack already opened for this round" };
    }

    const pack = session.caseOpeningPacks?.[session.round - 1]?.[playerIndex];
    if (!pack) return { error: "No booster for this round" };

    const packValue = pack.reduce(
      (sum, card) => sum + (cardMarketValue(card) ?? 0),
      0,
    );
    player.openedCount += 1;
    player.score = roundPrice(player.score + packValue);

    await this.broadcastState(session);

    const cards = await this.items.localizeCards(pack, player.locale, {
      keepPricing: true,
    });
    return { status: "ok" as const, cards };
  }

  @SubscribeMessage("minigame_submit_guess")
  async handleSubmitGuess(
    @MessageBody() data: SubmitGuessDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const user = this.requireSocketUser(client);
    const session = this.activeSessions.get(data.sessionId);
    if (!session || session.gameType !== MiniGameType.JUSTE_PRIX) {
      return { error: "Invalid session" };
    }
    if (session.state !== "playing") return { error: "Game not in progress" };

    const player = session.players.find((p) => p.userId === user.id);
    if (!player) return { error: "Not a player" };

    const round = session.round;
    if (player.guesses.some((g) => g.round === round)) {
      return { error: "Guess already submitted for this round" };
    }

    const item = session.justePrixItems?.[round - 1];
    if (!item) return { error: "Item not found" };

    // Elapsed time is measured server-side: a client-provided duration could
    // be negative and inflate the speed bonus.
    const elapsedSeconds = Math.max(
      0,
      (Date.now() - session.roundStartedAt) / 1000,
    );
    const points = scoreJustePrixGuess(
      item.price,
      data.guess,
      elapsedSeconds,
      JUSTE_PRIX_ROUND_SECONDS,
    );

    player.guesses.push({ round, guess: data.guess, elapsedSeconds, points });
    player.score += points;

    // State first, reveal last: a client that resets its reveal panel on every
    // state update must still end up showing the reveal.
    await this.broadcastState(session);
    if (this.isRoundClosed(session)) {
      this.revealRound(session);
    }
    return { status: "ok" as const };
  }

  // --- Round lifecycle -------------------------------------------------------

  private async createSession(
    gameType: MiniGameType,
    params: QueueParams,
    queued: QueuePlayer[],
  ): Promise<GameSession> {
    const session: GameSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      gameType,
      params,
      players: queued.map((p) => ({
        userId: p.userId,
        userName: p.userName,
        socketId: p.socketId,
        locale: p.locale,
        score: 0,
        ready: false,
        connected: true,
        openedCount: 0,
        guesses: [],
      })),
      state: "waiting",
      round: 0,
      maxRounds: params.roundCount,
      roundStartedAt: Date.now(),
      roundDurationMs:
        gameType === MiniGameType.JUSTE_PRIX
          ? JUSTE_PRIX_ROUND_SECONDS * 1000
          : null,
    };

    if (gameType === MiniGameType.CASE_OPENING) {
      session.caseOpeningPacks = await this.items.buildCaseOpeningPacks(
        params.roundCount,
        queued.length,
        {
          setId: params.setId,
          serieId: params.serieId,
          style: params.packStyle,
        },
      );
    } else {
      session.justePrixItems = await this.items.buildJustePrixItems(
        params.roundCount,
        params.setId,
      );
    }

    return session;
  }

  private startRound(session: GameSession, round: number) {
    session.round = round;
    session.roundStartedAt = Date.now();
    this.clearRoundTimer(session);

    if (session.roundDurationMs !== null) {
      session.roundTimer = setTimeout(() => {
        session.roundTimer = undefined;
        void this.closeRoundOnTimeout(session);
      }, session.roundDurationMs + ROUND_DEADLINE_SLACK_MS);
    }
  }

  /** Juste Prix: every player has answered the current round. */
  private isRoundClosed(session: GameSession): boolean {
    if (session.gameType === MiniGameType.CASE_OPENING) {
      return session.players.every((p) => p.openedCount >= session.round);
    }
    return session.players.every((p) =>
      p.guesses.some((g) => g.round === session.round),
    );
  }

  /** Files an empty guess for every player who let the timer run out. */
  private async closeRoundOnTimeout(session: GameSession) {
    if (session.state !== "playing" || this.isRoundClosed(session)) return;

    const elapsedSeconds = (session.roundDurationMs ?? 0) / 1000;
    for (const player of session.players) {
      if (!player.guesses.some((g) => g.round === session.round)) {
        player.guesses.push({
          round: session.round,
          guess: null,
          elapsedSeconds,
          points: 0,
        });
      }
    }

    await this.broadcastState(session);
    this.revealRound(session);
  }

  private revealRound(session: GameSession) {
    this.clearRoundTimer(session);
    const item = session.justePrixItems?.[session.round - 1];
    if (!item) return;

    this.server.to(roomOf(session.id)).emit("minigame_round_reveal", {
      round: session.round,
      correctPrice: item.price,
      guesses: session.players.map((p) => {
        const guess = p.guesses.find((g) => g.round === session.round);
        return {
          userId: p.userId,
          userName: p.userName,
          guess: guess?.guess ?? null,
          points: guess?.points ?? 0,
        };
      }),
    });
  }

  private finish(session: GameSession) {
    session.state = "finished";
    this.clearRoundTimer(session);
    for (const player of session.players) {
      this.clearDisconnectTimer(`${session.id}:${player.userId}`);
    }
    setTimeout(() => {
      this.activeSessions.delete(session.id);
    }, FINISHED_SESSION_TTL_MS).unref?.();
  }

  private forfeit(session: GameSession, leaver: GamePlayerState) {
    if (session.state === "finished") return;

    session.forfeitedBy = leaver.userId;
    this.finish(session);

    // Kept for clients that treat a departure as an interrupted match.
    this.server.to(roomOf(session.id)).emit("player_disconnected", {
      userId: leaver.userId,
      userName: leaver.userName,
    });
    void this.broadcastState(session);
  }

  // --- Payloads --------------------------------------------------------------

  /** Sends each player the state in their own language. */
  private async broadcastState(session: GameSession) {
    await Promise.all(
      session.players
        .filter((player) => player.connected)
        .map(async (player) =>
          this.server
            .to(player.socketId)
            .emit(
              "minigame_state_update",
              await this.formatSessionState(session, player),
            ),
        ),
    );
  }

  /**
   * Client view of a session for one recipient.
   *
   * Guesses of the round in progress are withheld from everyone: only
   * `hasGuessed` is exposed until the reveal, so a player cannot read the
   * opponent's estimate before submitting their own.
   */
  private async formatSessionState(
    session: GameSession,
    recipient: GamePlayerState,
  ) {
    const locale = recipient.locale;
    const revealedRound = this.isRoundClosed(session)
      ? session.round
      : session.round - 1;

    const players = await Promise.all(
      session.players.map(async (p, index) => ({
        userId: p.userId,
        userName: p.userName,
        score: p.score,
        ready: p.ready,
        connected: p.connected,
        hasGuessed: p.guesses.some((g) => g.round === session.round),
        guesses: p.guesses.filter((g) => g.round <= revealedRound),
        openedPacks: await this.openedPacksFor(session, index, locale),
      })),
    );

    const currentItem =
      session.gameType === MiniGameType.JUSTE_PRIX && session.round > 0
        ? await this.currentItemFor(session, locale)
        : null;

    return {
      id: session.id,
      gameType: session.gameType,
      round: session.round,
      maxRounds: session.maxRounds,
      state: session.state,
      roundStartedAt: session.roundStartedAt,
      roundDurationMs: session.roundDurationMs,
      serverTime: Date.now(),
      forfeitedBy: session.forfeitedBy ?? null,
      params: {
        setId: session.params.setId ?? null,
        serieId: session.params.serieId ?? null,
        packStyle: session.params.packStyle,
      },
      players,
      currentItem,
    };
  }

  private async openedPacksFor(
    session: GameSession,
    playerIndex: number,
    locale: SupportedLocale,
  ): Promise<Card[][]> {
    const packs = session.caseOpeningPacks;
    const opened = session.players[playerIndex]?.openedCount ?? 0;
    if (!packs || opened === 0) return [];

    return Promise.all(
      packs.slice(0, opened).map((roundPacks) =>
        this.items.localizeCards(roundPacks[playerIndex] ?? [], locale, {
          keepPricing: true,
        }),
      ),
    );
  }

  private async currentItemFor(session: GameSession, locale: SupportedLocale) {
    const item = session.justePrixItems?.[session.round - 1];
    if (!item) return null;
    return this.items.localizeJustePrixItem(item, locale);
  }

  // --- Helpers ---------------------------------------------------------------

  private removeFromQueue(userId: number) {
    this.matchmakingQueue = this.matchmakingQueue.filter(
      (p) => p.userId !== userId,
    );
  }

  private notifyQueueUpdate() {
    this.server.emit("minigame_queue_status", {
      queueSize: this.matchmakingQueue.length,
    });
  }

  private clearRoundTimer(session: GameSession) {
    if (session.roundTimer) {
      clearTimeout(session.roundTimer);
      session.roundTimer = undefined;
    }
  }

  private clearDisconnectTimer(key: string) {
    const timer = this.disconnectTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(key);
    }
  }

  private async authenticateClient(client: AuthenticatedSocket) {
    const accessToken = readCookie(
      client.handshake.headers.cookie,
      "accessToken",
    );
    if (!accessToken) {
      throw new UnauthorizedException("Missing access token");
    }

    const jwtSecret = this.configService.get<string>("JWT_SECRET");
    if (!jwtSecret) {
      throw new UnauthorizedException("JWT secret not configured");
    }

    const payload = await this.jwtService.verifyAsync<{ sub: number }>(
      accessToken,
      { secret: jwtSecret },
    );

    // A valid token is not enough: the account may have been deactivated or
    // deleted since it was issued, and the token stays valid until it expires.
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, isActive: true },
    });
    if (!user?.isActive) {
      throw new UnauthorizedException("Account is not active");
    }

    return { id: user.id, email: user.email, role: user.role };
  }

  private requireSocketUser(client: AuthenticatedSocket) {
    if (!client.data.user) {
      throw new UnauthorizedException("Not authenticated");
    }
    return client.data.user;
  }
}

function roomOf(sessionId: string): string {
  return `minigame:room:${sessionId}`;
}

function clampRoundCount(value: number | undefined): number {
  return Math.min(
    MAX_ROUND_COUNT,
    Math.max(MIN_ROUND_COUNT, value ?? DEFAULT_ROUND_COUNT),
  );
}

function readHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function readCookie(cookieHeader: string | undefined, cookieName: string) {
  if (!cookieHeader) return null;
  for (const rawCookie of cookieHeader.split(";")) {
    const [name, ...valueParts] = rawCookie.trim().split("=");
    if (name === cookieName) {
      return decodeURIComponent(valueParts.join("="));
    }
  }
  return null;
}

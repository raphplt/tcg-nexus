import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Card } from "../card/entities/card.entity";
import { SealedProduct } from "../sealed-product/entities/sealed-product.entity";
import { User } from "../user/entities/user.entity";
import { UnauthorizedException, Injectable } from "@nestjs/common";

type AuthenticatedSocket = Socket & {
  data: Socket["data"] & {
    user?: Pick<User, "id" | "email" | "role">;
  };
};

interface QueuePlayer {
  userId: number;
  userName: string;
  socketId: string;
  gameType: "case_opening" | "juste_prix";
  params?: {
    setId?: string;
    roundCount?: number;
  };
}

interface GamePlayerState {
  userId: number;
  userName: string;
  socketId: string;
  score: number;
  ready: boolean;
  openedPacks: any[][]; // Cards opened per booster
  guesses: {
    round: number;
    guess: number;
    timeTaken: number;
    diff: number;
    points: number;
  }[];
}

interface GameSession {
  id: string;
  gameType: "case_opening" | "juste_prix";
  params?: any;
  players: GamePlayerState[];
  state: "waiting" | "playing" | "finished";
  round: number;
  maxRounds: number;
  items: any[]; // The card or sealed product items generated for this session
}

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  namespace: "/mini-game",
})
@Injectable()
export class MiniGameGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  // Queue in memory
  private matchmakingQueue: QueuePlayer[] = [];
  // Active game sessions in memory
  private activeSessions = new Map<string, GameSession>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(Card)
    private readonly cardRepository: Repository<Card>,
    @InjectRepository(SealedProduct)
    private readonly sealedProductRepository: Repository<SealedProduct>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

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
      // Remove from queue if disconnects
      this.matchmakingQueue = this.matchmakingQueue.filter(
        (p) => p.userId !== user.id,
      );
      this.notifyQueueUpdate();

      // Handle active games: if a player disconnects, forfeit or alert the opponent
      for (const [sessionId, session] of this.activeSessions.entries()) {
        const playerIndex = session.players.findIndex(
          (p) => p.userId === user.id,
        );
        if (playerIndex !== -1) {
          // Notify opponent
          this.server.to(`minigame:room:${sessionId}`).emit("player_disconnected", {
            userId: user.id,
            userName: session.players[playerIndex].userName,
          });
          // End session if in finished state or clean up later
          this.activeSessions.delete(sessionId);
        }
      }
    }
  }

  // --- Matchmaking events ---

  @SubscribeMessage("minigame_join_queue")
  async handleJoinQueue(
    @MessageBody()
    data: {
      gameType: "case_opening" | "juste_prix";
      params?: { setId?: string; roundCount?: number };
    },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const user = this.requireSocketUser(client);
    const dbUser = await this.userRepository.findOne({
      where: { id: user.id },
    });
    const userName = dbUser?.email?.split("@")[0] || `User_${user.id}`;

    // Remove if already in queue
    this.matchmakingQueue = this.matchmakingQueue.filter(
      (p) => p.userId !== user.id,
    );

    const newPlayer: QueuePlayer = {
      userId: user.id,
      userName,
      socketId: client.id,
      gameType: data.gameType,
      params: data.params,
    };

    // Try matching
    const opponent = this.matchmakingQueue.find(
      (p) =>
        p.gameType === data.gameType &&
        p.userId !== user.id &&
        (!data.params?.setId ||
          !p.params?.setId ||
          p.params.setId === data.params.setId),
    );

    if (opponent) {
      // Remove opponent from queue
      this.matchmakingQueue = this.matchmakingQueue.filter(
        (p) => p.userId !== opponent.userId,
      );

      // Create session
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Generate items depending on game type
      const roundCount = data.params?.roundCount || 5;
      const items = await this.generateGameItems(
        data.gameType,
        roundCount,
        data.params?.setId,
      );

      const session: GameSession = {
        id: sessionId,
        gameType: data.gameType,
        params: data.params,
        players: [
          {
            userId: opponent.userId,
            userName: opponent.userName,
            socketId: opponent.socketId,
            score: 0,
            ready: false,
            openedPacks: [],
            guesses: [],
          },
          {
            userId: user.id,
            userName,
            socketId: client.id,
            score: 0,
            ready: false,
            openedPacks: [],
            guesses: [],
          },
        ],
        state: "waiting",
        round: 0,
        maxRounds: roundCount,
        items,
      };

      this.activeSessions.set(sessionId, session);

      // Emit to both
      this.server.to(opponent.socketId).emit("minigame_matched", {
        sessionId,
        gameType: data.gameType,
        opponentName: userName,
        opponentId: user.id,
        roundCount,
        items: this.sanitizeItemsForClient(items, data.gameType),
      });

      client.emit("minigame_matched", {
        sessionId,
        gameType: data.gameType,
        opponentName: opponent.userName,
        opponentId: opponent.userId,
        roundCount,
        items: this.sanitizeItemsForClient(items, data.gameType),
      });

      this.notifyQueueUpdate();
      return { status: "matched", sessionId };
    }

    // Add to queue
    this.matchmakingQueue.push(newPlayer);
    this.notifyQueueUpdate();

    return { status: "queued" };
  }

  @SubscribeMessage("minigame_leave_queue")
  handleLeaveQueue(@ConnectedSocket() client: AuthenticatedSocket) {
    const user = this.requireSocketUser(client);
    this.matchmakingQueue = this.matchmakingQueue.filter(
      (p) => p.userId !== user.id,
    );
    this.notifyQueueUpdate();
    return { status: "left" };
  }

  // --- Game Session events ---

  @SubscribeMessage("minigame_join_room")
  handleJoinRoom(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const user = this.requireSocketUser(client);
    const session = this.activeSessions.get(data.sessionId);

    if (!session) {
      return { error: "Session not found" };
    }

    const player = session.players.find((p) => p.userId === user.id);
    if (!player) {
      return { error: "You are not a player in this session" };
    }

    // Update socketId in case it changed
    player.socketId = client.id;

    const roomName = `minigame:room:${data.sessionId}`;
    client.join(roomName);

    client.emit("minigame_state_update", this.formatSessionState(session));
    return { status: "joined" };
  }

  @SubscribeMessage("minigame_ready")
  handleReady(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const user = this.requireSocketUser(client);
    const session = this.activeSessions.get(data.sessionId);

    if (!session) return { error: "Session not found" };

    const player = session.players.find((p) => p.userId === user.id);
    if (!player) return { error: "Not a player" };

    player.ready = true;

    // If both ready, advance round or start game
    if (session.players.every((p) => p.ready)) {
      // Reset ready flags
      for (const p of session.players) {
        p.ready = false;
      }

      if (session.state === "waiting") {
        session.state = "playing";
        session.round = 1;
      } else if (session.state === "playing") {
        if (session.round < session.maxRounds) {
          session.round += 1;
        } else {
          session.state = "finished";
        }
      }

      this.server
        .to(`minigame:room:${session.id}`)
        .emit("minigame_state_update", this.formatSessionState(session));
    } else {
      // Notify other player that this player is ready
      this.server
        .to(`minigame:room:${session.id}`)
        .emit("minigame_state_update", this.formatSessionState(session));
    }

    return { status: "ok" };
  }

  @SubscribeMessage("minigame_open_pack")
  async handleOpenPack(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const user = this.requireSocketUser(client);
    const session = this.activeSessions.get(data.sessionId);

    if (!session || session.gameType !== "case_opening") {
      return { error: "Invalid session" };
    }

    const player = session.players.find((p) => p.userId === user.id);
    if (!player) return { error: "Not a player" };

    const currentRound = session.round;
    if (player.openedPacks.length >= currentRound) {
      return { error: "Pack already opened for this round" };
    }

    // The cards are already pre-generated for this round in session.items[round-1][playerIndex]
    const roundIndex = currentRound - 1;
    const playerIndex = session.players.findIndex((p) => p.userId === user.id);
    const packCards = session.items[roundIndex]?.[playerIndex] || [];

    // Calculate score (total value)
    let packValue = 0;
    for (const card of packCards) {
      const price = this.getCardMarketValue(card);
      packValue += price;
    }

    player.openedPacks.push(packCards);
    player.score = parseFloat((player.score + packValue).toFixed(2));

    // Broadcast that player opened their pack (with the cards details)
    this.server
      .to(`minigame:room:${session.id}`)
      .emit("minigame_state_update", this.formatSessionState(session));

    return { status: "ok", cards: packCards };
  }

  @SubscribeMessage("minigame_submit_guess")
  handleSubmitGuess(
    @MessageBody() data: { sessionId: string; guess: number; timeTaken: number },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const user = this.requireSocketUser(client);
    const session = this.activeSessions.get(data.sessionId);

    if (!session || session.gameType !== "juste_prix") {
      return { error: "Invalid session" };
    }

    const player = session.players.find((p) => p.userId === user.id);
    if (!player) return { error: "Not a player" };

    const currentRound = session.round;
    if (player.guesses.some((g) => g.round === currentRound)) {
      return { error: "Guess already submitted for this round" };
    }

    const roundIndex = currentRound - 1;
    const item = session.items[roundIndex];
    if (!item) return { error: "Item not found" };

    const correctPrice = this.getItemPrice(item);
    const diff = Math.abs(correctPrice - data.guess);
    const diffPercent = correctPrice > 0 ? diff / correctPrice : 0;

    // Points system:
    // Max points per round = 1000
    // Penalize based on deviation percent (e.g., -100 points for each 10% deviation)
    let points = Math.max(0, 1000 - Math.round(diffPercent * 10000));
    // If they got it very close (within 5%), add speed bonus
    if (diffPercent <= 0.05) {
      const speedBonus = Math.max(0, Math.round((15 - data.timeTaken) * 20)); // up to 300 points speed bonus
      points += speedBonus;
    }

    player.guesses.push({
      round: currentRound,
      guess: data.guess,
      timeTaken: data.timeTaken,
      diff,
      points,
    });

    player.score += points;

    // Check if all players submitted guesses for this round
    const allGuessed = session.players.every((p) =>
      p.guesses.some((g) => g.round === currentRound),
    );

    if (allGuessed) {
      // Reveal prices to everyone
      this.server
        .to(`minigame:room:${session.id}`)
        .emit("minigame_round_reveal", {
          round: currentRound,
          correctPrice,
          guesses: session.players.map((p) => ({
            userId: p.userId,
            userName: p.userName,
            guess: p.guesses.find((g) => g.round === currentRound)?.guess,
            points: p.guesses.find((g) => g.round === currentRound)?.points,
          })),
        });
    }

    this.server
      .to(`minigame:room:${session.id}`)
      .emit("minigame_state_update", this.formatSessionState(session));

    return { status: "ok" };
  }

  // --- Helper Methods ---

  private notifyQueueUpdate() {
    this.server.emit("minigame_queue_status", {
      queueSize: this.matchmakingQueue.length,
    });
  }

  private async generateGameItems(
    gameType: "case_opening" | "juste_prix",
    roundCount: number,
    setId?: string,
  ): Promise<any[]> {
    if (gameType === "case_opening") {
      // Duel case opening: for each round, we need 2 packs (one for player A, one for player B).
      // A pack contains 6 random cards of the selected set (or general cards if no set selected).
      const packs: any[] = [];
      for (let r = 0; r < roundCount; r++) {
        const packA = await this.drawRandomCards(6, setId);
        const packB = await this.drawRandomCards(6, setId);
        packs.push([packA, packB]);
      }
      return packs;
    } else {
      // Juste Prix: we need 5 random items (could be cards or sealed products).
      // Let's get a mix: 3 cards, 2 sealed products.
      const items: any[] = [];

      // Query cards with pricing
      const cardQb = this.cardRepository
        .createQueryBuilder("card")
        .leftJoinAndSelect("card.set", "set")
        .where("card.pricing IS NOT NULL");
      if (setId) {
        cardQb.andWhere("set.id = :setId", { setId });
      }
      const dbCards = await cardQb
        .orderBy("RANDOM()")
        .limit(roundCount)
        .getMany();

      // Query sealed products
      const dbSealed = await this.sealedProductRepository
        .createQueryBuilder("sealed")
        .leftJoinAndSelect("sealed.pokemonSet", "set")
        .orderBy("RANDOM()")
        .limit(roundCount)
        .getMany();

      // Mix items
      let cardIdx = 0;
      let sealedIdx = 0;
      for (let i = 0; i < roundCount; i++) {
        if (i % 2 === 0 && cardIdx < dbCards.length) {
          items.push({
            type: "card",
            data: dbCards[cardIdx++],
          });
        } else if (sealedIdx < dbSealed.length) {
          items.push({
            type: "sealed",
            data: dbSealed[sealedIdx++],
          });
        } else if (cardIdx < dbCards.length) {
          items.push({
            type: "card",
            data: dbCards[cardIdx++],
          });
        } else {
          // Fail-safe mock if database is empty
          items.push(this.generateMockItem(i));
        }
      }

      return items;
    }
  }

  private async drawRandomCards(count: number, setId?: string): Promise<Card[]> {
    const qb = this.cardRepository
      .createQueryBuilder("card")
      .leftJoinAndSelect("card.set", "set");

    if (setId) {
      qb.where("set.id = :setId", { setId });
    }

    const cards = await qb.orderBy("RANDOM()").limit(count).getMany();

    // Fill with mocks if not enough cards in database
    while (cards.length < count) {
      cards.push(this.generateMockCard() as any);
    }

    return cards;
  }

  private generateMockCard() {
    const id = `mock_${Math.random().toString(36).substr(2, 9)}`;
    const names = ["Dracaufeu", "Pikachu", "Mewtwo", "Tortank", "Florizarre", "Lugia", "Evoli"];
    const rarities = ["Rare Holo", "Ultra Rare", "Secret Rare", "Common"];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomRarity = rarities[Math.floor(Math.random() * rarities.length)];
    const randomPrice = parseFloat((Math.random() * 50 + 0.5).toFixed(2));

    return {
      id,
      name: randomName,
      rarity: randomRarity,
      image: "https://images.pokemontcg.io/cel25/4_hires.png",
      pricing: {
        cardmarket: {
          trend: randomPrice,
        },
      },
    };
  }

  private generateMockItem(index: number) {
    const isCard = index % 2 === 0;
    if (isCard) {
      return {
        type: "card",
        data: this.generateMockCard(),
      };
    } else {
      const names = ["Booster Base Set", "Display Épée et Bouclier", "Coffret Evoli", "ETB Destinées Occultes"];
      const randomName = names[Math.floor(Math.random() * names.length)];
      const randomPrice = parseFloat((Math.random() * 300 + 10).toFixed(2));
      return {
        type: "sealed",
        data: {
          id: `mock_sealed_${index}`,
          nameEn: randomName,
          productType: "booster",
          image: "pokecardex/AQ/Booster_Aquapolis_Arcanin.png",
          mockPrice: randomPrice,
        },
      };
    }
  }

  private sanitizeItemsForClient(items: any[], gameType: string): any[] {
    if (gameType === "case_opening") {
      // In case opening, we don't send the pre-generated card packs to the client
      // because they would see what cards are inside before clicking open!
      // We just send placeholders or general info
      return items.map(() => ({ placeholder: true }));
    } else {
      // In juste prix, we send the item details *but strip the pricing* so they can't cheat!
      return items.map((item) => {
        const sanitized = JSON.parse(JSON.stringify(item));
        if (sanitized.type === "card" && sanitized.data) {
          delete sanitized.data.pricing;
        } else if (sanitized.type === "sealed" && sanitized.data) {
          delete sanitized.data.mockPrice;
        }
        return sanitized;
      });
    }
  }

  private formatSessionState(session: GameSession) {
    return {
      id: session.id,
      gameType: session.gameType,
      round: session.round,
      maxRounds: session.maxRounds,
      state: session.state,
      players: session.players.map((p) => ({
        userId: p.userId,
        userName: p.userName,
        score: p.score,
        ready: p.ready,
        openedPack: p.openedPacks[session.round - 1] || null,
        openedPacks: p.openedPacks,
        hasGuessed: p.guesses.some((g) => g.round === session.round),
        guesses: p.guesses,
      })),
      currentItem: session.gameType === "juste_prix" && session.round > 0
        ? this.sanitizeItemsForClient([session.items[session.round - 1]], "juste_prix")[0]
        : null,
    };
  }

  private getCardMarketValue(card: any): number {
    if (!card) return 0;
    // Extract pricing
    const cm = card.pricing?.cardmarket;
    if (cm) {
      if (cm.trend != null) return parseFloat(cm.trend);
      if (cm.avg != null) return parseFloat(cm.avg);
      if (cm.low != null) return parseFloat(cm.low);
    }
    const tcg = card.pricing?.tcgplayer;
    if (tcg) {
      const variants = [tcg.normal, tcg.holofoil, tcg.reverseHolofoil];
      for (const v of variants) {
        if (v?.marketPrice != null) return parseFloat(v.marketPrice);
        if (v?.midPrice != null) return parseFloat(v.midPrice);
      }
    }
    return 1.0; // default minimum
  }

  private getItemPrice(item: any): number {
    if (!item) return 0;
    if (item.type === "card") {
      return this.getCardMarketValue(item.data);
    } else {
      if (item.data.mockPrice != null) return item.data.mockPrice;
      // For sealed products, try to get some mock price based on productType
      const type = item.data.productType;
      if (type === "display") return 150.0;
      if (type === "etb") return 55.0;
      if (type === "booster") return 6.0;
      return 25.0;
    }
  }

  private async authenticateClient(client: AuthenticatedSocket) {
    const accessToken = this.readCookie(
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

    const payload = await this.jwtService.verifyAsync<any>(accessToken, {
      secret: jwtSecret,
    });

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }

  private requireSocketUser(client: AuthenticatedSocket) {
    if (!client.data.user) {
      throw new UnauthorizedException("Not authenticated");
    }
    return client.data.user;
  }

  private readCookie(cookieHeader: string | undefined, cookieName: string) {
    if (!cookieHeader) return null;
    for (const rawCookie of cookieHeader.split(";")) {
      const [name, ...valueParts] = rawCookie.trim().split("=");
      if (name === cookieName) {
        return decodeURIComponent(valueParts.join("="));
      }
    }
    return null;
  }
}

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Deck } from "../deck/entities/deck.entity";
import { TournamentRegistration } from "../tournament/entities/tournament-registration.entity";
import { UserFollowService } from "../user-follow/user-follow.service";

export type FeedEventType = "deck_created" | "tournament_joined";

export interface FeedActor {
  id: number;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export interface FeedDeckPayload {
  id: number;
  name: string;
  format?: { id: number; type: string } | null;
}

export interface FeedTournamentPayload {
  id: number;
  name: string;
  startDate: Date | null;
  endDate: Date | null;
}

export interface FeedItem {
  type: FeedEventType;
  createdAt: Date;
  actor: FeedActor;
  deck?: FeedDeckPayload;
  tournament?: FeedTournamentPayload;
}

@Injectable()
export class FeedService {
  constructor(
    @InjectRepository(Deck)
    private readonly deckRepo: Repository<Deck>,
    @InjectRepository(TournamentRegistration)
    private readonly regRepo: Repository<TournamentRegistration>,
    private readonly followService: UserFollowService,
  ) {}

  async getFeedForUser(
    userId: number,
    limit: number = 30,
  ): Promise<FeedItem[]> {
    const followedIds = await this.followService.getFollowedIds(userId);
    if (followedIds.length === 0) {
      return [];
    }

    const [decks, regs] = await Promise.all([
      this.deckRepo.find({
        where: { user: { id: In(followedIds) }, isPublic: true },
        relations: ["user", "format"],
        order: { createdAt: "DESC" },
        take: limit,
      }),
      this.regRepo.find({
        where: { player: { user: { id: In(followedIds) } } },
        relations: ["tournament", "player", "player.user"],
        order: { registeredAt: "DESC" },
        take: limit,
      }),
    ]);

    const deckItems: FeedItem[] = decks.map((deck) => ({
      type: "deck_created" as const,
      createdAt: deck.createdAt,
      actor: this.toActor(deck.user),
      deck: {
        id: deck.id,
        name: deck.name,
        format: deck.format
          ? { id: deck.format.id, type: deck.format.type }
          : null,
      },
    }));

    const regItems: FeedItem[] = regs
      .filter((reg) => reg.player?.user)
      .map((reg) => ({
        type: "tournament_joined" as const,
        createdAt: reg.registeredAt,
        actor: this.toActor(reg.player.user),
        tournament: {
          id: reg.tournament.id,
          name: reg.tournament.name,
          startDate: reg.tournament.startDate ?? null,
          endDate: reg.tournament.endDate ?? null,
        },
      }));

    return [...deckItems, ...regItems]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  private toActor(user: any): FeedActor {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl ?? null,
    };
  }
}

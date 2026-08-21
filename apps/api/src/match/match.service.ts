import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import { Deck } from "src/deck/entities/deck.entity";
import { DataSource, EntityManager, In, Repository } from "typeorm";
import { Player } from "../player/entities/player.entity";
import { Ranking } from "../ranking/entities/ranking.entity";
import { RankingService } from "../ranking/ranking.service";
import { Statistics } from "../statistics/entities/statistic.entity";
import {
  Tournament,
  TournamentStatus,
  TournamentType,
} from "../tournament/entities/tournament.entity";
import {
  RegistrationStatus,
  TournamentRegistration,
} from "../tournament/entities/tournament-registration.entity";
import {
  SwissPairingService,
  toSwissResults,
} from "../tournament/services/swiss-pairing.service";
import { CreateMatchDto } from "./dto/create-match.dto";
import {
  ReportScoreDto,
  ResetMatchDto,
  StartMatchDto,
} from "./dto/match-operations.dto";
import { UpdateMatchDto } from "./dto/update-match.dto";
import {
  BracketSide,
  Match,
  MatchPhase,
  MatchStatus,
} from "./entities/match.entity";
import {
  OnlineMatchSession,
  OnlineMatchSessionStatus,
} from "./entities/online-match-session.entity";

export interface MatchQueryDto {
  tournamentId?: number;
  round?: number;
  phase?: MatchPhase;
  status?: MatchStatus;
  playerId?: number;
  page?: number;
  limit?: number;
}

export interface PlayHubMatchSummary {
  id: number;
  tournamentId: number;
  tournamentName: string;
  opponentName: string;
  round: number;
  phase: MatchPhase;
  status: MatchStatus;
  scheduledDate?: Date | null;
  startedAt?: Date | null;
  finishedAt?: Date | null;
  playerAScore: number;
  playerBScore: number;
  onlineSessionStatus?: string | null;
}

export interface PlayHubDeckSummary {
  id: number;
  name: string;
  format: string | null;
  updatedAt: Date;
  coverCard?: {
    id: string;
    name?: string | null;
    image?: string | null;
  } | null;
}

export interface PlayHubResponse {
  playerId: number | null;
  ranked: {
    enabled: boolean;
    status: "coming_soon";
  };
  summary: {
    liveMatches: number;
    readyMatches: number;
    completedMatches: number;
    totalMatches: number;
    totalDecks: number;
  };
  matches: PlayHubMatchSummary[];
  recentDecks: PlayHubDeckSummary[];
}

@Injectable()
export class MatchService {
  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(OnlineMatchSession)
    private readonly onlineSessionRepository: Repository<OnlineMatchSession>,
    @InjectRepository(Tournament)
    private readonly tournamentRepository: Repository<Tournament>,
    @InjectRepository(Player)
    private readonly playerRepository: Repository<Player>,
    @InjectRepository(TournamentRegistration)
    private readonly registrationRepository: Repository<TournamentRegistration>,
    @InjectRepository(Ranking)
    private readonly rankingRepository: Repository<Ranking>,
    @InjectRepository(Statistics)
    private readonly statisticsRepository: Repository<Statistics>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(Deck)
    private readonly deckRepository: Repository<Deck>,
    private readonly rankingService: RankingService,
    private readonly swissPairingService: SwissPairingService,
  ) {}

  /**
   * Creates a new scheduled match.
   *
   * @param createMatchDto Match creation DTO.
   * @returns Created Match entity.
   */
  async create(createMatchDto: CreateMatchDto): Promise<Match> {
    const {
      tournamentId,
      playerAId,
      playerBId,
      round,
      phase,
      scheduledDate,
      notes,
      skipStatusCheck,
    } = createMatchDto;

    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException({
        code: "TOURNAMENT_NOT_FOUND",
        message: "Tournoi non trouvé",
      });
    }

    if (
      !skipStatusCheck &&
      tournament.status !== TournamentStatus.IN_PROGRESS
    ) {
      throw new BadRequestException(
        "Le tournoi doit être en cours pour créer des matches",
      );
    }

    let playerA: Player | null = null;
    let playerB: Player | null = null;

    if (playerAId != null) {
      playerA = await this.playerRepository.findOne({
        where: { id: playerAId },
      });
      if (!playerA) {
        throw new NotFoundException(
          `Joueur A avec l'ID ${playerAId} non trouvé`,
        );
      }
      const registrationA: TournamentRegistration | null =
        await this.registrationRepository.findOne({
          where: {
            tournament: { id: tournamentId },
            player: { id: playerAId },
            status: RegistrationStatus.CONFIRMED,
          },
        });
      if (!registrationA) {
        throw new BadRequestException(
          `Le joueur A n'est pas inscrit à ce tournoi`,
        );
      }
    }

    if (playerBId != null) {
      playerB = await this.playerRepository.findOne({
        where: { id: playerBId },
      });
      if (!playerB) {
        throw new NotFoundException(
          `Joueur B avec l'ID ${playerBId} non trouvé`,
        );
      }
      const registrationB: TournamentRegistration | null =
        await this.registrationRepository.findOne({
          where: {
            tournament: { id: tournamentId },
            player: { id: playerBId },
            status: RegistrationStatus.CONFIRMED,
          },
        });
      if (!registrationB) {
        throw new BadRequestException(
          `Le joueur B n'est pas inscrit à ce tournoi`,
        );
      }
    }

    if (!tournament || !playerA || !playerB) {
      throw new BadRequestException({
        code: "INVALID_DATA",
        message: "Données invalides",
      });
    }
    if (!round || !phase || !scheduledDate || !notes) {
      throw new BadRequestException({
        code: "INVALID_DATA",
        message: "Données invalides",
      });
    }

    const matchData: Partial<Match> = {
      tournament,
      playerA: playerA || undefined,
      playerB: playerB || undefined,
      round,
      phase,
      scheduledDate,
      notes,
      status: MatchStatus.SCHEDULED,
    };

    const match = this.matchRepository.create(matchData);

    const savedMatch = await this.matchRepository.save(match);
    return this.ensureOnlineSession(savedMatch);
  }

  /**
   * Retrieves paginated matches matching filter query parameters.
   *
   * @param query Match filter parameters.
   * @returns Paginated matches list.
   */
  async findAll(query: MatchQueryDto) {
    const {
      tournamentId,
      round,
      phase,
      status,
      playerId,
      page = 1,
      limit = 10,
    } = query;

    const qb = this.matchRepository
      .createQueryBuilder("match")
      .leftJoinAndSelect("match.tournament", "tournament")
      .leftJoinAndSelect("match.playerA", "playerA")
      .leftJoinAndSelect("playerA.user", "playerAUser")
      .leftJoinAndSelect("match.playerB", "playerB")
      .leftJoinAndSelect("playerB.user", "playerBUser")
      .leftJoinAndSelect("match.winner", "winner")
      .leftJoinAndSelect("match.statistics", "statistics");

    if (tournamentId != null) {
      qb.andWhere("tournament.id = :tournamentId", { tournamentId });
    }
    if (round != null) {
      qb.andWhere("match.round = :round", { round });
    }
    if (phase != null) {
      qb.andWhere("match.phase = :phase", { phase });
    }
    if (status != null) {
      qb.andWhere("match.status = :status", { status });
    }
    if (playerId != null) {
      qb.andWhere("(playerA.id = :playerId OR playerB.id = :playerId)", {
        playerId,
      });
    }

    const offset = (page - 1) * limit;
    qb.skip(offset).take(limit);
    qb.orderBy("match.round", "ASC").addOrderBy("match.phase", "ASC");

    const [matches, total] = await qb.getManyAndCount();

    return {
      matches,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retrieves a single match by ID with full relations.
   *
   * @param id Match ID.
   * @returns Match entity.
   */
  async findOne(id: number): Promise<Match> {
    const match = await this.matchRepository.findOne({
      where: { id },
      relations: [
        "tournament",
        "playerA",
        "playerA.user",
        "playerB",
        "playerB.user",
        "winner",
        "statistics",
      ],
    });

    if (!match) {
      throw new NotFoundException(`Match avec l'ID ${id} non trouvé`);
    }
    return match;
  }

  /**
   * Updates match attributes (status, notes, scheduledDate).
   *
   * @param id Match ID.
   * @param updateMatchDto Update fields DTO.
   * @returns Updated Match.
   */
  async update(id: number, updateMatchDto: UpdateMatchDto): Promise<Match> {
    const match = await this.findOne(id);

    const includesScore =
      updateMatchDto.playerAScore !== undefined ||
      updateMatchDto.playerBScore !== undefined;
    const isFinalStatus =
      updateMatchDto.status === MatchStatus.FINISHED ||
      updateMatchDto.status === MatchStatus.FORFEIT;

    if (
      includesScore ||
      isFinalStatus ||
      updateMatchDto.status === MatchStatus.IN_PROGRESS
    ) {
      throw new BadRequestException(
        updateMatchDto.status === MatchStatus.IN_PROGRESS
          ? "Utilisez l'action de démarrage pour commencer un match"
          : "Utilisez le flux de saisie de résultat pour enregistrer un score final",
      );
    }

    const wasNotInProgress = match.status !== MatchStatus.IN_PROGRESS;
    if (updateMatchDto.status) {
      match.status = updateMatchDto.status;
    }
    if (updateMatchDto.notes) {
      match.notes = updateMatchDto.notes;
    }
    if (updateMatchDto.scheduledDate) {
      match.scheduledDate = updateMatchDto.scheduledDate;
    }

    const updatedMatch = await this.matchRepository.save(match);
    if (wasNotInProgress && updatedMatch.status === MatchStatus.IN_PROGRESS) {
      this.eventEmitter.emit("match.ready", {
        matchId: updatedMatch.id,
        tournamentId: updatedMatch.tournament?.id ?? null,
        playerAUserId: updatedMatch.playerA?.user?.id ?? null,
        playerBUserId: updatedMatch.playerB?.user?.id ?? null,
      });
    }
    return updatedMatch;
  }

  /**
   * Removes a match record by ID.
   *
   * @param id Match ID.
   */
  async remove(id: number): Promise<void> {
    const match = await this.findOne(id);
    if (
      match.status === MatchStatus.IN_PROGRESS ||
      match.status === MatchStatus.FINISHED
    ) {
      throw new BadRequestException(
        "Impossible de supprimer un match en cours ou terminé",
      );
    }
    await this.matchRepository.remove(match);
  }

  // Démarrer un match
  /**
   * Starts a single match by updating status and creating online game session.
   */
  async startMatch(id: number, startMatchDto: StartMatchDto): Promise<Match> {
    const match = await this.findOne(id);
    const result = await this.startMatches(
      match.tournament.id,
      [id],
      startMatchDto,
    );
    return result.matches[0];
  }

  async startMatches(
    tournamentId: number,
    matchIds: number[],
    startMatchDto: StartMatchDto = {},
  ): Promise<{ startedCount: number; matches: Match[] }> {
    const uniqueMatchIds = [...new Set(matchIds)];
    if (
      uniqueMatchIds.length === 0 ||
      uniqueMatchIds.length !== matchIds.length
    ) {
      throw new BadRequestException(
        "La sélection de matches doit contenir des identifiants uniques",
      );
    }

    const matches = await this.dataSource.transaction<Match[]>(
      async (manager: EntityManager) => {
        const tournament = await manager.findOne(Tournament, {
          where: { id: tournamentId },
          lock: { mode: "pessimistic_write" },
        });
        if (!tournament) {
          throw new NotFoundException({
            code: "TOURNAMENT_NOT_FOUND",
            message: "Tournoi non trouvé",
          });
        }
        if (tournament.status !== TournamentStatus.IN_PROGRESS) {
          throw new BadRequestException(
            "Les matches ne peuvent être démarrés que pendant un tournoi en cours",
          );
        }

        const selectedMatches = await manager.find(Match, {
          where: {
            id: In(uniqueMatchIds),
            tournament: { id: tournamentId },
          },
          relations: [
            "tournament",
            "playerA",
            "playerA.user",
            "playerB",
            "playerB.user",
          ],
          order: { id: "ASC" },
        });

        if (selectedMatches.length !== uniqueMatchIds.length) {
          throw new NotFoundException(
            "Un ou plusieurs matches sont introuvables dans ce tournoi",
          );
        }

        const invalidMatch = selectedMatches.find(
          (selectedMatch) =>
            selectedMatch.status !== MatchStatus.SCHEDULED ||
            selectedMatch.round !== tournament.currentRound ||
            !selectedMatch.playerA ||
            !selectedMatch.playerB,
        );
        if (invalidMatch) {
          throw new BadRequestException(
            `Le match ${invalidMatch.id} n'est pas prêt à être démarré dans le round courant`,
          );
        }

        const startedAt = new Date();
        for (const selectedMatch of selectedMatches) {
          selectedMatch.status = MatchStatus.IN_PROGRESS;
          selectedMatch.startedAt = startedAt;
          if (startMatchDto.notes) {
            selectedMatch.notes = startMatchDto.notes;
          }
        }

        const savedMatches = await manager.save(Match, selectedMatches);
        for (const savedMatch of savedMatches) {
          await this.createOnlineSessionWithManager(savedMatch, manager);
        }
        return savedMatches;
      },
    );

    for (const match of matches) {
      this.eventEmitter.emit("match.ready", {
        matchId: match.id,
        tournamentId: match.tournament?.id ?? tournamentId,
        playerAUserId: match.playerA?.user?.id ?? null,
        playerBUserId: match.playerB?.user?.id ?? null,
      });
    }

    return { startedCount: matches.length, matches };
  }

  /**
   * Reports final match scores and computes winner or draw status.
   *
   * @param id Match ID.
   * @param reportScoreDto Score payload.
   * @returns Updated Match.
   */
  async reportScore(
    id: number,
    reportScoreDto: ReportScoreDto,
  ): Promise<Match> {
    const result = await this.dataSource.transaction<{
      match: Match;
      tournamentFinished: boolean;
    }>(async (manager: EntityManager) => {
      const lockedMatch = await manager.findOne(Match, {
        where: { id },
        lock: { mode: "pessimistic_write" },
      });

      if (!lockedMatch) {
        throw new NotFoundException({
          code: "MATCH_NOT_FOUND",
          message: "Match non trouvé",
        });
      }

      const match = await manager.findOne(Match, {
        where: { id },
        relations: [
          "tournament",
          "playerA",
          "playerA.user",
          "playerB",
          "playerB.user",
          "winner",
        ],
      });

      if (!match) {
        throw new NotFoundException({
          code: "MATCH_NOT_FOUND",
          message: "Match non trouvé",
        });
      }

      if (match.status !== MatchStatus.IN_PROGRESS) {
        throw new BadRequestException(
          "Seuls les matches en cours peuvent recevoir des scores",
        );
      }

      const { playerAScore, playerBScore, isForfeit, notes } = reportScoreDto;
      const isElimination =
        match.tournament.type === TournamentType.SINGLE_ELIMINATION ||
        match.tournament.type === TournamentType.DOUBLE_ELIMINATION;

      if (playerAScore === playerBScore && (isForfeit || isElimination)) {
        throw new BadRequestException(
          isElimination
            ? "Un match à élimination doit désigner un vainqueur"
            : "Un forfait doit désigner un vainqueur",
        );
      }

      match.playerAScore = playerAScore;
      match.playerBScore = playerBScore;
      match.finishedAt = new Date();

      if (isForfeit) {
        match.status = MatchStatus.FORFEIT;
        // On forfeit: infer winner based on provided score
        match.winner =
          playerAScore > playerBScore
            ? (match.playerA ?? null)
            : (match.playerB ?? null);
      } else {
        match.status = MatchStatus.FINISHED;
        if (playerAScore > playerBScore) {
          match.winner = match.playerA ?? null;
        } else if (playerBScore > playerAScore) {
          match.winner = match.playerB ?? null;
        } else {
          match.winner = undefined;
        }
      }

      if (notes) {
        match.notes = notes;
      }

      const savedMatch = await manager.save(Match, match);

      if (match.winner) {
        await this.updateRankings(match, manager);
      }
      await this.createMatchStatistics(match, manager);

      // Check if tournament can progress automatically
      const tournamentFinished = await this.checkTournamentProgression(
        match,
        manager,
      );

      if (savedMatch.winner?.user?.id) {
        this.eventEmitter.emit("challenge.action", {
          userId: savedMatch.winner.user.id,
          action: "WIN_MATCH",
        });
      }

      return { match: savedMatch, tournamentFinished };
    });

    if (result.tournamentFinished) {
      const rankings = await this.rankingService.updateTournamentRankings(
        result.match.tournament.id,
      );
      const tournament = await this.tournamentRepository.findOne({
        where: { id: result.match.tournament.id },
        relations: [
          "registrations",
          "registrations.player",
          "registrations.player.user",
        ],
      });
      const rankByPlayer = new Map(
        rankings.map((ranking) => [ranking.player.id, ranking.rank]),
      );

      if (tournament) {
        this.eventEmitter.emit("tournament.finished", {
          tournamentId: tournament.id,
          name: tournament.name,
          rankings: tournament.registrations
            .filter((registration) => registration.player?.user?.id)
            .map((registration) => ({
              userId: registration.player.user.id,
              rank: rankByPlayer.get(registration.player.id) ?? 0,
            })),
        });
      }
    }

    return result.match;
  }

  /**
   * Resets a recorded match outcome (judge action).
   *
   * @param id Match ID.
   * @param resetMatchDto Reset parameters and reason.
   * @returns Reset Match entity.
   */
  async resetMatch(id: number, resetMatchDto: ResetMatchDto): Promise<Match> {
    const result = await this.dataSource.transaction<{
      match: Match;
      tournamentId: number;
    }>(async (manager: EntityManager) => {
      const lockedMatch = await manager.findOne(Match, {
        where: { id },
        lock: { mode: "pessimistic_write" },
      });
      if (!lockedMatch) {
        throw new NotFoundException({
          code: "MATCH_NOT_FOUND",
          message: "Match non trouvé",
        });
      }

      const match = await manager.findOne(Match, {
        where: { id },
        relations: ["tournament", "playerA", "playerB", "winner"],
      });
      if (!match) {
        throw new NotFoundException({
          code: "MATCH_NOT_FOUND",
          message: "Match non trouvé",
        });
      }

      if (
        match.status !== MatchStatus.FINISHED &&
        match.status !== MatchStatus.FORFEIT
      ) {
        throw new BadRequestException(
          "Seuls les matches terminés peuvent être réinitialisés",
        );
      }

      if (match.tournament.status !== TournamentStatus.IN_PROGRESS) {
        throw new BadRequestException(
          "Un résultat ne peut plus être réinitialisé après la fin ou l'annulation du tournoi",
        );
      }

      if (match.round !== match.tournament.currentRound) {
        throw new BadRequestException(
          "Ce résultat ne peut plus être réinitialisé car le tournoi a déjà progressé au round suivant",
        );
      }

      // Elimination results are propagated as soon as they are reported, so
      // the players seated downstream have to be taken back out.
      await this.withdrawBracketPropagation(match, manager);

      match.status = MatchStatus.SCHEDULED;
      match.playerAScore = 0;
      match.playerBScore = 0;
      match.winner = undefined;
      match.startedAt = undefined;
      match.finishedAt = undefined;

      if (resetMatchDto.reason) {
        match.notes = `Réinitialisé: ${resetMatchDto.reason}`;
      }

      const savedMatch = await manager.save(Match, match);

      await manager.delete(Statistics, { match: { id } });

      return {
        match: savedMatch,
        tournamentId: match.tournament.id,
      };
    });

    await this.rankingService.updateTournamentRankings(result.tournamentId);
    return result.match;
  }

  /**
   * Retrieves matches for a specific tournament round.
   *
   * @param tournamentId Tournament ID.
   * @param round Round number.
   * @returns List of Match entities.
   */
  async getMatchesByRound(
    tournamentId: number,
    round: number,
  ): Promise<Match[]> {
    return this.matchRepository.find({
      where: {
        tournament: { id: tournamentId },
        round,
      },
      relations: ["playerA", "playerB", "winner"],
      order: { phase: "ASC" },
    });
  }

  async ensureTournamentMatchSessions(
    tournamentId: number,
    round?: number,
  ): Promise<void> {
    const matches = await this.matchRepository.find({
      where: {
        tournament: { id: tournamentId },
        ...(round === undefined ? {} : { round }),
        status: MatchStatus.SCHEDULED,
      },
      relations: ["onlineSession", "playerA", "playerB"],
    });

    // Empty bracket slots are persisted upfront: they have no game to host yet.
    await this.ensureOnlineSessions(
      matches.filter((match) => match.playerA && match.playerB),
    );
  }

  /**
   * Retrieves matches for a specific player in a tournament.
   *
   * @param tournamentId Tournament ID.
   * @param playerId Player ID.
   * @returns List of Match entities.
   */
  async getPlayerMatches(
    tournamentId: number,
    playerId: number,
  ): Promise<Match[]> {
    return this.matchRepository.find({
      where: [
        { tournament: { id: tournamentId }, playerA: { id: playerId } },
        { tournament: { id: tournamentId }, playerB: { id: playerId } },
      ],
      relations: ["playerA", "playerB", "winner"],
      order: { round: "ASC", phase: "ASC" },
    });
  }

  /** First scheduled/in-progress match for the given player in a tournament, with onlineSession. */
  async findPendingTournamentMatchForPlayer(
    tournamentId: number,
    playerId: number,
  ): Promise<Match | null> {
    return this.matchRepository
      .createQueryBuilder("match")
      .leftJoinAndSelect("match.playerA", "playerA")
      .leftJoinAndSelect("playerA.user", "playerAUser")
      .leftJoinAndSelect("match.playerB", "playerB")
      .leftJoinAndSelect("playerB.user", "playerBUser")
      .leftJoinAndSelect("match.onlineSession", "onlineSession")
      .where("match.tournamentId = :tournamentId", { tournamentId })
      .andWhere("match.status IN (:...statuses)", {
        statuses: [MatchStatus.SCHEDULED, MatchStatus.IN_PROGRESS],
      })
      .andWhere("(playerA.id = :playerId OR playerB.id = :playerId)", {
        playerId,
      })
      .orderBy("match.round", "ASC")
      .addOrderBy("match.phase", "ASC")
      .getOne();
  }

  async getPlayHub(userId: number): Promise<PlayHubResponse> {
    const player = await this.playerRepository.findOne({
      where: { user: { id: userId } },
      relations: ["user"],
    });

    const [recentDecks, totalDecks] = await this.deckRepository.findAndCount({
      where: { user: { id: userId } },
      order: { updatedAt: "DESC" },
      take: 6,
    });

    if (!player) {
      return {
        playerId: null,
        ranked: {
          enabled: false,
          status: "coming_soon",
        },
        summary: {
          liveMatches: 0,
          readyMatches: 0,
          completedMatches: 0,
          totalMatches: 0,
          totalDecks,
        },
        matches: [],
        recentDecks: recentDecks.map((deck) => this.mapDeckSummary(deck)),
      };
    }

    const matches = await this.matchRepository
      .createQueryBuilder("match")
      .leftJoinAndSelect("match.tournament", "tournament")
      .leftJoinAndSelect("match.playerA", "playerA")
      .leftJoinAndSelect("playerA.user", "playerAUser")
      .leftJoinAndSelect("match.playerB", "playerB")
      .leftJoinAndSelect("playerB.user", "playerBUser")
      .leftJoinAndSelect("match.onlineSession", "onlineSession")
      .where("playerA.id = :playerId OR playerB.id = :playerId", {
        playerId: player.id,
      })
      .addSelect(
        `COALESCE("match"."startedAt", "match"."scheduledDate", "tournament"."startDate")`,
        "sort_date",
      )
      .orderBy("sort_date", "DESC")
      .take(20)
      .getMany();
    const hydratedMatches = await this.ensureOnlineSessions(matches);

    const liveMatches = hydratedMatches.filter(
      (match) => match.status === MatchStatus.IN_PROGRESS,
    ).length;
    const readyMatches = hydratedMatches.filter(
      (match) => match.status === MatchStatus.SCHEDULED,
    ).length;
    const completedMatches = hydratedMatches.filter((match) =>
      [
        MatchStatus.FINISHED,
        MatchStatus.FORFEIT,
        MatchStatus.CANCELLED,
      ].includes(match.status),
    ).length;

    return {
      playerId: player.id,
      ranked: {
        enabled: false,
        status: "coming_soon",
      },
      summary: {
        liveMatches,
        readyMatches,
        completedMatches,
        totalMatches: hydratedMatches.length,
        totalDecks,
      },
      matches: hydratedMatches.map((match) =>
        this.mapPlayHubMatch(match, player.id),
      ),
      recentDecks: recentDecks.map((deck) => this.mapDeckSummary(deck)),
    };
  }

  // =================== Private ===================

  private async ensureOnlineSessions(matches: Match[]): Promise<Match[]> {
    if (!matches.length) {
      return matches;
    }

    return Promise.all(matches.map((match) => this.ensureOnlineSession(match)));
  }

  private async ensureOnlineSession(match: Match): Promise<Match> {
    if (match.onlineSession?.id) {
      return match;
    }

    const existingSession = await this.onlineSessionRepository.findOne({
      where: {
        match: {
          id: match.id,
        },
      },
    });

    if (existingSession) {
      match.onlineSession = existingSession;
      return match;
    }

    try {
      match.onlineSession = await this.onlineSessionRepository.save(
        this.onlineSessionRepository.create({
          match,
          seed: Date.now().toString(),
          status: OnlineMatchSessionStatus.WAITING_FOR_DECKS,
          playerADeckId: null,
          playerBDeckId: null,
          winnerPlayerId: null,
          endedReason: null,
          serializedState: null,
          eventLog: [],
        }),
      );

      return match;
    } catch (error) {
      const concurrentSession = await this.onlineSessionRepository.findOne({
        where: {
          match: {
            id: match.id,
          },
        },
      });

      if (concurrentSession) {
        match.onlineSession = concurrentSession;
        return match;
      }

      throw error;
    }
  }

  private mapPlayHubMatch(
    match: Match,
    currentPlayerId: number,
  ): PlayHubMatchSummary {
    const opponent =
      match.playerA?.id === currentPlayerId ? match.playerB : match.playerA;

    return {
      id: match.id,
      tournamentId: match.tournament.id,
      tournamentName: match.tournament.name,
      opponentName: this.getPlayerDisplayName(opponent),
      round: match.round,
      phase: match.phase,
      status: match.status,
      scheduledDate: match.scheduledDate,
      startedAt: match.startedAt,
      finishedAt: match.finishedAt,
      playerAScore: match.playerAScore,
      playerBScore: match.playerBScore,
      onlineSessionStatus: match.onlineSession?.status || null,
    };
  }

  private mapDeckSummary(deck: Deck): PlayHubDeckSummary {
    return {
      id: deck.id,
      name: deck.name,
      format: deck.format?.type || null,
      updatedAt: deck.updatedAt,
      coverCard: deck.coverCard
        ? {
            id: deck.coverCard.id,
            name: deck.coverCard.name || null,
            image: deck.coverCard.image || null,
          }
        : null,
    };
  }

  private getPlayerDisplayName(player?: Player | null): string {
    if (!player) {
      return "Adversaire à confirmer";
    }

    if (player.user?.firstName || player.user?.lastName) {
      return `${player.user?.firstName || ""} ${player.user?.lastName || ""}`.trim();
    }

    return `Joueur #${player.id}`;
  }

  private async updateRankings(
    match: Match,
    manager: EntityManager,
  ): Promise<void> {
    if (!match.winner || !match.playerA || !match.playerB) return;

    const tournamentId = match.tournament.id;
    const winnerId = match.winner.id;
    const loserId =
      match.playerA.id === winnerId ? match.playerB.id : match.playerA.id;

    // Gagnant
    let winnerRanking =
      (await manager.findOne(Ranking, {
        where: { tournament: { id: tournamentId }, player: { id: winnerId } },
      })) ?? null;

    if (winnerRanking) {
      winnerRanking.wins += 1;
      winnerRanking.points += 3;
    } else {
      winnerRanking = manager.create(Ranking, {
        tournament: { id: tournamentId },
        player: { id: winnerId },
        wins: 1,
        losses: 0,
        draws: 0,
        points: 3,
        rank: 0,
        winRate: 100,
      });
    }

    // Perdant
    let loserRanking =
      (await manager.findOne(Ranking, {
        where: { tournament: { id: tournamentId }, player: { id: loserId } },
      })) ?? null;

    if (loserRanking) {
      loserRanking.losses += 1;
    } else {
      loserRanking = manager.create(Ranking, {
        tournament: { id: tournamentId },
        player: { id: loserId },
        wins: 0,
        losses: 1,
        draws: 0,
        points: 0,
        rank: 0,
        winRate: 0,
      });
    }

    const winnerTotal =
      winnerRanking.wins + winnerRanking.losses + winnerRanking.draws;
    const loserTotal =
      loserRanking.wins + loserRanking.losses + loserRanking.draws;

    winnerRanking.winRate =
      winnerTotal > 0 ? (winnerRanking.wins / winnerTotal) * 100 : 0;
    loserRanking.winRate =
      loserTotal > 0 ? (loserRanking.wins / loserTotal) * 100 : 0;

    await manager.save([winnerRanking, loserRanking]);
  }

  private async createMatchStatistics(
    match: Match,
    manager: EntityManager,
  ): Promise<void> {
    const players = [match.playerA, match.playerB].filter((p): p is Player =>
      Boolean(p),
    );

    for (const player of players) {
      const isWinner = player.id === match.winner?.id;
      const isPlayerA = player.id === match.playerA?.id;
      const score = isPlayerA ? match.playerAScore : match.playerBScore;
      const opponentScore = isPlayerA ? match.playerBScore : match.playerAScore;

      const stat = manager.create(Statistics, {
        match,
        player,
        points: score,
        opponentPoints: opponentScore,
        isWinner,
        isPlayerA,
      });

      await manager.save(stat);
    }
  }

  /**
   * Checks if tournament can progress to the next round automatically.
   */
  private async checkTournamentProgression(
    match: Match,
    manager: EntityManager,
  ): Promise<boolean> {
    const tournament = await manager.findOne(Tournament, {
      where: { id: match.tournament.id },
    });

    if (!tournament) return false;

    if (
      tournament.type === TournamentType.SINGLE_ELIMINATION ||
      tournament.type === TournamentType.DOUBLE_ELIMINATION
    ) {
      return this.advanceEliminationBracket(tournament, match, manager);
    }

    const currentRoundMatches = await manager.find(Match, {
      where: {
        tournament: { id: tournament.id },
        round: tournament.currentRound,
      },
      relations: ["playerA", "playerB", "winner"],
      order: { id: "ASC" },
    });

    const unfinishedMatches = currentRoundMatches.filter(
      (m) =>
        m.status !== MatchStatus.FINISHED && m.status !== MatchStatus.FORFEIT,
    );

    // If all matches in current round are complete, attempt round progression
    if (unfinishedMatches.length === 0) {
      if (tournament.type === TournamentType.ROUND_ROBIN) {
        return this.advanceRoundRobin(tournament, manager);
      }

      if (tournament.type === TournamentType.SWISS_SYSTEM) {
        return this.advanceSwiss(tournament, manager);
      }
    }

    return false;
  }

  /**
   * Pairs and opens the next Swiss round.
   *
   * Pairings depend on the standings, so they can only be computed once the
   * previous round has been fully played.
   *
   * @returns True when the tournament has just finished.
   */
  private async advanceSwiss(
    tournament: Tournament,
    manager: EntityManager,
  ): Promise<boolean> {
    const currentRound = tournament.currentRound || 1;

    if (currentRound >= (tournament.totalRounds || 0)) {
      tournament.status = TournamentStatus.FINISHED;
      tournament.isFinished = true;
      await manager.save(tournament);
      return true;
    }

    const nextRound = currentRound + 1;

    const alreadyPaired = await manager.count(Match, {
      where: { tournament: { id: tournament.id }, round: nextRound },
    });

    if (alreadyPaired === 0) {
      const registrations = await manager.find(TournamentRegistration, {
        where: {
          tournament: { id: tournament.id },
          status: RegistrationStatus.CONFIRMED,
        },
        relations: ["player"],
      });

      const playedMatches = await manager.find(Match, {
        where: { tournament: { id: tournament.id } },
        relations: ["playerA", "playerB", "winner"],
      });

      const standings = this.swissPairingService.computeStandings(
        registrations
          .map((registration) => registration.player?.id)
          .filter((id): id is number => typeof id === "number"),
        toSwissResults(playedMatches),
      );

      const droppedPlayerIds = registrations
        .filter((registration) => registration.droppedAt)
        .map((registration) => registration.player.id);

      const pairings = this.swissPairingService.pairNextRound(
        standings,
        droppedPlayerIds,
      );

      for (const pairing of pairings) {
        const newMatch = manager.create(Match, {
          tournament,
          playerA: { id: pairing.playerAId } as Player,
          playerB: pairing.isBye
            ? undefined
            : ({ id: pairing.playerBId } as Player),
          winner: pairing.isBye
            ? ({ id: pairing.playerAId } as Player)
            : undefined,
          round: nextRound,
          phase: MatchPhase.QUALIFICATION,
          status: pairing.isBye ? MatchStatus.FINISHED : MatchStatus.SCHEDULED,
          isBye: pairing.isBye,
          notes: pairing.isBye
            ? "Qualification automatique (bye)"
            : `Ronde ${nextRound} - Système suisse`,
          scheduledDate: new Date(),
          finishedAt: pairing.isBye ? new Date() : undefined,
        });

        const savedMatch = await manager.save(Match, newMatch);
        if (!pairing.isBye) {
          await this.createOnlineSessionWithManager(savedMatch, manager);
        }
      }
    }

    tournament.currentRound = nextRound;
    await manager.save(tournament);

    return false;
  }

  /**
   * Opens the next round of a round robin.
   *
   * Every round is created when the tournament starts, so this only advances
   * the counter and prepares the online sessions, or closes the tournament
   * after the last round.
   *
   * @returns True when the tournament has just finished.
   */
  private async advanceRoundRobin(
    tournament: Tournament,
    manager: EntityManager,
  ): Promise<boolean> {
    const currentRound = tournament.currentRound || 1;

    if (currentRound >= (tournament.totalRounds || 0)) {
      tournament.status = TournamentStatus.FINISHED;
      tournament.isFinished = true;
      await manager.save(tournament);
      return true;
    }

    const nextRound = currentRound + 1;
    const nextRoundMatches = await manager.find(Match, {
      where: {
        tournament: { id: tournament.id },
        round: nextRound,
        status: MatchStatus.SCHEDULED,
      },
    });

    for (const nextMatch of nextRoundMatches) {
      await this.createOnlineSessionWithManager(nextMatch, manager);
    }

    tournament.currentRound = nextRound;
    await manager.save(tournament);

    return false;
  }

  /**
   * Applies a bracket result by following the links stored on the match.
   *
   * The winner is pushed to `nextMatchId`, the loser to `loserNextMatchId`
   * when the format gives them a second chance. A defeat with no destination
   * is final: the player leaves the tournament.
   *
   * @returns True when the tournament has just finished.
   */
  private async advanceEliminationBracket(
    tournament: Tournament,
    match: Match,
    manager: EntityManager,
  ): Promise<boolean> {
    const finished = await this.propagateBracketResult(
      tournament,
      match,
      manager,
    );

    if (finished) {
      tournament.status = TournamentStatus.FINISHED;
      tournament.isFinished = true;
      await manager.save(tournament);
      return true;
    }

    await this.syncEliminationRound(tournament, manager);
    return false;
  }

  /**
   * Pushes the winner and the loser of a settled match to their destinations.
   *
   * @returns True when the match was the last one of the tournament.
   */
  private async propagateBracketResult(
    tournament: Tournament,
    match: Match,
    manager: EntityManager,
  ): Promise<boolean> {
    const winner = match.winner;
    if (!winner) return false;

    const loser =
      match.playerA && match.playerA.id === winner.id
        ? match.playerB
        : match.playerA;

    const resetCreated = await this.createGrandFinalReset(
      tournament,
      match,
      manager,
    );

    if (loser && !resetCreated) {
      if (match.loserNextMatchId) {
        await this.assignBracketSlot(
          tournament,
          match.loserNextMatchId,
          match.loserNextSlot,
          loser,
          manager,
        );
      } else {
        await this.eliminateFromTournament(
          tournament,
          loser,
          match.round,
          manager,
        );
      }
    }

    if (match.nextMatchId) {
      await this.assignBracketSlot(
        tournament,
        match.nextMatchId,
        match.nextSlot,
        winner,
        manager,
      );
      return false;
    }

    // Only the grand final and the single-elimination final have no successor.
    return !resetCreated;
  }

  /**
   * Seats a player in a bracket slot and unlocks the match when it is ready.
   *
   * A slot whose opponent branch is empty resolves as a bye straight away, and
   * the result cascades further down the bracket.
   */
  private async assignBracketSlot(
    tournament: Tournament,
    matchId: number,
    slot: "A" | "B" | null,
    player: Player,
    manager: EntityManager,
  ): Promise<void> {
    const target = await manager.findOne(Match, {
      where: { id: matchId },
      relations: ["tournament", "playerA", "playerB", "winner"],
    });

    if (
      !target ||
      target.status === MatchStatus.FINISHED ||
      target.status === MatchStatus.FORFEIT
    ) {
      return;
    }

    if (slot === "B") {
      target.playerB = player;
    } else {
      target.playerA = player;
    }

    const opponent = slot === "B" ? target.playerA : target.playerB;

    if (target.isBye && !opponent) {
      target.winner = player;
      target.status = MatchStatus.FINISHED;
      target.finishedAt = new Date();
      const settledBye = await manager.save(Match, target);
      await this.propagateBracketResult(tournament, settledBye, manager);
      return;
    }

    const savedTarget = await manager.save(Match, target);

    if (savedTarget.playerA && savedTarget.playerB) {
      await this.createOnlineSessionWithManager(savedTarget, manager);
    }
  }

  /**
   * Opens the deciding grand final when the losers bracket finalist wins.
   *
   * They arrive with one defeat already, so beating the winners bracket
   * finalist once only levels the score: a second match settles the title.
   *
   * @returns True when a deciding match was created or already exists.
   */
  private async createGrandFinalReset(
    tournament: Tournament,
    match: Match,
    manager: EntityManager,
  ): Promise<boolean> {
    if (
      match.bracketSide !== BracketSide.GRAND_FINAL ||
      match.bracketPosition !== 0 ||
      !tournament.grandFinalReset
    ) {
      return false;
    }

    // The losers bracket finalist always sits in slot B of the grand final.
    if (!match.playerA || !match.playerB) return false;
    if (match.winner?.id !== match.playerB.id) return false;

    const decidingRound = match.round + 1;
    const alreadyCreated = await manager.count(Match, {
      where: {
        tournament: { id: tournament.id },
        bracketSide: BracketSide.GRAND_FINAL,
        bracketPosition: 1,
      },
    });

    if (alreadyCreated > 0) return true;

    const deciding = manager.create(Match, {
      tournament: { id: tournament.id } as Tournament,
      playerA: match.playerA,
      playerB: match.playerB,
      round: decidingRound,
      phase: MatchPhase.FINAL,
      bracketSide: BracketSide.GRAND_FINAL,
      bracketPosition: 1,
      status: MatchStatus.SCHEDULED,
      scheduledDate: new Date(),
      notes: "Belle de la grande finale",
    });

    const savedDeciding = await manager.save(Match, deciding);
    await this.createOnlineSessionWithManager(savedDeciding, manager);

    tournament.totalRounds = decidingRound;
    await manager.save(tournament);

    return true;
  }

  /**
   * Records a final defeat on the registration of an eliminated player.
   */
  private async eliminateFromTournament(
    tournament: Tournament,
    player: Player,
    round: number,
    manager: EntityManager,
  ): Promise<void> {
    const registration = await manager.findOne(TournamentRegistration, {
      where: {
        tournament: { id: tournament.id },
        player: { id: player.id },
      },
    });

    if (!registration || registration.eliminatedAt) return;

    registration.eliminatedAt = new Date();
    registration.eliminatedRound = round;
    await manager.save(registration);
  }

  /**
   * Undoes the propagation of a bracket result before a judge resets it.
   *
   * Both destinations are emptied, and a player who had been eliminated by
   * this defeat is brought back into the tournament.
   *
   * @throws BadRequestException If a match downstream has already started.
   */
  private async withdrawBracketPropagation(
    match: Match,
    manager: EntityManager,
  ): Promise<void> {
    if (!match.winner) return;

    const loser =
      match.playerA && match.playerA.id === match.winner.id
        ? match.playerB
        : match.playerA;

    await this.clearBracketSlot(match.nextMatchId, match.nextSlot, manager);
    await this.clearBracketSlot(
      match.loserNextMatchId,
      match.loserNextSlot,
      manager,
    );

    if (!loser || match.loserNextMatchId) return;

    const registration = await manager.findOne(TournamentRegistration, {
      where: {
        tournament: { id: match.tournament.id },
        player: { id: loser.id },
      },
    });

    if (registration?.eliminatedRound === match.round) {
      registration.eliminatedAt = null;
      registration.eliminatedRound = null;
      await manager.save(registration);
    }
  }

  /**
   * Empties a bracket slot that a reset result had filled.
   *
   * @throws BadRequestException If the downstream match is already under way.
   */
  private async clearBracketSlot(
    matchId: number | null,
    slot: "A" | "B" | null,
    manager: EntityManager,
  ): Promise<void> {
    if (!matchId) return;

    const target = await manager.findOne(Match, {
      where: { id: matchId },
      relations: ["playerA", "playerB", "winner"],
    });

    if (!target) return;

    if (target.status !== MatchStatus.SCHEDULED) {
      throw new BadRequestException(
        `Ce résultat ne peut plus être réinitialisé : le match ${target.id} qui en découle est déjà engagé`,
      );
    }

    // TypeORM skips undefined values, so the column is cleared with null.
    if (slot === "B") {
      target.playerB = null as unknown as Player;
    } else {
      target.playerA = null as unknown as Player;
    }

    await manager.save(Match, target);
  }

  /**
   * Aligns the current round on the earliest step that still has to be played.
   *
   * Both branches of a double elimination bracket share the same step, so the
   * whole tournament moves forward together.
   */
  private async syncEliminationRound(
    tournament: Tournament,
    manager: EntityManager,
  ): Promise<void> {
    const pendingMatches = await manager.find(Match, {
      where: {
        tournament: { id: tournament.id },
        status: In([MatchStatus.SCHEDULED, MatchStatus.IN_PROGRESS]),
      },
      relations: ["playerA", "playerB"],
      order: { round: "ASC" },
    });

    if (pendingMatches.length === 0) return;

    const nextRound = Math.min(...pendingMatches.map((m) => m.round));
    if (nextRound === tournament.currentRound) return;

    tournament.currentRound = nextRound;
    await manager.save(tournament);

    for (const upcoming of pendingMatches) {
      if (
        upcoming.round === nextRound &&
        upcoming.playerA &&
        upcoming.playerB
      ) {
        await this.createOnlineSessionWithManager(upcoming, manager);
      }
    }
  }

  private async createOnlineSessionWithManager(
    match: Match,
    manager: EntityManager,
  ): Promise<void> {
    const existingSession = await manager.findOne(OnlineMatchSession, {
      where: { match: { id: match.id } },
    });

    if (existingSession) {
      return;
    }

    const session = manager.create(OnlineMatchSession, {
      match,
      seed: Date.now().toString(),
      status: OnlineMatchSessionStatus.WAITING_FOR_DECKS,
      playerADeckId: null,
      playerBDeckId: null,
      winnerPlayerId: null,
      endedReason: null,
      serializedState: null,
      eventLog: [],
    });
    await manager.save(OnlineMatchSession, session);
  }
}

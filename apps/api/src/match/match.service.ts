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
import { CreateMatchDto } from "./dto/create-match.dto";
import {
  ReportScoreDto,
  ResetMatchDto,
  StartMatchDto,
} from "./dto/match-operations.dto";
import { UpdateMatchDto } from "./dto/update-match.dto";
import { Match, MatchPhase, MatchStatus } from "./entities/match.entity";
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
      relations: ["onlineSession"],
    });

    await this.ensureOnlineSessions(matches);
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
      // Automatically propagate winners in elimination brackets
      if (
        tournament.type === TournamentType.SINGLE_ELIMINATION ||
        tournament.type === TournamentType.DOUBLE_ELIMINATION
      ) {
        return this.propagateEliminationWinners(
          tournament,
          currentRoundMatches,
          manager,
        );
      }
    }

    return false;
  }

  /**
   * Propage les vainqueurs dans un bracket d'élimination
   */
  private async propagateEliminationWinners(
    tournament: Tournament,
    currentRoundMatches: Match[],
    manager: EntityManager,
  ): Promise<boolean> {
    const currentRound = tournament.currentRound || 1;
    const nextRound = currentRound + 1;

    const completedMatches = currentRoundMatches
      .filter((currentMatch) => currentMatch.winner)
      .sort((a, b) => a.id - b.id);

    if (completedMatches.length === 0) return false;

    for (const completedMatch of completedMatches) {
      const loser =
        completedMatch.playerA?.id === completedMatch.winner?.id
          ? completedMatch.playerB
          : completedMatch.playerA;

      if (!loser) {
        continue;
      }

      const registration = await manager.findOne(TournamentRegistration, {
        where: {
          tournament: { id: tournament.id },
          player: { id: loser.id },
        },
      });

      if (registration && !registration.eliminatedAt) {
        registration.eliminatedAt = new Date();
        registration.eliminatedRound = currentRound;
        await manager.save(registration);
      }
    }

    if (currentRound >= (tournament.totalRounds || 0)) {
      tournament.status = TournamentStatus.FINISHED;
      tournament.isFinished = true;
      await manager.save(tournament);
      return true;
    }

    const nextRoundMatches = await manager.count(Match, {
      where: {
        tournament: { id: tournament.id },
        round: nextRound,
      },
    });

    if (nextRoundMatches === 0 && completedMatches.length > 1) {
      const winners = completedMatches.map((completedMatch) => {
        return completedMatch.winner!;
      });

      for (let i = 0; i < winners.length; i += 2) {
        if (i + 1 < winners.length) {
          const newMatch = manager.create(Match, {
            tournament,
            playerA: winners[i],
            playerB: winners[i + 1],
            round: nextRound,
            phase: this.getPhaseForRound(
              nextRound,
              tournament.totalRounds || 0,
            ),
            status: MatchStatus.SCHEDULED,
            scheduledDate: new Date(),
          });

          const savedMatch = await manager.save(Match, newMatch);
          await this.createOnlineSessionWithManager(savedMatch, manager);
        }
      }

      tournament.currentRound = nextRound;
      await manager.save(tournament);
    }

    return false;
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

  /**
   * Détermine la phase selon le round et le total
   */
  private getPhaseForRound(round: number, totalRounds: number): MatchPhase {
    if (round === totalRounds) return MatchPhase.FINAL;
    if (round === totalRounds - 1) return MatchPhase.SEMI_FINAL;
    if (round === totalRounds - 2) return MatchPhase.QUARTER_FINAL;
    return MatchPhase.QUALIFICATION;
  }
}

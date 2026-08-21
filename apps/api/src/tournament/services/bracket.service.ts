import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import {
  BracketSide,
  Match,
  MatchPhase,
  MatchStatus,
} from "../../match/entities/match.entity";
import { Player } from "../../player/entities/player.entity";
import { Tournament, TournamentType } from "../entities/tournament.entity";
import { RegistrationStatus } from "../entities/tournament-registration.entity";
import {
  buildDoubleEliminationPlan,
  buildSingleEliminationPlan,
  EliminationPlan,
  PlanNode,
  PlanPlayer,
} from "./elimination-bracket.builder";
import { SeededPlayer, SeedingMethod, SeedingService } from "./seeding.service";
import { SwissPairingService } from "./swiss-pairing.service";

export interface BracketNode {
  matchId?: number;
  round: number;
  position: number;
  playerA?: {
    id: number;
    name: string;
    seed?: number;
  };
  playerB?: {
    id: number;
    name: string;
    seed?: number;
  };
  winnerId?: number;
  status?: MatchStatus;
  playerAScore?: number;
  playerBScore?: number;
  scheduledDate?: Date;
  nextMatchId?: number;
  nextSlot?: "A" | "B";
  loserNextMatchId?: number;
  loserNextSlot?: "A" | "B";
  bracketSide?: BracketSide;
  isBye?: boolean;
  phase: MatchPhase;
}

export interface BracketStructure {
  type: TournamentType;
  totalRounds: number;
  rounds: {
    index: number;
    matches: BracketNode[];
  }[];
}

/**
 * Projects a seeded player onto the representation used by bracket plans.
 */
function toPlanPlayer(player: SeededPlayer): PlanPlayer {
  return {
    id: player.id,
    name: `${player.user?.firstName || ""} ${player.user?.lastName || ""}`.trim(),
    seed: player.seed,
  };
}

export interface GenerateBracketOptions {
  checkInRequired?: boolean;
  manager?: EntityManager;
  seedingMethod?: SeedingMethod;
}

@Injectable()
export class BracketService {
  constructor(
    @InjectRepository(Tournament)
    private tournamentRepository: Repository<Tournament>,
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    private seedingService: SeedingService,
    private swissPairingService: SwissPairingService,
  ) {}

  /**
   * Génère le bracket complet pour un tournoi selon son type
   */
  async generateBracket(
    tournamentId: number,
    options: GenerateBracketOptions = {},
  ): Promise<BracketStructure> {
    const tournamentRepository =
      options.manager?.getRepository(Tournament) ?? this.tournamentRepository;
    const tournament = await tournamentRepository.findOne({
      where: { id: tournamentId },
      relations: [
        "registrations",
        "registrations.player",
        "registrations.player.user",
      ],
    });

    if (!tournament) {
      throw new BadRequestException({
        code: "TOURNAMENT_NOT_FOUND",
        message: "Tournoi non trouvé",
      });
    }

    const confirmedPlayers = tournament.registrations
      .filter(
        (reg) =>
          reg.status === RegistrationStatus.CONFIRMED &&
          (!options.checkInRequired || reg.checkedIn),
      )
      .map((reg) => reg.player);

    if (confirmedPlayers.length < (tournament.minPlayers || 2)) {
      throw new BadRequestException(
        "Pas assez de joueurs pour démarrer le tournoi",
      );
    }

    const seededPlayers = await this.seedingService.seedPlayers(
      confirmedPlayers,
      tournament,
      options.seedingMethod ?? SeedingMethod.RANDOM,
    );

    const bracketStructure = await this.buildBracketForType(
      seededPlayers,
      tournament,
      options.manager,
    );

    tournament.totalRounds = bracketStructure.totalRounds;
    tournament.currentRound = 1;
    await tournamentRepository.save(tournament);

    return bracketStructure;
  }

  /**
   * Routes to the generator matching the tournament format.
   */
  private buildBracketForType(
    players: SeededPlayer[],
    tournament: Tournament,
    manager?: EntityManager,
  ): Promise<BracketStructure> {
    switch (tournament.type) {
      case TournamentType.SINGLE_ELIMINATION:
        return this.generateSingleEliminationBracket(
          players,
          tournament,
          manager,
        );

      case TournamentType.DOUBLE_ELIMINATION:
        return this.generateDoubleEliminationBracket(
          players,
          tournament,
          manager,
        );

      case TournamentType.ROUND_ROBIN:
        return this.generateRoundRobinBracket(players, tournament, manager);

      case TournamentType.SWISS_SYSTEM:
        return this.generateSwissBracket(players, tournament, manager);

      default:
        throw new BadRequestException(
          "Ce format n'est pas encore orchestré par Nexus",
        );
    }
  }

  /**
   * Generates every round of a round robin using the circle method.
   *
   * Each player faces all the others exactly once. With an odd field, a dummy
   * opponent is added: whoever faces it receives a bye for that round.
   */
  private async generateRoundRobinBracket(
    players: SeededPlayer[],
    tournament: Tournament,
    manager?: EntityManager,
  ): Promise<BracketStructure> {
    const slots: (SeededPlayer | undefined)[] = [...players];
    if (slots.length % 2 !== 0) {
      slots.push(undefined);
    }

    const size = slots.length;
    const totalRounds = size - 1;
    const matchesPerRound = size / 2;

    // The first player stays fixed while the others rotate by one per round.
    const fixedPlayer = slots[0];
    let rotating = slots.slice(1);

    const rounds: { index: number; matches: BracketNode[] }[] = [];

    for (let round = 1; round <= totalRounds; round++) {
      const arrangement = [fixedPlayer, ...rotating];
      const matches: BracketNode[] = [];

      for (let position = 0; position < matchesPerRound; position++) {
        const home = arrangement[position];
        const away = arrangement[size - 1 - position];

        // Alternate the A/B side so the same player is not always playerA.
        const swap = (round + position) % 2 === 1;
        const playerA = swap ? away : home;
        const playerB = swap ? home : away;

        matches.push({
          round,
          position,
          phase: MatchPhase.QUALIFICATION,
          playerA: playerA ? this.toBracketPlayer(playerA) : undefined,
          playerB: playerB ? this.toBracketPlayer(playerB) : undefined,
        });
      }

      rounds.push({ index: round, matches });

      rotating = [rotating[rotating.length - 1], ...rotating.slice(0, -1)];
    }

    await this.createMatchesFromBracket(tournament, rounds, manager);

    return {
      type: TournamentType.ROUND_ROBIN,
      totalRounds,
      rounds,
    };
  }

  /**
   * Generates the opening round of a Swiss tournament.
   *
   * Unlike the other formats, later rounds are not known upfront: they depend
   * on the results and are paired on the fly by {@link SwissPairingService}.
   * Only the opening round is created here, crossing the top half of the
   * seeding with the bottom half.
   */
  private async generateSwissBracket(
    players: SeededPlayer[],
    tournament: Tournament,
    manager?: EntityManager,
  ): Promise<BracketStructure> {
    const totalRounds = this.swissPairingService.recommendedRounds(
      players.length,
    );

    const half = Math.ceil(players.length / 2);
    const topHalf = players.slice(0, half);
    const bottomHalf = players.slice(half);

    const matches: BracketNode[] = topHalf.map((player, position) => {
      const opponent = bottomHalf[position];

      return {
        round: 1,
        position,
        phase: MatchPhase.QUALIFICATION,
        playerA: this.toBracketPlayer(player),
        playerB: opponent ? this.toBracketPlayer(opponent) : undefined,
      };
    });

    const rounds = [{ index: 1, matches }];

    await this.createMatchesFromBracket(tournament, rounds, manager);

    return {
      type: TournamentType.SWISS_SYSTEM,
      totalRounds,
      rounds,
    };
  }

  /**
   * Projects a seeded player onto the representation used by the bracket.
   */
  private toBracketPlayer(player: SeededPlayer): {
    id: number;
    name: string;
    seed?: number;
  } {
    return {
      id: player.id,
      name: `${player.user?.firstName || ""} ${player.user?.lastName || ""}`.trim(),
      seed: player.seed,
    };
  }

  /**
   * Generates a single elimination bracket: one tree, one defeat and you are out.
   *
   * Every match is persisted upfront, empty ones included, so the winner links
   * can be stored and the progression never has to guess the pairings again.
   */
  private async generateSingleEliminationBracket(
    players: SeededPlayer[],
    tournament: Tournament,
    manager?: EntityManager,
  ): Promise<BracketStructure> {
    const plan = buildSingleEliminationPlan(players.map(toPlanPlayer));

    return this.persistEliminationPlan(
      TournamentType.SINGLE_ELIMINATION,
      plan,
      tournament,
      manager,
    );
  }

  /**
   * Generates a double elimination bracket: winners tree, losers tree and
   * grand final, for a total of `2 * bracketSize - 2` matches.
   *
   * Losers of the winners bracket drop into the losers bracket at a position
   * that rules out an immediate rematch, and a player only leaves the
   * tournament on their second defeat.
   */
  private async generateDoubleEliminationBracket(
    players: SeededPlayer[],
    tournament: Tournament,
    manager?: EntityManager,
  ): Promise<BracketStructure> {
    const plan = buildDoubleEliminationPlan(players.map(toPlanPlayer));

    return this.persistEliminationPlan(
      TournamentType.DOUBLE_ELIMINATION,
      plan,
      tournament,
      manager,
    );
  }

  /**
   * Persists a bracket plan and turns it into the public bracket structure.
   *
   * Rows are written first without their links, because a link needs the
   * target's database id; a second pass fills them in.
   */
  private async persistEliminationPlan(
    type: TournamentType,
    plan: EliminationPlan,
    tournament: Tournament,
    manager?: EntityManager,
  ): Promise<BracketStructure> {
    const matchRepository =
      manager?.getRepository(Match) ?? this.matchRepository;

    const matchIdByKey = new Map<number, number>();
    const savedByKey = new Map<number, Match>();

    for (const node of plan.nodes) {
      const match = matchRepository.create({
        tournament,
        playerA: node.playerA ? ({ id: node.playerA.id } as Player) : undefined,
        playerB: node.playerB ? ({ id: node.playerB.id } as Player) : undefined,
        winner: node.winner ? ({ id: node.winner.id } as Player) : undefined,
        round: node.round,
        phase: node.phase,
        bracketSide: node.side,
        bracketPosition: node.position,
        scheduledDate: new Date(tournament.startDate),
        isBye: node.isBye,
        notes: node.isBye
          ? "Qualification automatique (bye)"
          : "Match généré automatiquement",
        status: node.status,
        finishedAt:
          node.status === MatchStatus.FINISHED ? new Date() : undefined,
      });

      const savedMatch = await matchRepository.save(match);
      matchIdByKey.set(node.key, savedMatch.id);
      savedByKey.set(node.key, savedMatch);
    }

    for (const node of plan.nodes) {
      const savedMatch = savedByKey.get(node.key)!;
      savedMatch.nextMatchId = node.winnerTarget
        ? (matchIdByKey.get(node.winnerTarget.key) ?? null)
        : null;
      savedMatch.nextSlot = node.winnerTarget?.slot ?? null;
      savedMatch.loserNextMatchId = node.loserTarget
        ? (matchIdByKey.get(node.loserTarget.key) ?? null)
        : null;
      savedMatch.loserNextSlot = node.loserTarget?.slot ?? null;
      await matchRepository.save(savedMatch);
    }

    const rounds = new Map<number, BracketNode[]>();
    for (const node of plan.nodes) {
      if (!rounds.has(node.round)) {
        rounds.set(node.round, []);
      }
      rounds.get(node.round)!.push(this.toBracketNode(node, matchIdByKey));
    }

    return {
      type,
      totalRounds: plan.totalRounds,
      rounds: [...rounds.entries()]
        .sort(([a], [b]) => a - b)
        .map(([index, matches]) => ({ index, matches })),
    };
  }

  /**
   * Projects a persisted plan node onto the public bracket representation.
   */
  private toBracketNode(
    node: PlanNode,
    matchIdByKey: Map<number, number>,
  ): BracketNode {
    return {
      matchId: matchIdByKey.get(node.key),
      round: node.round,
      position: node.position,
      phase: node.phase,
      bracketSide: node.side,
      playerA: node.playerA,
      playerB: node.playerB,
      winnerId: node.winner?.id,
      status: node.status,
      isBye: node.isBye,
      nextMatchId: node.winnerTarget
        ? matchIdByKey.get(node.winnerTarget.key)
        : undefined,
      nextSlot: node.winnerTarget?.slot,
      loserNextMatchId: node.loserTarget
        ? matchIdByKey.get(node.loserTarget.key)
        : undefined,
      loserNextSlot: node.loserTarget?.slot,
    };
  }

  /**
   * Crée les matches en base à partir du bracket
   */
  private async createMatchesFromBracket(
    tournament: Tournament,
    rounds: { index: number; matches: BracketNode[] }[],
    manager?: EntityManager,
  ): Promise<void> {
    const matchRepository =
      manager?.getRepository(Match) ?? this.matchRepository;

    for (const round of rounds) {
      for (const node of round.matches) {
        if (node.playerA || node.playerB) {
          const isBye = Boolean(node.playerA) !== Boolean(node.playerB);
          const byeWinner = node.playerA ?? node.playerB;
          const match = matchRepository.create({
            tournament,
            playerA: node.playerA
              ? ({ id: node.playerA.id } as Player)
              : undefined,
            playerB: node.playerB
              ? ({ id: node.playerB.id } as Player)
              : undefined,
            winner:
              isBye && byeWinner ? ({ id: byeWinner.id } as Player) : undefined,
            round: node.round,
            phase: node.phase,
            scheduledDate: new Date(tournament.startDate),
            isBye,
            notes: isBye
              ? "Qualification automatique (bye)"
              : "Match généré automatiquement",
            status: isBye ? MatchStatus.FINISHED : MatchStatus.SCHEDULED,
            finishedAt: isBye ? new Date() : undefined,
          });
          const savedMatch = await matchRepository.save(match);
          node.matchId = savedMatch.id;
          node.winnerId = savedMatch.winner?.id;
        }
      }
    }
  }

  /**
   * Récupère le bracket actuel d'un tournoi
   */
  async getBracket(tournamentId: number): Promise<BracketStructure> {
    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId },
      relations: [
        "matches",
        "matches.playerA",
        "matches.playerA.user",
        "matches.playerB",
        "matches.playerB.user",
        "matches.winner",
      ],
    });

    if (!tournament) {
      throw new BadRequestException({
        code: "TOURNAMENT_NOT_FOUND",
        message: "Tournoi non trouvé",
      });
    }

    const rounds: { index: number; matches: BracketNode[] }[] = [];
    const matchesByRound = new Map<number, Match[]>();

    // Grouper les matches par round
    [...tournament.matches]
      .sort(
        (a, b) =>
          a.round - b.round ||
          (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0) ||
          a.id - b.id,
      )
      .forEach((match) => {
        if (!matchesByRound.has(match.round)) {
          matchesByRound.set(match.round, []);
        }
        matchesByRound.get(match.round)!.push(match);
      });

    // Convertir en structure de bracket
    for (const [roundNumber, matches] of matchesByRound) {
      const nodes: BracketNode[] = matches.map((match, position) => ({
        matchId: match.id,
        round: roundNumber,
        position: match.bracketPosition ?? position,
        bracketSide: match.bracketSide ?? undefined,
        playerA: match.playerA
          ? {
              id: match.playerA.id,
              name: `${match.playerA.user?.firstName || ""} ${match.playerA.user?.lastName || ""}`.trim(),
            }
          : undefined,
        playerB: match.playerB
          ? {
              id: match.playerB.id,
              name: `${match.playerB.user?.firstName || ""} ${match.playerB.user?.lastName || ""}`.trim(),
            }
          : undefined,
        winnerId: match.winner?.id,
        status: match.status,
        playerAScore: match.playerAScore,
        playerBScore: match.playerBScore,
        scheduledDate: match.scheduledDate,
        isBye: match.isBye,
        nextMatchId: match.nextMatchId ?? undefined,
        nextSlot: match.nextSlot ?? undefined,
        loserNextMatchId: match.loserNextMatchId ?? undefined,
        loserNextSlot: match.loserNextSlot ?? undefined,
        phase: match.phase,
      }));

      rounds.push({ index: roundNumber, matches: nodes });
    }

    // Trier les rounds
    rounds.sort((a, b) => a.index - b.index);

    return {
      type: tournament.type,
      totalRounds: tournament.totalRounds || 0,
      rounds,
    };
  }
}

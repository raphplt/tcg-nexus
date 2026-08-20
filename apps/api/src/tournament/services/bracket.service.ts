import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import {
  Match,
  MatchPhase,
  MatchStatus,
} from "../../match/entities/match.entity";
import { Player } from "../../player/entities/player.entity";
import { Tournament, TournamentType } from "../entities/tournament.entity";
import { RegistrationStatus } from "../entities/tournament-registration.entity";
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
   * Génère le bracket pour élimination simple
   */
  private async generateSingleEliminationBracket(
    players: SeededPlayer[],
    tournament: Tournament,
    manager?: EntityManager,
  ): Promise<BracketStructure> {
    const playerCount = players.length;
    const totalRounds = Math.ceil(Math.log2(playerCount));
    const bracketSize = 2 ** totalRounds;
    const bracketSlots = this.generateSeedOrder(bracketSize).map(
      (seed) => players[seed - 1],
    );

    const rounds: { index: number; matches: BracketNode[] }[] = [];
    let matchId = 1;

    // Create all bracket rounds
    for (let round = 1; round <= totalRounds; round++) {
      const matchesInRound = Math.pow(2, totalRounds - round);
      const matches: BracketNode[] = [];

      for (let position = 0; position < matchesInRound; position++) {
        const node: BracketNode = {
          matchId: matchId++,
          round,
          position,
          phase: this.getPhaseForRound(round, totalRounds),
          nextMatchId:
            round < totalRounds
              ? Math.floor(matchId + position / 2)
              : undefined,
          nextSlot: position % 2 === 0 ? "A" : "B",
        };

        // First round: assign players to slots
        if (round === 1) {
          const playerAIndex = position * 2;
          const playerBIndex = playerAIndex + 1;
          const playerA = bracketSlots[playerAIndex];
          const playerB = bracketSlots[playerBIndex];

          if (playerA) {
            node.playerA = {
              id: playerA.id,
              name: `${playerA.user?.firstName || ""} ${playerA.user?.lastName || ""}`.trim(),
              seed: playerA.seed,
            };
          }

          if (playerB) {
            node.playerB = {
              id: playerB.id,
              name: `${playerB.user?.firstName || ""} ${playerB.user?.lastName || ""}`.trim(),
              seed: playerB.seed,
            };
          }
        }

        matches.push(node);
      }

      rounds.push({ index: round, matches });
    }

    // Persist created bracket matches in database
    await this.createMatchesFromBracket(tournament, rounds, manager);

    return {
      type: TournamentType.SINGLE_ELIMINATION,
      totalRounds,
      rounds,
    };
  }

  private generateSeedOrder(bracketSize: number): number[] {
    let order = [1, 2];

    while (order.length < bracketSize) {
      const seedSum = order.length * 2 + 1;
      order = order.flatMap((seed) => [seed, seedSum - seed]);
    }

    return order;
  }

  /**
   * Détermine la phase d'un match selon le round
   */
  private getPhaseForRound(round: number, totalRounds: number): MatchPhase {
    if (round === totalRounds) return MatchPhase.FINAL;
    if (round === totalRounds - 1) return MatchPhase.SEMI_FINAL;
    if (round === totalRounds - 2) return MatchPhase.QUARTER_FINAL;
    return MatchPhase.QUALIFICATION;
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
      .sort((a, b) => a.round - b.round || a.id - b.id)
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
        position,
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

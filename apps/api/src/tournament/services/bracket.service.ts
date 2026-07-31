import { BadRequestException, Injectable } from "@nestjs/common";
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
      throw new BadRequestException("Tournoi non trouvé");
    }

    if (tournament.type !== TournamentType.SINGLE_ELIMINATION) {
      throw new BadRequestException(
        "Seul le format à élimination directe est orchestré par Nexus",
      );
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

    const bracketStructure = await this.generateSingleEliminationBracket(
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

    // Créer tous les rounds
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

        // Premier round : assigner les joueurs
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

    // Créer les matches en base
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
      throw new BadRequestException("Tournoi non trouvé");
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

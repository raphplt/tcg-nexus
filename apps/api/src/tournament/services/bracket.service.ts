import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament, TournamentType } from '../entities/tournament.entity';
import { Match, MatchPhase } from '../../match/entities/match.entity';
import { Player } from '../../player/entities/player.entity';
import {
  TournamentRegistration,
  RegistrationStatus
} from '../entities/tournament-registration.entity';
import { Ranking } from '../../ranking/entities/ranking.entity';
import { MatchService } from '../../match/match.service';

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
  nextMatchId?: number;
  nextSlot?: 'A' | 'B';
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

export interface SwissPairing {
  round: number;
  pairings: {
    playerA: Player;
    playerB?: Player; // null pour bye
    tableNumber: number;
  }[];
}

@Injectable()
export class BracketService {
  constructor(
    @InjectRepository(Tournament)
    private tournamentRepository: Repository<Tournament>,
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    @InjectRepository(Player)
    private playerRepository: Repository<Player>,
    @InjectRepository(TournamentRegistration)
    private registrationRepository: Repository<TournamentRegistration>,
    @InjectRepository(Ranking)
    private rankingRepository: Repository<Ranking>,
    private matchService: MatchService
  ) {}

  /**
   * Génère le bracket complet pour un tournoi selon son type
   */
  async generateBracket(tournamentId: number): Promise<BracketStructure> {
    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId },
      relations: [
        'registrations',
        'registrations.player',
        'registrations.player.user'
      ]
    });

    if (!tournament) {
      throw new BadRequestException('Tournoi non trouvé');
    }

    // Récupérer les joueurs confirmés et check-in
    const confirmedPlayers = tournament.registrations
      .filter(
        (reg) => reg.status === RegistrationStatus.CONFIRMED && reg.checkedIn
      )
      .map((reg) => reg.player);

    if (confirmedPlayers.length < (tournament.minPlayers || 2)) {
      throw new BadRequestException(
        'Pas assez de joueurs pour démarrer le tournoi'
      );
    }

    // Seeding des joueurs
    const seededPlayers = this.seedPlayers(confirmedPlayers);

    let bracketStructure: BracketStructure;

    switch (tournament.type) {
      case TournamentType.SINGLE_ELIMINATION:
        bracketStructure = this.generateSingleEliminationBracket(
          seededPlayers,
          tournament
        );
        break;

      case TournamentType.DOUBLE_ELIMINATION:
        bracketStructure = this.generateDoubleEliminationBracket(
          seededPlayers,
          tournament
        );
        break;

      case TournamentType.SWISS_SYSTEM:
        bracketStructure = {
          type: TournamentType.SWISS_SYSTEM,
          totalRounds: this.calculateSwissRounds(seededPlayers.length),
          rounds: []
        };
        break;

      case TournamentType.ROUND_ROBIN:
        bracketStructure = this.generateRoundRobinBracket(
          seededPlayers,
          tournament
        );
        break;

      default:
        throw new BadRequestException(
          `Type de tournoi non supporté: ${tournament.type as string}`
        );
    }

    tournament.totalRounds = bracketStructure.totalRounds;
    tournament.currentRound = 1;
    await this.tournamentRepository.save(tournament);

    return bracketStructure;
  }

  /**
   * Génère les paires pour le round suivant en Swiss
   */
  async generateSwissPairings(
    tournamentId: number,
    round: number
  ): Promise<SwissPairing> {
    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId },
      relations: [
        'registrations',
        'registrations.player',
        'registrations.player.user',
        'rankings'
      ]
    });

    if (!tournament) {
      throw new BadRequestException('Tournoi non trouvé');
    }

    if (tournament.type !== TournamentType.SWISS_SYSTEM) {
      throw new BadRequestException("Ce tournoi n'est pas en système suisse");
    }

    const confirmedPlayers = tournament.registrations
      .filter(
        (reg) => reg.status === RegistrationStatus.CONFIRMED && reg.checkedIn
      )
      .map((reg) => reg.player);

    let sortedPlayers: Player[];

    if (round === 1) {
      // Premier round : tri aléatoire ou par ranking initial
      sortedPlayers = this.seedPlayers(confirmedPlayers);
    } else {
      // Rounds suivants : tri par points puis par tie-breaks
      const rankings = tournament.rankings || [];
      sortedPlayers = confirmedPlayers.sort((a, b) => {
        const rankingA = rankings.find((r) => r.player.id === a.id);
        const rankingB = rankings.find((r) => r.player.id === b.id);

        const pointsA = rankingA?.points || 0;
        const pointsB = rankingB?.points || 0;

        if (pointsA !== pointsB) {
          return pointsB - pointsA; // Plus de points en premier
        }

        // Tie-break par winRate
        const winRateA = rankingA?.winRate || 0;
        const winRateB = rankingB?.winRate || 0;
        return winRateB - winRateA;
      });
    }

    // Générer les paires en évitant les re-matchs
    const pairings = await this.createSwissPairings(
      sortedPlayers,
      tournamentId
    );

    return {
      round,
      pairings
    };
  }

  /**
   * Génère le bracket pour élimination simple
   */
  private generateSingleEliminationBracket(
    players: Player[],
    tournament: Tournament
  ): BracketStructure {
    const playerCount = players.length;
    const totalRounds = Math.ceil(Math.log2(playerCount));

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
          nextSlot: position % 2 === 0 ? 'A' : 'B'
        };

        // Premier round : assigner les joueurs
        if (round === 1) {
          const playerAIndex = position * 2;
          const playerBIndex = position * 2 + 1;

          if (playerAIndex < players.length) {
            node.playerA = {
              id: players[playerAIndex].id,
              name: `${players[playerAIndex].user?.firstName || ''} ${players[playerAIndex].user?.lastName || ''}`.trim(),
              seed: playerAIndex + 1
            };
          }

          if (playerBIndex < players.length) {
            node.playerB = {
              id: players[playerBIndex].id,
              name: `${players[playerBIndex].user?.firstName || ''} ${players[playerBIndex].user?.lastName || ''}`.trim(),
              seed: playerBIndex + 1
            };
          }
        }

        matches.push(node);
      }

      rounds.push({ index: round, matches });
    }

    // Créer les matches en base
    this.createMatchesFromBracket(tournament, rounds);

    return {
      type: TournamentType.SINGLE_ELIMINATION,
      totalRounds,
      rounds
    };
  }

  /**
   * Génère le bracket pour élimination double
   */
  private generateDoubleEliminationBracket(
    players: Player[],
    tournament: Tournament
  ): BracketStructure {
    // Implémentation simplifiée - bracket winner + loser
    //TODO: Implémenter la logique complète du double elimination
    // const playerCount = players.length;
    // const winnerRounds = Math.ceil(Math.log2(playerCount));
    // const loserRounds = (winnerRounds - 1) * 2;

    // Pour l'instant, on génère comme un single elimination
    // TODO: Implémenter la logique complète du double elimination
    return this.generateSingleEliminationBracket(players, tournament);
  }

  /**
   * Génère le bracket pour round robin
   */
  private generateRoundRobinBracket(
    players: Player[],
    tournament: Tournament
  ): BracketStructure {
    const playerCount = players.length;
    const totalRounds = playerCount - 1;
    const rounds: { index: number; matches: BracketNode[] }[] = [];

    // Algorithme round-robin standard
    for (let round = 1; round <= totalRounds; round++) {
      const matches: BracketNode[] = [];
      const matchesInRound = Math.floor(playerCount / 2);

      for (let match = 0; match < matchesInRound; match++) {
        const playerAIndex = match;
        const playerBIndex = playerCount - 1 - match;

        if (playerAIndex !== playerBIndex) {
          matches.push({
            matchId: (round - 1) * matchesInRound + match + 1,
            round,
            position: match,
            playerA: {
              id: players[playerAIndex].id,
              name: `${players[playerAIndex].user?.firstName || ''} ${players[playerAIndex].user?.lastName || ''}`.trim(),
              seed: playerAIndex + 1
            },
            playerB: {
              id: players[playerBIndex].id,
              name: `${players[playerBIndex].user?.firstName || ''} ${players[playerBIndex].user?.lastName || ''}`.trim(),
              seed: playerBIndex + 1
            },
            phase: MatchPhase.QUALIFICATION
          });
        }
      }

      rounds.push({ index: round, matches });

      // Rotation des joueurs (sauf le premier)
      if (round < totalRounds) {
        const temp = players[1];
        for (let i = 1; i < playerCount - 1; i++) {
          players[i] = players[i + 1];
        }
        players[playerCount - 1] = temp;
      }
    }

    this.createMatchesFromBracket(tournament, rounds);

    return {
      type: TournamentType.ROUND_ROBIN,
      totalRounds,
      rounds
    };
  }

  /**
   * Seeding des joueurs (aléatoire par défaut)
   */
  private seedPlayers(players: Player[]): Player[] {
    // TODO: Implémenter le seeding basé sur le ranking/ELO
    // Pour l'instant, mélange aléatoire
    const shuffled = [...players];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Calcule le nombre de rounds pour un tournoi Swiss
   */
  private calculateSwissRounds(playerCount: number): number {
    // Formule standard : log2(playerCount) arrondi à l'entier supérieur
    return Math.ceil(Math.log2(playerCount));
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
  private createMatchesFromBracket(
    tournament: Tournament,
    rounds: { index: number; matches: BracketNode[] }[]
  ): void {
    for (const round of rounds) {
      for (const node of round.matches) {
        if (node.playerA || node.playerB) {
          void this.matchService.create({
            tournamentId: tournament.id,
            playerAId: node.playerA?.id,
            playerBId: node.playerB?.id,
            round: node.round,
            phase: node.phase,
            scheduledDate: new Date(tournament.startDate),
            notes: `Match généré automatiquement`
          });
        }
      }
    }
  }

  /**
   * Crée les paires Swiss en évitant les re-matchs
   */
  private async createSwissPairings(
    sortedPlayers: Player[],
    tournamentId: number
  ): Promise<SwissPairing['pairings']> {
    const pairings: SwissPairing['pairings'] = [];
    const availablePlayers = [...sortedPlayers];
    let tableNumber = 1;

    // Récupérer les matchs précédents pour éviter les re-matchs
    const previousMatches = await this.matchRepository.find({
      where: { tournament: { id: tournamentId } },
      relations: ['playerA', 'playerB']
    });

    const hasPlayedAgainst = (playerA: Player, playerB: Player): boolean => {
      return previousMatches.some(
        (match) =>
          (match.playerA?.id === playerA.id &&
            match.playerB?.id === playerB.id) ||
          (match.playerA?.id === playerB.id && match.playerB?.id === playerA.id)
      );
    };

    while (availablePlayers.length > 1) {
      const playerA = availablePlayers.shift()!;
      let playerB: Player | undefined;
      let playerBIndex = -1;

      // Chercher un adversaire qui n'a pas encore joué contre playerA
      for (let i = 0; i < availablePlayers.length; i++) {
        if (!hasPlayedAgainst(playerA, availablePlayers[i])) {
          playerB = availablePlayers[i];
          playerBIndex = i;
          break;
        }
      }

      // Si aucun adversaire inédit, prendre le premier disponible
      if (!playerB && availablePlayers.length > 0) {
        playerB = availablePlayers[0];
        playerBIndex = 0;
      }

      if (playerB) {
        availablePlayers.splice(playerBIndex, 1);
      }

      pairings.push({
        playerA,
        playerB,
        tableNumber: tableNumber++
      });
    }

    // Joueur restant reçoit un bye
    if (availablePlayers.length === 1) {
      pairings.push({
        playerA: availablePlayers[0],
        playerB: undefined, // bye
        tableNumber: tableNumber++
      });
    }

    return pairings;
  }

  /**
   * Récupère le bracket actuel d'un tournoi
   */
  async getBracket(tournamentId: number): Promise<BracketStructure> {
    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId },
      relations: [
        'matches',
        'matches.playerA',
        'matches.playerA.user',
        'matches.playerB',
        'matches.playerB.user',
        'matches.winner'
      ]
    });

    if (!tournament) {
      throw new BadRequestException('Tournoi non trouvé');
    }

    const rounds: { index: number; matches: BracketNode[] }[] = [];
    const matchesByRound = new Map<number, Match[]>();

    // Grouper les matches par round
    tournament.matches.forEach((match) => {
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
              name: `${match.playerA.user?.firstName || ''} ${match.playerA.user?.lastName || ''}`.trim()
            }
          : undefined,
        playerB: match.playerB
          ? {
              id: match.playerB.id,
              name: `${match.playerB.user?.firstName || ''} ${match.playerB.user?.lastName || ''}`.trim()
            }
          : undefined,
        winnerId: match.winner?.id,
        phase: match.phase
      }));

      rounds.push({ index: roundNumber, matches: nodes });
    }

    // Trier les rounds
    rounds.sort((a, b) => a.index - b.index);

    return {
      type: tournament.type,
      totalRounds: tournament.totalRounds || 0,
      rounds
    };
  }
}

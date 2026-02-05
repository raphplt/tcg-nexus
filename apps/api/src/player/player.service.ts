import {
  Injectable,
  NotFoundException,
  BadRequestException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { Player } from './entities/player.entity';
import { Ranking } from 'src/ranking/entities/ranking.entity';
import { TournamentStatus } from 'src/tournament/entities/tournament.entity';

@Injectable()
export class PlayerService {
  constructor(
    @InjectRepository(Player)
    private readonly playerRepository: Repository<Player>,
    @InjectRepository(Ranking)
    private readonly rankingRepository: Repository<Ranking>
  ) {}

  async create(createPlayerDto: CreatePlayerDto) {
    const player = this.playerRepository.create(createPlayerDto as any);
    return this.playerRepository.save(player);
  }

  async findAll() {
    return this.playerRepository.find({ relations: ['user'] });
  }

  async findOne(id: number) {
    const player = await this.playerRepository.findOne({
      where: { id },
      relations: ['user']
    });

    if (!player) {
      throw new NotFoundException('Joueur non trouvé');
    }

    return player;
  }

  async update(id: number, updatePlayerDto: UpdatePlayerDto) {
    const player = await this.findOne(id);
    Object.assign(player, updatePlayerDto);
    return this.playerRepository.save(player);
  }

  async remove(id: number) {
    const player = await this.findOne(id);
    await this.playerRepository.remove(player);
    return { success: true };
  }

  async getTournamentHistory(playerId: number, period?: string) {
    const player = await this.playerRepository.findOne({
      where: { id: playerId },
      relations: ['user']
    });

    if (!player) {
      throw new NotFoundException('Joueur non trouvé');
    }

    const rankings = await this.rankingRepository.find({
      where: { player: { id: playerId } },
      relations: ['tournament'],
      order: { createdAt: 'ASC' }
    });

    const now = new Date();
    const cutoff = this.resolvePeriodCutoff(period, now);

    const pastRankings = rankings.filter((ranking) => {
      const tournament = ranking.tournament;
      if (!tournament) return false;

      const endDate = tournament.endDate ? new Date(tournament.endDate) : null;
      const isPast =
        tournament.status === TournamentStatus.FINISHED ||
        tournament.isFinished === true ||
        (endDate ? endDate <= now : false);

      if (!isPast) return false;
      if (cutoff && endDate) {
        return endDate >= cutoff;
      }
      return !cutoff || !endDate;
    });

    if (pastRankings.length === 0) {
      return {
        playerId,
        period: period || 'all',
        baseElo: 1000,
        history: [],
        stats: {
          totalTournaments: 0,
          totalWins: 0,
          totalLosses: 0,
          totalDraws: 0,
          totalMatches: 0,
          winRate: 0,
          bestRank: null,
          totalPoints: 0
        }
      };
    }

    const tournamentIds = pastRankings
      .map((ranking) => ranking.tournament?.id)
      .filter((id): id is number => typeof id === 'number');

    if (tournamentIds.length === 0) {
      throw new BadRequestException('Aucun tournoi valide trouvé');
    }

    const counts = await this.rankingRepository
      .createQueryBuilder('ranking')
      .select('ranking.tournamentId', 'tournamentId')
      .addSelect('COUNT(*)', 'count')
      .where('ranking.tournamentId IN (:...ids)', { ids: tournamentIds })
      .groupBy('ranking.tournamentId')
      .getRawMany();

    const countMap = new Map<number, number>();
    counts.forEach((row: { tournamentId: string; count: string }) => {
      countMap.set(Number(row.tournamentId), Number(row.count));
    });

    const sorted = [...pastRankings].sort((a, b) => {
      const dateA = a.tournament?.endDate
        ? new Date(a.tournament.endDate).getTime()
        : 0;
      const dateB = b.tournament?.endDate
        ? new Date(b.tournament.endDate).getTime()
        : 0;
      return dateA - dateB;
    });

    let elo = 1000;
    const history = sorted.map((ranking) => {
      const totalPlayers =
        (ranking.tournament?.id &&
          countMap.get(ranking.tournament.id)) ||
        0;
      const eloBefore = elo;
      const eloDelta = this.computeEloDelta(ranking, totalPlayers);
      const eloAfter = eloBefore + eloDelta;
      elo = eloAfter;

      return {
        tournament: {
          id: ranking.tournament?.id,
          name: ranking.tournament?.name,
          startDate: ranking.tournament?.startDate,
          endDate: ranking.tournament?.endDate,
          location: ranking.tournament?.location,
          type: ranking.tournament?.type,
          status: ranking.tournament?.status
        },
        rank: ranking.rank,
        points: ranking.points,
        wins: ranking.wins,
        losses: ranking.losses,
        draws: ranking.draws,
        winRate: Number(ranking.winRate),
        totalPlayers,
        eloBefore,
        eloAfter,
        eloDelta
      };
    });

    const totalWins = history.reduce((sum, h) => sum + h.wins, 0);
    const totalLosses = history.reduce((sum, h) => sum + h.losses, 0);
    const totalDraws = history.reduce((sum, h) => sum + h.draws, 0);
    const totalMatches = totalWins + totalLosses + totalDraws;
    const bestRank = history.reduce<number | null>((best, h) => {
      if (best === null) return h.rank;
      return h.rank < best ? h.rank : best;
    }, null);

    const totalPoints = history.reduce((sum, h) => sum + h.points, 0);
    const winRate = totalMatches
      ? Math.round((totalWins / totalMatches) * 1000) / 10
      : 0;

    return {
      playerId,
      period: period || 'all',
      baseElo: 1000,
      history,
      stats: {
        totalTournaments: history.length,
        totalWins,
        totalLosses,
        totalDraws,
        totalMatches,
        winRate,
        bestRank,
        totalPoints
      }
    };
  }

  private resolvePeriodCutoff(period?: string, now: Date = new Date()) {
    if (!period || period === 'all') return null;

    const cutoff = new Date(now);

    switch (period) {
      case '1m':
      case 'last_month':
        cutoff.setMonth(cutoff.getMonth() - 1);
        return cutoff;
      case '3m':
      case '3_months':
        cutoff.setMonth(cutoff.getMonth() - 3);
        return cutoff;
      case '1y':
      case 'year':
        cutoff.setFullYear(cutoff.getFullYear() - 1);
        return cutoff;
      default:
        return null;
    }
  }

  private computeEloDelta(ranking: Ranking, totalPlayers: number) {
    const pointsComponent = (ranking.points || 0) * 5;
    const winRateComponent = Math.round((Number(ranking.winRate) || 0) * 0.2);
    const rankBonus =
      totalPlayers > 1
        ? Math.round(((totalPlayers - ranking.rank) / (totalPlayers - 1)) * 20)
        : 10;

    return Math.round(pointsComponent + winRateComponent + rankBonus - 10);
  }
}

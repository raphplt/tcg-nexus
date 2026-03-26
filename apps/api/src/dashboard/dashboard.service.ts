import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, In } from 'typeorm';
import { Collection } from 'src/collection/entities/collection.entity';
import { CollectionItem } from 'src/collection-item/entities/collection-item.entity';
import { Deck } from 'src/deck/entities/deck.entity';
import { Player } from 'src/player/entities/player.entity';
import { Ranking } from 'src/ranking/entities/ranking.entity';
import { Listing } from 'src/marketplace/entities/listing.entity';
import { Order, OrderStatus } from 'src/marketplace/entities/order.entity';
import { OrderItem } from 'src/marketplace/entities/order-item.entity';
import { CardEvent } from 'src/marketplace/entities/card-event.entity';
import { User } from 'src/user/entities/user.entity';
import { BadgeService } from 'src/badge/badge.service';
import {
  DashboardResponseDto,
  DashboardCollectionData,
  DashboardTournamentsData,
  DashboardDecksData,
  DashboardMarketplaceData,
  DashboardBadgesData,
  DashboardActivityDay
} from './dto/dashboard-response.dto';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Collection)
    private readonly collectionRepository: Repository<Collection>,
    @InjectRepository(CollectionItem)
    private readonly collectionItemRepository: Repository<CollectionItem>,
    @InjectRepository(Deck)
    private readonly deckRepository: Repository<Deck>,
    @InjectRepository(Player)
    private readonly playerRepository: Repository<Player>,
    @InjectRepository(Ranking)
    private readonly rankingRepository: Repository<Ranking>,
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(CardEvent)
    private readonly cardEventRepository: Repository<CardEvent>,
    private readonly badgeService: BadgeService
  ) {}

  async getDashboard(user: User): Promise<DashboardResponseDto> {
    const [collection, tournaments, decks, marketplace, activity] = await Promise.all([
      this.getCollectionStats(user.id),
      this.getTournamentStats(user.id),
      this.getDeckStats(user.id),
      this.getMarketplaceStats(user.id),
      this.getActivityStats(user.id)
    ]);

    const badges = await this.getBadgeStats(user.id, {
      totalCards: collection.totalCards,
      totalDecks: decks.total,
      totalWins: tournaments.totalWins,
      totalListings: marketplace.activeListings,
      totalPurchases: marketplace.totalPurchases
    });

    return {
      collection,
      tournaments,
      decks,
      marketplace,
      badges,
      activity,
      user: {
        memberSince: user.createdAt,
        isActive: user.isActive
      }
    };
  }

  private async getCollectionStats(userId: number): Promise<DashboardCollectionData> {
    const collections = await this.collectionRepository.find({
      where: { user: { id: userId } }
    });

    if (collections.length === 0) {
      return { totalCards: 0, estimatedValue: 0, recentlyAdded: 0, collectionCount: 0 };
    }

    const collectionIds = collections.map((c) => c.id);

    const items = await this.collectionItemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.pokemonCard', 'card')
      .leftJoin('item.collection', 'collection')
      .where('collection.id IN (:...collectionIds)', { collectionIds })
      .getMany();

    const totalCards = items.reduce((sum, item) => sum + item.quantity, 0);

    let estimatedValue = 0;
    for (const item of items) {
      const card = item.pokemonCard;
      if (card?.pricing) {
        const price =
          card.pricing.cardmarket?.avg ??
          card.pricing.cardmarket?.trend ??
          card.pricing.tcgplayer?.normal?.marketPrice ??
          0;
        estimatedValue += price * item.quantity;
      }
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentlyAdded = items.filter(
      (item) => new Date(item.added_at) > thirtyDaysAgo
    ).length;

    return {
      totalCards,
      estimatedValue: Math.round(estimatedValue * 100) / 100,
      recentlyAdded,
      collectionCount: collections.length
    };
  }

  private async getTournamentStats(userId: number): Promise<DashboardTournamentsData> {
    const player = await this.playerRepository.findOne({
      where: { user: { id: userId } }
    });

    if (!player) {
      return { played: 0, winRate: 0, bestRank: null, totalWins: 0, totalLosses: 0 };
    }

    const rankings = await this.rankingRepository.find({
      where: { player: { id: player.id } },
      relations: ['tournament']
    });

    const finishedRankings = rankings.filter(
      (r) => r.tournament?.status === 'finished'
    );

    if (finishedRankings.length === 0) {
      return { played: 0, winRate: 0, bestRank: null, totalWins: 0, totalLosses: 0 };
    }

    const totalWins = finishedRankings.reduce((sum, r) => sum + r.wins, 0);
    const totalLosses = finishedRankings.reduce((sum, r) => sum + r.losses, 0);
    const totalGames = totalWins + totalLosses;
    const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
    const bestRank = Math.min(...finishedRankings.map((r) => r.rank));

    return {
      played: finishedRankings.length,
      winRate,
      bestRank: bestRank === Infinity ? null : bestRank,
      totalWins,
      totalLosses
    };
  }

  private async getDeckStats(userId: number): Promise<DashboardDecksData> {
    const decks = await this.deckRepository.find({
      where: { user: { id: userId } },
      order: { views: 'DESC' }
    });

    if (decks.length === 0) {
      return { total: 0, mostUsed: null };
    }

    const top = decks[0];

    return {
      total: decks.length,
      mostUsed: {
        id: top.id,
        name: top.name,
        views: top.views
      }
    };
  }

  private async getMarketplaceStats(userId: number): Promise<DashboardMarketplaceData> {
    // Active listings (not expired)
    const activeListings = await this.listingRepository
      .createQueryBuilder('listing')
      .where('listing.seller_id = :userId', { userId })
      .andWhere('(listing.expiresAt IS NULL OR listing.expiresAt > NOW())')
      .getCount();

    // Revenue from sales (orders containing user's listings that are paid/shipped)
    const revenueResult = await this.orderItemRepository
      .createQueryBuilder('oi')
      .innerJoin('oi.listing', 'listing')
      .innerJoin('oi.order', 'ord')
      .where('listing.seller_id = :userId', { userId })
      .andWhere('ord.status IN (:...statuses)', {
        statuses: [OrderStatus.PAID, OrderStatus.SHIPPED]
      })
      .select('COALESCE(SUM(oi.unitPrice * oi.quantity), 0)', 'revenue')
      .getRawOne();

    const totalRevenue = parseFloat(revenueResult?.revenue ?? '0');

    // Purchases as buyer
    const purchaseResult = await this.orderRepository
      .createQueryBuilder('ord')
      .where('ord.buyer_id = :userId', { userId })
      .select('COUNT(ord.id)', 'count')
      .addSelect('COALESCE(SUM(ord.totalAmount), 0)', 'spent')
      .getRawOne();

    return {
      activeListings,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalPurchases: parseInt(purchaseResult?.count ?? '0', 10),
      totalSpent: Math.round(parseFloat(purchaseResult?.spent ?? '0') * 100) / 100
    };
  }

  private async getBadgeStats(
    userId: number,
    stats: {
      totalCards: number;
      totalDecks: number;
      totalWins: number;
      totalListings: number;
      totalPurchases: number;
    }
  ): Promise<DashboardBadgesData> {
    await this.badgeService.checkAndAwardBadges(userId, stats);

    const [userBadges, totalBadges, nextBadge] = await Promise.all([
      this.badgeService.getUserBadges(userId),
      this.badgeService.getTotalBadgeCount(),
      this.badgeService.getNextBadgeProgress(userId, stats)
    ]);

    return {
      unlocked: userBadges.map((ub) => ({
        code: ub.badge.code,
        name: ub.badge.name,
        icon: ub.badge.icon,
        category: ub.badge.category,
        unlockedAt: ub.unlockedAt
      })),
      total: totalBadges,
      nextBadge
    };
  }

  private async getActivityStats(userId: number): Promise<DashboardActivityDay[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const events = await this.cardEventRepository
      .createQueryBuilder('event')
      .where('event.user_id = :userId', { userId })
      .andWhere('event.createdAt > :sevenDaysAgo', { sevenDaysAgo })
      .select("DATE(event.createdAt)", 'date')
      .addSelect('COUNT(*)', 'count')
      .groupBy("DATE(event.createdAt)")
      .getRawMany();

    const eventMap = new Map<string, number>();
    for (const e of events) {
      const dateStr =
        e.date instanceof Date ? e.date.toISOString().split('T')[0] : String(e.date);
      eventMap.set(dateStr, parseInt(e.count, 10));
    }

    const result: DashboardActivityDay[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        events: eventMap.get(dateStr) ?? 0
      });
    }

    return result;
  }
}

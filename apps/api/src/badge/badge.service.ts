import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Badge, BadgeCategory } from './entities/badge.entity';
import { UserBadge } from './entities/user-badge.entity';

export interface BadgeStats {
  totalCards: number;
  totalDecks: number;
  totalWins: number;
  totalListings: number;
  totalPurchases: number;
}

const DEFAULT_BADGES: Omit<Badge, 'id' | 'createdAt' | 'userBadges'>[] = [
  {
    code: 'first_card',
    name: 'Première carte',
    description: 'Ajoutez votre première carte à une collection',
    icon: 'sparkles',
    category: BadgeCategory.COLLECTION,
    threshold: 1
  },
  {
    code: 'collector_10',
    name: 'Collectionneur',
    description: '10 cartes dans vos collections',
    icon: 'layers',
    category: BadgeCategory.COLLECTION,
    threshold: 10
  },
  {
    code: 'collector_50',
    name: 'Grand collectionneur',
    description: '50 cartes dans vos collections',
    icon: 'library',
    category: BadgeCategory.COLLECTION,
    threshold: 50
  },
  {
    code: 'collector_100',
    name: 'Maître collectionneur',
    description: '100 cartes dans vos collections',
    icon: 'crown',
    category: BadgeCategory.COLLECTION,
    threshold: 100
  },
  {
    code: 'first_deck',
    name: 'Premier deck',
    description: 'Créez votre premier deck',
    icon: 'square-stack',
    category: BadgeCategory.DECK,
    threshold: 1
  },
  {
    code: 'deck_builder_5',
    name: 'Deck builder',
    description: 'Créez 5 decks',
    icon: 'hammer',
    category: BadgeCategory.DECK,
    threshold: 5
  },
  {
    code: 'first_tournament',
    name: 'Débutant',
    description: 'Participez à votre premier tournoi',
    icon: 'swords',
    category: BadgeCategory.TOURNAMENT,
    threshold: 1
  },
  {
    code: 'winner_1',
    name: 'Vainqueur',
    description: 'Gagnez votre premier match',
    icon: 'trophy',
    category: BadgeCategory.TOURNAMENT,
    threshold: 1
  },
  {
    code: 'winner_5',
    name: 'Champion',
    description: 'Gagnez 5 matchs',
    icon: 'medal',
    category: BadgeCategory.TOURNAMENT,
    threshold: 5
  },
  {
    code: 'first_listing',
    name: 'Vendeur',
    description: 'Créez votre première annonce',
    icon: 'tag',
    category: BadgeCategory.MARKETPLACE,
    threshold: 1
  },
  {
    code: 'merchant_10',
    name: 'Marchand',
    description: 'Réalisez 10 ventes',
    icon: 'store',
    category: BadgeCategory.MARKETPLACE,
    threshold: 10
  },
  {
    code: 'first_purchase',
    name: 'Acheteur',
    description: 'Faites votre premier achat',
    icon: 'shopping-bag',
    category: BadgeCategory.MARKETPLACE,
    threshold: 1
  }
];

@Injectable()
export class BadgeService implements OnModuleInit {
  constructor(
    @InjectRepository(Badge)
    private readonly badgeRepository: Repository<Badge>,
    @InjectRepository(UserBadge)
    private readonly userBadgeRepository: Repository<UserBadge>
  ) {}

  async onModuleInit() {
    await this.seedBadges();
  }

  async seedBadges(): Promise<void> {
    for (const badgeData of DEFAULT_BADGES) {
      const exists = await this.badgeRepository.findOne({
        where: { code: badgeData.code }
      });
      if (!exists) {
        await this.badgeRepository.save(this.badgeRepository.create(badgeData));
      }
    }
  }

  async getUserBadges(userId: number): Promise<UserBadge[]> {
    return this.userBadgeRepository.find({
      where: { user: { id: userId } },
      relations: ['badge'],
      order: { unlockedAt: 'DESC' }
    });
  }

  async checkAndAwardBadges(userId: number, stats: BadgeStats): Promise<void> {
    const allBadges = await this.badgeRepository.find();
    const existingUserBadges = await this.userBadgeRepository.find({
      where: { user: { id: userId } },
      relations: ['badge']
    });
    const unlockedCodes = new Set(existingUserBadges.map((ub) => ub.badge.code));

    for (const badge of allBadges) {
      if (unlockedCodes.has(badge.code)) continue;

      const currentValue = this.getStatForBadge(badge, stats);
      if (currentValue >= badge.threshold) {
        await this.userBadgeRepository.save(
          this.userBadgeRepository.create({
            user: { id: userId } as any,
            badge
          })
        );
      }
    }
  }

  async getNextBadgeProgress(
    userId: number,
    stats: BadgeStats
  ): Promise<{
    code: string;
    name: string;
    icon: string;
    description: string;
    progress: number;
    current: number;
    threshold: number;
  } | null> {
    const allBadges = await this.badgeRepository.find({ order: { threshold: 'ASC' } });
    const existingUserBadges = await this.userBadgeRepository.find({
      where: { user: { id: userId } },
      relations: ['badge']
    });
    const unlockedCodes = new Set(existingUserBadges.map((ub) => ub.badge.code));

    let closest: {
      code: string;
      name: string;
      icon: string;
      description: string;
      progress: number;
      current: number;
      threshold: number;
    } | null = null;
    let bestProgress = -1;

    for (const badge of allBadges) {
      if (unlockedCodes.has(badge.code)) continue;

      const current = this.getStatForBadge(badge, stats);
      const progress = Math.min(100, Math.round((current / badge.threshold) * 100));

      if (progress > bestProgress) {
        bestProgress = progress;
        closest = {
          code: badge.code,
          name: badge.name,
          icon: badge.icon,
          description: badge.description,
          progress,
          current,
          threshold: badge.threshold
        };
      }
    }

    return closest;
  }

  async getTotalBadgeCount(): Promise<number> {
    return this.badgeRepository.count();
  }

  private getStatForBadge(badge: Badge, stats: BadgeStats): number {
    switch (badge.code) {
      case 'first_card':
      case 'collector_10':
      case 'collector_50':
      case 'collector_100':
        return stats.totalCards;
      case 'first_deck':
      case 'deck_builder_5':
        return stats.totalDecks;
      case 'first_tournament':
        return stats.totalWins > 0 ? 1 : 0;
      case 'winner_1':
      case 'winner_5':
        return stats.totalWins;
      case 'first_listing':
      case 'merchant_10':
        return stats.totalListings;
      case 'first_purchase':
        return stats.totalPurchases;
      default:
        return 0;
    }
  }
}

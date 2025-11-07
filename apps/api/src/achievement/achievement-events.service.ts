import { Injectable } from '@nestjs/common';
import { AchievementService } from './achievement.service';
import { AchievementType } from './entities/achievement.entity';
import { UserAchievement } from './entities/user-achievement.entity';

/**
 * Service pour gérer les événements et le déclenchement des achievements
 * Ce service doit être appelé depuis les autres services (tournament, deck, marketplace, etc.)
 */
@Injectable()
export class AchievementEventsService {
  constructor(private readonly achievementService: AchievementService) {}

  /**
   * Déclencher l'achievement de création de compte
   */
  async onAccountCreated(userId: number): Promise<UserAchievement | null> {
    return this.achievementService.unlockAchievement(
      userId,
      AchievementType.ACCOUNT_CREATED
    );
  }

  /**
   * Vérifier et déclencher l'achievement de profil complété
   */
  async onProfileCompleted(userId: number): Promise<UserAchievement | null> {
    return this.achievementService.unlockAchievement(
      userId,
      AchievementType.PROFILE_COMPLETED
    );
  }

  // ==================== MARKETPLACE ====================

  /**
   * Déclencher les achievements liés à l'achat de cartes
   */
  async onCardBought(userId: number): Promise<UserAchievement[]> {
    const unlockedAchievements: UserAchievement[] = [];

    // Premier achat
    const firstBuy = await this.achievementService.incrementAchievementProgress(
      userId,
      AchievementType.FIRST_CARD_BOUGHT
    );
    if (firstBuy) unlockedAchievements.push(firstBuy);

    // 10 achats
    const buy10 = await this.achievementService.incrementAchievementProgress(
      userId,
      AchievementType.CARDS_BOUGHT_10
    );
    if (buy10) unlockedAchievements.push(buy10);

    // 50 achats
    const buy50 = await this.achievementService.incrementAchievementProgress(
      userId,
      AchievementType.CARDS_BOUGHT_50
    );
    if (buy50) unlockedAchievements.push(buy50);

    // 100 achats
    const buy100 = await this.achievementService.incrementAchievementProgress(
      userId,
      AchievementType.CARDS_BOUGHT_100
    );
    if (buy100) unlockedAchievements.push(buy100);

    return unlockedAchievements;
  }

  /**
   * Déclencher les achievements liés à la mise en vente de cartes
   */
  async onCardListed(userId: number): Promise<UserAchievement | null> {
    return this.achievementService.incrementAchievementProgress(
      userId,
      AchievementType.FIRST_CARD_LISTED
    );
  }

  /**
   * Déclencher les achievements liés à la vente de cartes
   */
  async onCardSold(userId: number): Promise<UserAchievement[]> {
    const unlockedAchievements: UserAchievement[] = [];

    // Première vente
    const firstSale = await this.achievementService.incrementAchievementProgress(
      userId,
      AchievementType.FIRST_SALE
    );
    if (firstSale) unlockedAchievements.push(firstSale);

    // 10 ventes
    const sale10 = await this.achievementService.incrementAchievementProgress(
      userId,
      AchievementType.CARDS_SOLD_10
    );
    if (sale10) unlockedAchievements.push(sale10);

    // 50 ventes
    const sale50 = await this.achievementService.incrementAchievementProgress(
      userId,
      AchievementType.CARDS_SOLD_50
    );
    if (sale50) unlockedAchievements.push(sale50);

    // 100 ventes
    const sale100 = await this.achievementService.incrementAchievementProgress(
      userId,
      AchievementType.CARDS_SOLD_100
    );
    if (sale100) unlockedAchievements.push(sale100);

    return unlockedAchievements;
  }

  // ==================== DECKS ====================

  /**
   * Déclencher les achievements liés à la création de decks
   */
  async onDeckCreated(userId: number): Promise<UserAchievement[]> {
    const unlockedAchievements: UserAchievement[] = [];

    // Premier deck
    const firstDeck = await this.achievementService.incrementAchievementProgress(
      userId,
      AchievementType.FIRST_DECK_CREATED
    );
    if (firstDeck) unlockedAchievements.push(firstDeck);

    // 5 decks
    const deck5 = await this.achievementService.incrementAchievementProgress(
      userId,
      AchievementType.DECKS_CREATED_5
    );
    if (deck5) unlockedAchievements.push(deck5);

    // 10 decks
    const deck10 = await this.achievementService.incrementAchievementProgress(
      userId,
      AchievementType.DECKS_CREATED_10
    );
    if (deck10) unlockedAchievements.push(deck10);

    // 25 decks
    const deck25 = await this.achievementService.incrementAchievementProgress(
      userId,
      AchievementType.DECKS_CREATED_25
    );
    if (deck25) unlockedAchievements.push(deck25);

    return unlockedAchievements;
  }

  // ==================== TOURNAMENTS ====================

  /**
   * Déclencher les achievements liés à la participation aux tournois
   */
  async onTournamentJoined(userId: number): Promise<UserAchievement[]> {
    const unlockedAchievements: UserAchievement[] = [];

    // Premier tournoi
    const firstTournament =
      await this.achievementService.incrementAchievementProgress(
        userId,
        AchievementType.FIRST_TOURNAMENT_JOINED
      );
    if (firstTournament) unlockedAchievements.push(firstTournament);

    // 5 tournois
    const tournament5 = await this.achievementService.incrementAchievementProgress(
      userId,
      AchievementType.TOURNAMENTS_JOINED_5
    );
    if (tournament5) unlockedAchievements.push(tournament5);

    // 10 tournois
    const tournament10 =
      await this.achievementService.incrementAchievementProgress(
        userId,
        AchievementType.TOURNAMENTS_JOINED_10
      );
    if (tournament10) unlockedAchievements.push(tournament10);

    // 25 tournois
    const tournament25 =
      await this.achievementService.incrementAchievementProgress(
        userId,
        AchievementType.TOURNAMENTS_JOINED_25
      );
    if (tournament25) unlockedAchievements.push(tournament25);

    return unlockedAchievements;
  }

  /**
   * Déclencher les achievements liés aux victoires de tournois
   */
  async onTournamentWon(userId: number): Promise<UserAchievement[]> {
    const unlockedAchievements: UserAchievement[] = [];

    // Première victoire
    const firstWin = await this.achievementService.incrementAchievementProgress(
      userId,
      AchievementType.FIRST_TOURNAMENT_WIN
    );
    if (firstWin) unlockedAchievements.push(firstWin);

    // 3 victoires
    const win3 = await this.achievementService.incrementAchievementProgress(
      userId,
      AchievementType.TOURNAMENTS_WON_3
    );
    if (win3) unlockedAchievements.push(win3);

    // 5 victoires
    const win5 = await this.achievementService.incrementAchievementProgress(
      userId,
      AchievementType.TOURNAMENTS_WON_5
    );
    if (win5) unlockedAchievements.push(win5);

    // 10 victoires
    const win10 = await this.achievementService.incrementAchievementProgress(
      userId,
      AchievementType.TOURNAMENTS_WON_10
    );
    if (win10) unlockedAchievements.push(win10);

    return unlockedAchievements;
  }

  // ==================== MATCHES ====================

  /**
   * Déclencher les achievements liés aux victoires de matchs
   */
  async onMatchWon(userId: number): Promise<UserAchievement[]> {
    const unlockedAchievements: UserAchievement[] = [];

    // Première victoire
    const firstWin = await this.achievementService.incrementAchievementProgress(
      userId,
      AchievementType.FIRST_MATCH_WIN
    );
    if (firstWin) unlockedAchievements.push(firstWin);

    // 10 victoires
    const win10 = await this.achievementService.incrementAchievementProgress(
      userId,
      AchievementType.MATCHES_WON_10
    );
    if (win10) unlockedAchievements.push(win10);

    // 50 victoires
    const win50 = await this.achievementService.incrementAchievementProgress(
      userId,
      AchievementType.MATCHES_WON_50
    );
    if (win50) unlockedAchievements.push(win50);

    // 100 victoires
    const win100 = await this.achievementService.incrementAchievementProgress(
      userId,
      AchievementType.MATCHES_WON_100
    );
    if (win100) unlockedAchievements.push(win100);

    return unlockedAchievements;
  }

  // ==================== COLLECTION ====================

  /**
   * Vérifier et mettre à jour les achievements de collection
   * Cette méthode doit être appelée après ajout/suppression de cartes dans la collection
   */
  async checkCollectionAchievements(
    userId: number,
    totalCards: number
  ): Promise<UserAchievement[]> {
    const unlockedAchievements: UserAchievement[] = [];

    // Collectionneur débutant (10 cartes)
    if (totalCards >= 10) {
      const beginner = await this.achievementService.setAchievementProgress(
        userId,
        AchievementType.COLLECTOR_BEGINNER,
        totalCards
      );
      if (beginner) unlockedAchievements.push(beginner);
    }

    // Collectionneur intermédiaire (50 cartes)
    if (totalCards >= 50) {
      const intermediate = await this.achievementService.setAchievementProgress(
        userId,
        AchievementType.COLLECTOR_INTERMEDIATE,
        totalCards
      );
      if (intermediate) unlockedAchievements.push(intermediate);
    }

    // Collectionneur avancé (100 cartes)
    if (totalCards >= 100) {
      const advanced = await this.achievementService.setAchievementProgress(
        userId,
        AchievementType.COLLECTOR_ADVANCED,
        totalCards
      );
      if (advanced) unlockedAchievements.push(advanced);
    }

    // Collectionneur expert (500 cartes)
    if (totalCards >= 500) {
      const expert = await this.achievementService.setAchievementProgress(
        userId,
        AchievementType.COLLECTOR_EXPERT,
        totalCards
      );
      if (expert) unlockedAchievements.push(expert);
    }

    // Maître collectionneur (1000 cartes)
    if (totalCards >= 1000) {
      const master = await this.achievementService.setAchievementProgress(
        userId,
        AchievementType.COLLECTOR_MASTER,
        totalCards
      );
      if (master) unlockedAchievements.push(master);
    }

    return unlockedAchievements;
  }
}


# Guide d'intégration des Achievements

Ce guide explique comment intégrer le système d'achievements dans les différents modules de l'application.

## Table des matières
1. [Vue d'ensemble](#vue-densemble)
2. [Import du module](#import-du-module)
3. [Exemples d'intégration](#exemples-dintégration)
4. [Liste des événements disponibles](#liste-des-événements-disponibles)

## Vue d'ensemble

Le système d'achievements est basé sur deux services :
- `AchievementService` : Gestion CRUD des achievements et de leur progression
- `AchievementEventsService` : Service de haut niveau pour déclencher les achievements

## Import du module

Dans le module où vous souhaitez déclencher des achievements, importez `AchievementModule` :

```typescript
import { AchievementModule } from 'src/achievement/achievement.module';

@Module({
  imports: [
    // ... autres imports
    AchievementModule
  ],
  // ...
})
export class VotreModule {}
```

## Exemples d'intégration

### 1. User Service - Création de compte

Dans `user.service.ts` :

```typescript
import { AchievementEventsService } from 'src/achievement/achievement-events.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private achievementEventsService: AchievementEventsService // Injecter le service
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // ... logique de création d'utilisateur
    const user = await this.userRepository.save(newUser);

    // Déclencher l'achievement de création de compte
    await this.achievementEventsService.onAccountCreated(user.id);

    return user;
  }

  async updateProfile(userId: number, updateDto: UpdateUserDto): Promise<User> {
    // ... logique de mise à jour
    const user = await this.userRepository.save(updatedUser);

    // Vérifier si le profil est complet
    if (this.isProfileComplete(user)) {
      await this.achievementEventsService.onProfileCompleted(user.id);
    }

    return user;
  }

  private isProfileComplete(user: User): boolean {
    return !!(user.firstName && user.lastName && user.avatarUrl);
  }
}
```

### 2. Deck Service - Création de deck

Dans `deck.service.ts` :

```typescript
import { AchievementEventsService } from 'src/achievement/achievement-events.service';

@Injectable()
export class DeckService {
  constructor(
    @InjectRepository(Deck)
    private deckRepository: Repository<Deck>,
    private achievementEventsService: AchievementEventsService
  ) {}

  async create(userId: number, createDeckDto: CreateDeckDto): Promise<Deck> {
    const deck = this.deckRepository.create({
      ...createDeckDto,
      user: { id: userId }
    });

    const savedDeck = await this.deckRepository.save(deck);

    // Déclencher les achievements de création de deck
    const unlockedAchievements = await this.achievementEventsService.onDeckCreated(userId);

    // Optionnel : Notifier l'utilisateur des achievements débloqués
    if (unlockedAchievements.length > 0) {
      console.log(`User ${userId} unlocked ${unlockedAchievements.length} achievements`);
    }

    return savedDeck;
  }
}
```

### 3. Tournament Service - Inscription et victoire

Dans `tournament.service.ts` :

```typescript
import { AchievementEventsService } from 'src/achievement/achievement-events.service';

@Injectable()
export class TournamentService {
  constructor(
    @InjectRepository(Tournament)
    private tournamentRepository: Repository<Tournament>,
    @InjectRepository(Player)
    private playerRepository: Repository<Player>,
    private achievementEventsService: AchievementEventsService
  ) {}

  async registerPlayer(tournamentId: number, playerId: number): Promise<void> {
    // ... logique d'inscription

    // Récupérer l'userId du player
    const player = await this.playerRepository.findOne({
      where: { id: playerId },
      relations: ['user']
    });

    if (player?.user) {
      // Déclencher les achievements de participation aux tournois
      await this.achievementEventsService.onTournamentJoined(player.user.id);
    }
  }

  async finishTournament(tournamentId: number): Promise<void> {
    // ... logique de fin de tournoi
    // Récupérer le classement final
    const winner = await this.getWinner(tournamentId);

    if (winner?.user) {
      // Déclencher les achievements de victoire de tournoi
      await this.achievementEventsService.onTournamentWon(winner.user.id);
    }
  }
}
```

### 4. Match Service - Victoire de match

Dans `match.service.ts` :

```typescript
import { AchievementEventsService } from 'src/achievement/achievement-events.service';

@Injectable()
export class MatchService {
  constructor(
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    private achievementEventsService: AchievementEventsService
  ) {}

  async finishMatch(matchId: number, winnerId: number): Promise<Match> {
    // ... logique de fin de match
    const match = await this.matchRepository.save(updatedMatch);

    // Récupérer le winner avec son user
    const winner = await this.playerRepository.findOne({
      where: { id: winnerId },
      relations: ['user']
    });

    if (winner?.user) {
      // Déclencher les achievements de victoire de match
      await this.achievementEventsService.onMatchWon(winner.user.id);
    }

    return match;
  }
}
```

### 5. Marketplace Service - Achat et vente

Dans `marketplace.service.ts` :

```typescript
import { AchievementEventsService } from 'src/achievement/achievement-events.service';

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectRepository(Listing)
    private listingRepository: Repository<Listing>,
    private achievementEventsService: AchievementEventsService
  ) {}

  async createListing(userId: number, createListingDto: CreateListingDto): Promise<Listing> {
    // ... logique de création de listing
    const listing = await this.listingRepository.save(newListing);

    // Déclencher l'achievement de première mise en vente
    await this.achievementEventsService.onCardListed(userId);

    return listing;
  }

  async buyCard(buyerId: number, listingId: number): Promise<void> {
    // ... logique d'achat
    const listing = await this.listingRepository.findOne({
      where: { id: listingId },
      relations: ['seller']
    });

    // Déclencher les achievements pour l'acheteur
    await this.achievementEventsService.onCardBought(buyerId);

    // Déclencher les achievements pour le vendeur
    if (listing?.seller) {
      await this.achievementEventsService.onCardSold(listing.seller.id);
    }
  }
}
```

### 6. Collection Service - Progression de collection

Dans `collection.service.ts` :

```typescript
import { AchievementEventsService } from 'src/achievement/achievement-events.service';

@Injectable()
export class CollectionService {
  constructor(
    @InjectRepository(Collection)
    private collectionRepository: Repository<Collection>,
    @InjectRepository(CollectionItem)
    private collectionItemRepository: Repository<CollectionItem>,
    private achievementEventsService: AchievementEventsService
  ) {}

  async addCardToCollection(userId: number, cardId: string): Promise<CollectionItem> {
    // ... logique d'ajout de carte

    // Compter le nombre total de cartes dans la collection de l'utilisateur
    const totalCards = await this.collectionItemRepository.count({
      where: { collection: { user: { id: userId } } }
    });

    // Vérifier et mettre à jour les achievements de collection
    await this.achievementEventsService.checkCollectionAchievements(userId, totalCards);

    return item;
  }

  async removeCardFromCollection(userId: number, itemId: number): Promise<void> {
    // ... logique de suppression

    // Recalculer le total après suppression
    const totalCards = await this.collectionItemRepository.count({
      where: { collection: { user: { id: userId } } }
    });

    // Mettre à jour les achievements de collection
    await this.achievementEventsService.checkCollectionAchievements(userId, totalCards);
  }
}
```

## Liste des événements disponibles

### Account
- `onAccountCreated(userId)` - Compte créé
- `onProfileCompleted(userId)` - Profil complété

### Marketplace
- `onCardBought(userId)` - Achat d'une carte (incrémente automatiquement les achievements 1, 10, 50, 100)
- `onCardListed(userId)` - Mise en vente d'une carte
- `onCardSold(userId)` - Vente d'une carte (incrémente automatiquement les achievements 1, 10, 50, 100)

### Decks
- `onDeckCreated(userId)` - Création d'un deck (incrémente automatiquement les achievements 1, 5, 10, 25)

### Tournaments
- `onTournamentJoined(userId)` - Participation à un tournoi (incrémente automatiquement les achievements 1, 5, 10, 25)
- `onTournamentWon(userId)` - Victoire d'un tournoi (incrémente automatiquement les achievements 1, 3, 5, 10)

### Matches
- `onMatchWon(userId)` - Victoire d'un match (incrémente automatiquement les achievements 1, 10, 50, 100)

### Collection
- `checkCollectionAchievements(userId, totalCards)` - Vérifie et met à jour les achievements de collection (10, 50, 100, 500, 1000)

## Notes importantes

1. **Gestion des erreurs** : Les méthodes du service d'achievements ne lancent pas d'exceptions si un achievement n'existe pas. Elles retournent simplement `null`.

2. **Retours** : Les méthodes retournent soit un `UserAchievement` débloqué, soit un tableau de `UserAchievement[]`, soit `null` si aucun achievement n'est débloqué.

3. **Performance** : Les appels aux achievements sont asynchrones mais peuvent être appelés en "fire and forget" si vous ne souhaitez pas notifier l'utilisateur immédiatement :

```typescript
// Fire and forget (ne bloque pas l'exécution)
this.achievementEventsService.onDeckCreated(userId).catch(err => {
  console.error('Error triggering achievement:', err);
});

// Ou attendre la réponse pour notifier l'utilisateur
const unlockedAchievements = await this.achievementEventsService.onDeckCreated(userId);
if (unlockedAchievements.length > 0) {
  // Notifier l'utilisateur
}
```

4. **Notifications** : Pour implémenter les notifications en temps réel, vous pouvez utiliser WebSockets ou un système de notifications push. Le champ `isNotified` dans `UserAchievement` permet de suivre si l'utilisateur a été notifié.

## Prochaines étapes

1. Importer `AchievementModule` dans chaque module concerné (UserModule, DeckModule, TournamentModule, etc.)
2. Injecter `AchievementEventsService` dans les services appropriés
3. Appeler les méthodes d'événements aux endroits stratégiques du code
4. Tester que les achievements se débloquent correctement
5. Implémenter les notifications en temps réel (optionnel)


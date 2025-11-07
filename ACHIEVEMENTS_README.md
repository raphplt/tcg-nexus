# Système d'Achievements - Guide complet

## 🎯 Vue d'ensemble

Le système d'achievements a été entièrement implémenté pour gamifier l'expérience utilisateur. Les utilisateurs peuvent débloquer des badges en effectuant diverses actions sur la plateforme.

## 📦 Installation

### Backend

Aucune dépendance supplémentaire n'est nécessaire pour le backend, tout est déjà configuré.

### Frontend  

Installer la dépendance manquante pour le composant Progress :

```bash
cd apps/web
npm install @radix-ui/react-progress
```

## 🚀 Démarrage

### 1. Lancer la base de données

Assurez-vous que PostgreSQL est en cours d'exécution et que la base de données est configurée.

### 2. Seed des achievements

Une fois l'application lancée, créez les achievements de base :

```bash
# Via l'API (avec curl ou Postman)
POST http://localhost:3000/seed/achievements
```

Ou via le seed complet :

```bash
POST http://localhost:3000/seed/all
```

### 3. Intégration dans le layout

Pour afficher les notifications d'achievements, ajoutez le provider dans le layout principal :

```tsx
// apps/web/app/layout.tsx
import { AchievementNotificationProvider } from '@/components/Achievement';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AchievementNotificationProvider>
          {children}
        </AchievementNotificationProvider>
      </body>
    </html>
  );
}
```

## 📝 Achievements disponibles

### 👤 Compte (Account)
- **Bienvenue !** (10 pts) - Créer un compte
- **Profil complet** (25 pts) - Compléter son profil

### 🏪 Marketplace
- **Premier achat** (50 pts) - Acheter sa première carte
- **Premier vendeur** (50 pts) - Mettre une carte en vente
- **Première vente** (75 pts) - Réaliser sa première vente
- **Acheteur régulier** (100 pts) - Acheter 10 cartes
- **Collectionneur passionné** (250 pts) - Acheter 50 cartes
- **Acheteur expert** (500 pts) - Acheter 100 cartes
- **Vendeur confirmé** (150 pts) - Vendre 10 cartes
- **Vendeur professionnel** (400 pts) - Vendre 50 cartes
- **Maître marchand** (750 pts) - Vendre 100 cartes

### 🎴 Decks
- **Stratège débutant** (50 pts) - Créer son premier deck
- **Constructeur de decks** (100 pts) - Créer 5 decks
- **Architecte stratégique** (200 pts) - Créer 10 decks
- **Maître deck builder** (500 pts) - Créer 25 decks

### 🏆 Tournois
- **Premier tournoi** (75 pts) - Participer à son premier tournoi
- **Première victoire** (200 pts) - Remporter son premier tournoi
- **Compétiteur régulier** (150 pts) - Participer à 5 tournois
- **Vétéran des tournois** (300 pts) - Participer à 10 tournois
- **Compétiteur acharné** (600 pts) - Participer à 25 tournois
- **Triple champion** (400 pts) - Remporter 3 tournois
- **Champion confirmé** (750 pts) - Remporter 5 tournois
- **Légende vivante** (1500 pts) - Remporter 10 tournois

### ⚔️ Matchs
- **Première victoire en match** (25 pts) - Gagner son premier match
- **Joueur confirmé** (100 pts) - Gagner 10 matchs
- **Joueur expérimenté** (300 pts) - Gagner 50 matchs
- **Maître du combat** (750 pts) - Gagner 100 matchs

### 📚 Collection
- **Collectionneur débutant** (50 pts) - Posséder 10 cartes
- **Collectionneur intermédiaire** (150 pts) - Posséder 50 cartes
- **Collectionneur avancé** (300 pts) - Posséder 100 cartes
- **Collectionneur expert** (1000 pts) - Posséder 500 cartes
- **Maître collectionneur** (2500 pts) - Posséder 1000 cartes

## 🔧 Intégration dans les services

Pour que les achievements se déclenchent automatiquement, il faut intégrer `AchievementEventsService` dans les différents modules du backend.

### Exemple : Deck Service

```typescript
// apps/api/src/deck/deck.module.ts
import { AchievementModule } from 'src/achievement/achievement.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Deck]),
    AchievementModule // Importer le module
  ],
  // ...
})
export class DeckModule {}
```

```typescript
// apps/api/src/deck/deck.service.ts
import { AchievementEventsService } from 'src/achievement/achievement-events.service';

@Injectable()
export class DeckService {
  constructor(
    @InjectRepository(Deck)
    private deckRepository: Repository<Deck>,
    private achievementEventsService: AchievementEventsService // Injecter le service
  ) {}

  async create(userId: number, createDeckDto: CreateDeckDto): Promise<Deck> {
    const deck = await this.deckRepository.save(/* ... */);
    
    // Déclencher les achievements
    await this.achievementEventsService.onDeckCreated(userId);
    
    return deck;
  }
}
```

### Modules à intégrer

Consultez le fichier `apps/api/src/achievement/INTEGRATION.md` pour des exemples détaillés d'intégration dans :
- ✅ UserModule (déjà fait)
- ⏳ DeckModule
- ⏳ TournamentModule
- ⏳ MatchModule
- ⏳ MarketplaceModule
- ⏳ CollectionModule

## 🎨 Frontend

### Page des achievements

Accessible via : `http://localhost:3000/profile/achievements`

La page affiche :
- Statistiques globales (total, débloqués, progression, points)
- Filtres par catégorie
- Grille d'achievements avec :
  - Icône animée
  - Nom et description
  - Points gagnés
  - Barre de progression (pour les non-débloqués)
  - Date de déblocage

### Notifications

Les notifications apparaissent automatiquement en haut à droite de l'écran quand un achievement est débloqué :
- Animation d'entrée fluide
- Effet de brillance
- Confetti
- Auto-fermeture après 5 secondes
- Barre de progression pour l'auto-close

### Hook personnalisé (optionnel)

Vous pouvez créer un hook pour faciliter l'utilisation des achievements :

```tsx
// apps/web/hooks/useAchievements.ts
import { useQuery } from '@tanstack/react-query';
import { getUserAchievements, getUserAchievementStats } from '@/services/achievement.service';

export function useAchievements(userId: number | undefined) {
  const { data: achievements, isLoading } = useQuery({
    queryKey: ['achievements', userId],
    queryFn: () => getUserAchievements(userId!),
    enabled: !!userId
  });

  const { data: stats } = useQuery({
    queryKey: ['achievement-stats', userId],
    queryFn: () => getUserAchievementStats(userId!),
    enabled: !!userId
  });

  return { achievements, stats, isLoading };
}
```

## 📊 Endpoints API

### Publics / Authentifiés

- `GET /achievements` - Liste tous les achievements
- `GET /achievements/:id` - Récupère un achievement
- `GET /achievements/user/:userId` - Achievements d'un utilisateur avec progression
- `GET /achievements/user/:userId/unlocked` - Achievements débloqués uniquement
- `GET /achievements/user/:userId/stats` - Statistiques globales
- `GET /achievements/me/unnotified` - Achievements non notifiés (authentifié)
- `POST /achievements/user-achievement/:id/notify` - Marquer comme notifié

### Admin uniquement

- `POST /achievements` - Créer un achievement
- `PUT /achievements/:id` - Mettre à jour un achievement
- `DELETE /achievements/:id` - Supprimer un achievement

## 🧪 Tests

### Tester le déblocage d'un achievement

1. Créer un compte → Achievement "Bienvenue !" débloqué
2. Créer un deck → Achievement "Stratège débutant" débloqué
3. Etc.

### Vérifier les notifications

Les notifications s'affichent automatiquement si le `AchievementNotificationProvider` est configuré dans le layout.

## 🎯 Prochaines améliorations possibles

1. **WebSocket pour les notifications en temps réel** : Actuellement, les notifications sont vérifiées toutes les 30 secondes. On pourrait utiliser Socket.io pour une notification instantanée.

2. **Classement des joueurs** : Ajouter une page de leaderboard basée sur les points d'achievements.

3. **Achievements secrets** : Implémenter des achievements cachés avec des conditions spéciales.

4. **Achievements temporaires** : Achievements disponibles uniquement pendant certaines périodes (événements spéciaux).

5. **Récompenses** : Associer des récompenses concrètes aux achievements (cartes gratuites, boosters, etc.).

6. **Partage social** : Permettre de partager ses achievements sur les réseaux sociaux.

7. **Achievements de série** : Débloquer un achievement spécial en complétant une série d'achievements.

## 📁 Structure des fichiers

### Backend

```
apps/api/src/achievement/
├── entities/
│   ├── achievement.entity.ts
│   └── user-achievement.entity.ts
├── dto/
│   ├── create-achievement.dto.ts
│   ├── update-achievement.dto.ts
│   └── user-achievement-response.dto.ts
├── achievement.service.ts
├── achievement-events.service.ts
├── achievement.controller.ts
├── achievement.module.ts
└── INTEGRATION.md
```

### Frontend

```
apps/web/
├── types/
│   └── achievement.ts
├── services/
│   └── achievement.service.ts
├── components/
│   └── Achievement/
│       ├── AchievementUnlocked.tsx
│       ├── AchievementNotificationProvider.tsx
│       └── index.ts
└── app/
    └── profile/
        └── achievements/
            └── page.tsx
```

## 🤝 Contribution

Pour ajouter de nouveaux achievements :

1. Ajouter le type dans `AchievementType` (backend et frontend)
2. Ajouter la catégorie si nécessaire dans `AchievementCategory`
3. Ajouter les seeds dans `seed.service.ts`
4. Créer la méthode de déclenchement dans `achievement-events.service.ts`
5. Intégrer dans le service approprié
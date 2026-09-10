---
title: Vue d'ensemble de l'API NestJS
---

L'API de **TCG Nexus** (`apps/api`) constitue le cœur logique et métier de la plateforme. Elle expose l'ensemble des services REST et WebSocket aux clients Web et Mobile.

---

## 1. Stack technique & Principes directeurs

- **NestJS 11** : framework modulaire TypeScript avec injection de dépendances robuste.
- **PostgreSQL & TypeORM** : persistance relationnelle avec support de l'extension vectorielle **`pgvector`** pour les similarités de decks.
- **Sécurité & Authentification** : double token JWT (access token court + refresh token avec rotation sécurisée en cookies httpOnly SameSite).
- **Validation stricte** : `ValidationPipe` global avec rejet des champs non déclarés (`whitelist: true`, `forbidNonWhitelisted: true`) et transformation automatique des types (`class-transformer`).
- **Gestion d'erreurs normalisée** : filtre d'exception global (`AllExceptionsFilter`) assurant un format d'erreur homogène et prévisible pour tous les clients.
- **Documentation OpenAPI / Swagger** : décorateurs Swagger sur l'ensemble des contrôleurs, interface accessible sur `/api/docs` (et activable en production via `SWAGGER_ENABLED=true`).
- **Passerelles temps réel** : serveurs WebSocket Socket.IO pour les tournois, matches, mini-jeux et notifications en direct.

---

## 2. Configuration d'environnement (`apps/api/.env`)

Variables essentielles au fonctionnement de l'API :

```dotenv
# Base de données PostgreSQL
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=tcg_nexus
DATABASE_MIGRATIONS_RUN=false   # true en production pour exécuter les migrations au boot

# Sécurité & Tokens JWT
JWT_SECRET=votre-cle-secrete-jwt
JWT_REFRESH_SECRET=votre-cle-secrete-refresh
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PORT=3001
NODE_ENV=development

# Swagger en production
SWAGGER_ENABLED=true

# Intégrations optionnelles
FRONTEND_URL=http://localhost:3000
VISION_SERVICE_URL=http://localhost:8000
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 3. Découpage modulaire du Backend

L'API est organisée en modules fonctionnels indépendants :

| Module | Documentation dédiée | Description |
|---|---|---|
| **Authentification** | [Authentification](./auth) | Inscription, connexion, rotation des refresh tokens et cookies sécurisés. |
| **Utilisateurs & Joueurs** | [Utilisateurs](./users) | Comptes, profils `Player`, score ELO, XP et niveaux. |
| **Catalogue Pokémon** | [Cartes Pokémon](./cards) | Cartes, séries, sets, produits scellés et synchronisation TCGdex. |
| **Decks** | [Decks](./decks) | Construction, légalité, bibliothèque, import/export et partage. |
| **Collections & Inventaire** | [Collections](./collections) | Inventaire de cartes et scellé, états d'usure, export/import CSV avec annulation compensatoire. |
| **Marketplace & Grand Livre** | [Marketplace & Paiements](./marketplace) | Annonces, commandes, verrous pessimistes, Stripe, ledger vendeur et mouvements d'inventaire. |
| **Tournois** | [Tournois](./tournaments) | Rondes suisses, arbres à élimination, horloge de round, vérification de légalité TRN-02 et départages officiels TRN-04. |
| **Parties en ligne & Moteur** | [Parties en ligne](./matches) | Moteur de jeu de cartes déterministe (`GameEngine.ts`), matches casual et entraînement contre IA. |
| **Module IA & Deck Insights** | [Module IA](./ai) | Rôles de cartes, scoring multi-dimensionnel et similarité d'archétypes `pgvector`. |
| **Mini-jeux** | [Mini-jeux](./mini-games) | Le Juste Prix et Case Opening (boosters), modes solo/local REST et duels multijoueurs WebSocket. |
| **Notifications** | [Notifications](./notifications) | Notifications multi-canal (in-app, push Expo, mails transactionnels). |
| **Traductions** | [Traductions](./translations) | Internationalisation i18n, gestion des dictionnaires et interception automatique du catalogue. |
| **Gamification & Réseau Social** | [Gamification & Social](./social-gamification) | Badges, défis, abonnements entre membres, fil d'actualité et classement mondial. |
| **Support & Infrastructure** | [Support & Contenu](./support-editorial) | Tickets d'assistance, blog, FAQ, stockage Cloudflare R2, messagerie et modèle Outbox. |

---

## 4. Pattern Outbox & Événements de domaine

Pour garantir l'intégrité des opérations distribuées (par exemple, confirmer une commande et émettre la notification sans risque d'incohérence en cas de crash réseau), l'API s'appuie sur le pattern **Transactional Outbox** :

1. Les événements métier sont définis de manière centralisée dans `src/common/events/domain-events.ts` ;
2. Tout événement est inséré dans la table `outbox_message` au sein de la **même transaction PostgreSQL** que la modification d'état métier ;
3. Un dispatcher périodique sécurisé par un verrou consultatif PostgreSQL (`tcg-nexus:outbox-dispatcher`) dépile les messages non traités ;
4. Chaque consommateur (`EventConsumerService`) enregistre son exécution dans `processed_event` pour assurer un traitement strictement idempotent (`runOnce`).

---

## 5. Commandes de développement & Tests

```bash
cd apps/api

# Lancer la base PostgreSQL avec pgvector et Vision en local
npm run docker:db

# Démarrer le serveur NestJS en mode développement (watch)
npm run start:dev

# Exécuter les tests unitaires et d'intégration
npm run test
npm run test:cov

# Lancer la suite de tests E2E avec PostgreSQL éphémère
npm run test:e2e:tournament

# Peupler la base avec les données de démonstration
npm run seed
```

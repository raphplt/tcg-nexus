# Fiche de progression – RUN 4 (2025-11-12)

## 1. Contexte

- Numéro et date du RUN : 4 – 2025-11-12
- Objectifs globaux du RUN :
  - Refonte **complète du Marketplace** avec nouvelles pages et features avancées.
  - Implémenter un **système de panier** avec gestion des commandes.
  - Finaliser la gestion des **Decks** avec pages dédiées (liste, détail, création, édition).
  - Améliorer la **Collection** avec gestion des favoris et wishlist.
  - Ajouter un **système de tracking et analytics** pour les cartes (vues, recherches, favoris, ajouts panier).
  - Implémenter des **métriques de popularité et tendances** pour les cartes.

## 2. Bilan du RUN précédent

- Objectifs visés lors du RUN 3 :
  - Améliorer l'expérience utilisateur avec la section Collection et les Decks.
  - Finaliser les fonctionnalités Tournaments (inscription, participants, contrôles d'accès).
  - Renforcer la sécurité et les contrôles d'ownership sur l'API.
  - Améliorer l'UX globale avec une barre de recherche fonctionnelle et un profil enrichi.
- Objectifs **atteints** :
  - Collection avec listing + filtres + wishlist ✅
  - Tournaments avec inscription et gestion des participants ✅
  - Sécurité renforcée avec guards et contrôles d'ownership ✅
  - Barre de recherche globale fonctionnelle ✅
  - Marketplace basique avec listing et filtres ✅
- Objectifs **partiellement atteints** :
  - Gestion des Decks (API complète, UI de base à améliorer) ❗
- Objectifs **non atteints** :
  - Tests unitaires (reportés)
  - Analyse de deck (AI/recommandations)

## 3. Avancement des User Stories

| User Story                                                                      | Statut   | Commentaires                                                                                                                                            |
| ------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Parcourir les cartes en vente (Marketplace)**                                 | **Done** | Refonte totale : page d'accueil, catalogue avec filtres avancés, détail de carte avec stats et graphiques, profil vendeur. Navigation avec breadcrumbs. |
| **Consulter les statistiques d'une carte**                                      | **Done** | Page de détail avec prix min/max/moyen, historique des prix (graphique), nombre de listings, filtres par devise et état.                                |
| **Ajouter une carte au panier**                                                 | **Done** | Bouton "Ajouter au panier" implémenté avec tracking d'événements. Entités `Order` et `OrderItem` créées pour la gestion des commandes.                  |
| **Consulter le profil d'un vendeur**                                            | **Done** | Page `/marketplace/sellers/:id` avec statistiques détaillées, note moyenne, nombre de ventes, listings actifs, et informations du vendeur.              |
| **Gérer mes decks**                                                             | **Done** | Page "Mes decks" avec liste paginée, filtres par format et recherche. Création, édition et suppression de decks. Affichage détaillé des cartes du deck. |
| **Créer un deck** en ajoutant des cartes depuis une sélection.                  | **Done** | Formulaire complet avec sélection de cartes via modal, gestion des quantités et rôles (main/side), choix du format.                                     |
| **Éditer un deck existant**                                                     | **Done** | Page d'édition avec formulaire pré-rempli, modification des cartes, quantités et rôles.                                                                 |
| **Consulter le détail d'un deck**                                               | **Done** | Page de détail affichant toutes les cartes du deck avec images, quantités et rôles. Badge pour le format.                                               |
| **Consulter ma collection personnelle** pour suivre mes cartes.                 | **Done** | Collection avec listing, filtres, wishlist et gestion des favoris. Services d'ajout aux favoris et wishlist implémentés.                                |
| **Recevoir une recommandation de deck** basée sur mes cartes et le méta actuel. | Blocked  | Endpoint `analyzeDeck` non démarré.                                                                                                                     |
| **Créer un tournoi** (formulaire + création côté API).                          | **Done** | Création complète avec contrôle des rôles (`isPro`).                                                                                                    |
| **Rejoindre un tournoi**                                                        | **Done** | Endpoint `POST /tournaments/:id/register` + UI bouton "Rejoindre" + affichage de la liste des participants.                                             |

## 4. Problèmes & Blocages

- **Gestion complète du panier** : entités créées mais interface utilisateur du panier non finalisée.
  - Impact : les utilisateurs peuvent tracker l'ajout au panier mais ne peuvent pas encore finaliser les achats.
  - Actions : créer la page `/marketplace/cart` avec liste des items, calcul du total, et processus de checkout.
- **Paiement** : système de paiement non implémenté.
  - Impact : les commandes ne peuvent pas être finalisées et payées.
  - Actions : intégrer une solution de paiement (Stripe/PayPal) et créer les flux de paiement.
- **Analyse de deck (AI/recommandations)** : endpoint squelette non créé.
  - Impact : fonctionnalité de recommandation reportée.
  - Actions : définir la logique métier et créer un endpoint prototype au RUN 5.
- **Tests** : toujours absents malgré la complexité croissante du projet.
  - Impact : risques de régressions et bugs en production.
  - Actions : prioriser les tests unitaires et e2e pour les modules critiques (marketplace, decks, collection).

## 5. Démonstrations & Preuves

### Front-end

#### Marketplace

- `apps/web/app/marketplace/page.tsx` – **Page d'accueil du Marketplace** : sections cartes populaires, tendances, meilleurs vendeurs, sets populaires.
- `apps/web/app/marketplace/cards/page.tsx` – **Catalogue de cartes** avec filtres avancés (prix, devise, état, rareté, set, série), recherche et pagination.
- `apps/web/app/marketplace/cards/[id]/page.tsx` – **Détail d'une carte** avec statistiques de prix, historique graphique, liste des offres disponibles, filtres et bouton "Ajouter au panier".
- `apps/web/app/marketplace/sellers/[id]/page.tsx` – **Profil vendeur** avec statistiques détaillées, note moyenne, listings actifs.
- `apps/web/app/marketplace/create/page.tsx` – **Création de vente** avec formulaire complet.
- `apps/web/components/Marketplace/PriceChart.tsx` – **Composant graphique** d'historique des prix avec tendances.
- `apps/web/components/Marketplace/MarketplaceBreadcrumb.tsx` – **Navigation breadcrumb** pour le marketplace.
- `apps/web/components/Marketplace/CardCard.tsx`, `SellerCard.tsx`, `SetCard.tsx` – Composants réutilisables pour l'affichage.

#### Decks

- `apps/web/app/decks/page.tsx` – **Liste publique des decks**.
- `apps/web/app/decks/me/page.tsx` – **Mes decks** avec filtres par format, recherche, tri et pagination.
- `apps/web/app/decks/[id]/page.tsx` – **Détail d'un deck** avec affichage des cartes, quantités et rôles.
- `apps/web/app/decks/create/page.tsx` – **Création de deck** avec formulaire et sélection de cartes.
- `apps/web/app/decks/[id]/update/page.tsx` – **Édition de deck** avec formulaire pré-rempli.
- `apps/web/app/decks/_components/cardSelector.tsx` – **Modal de sélection de cartes**.
- `apps/web/app/decks/_components/DecksFilters.tsx` – Filtres pour les decks.
- `apps/web/app/decks/_components/DecksTable.tsx` – Tableau d'affichage des decks.
- `apps/web/app/decks/_components/DecksPagination.tsx` – Pagination des decks.

#### Collection

- `apps/web/app/collection/page.tsx` – **Ma Collection** avec listing, filtres et wishlist.
- `apps/web/components/Home/FavoritesButton.tsx` – Bouton d'ajout aux favoris.

#### Hooks & Services

- `apps/web/hooks/useMarketplace.ts` – Hooks `useMarketplaceHome()` et `useMarketplaceCards()` pour récupérer les données du marketplace.
- `apps/web/services/marketplace.service.ts` – Service complet pour les appels API marketplace.
- `apps/web/services/decks.service.ts` – Service pour la gestion des decks.
- `apps/web/services/collection.service.ts` – Service pour la gestion de la collection.
- `apps/web/services/card-event-tracker.service.ts` – Service de tracking des événements de cartes (vues, favoris, ajout au panier).

### Back-end

#### Marketplace - Entités

- `apps/api/src/marketplace/entities/order.entity.ts` – Entité **Order** pour les commandes avec statuts (Pending, Paid, Shipped, Cancelled, Refunded).
- `apps/api/src/marketplace/entities/order-item.entity.ts` – Entité **OrderItem** pour les items d'une commande.
- `apps/api/src/marketplace/entities/payment-transaction.entity.ts` – Entité **PaymentTransaction** pour les transactions de paiement.
- `apps/api/src/marketplace/entities/card-event.entity.ts` – Entité **CardEvent** pour tracker les événements des cartes (view, search, favorite, add_to_cart, sale).
- `apps/api/src/marketplace/entities/card-popularity-metrics.entity.ts` – Entité **CardPopularityMetrics** pour stocker les métriques agrégées (popularité, tendances).
- `apps/api/src/marketplace/entities/price-history.entity.ts` – Entité **PriceHistory** pour l'historique des prix des cartes.

#### Marketplace - Services & Controllers

- `apps/api/src/marketplace/marketplace.service.ts` – Service marketplace avec méthodes :
  - `getCardStatistics()` : statistiques de prix d'une carte (min/max/avg, historique)
  - `getPopularCards()` : cartes les plus populaires
  - `getBestSellers()` : meilleurs vendeurs
  - `getSellerStatistics()` : statistiques détaillées d'un vendeur
  - `getCardsWithMarketplaceData()` : catalogue de cartes avec données marketplace
- `apps/api/src/marketplace/card-popularity.service.ts` – Service de gestion de la popularité avec :
  - `recordEvent()` : enregistrement des événements de cartes
  - `aggregateDailyMetrics()` : agrégation des métriques journalières
  - `getPopularCards()` : récupération des cartes populaires avec scores
  - `getTrendingCards()` : récupération des cartes en tendance
- `apps/api/src/marketplace/card-popularity.controller.ts` – Controller pour :
  - `POST /marketplace/events` : enregistrer un événement
  - `GET /marketplace/popular` : récupérer les cartes populaires
  - `GET /marketplace/trending` : récupérer les cartes en tendance
- `apps/api/src/marketplace/marketplace.controller.ts` – Controller marketplace avec :
  - `GET /marketplace/cards/:id/stats` : statistiques d'une carte
  - `GET /marketplace/best-sellers` : meilleurs vendeurs
  - `GET /marketplace/cards` : catalogue de cartes avec marketplace data
- `apps/api/src/marketplace/card-popularity.scheduler.ts` – Scheduler pour l'agrégation automatique des métriques.

#### Decks

- `apps/api/src/deck/entities/deck.entity.ts` – Entité **Deck**.
- `apps/api/src/deck-card/entities/deck-card.entity.ts` – Entité **DeckCard** pour les cartes d'un deck.
- `apps/api/src/deck/deck.service.ts` – Service complet pour la gestion des decks avec contrôles d'ownership.
- `apps/api/src/deck/deck.controller.ts` – Controller avec endpoints CRUD pour les decks.

#### Collection

- `apps/api/src/collection/entities/collection.entity.ts` – Entité **Collection**.
- `apps/api/src/collection-item/entities/collection-item.entity.ts` – Entité **CollectionItem** avec gestion des quantités.
- `apps/api/src/collection-item/collection-item.service.ts` – Service avec méthodes :
  - `addToWishlist()` : ajout à la wishlist
  - `addToFavorites()` : ajout aux favoris
  - `addToCollection()` : ajout d'une carte à la collection
- `apps/api/src/collection-item/collection-item.controller.ts` – Controller pour la gestion des items de collection.

#### Types & DTOs

- `apps/api/src/marketplace/dto/card-popularity.dto.ts` – DTOs pour les événements et requêtes de popularité.
- `apps/web/types/listing.ts` – Types TypeScript pour les listings.
- `apps/web/types/Decks.ts` – Types TypeScript pour les decks.
- `apps/web/types/collection.ts` – Types TypeScript pour la collection.

## 6. Plan d'action pour le prochain RUN

### Marketplace & Panier

- Créer la page **`/marketplace/cart`** avec :
  - Liste des items du panier
  - Calcul du total par devise
  - Boutons pour modifier les quantités et supprimer des items
  - Bouton "Finaliser la commande"
- Implémenter le **processus de checkout** :
  - Page de validation de la commande avec récapitulatif
  - Formulaire d'adresse de livraison
  - Choix du mode de paiement
- Intégrer une **solution de paiement** (Stripe ou PayPal) :
  - Création des endpoints de paiement côté API
  - Gestion des webhooks pour les confirmations de paiement
  - Mise à jour du statut des commandes

### Analyse de Deck & Recommandations

- Créer l'endpoint **`POST /decks/:id/analyze`** :
  - Analyse de la composition du deck
  - Suggestions de cartes basées sur le format et le méta
  - Détection des synergies entre cartes
- Ajouter un **bouton "Analyser mon deck"** sur la page de détail du deck
- Implémenter une page **`/decks/:id/analysis`** pour afficher les résultats de l'analyse

### Qualité & Tests

- Mettre en place des **tests unitaires** pour :
  - `MarketplaceService` (statistiques, popularité)
  - `DeckService` (création, édition, validation)
  - `CollectionService` (ajout, suppression, wishlist)
- Créer des **tests e2e** pour les parcours utilisateurs critiques :
  - Parcours marketplace : recherche → détail carte → ajout panier → checkout
  - Parcours deck : création → édition → consultation
  - Parcours collection : ajout carte → wishlist → favoris
- Ajouter un **monitoring des performances** pour les endpoints les plus utilisés

### UX & Améliorations

- Améliorer les **notifications** utilisateur :
  - Toast de confirmation après ajout au panier
  - Notifications pour les événements importants (vente réussie, deck publié, etc.)
- Ajouter des **animations** pour améliorer l'expérience :
  - Transitions entre pages
  - Animations d'ajout au panier
  - Loading states plus fluides
- Implémenter un **système de favoris** pour les decks publics
- Ajouter la possibilité de **commenter et noter** les decks publics

### Sécurité & Performance

- Optimiser les **requêtes de popularité** :
  - Mise en cache des cartes populaires/tendances
  - Optimisation des index en base de données
- Renforcer la **validation** des données :
  - Validation stricte des quantités dans le panier
  - Vérification de la disponibilité des stocks avant checkout
- Ajouter des **rate limits** sur les endpoints sensibles :
  - Création de ventes
  - Enregistrement d'événements
  - Recherche de cartes

### Responsables

- **Marketplace & Panier** : `@raphplt` (API + UI) / `@soldrix` (UI)
- **Paiement** : `@raphplt` (API + intégration) / `@Jounayd` (tests)
- **Analyse de Deck** : `@raphplt` (endpoint) / `@aymardl` (UI)
- **Tests & Qualité** : `@Jounayd` (tests unitaires + e2e) / `@raphplt` (monitoring)
- **UX & Animations** : `@soldrix` (UI) / `@aymardl` (animations)

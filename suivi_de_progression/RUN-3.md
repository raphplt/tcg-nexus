# Fiche de progression – RUN 3 (2025-10-01)

## 1. Contexte

- Numéro et date du RUN : 3 – 2025-10-01
- Objectifs globaux du RUN :
  - Améliorer l'expérience utilisateur avec la **section Collection** et les **Decks**.
  - Finaliser les fonctionnalités **Tournaments** (inscription, participants, contrôles d'accès).
  - Renforcer la **sécurité** et les **contrôles d'ownership** sur l'API.
  - Améliorer l'**UX globale** avec une barre de recherche fonctionnelle et un profil enrichi.

## 2. Bilan du RUN précédent

- Objectifs visés lors du RUN 2 :
  - Démarrer **Marketplace** (consultation des ventes) et **Tournaments** (listing + création).
  - Poser les **entités** back (`Listing`, `Tournament`) et les pages front associées.
  - Améliorer l'**authentification** et introduire les **rôles** (`pro`, `customer`).
- Objectifs **atteints** :
  - Page Marketplace avec listing et filtres ✅
  - Création de tournois ✅
  - Bouton "Rejoindre" un tournoi ✅ 
  - Authentification avec rôles `pro`/`customer` ✅
  - Section Collection (listing + filtres + wishlist) ✅
- Objectifs **partiellement atteints** :
  - Contrôles de sécurité (améliorés mais peuvent être renforcés) ❗
  - Gestion des Decks (API complète, UI à finaliser) ❗
- Objectifs **non atteints** :
  - Tests unitaires (reportés)
  - Analyse de deck (AI/recommandations)

## 3. Avancement des User Stories

| User Story                                                                      | Statut      | Commentaires                                                                                                             |
| ------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Consulter les tournois listés** afin de choisir celui qui m'intéresse.        | **Done**    | Listing avec filtres + bouton "Rejoindre" + affichage des participants implémentés.                                      |
| **Créer un deck** en ajoutant des cartes depuis ma collection.                  | In Progress | Entités `Deck` et `DeckCard` créées ; endpoints API fonctionnels ; page frontend non démarrée.                           |
| **Mettre en vente une carte** avec un prix fixé.                                | **Done**    | Formulaire de création + section "Mes ventes" dans le profil avec gestion (édition/suppression/activation).              |
| **Consulter ma collection personnelle** pour suivre mes cartes.                 | **Done**    | Page frontend et API créées ; listing + filtres + wishlist implémentés.                                                   |
| **Recevoir une recommandation de deck** basée sur mes cartes et le méta actuel. | Blocked     | Endpoint `analyzeDeck` non démarré.                                                                                      |
| **Parcourir les cartes en vente (Marketplace)**                                 | **Done**    | Listing avec filtres, tri et pagination.                                                                                  |
| **Créer un tournoi** (formulaire + création côté API).                          | **Done**    | Création complète avec contrôle des rôles (`isPro`).                                                                      |
| **Rejoindre un tournoi**                                                        | **Done**    | Endpoint `POST /tournaments/:id/register` + UI bouton "Rejoindre" + affichage de la liste des participants.              |

## 4. Problèmes & Blocages

- **Decks incomplets** : entités créées côté API mais pages frontend pas finalisées.
  - Impact : fonctionnalité de gestion de decks non accessible aux utilisateurs finaux.
  - Actions : prioriser la création de la page `My Decks` au RUN 4.
- **Tests manuels de tournois** : pas de scénario de test complet exécuté.
  - Impact : risques de bugs en production lors de l'inscription/gestion de tournois.
  - Actions : créer un plan de test manuel et l'exécuter sur un tournoi de bout en bout.
- **Analyse de deck (AI/recommandations)** : endpoint squelette non créé.
  - Impact : fonctionnalité de recommandation reportée.
  - Actions : définir la logique métier et créer un endpoint prototype au RUN 4.

## 5. Démonstrations & Preuves

- **Front** :
  - `apps/web/app/collection/page.tsx` – Page **"My Collection"** avec listing, filtres et wishlist.
  - `apps/web/app/(protected)/profile/_components/MainProfile.tsx` – Section **"Mes ventes"** avec recherche, filtres et actions (éditer/supprimer/activer-désactiver).
  - `apps/web/app/(protected)/profile/_components/MainProfile.tsx` (lignes 494-853) – Section **"Mes tournois"** (données mockées).
  - `apps/web/components/Layout/SearchBar.tsx` – **Barre de recherche globale** fonctionnelle avec raccourcis clavier (Ctrl+K, /).
  - `apps/web/app/tournaments/[id]/page.tsx` (lignes 380-430) – **Liste des participants** d'un tournoi.
  - `apps/web/app/tournaments/_components/TournamentsTable.tsx` (lignes 69-80) – Fonction **`register`** pour rejoindre un tournoi.
- **Back** :
  - `apps/api/src/collection/entities/collection.entity.ts` – Entité **Collection**.
  - `apps/api/src/deck/entities/deck.entity.ts` – Entité **Deck**.
  - `apps/api/src/deck-card/entities/deck-card.entity.ts` – Entité **DeckCard**.
  - `apps/api/src/tournament/tournament.controller.ts` (lignes 98-112) – Endpoint **`POST /tournaments/:id/register`**.
  - `apps/api/src/tournament/tournament.service.ts` (lignes 275-354) – Logique métier pour l'inscription à un tournoi.
- **Sécurité & Guards** :
  - `apps/api/src/auth/guards/roles.guard.ts` – **RolesGuard** pour contrôler l'accès par rôles.
  - `apps/api/src/tournament/guards/tournament-organizer.guard.ts` – **TournamentOrganizerGuard** pour vérifier les droits d'organisateur.
  - `apps/api/src/tournament/guards/tournament-owner.guard.ts` – **TournamentOwnerGuard** pour vérifier la propriété d'un tournoi.
  - `apps/api/src/tournament/guards/tournament-participant.guard.ts` – **TournamentParticipantGuard** pour vérifier l'inscription d'un joueur.
  - `apps/api/src/deck/deck.service.ts` (lignes 88-102, 104-114) – Vérifications d'**ownership** sur les decks (update/delete).
- **Search** :
  - `apps/web/services/search.service.ts` – Service de **recherche globale** avec suggestions.
  - `apps/api/src/search/search.controller.ts` – Endpoints de recherche côté API.
- **Seed Service** :
  - `apps/api/src/seed/seed.service.ts` – Service de seed **amélioré** pour les données de test (users, tournaments, decks, listings).

## 6. Plan d'action pour le prochain RUN

- **Decks** :
  - Créer la page **`My Decks`** (liste + création/édition + stats).
  - Implémenter le formulaire de création/édition de deck avec sélection de cartes.
- **Analyse de deck** :
  - Créer l'endpoint **`analyzeDeck`** (squelette) pour retourner des suggestions basiques.
  - Ajouter un CTA **"Analyser mon deck"** sur la page de détail d'un deck.
- **Tests** :
  - Créer et exécuter un **plan de test manuel** complet pour les tournois (création, inscription, gestion des participants, lancement).
  - Ajouter des **tests unitaires** pour les services critiques (`DeckService`, `CollectionService`, `TournamentService`).
- **UX** :
  - Remplacer les données mockées de "Mes tournois" par des **données réelles** issues de l'API.
  - Améliorer les **skeletons** et états de chargement sur la page Decks.
- **Responsables** :
  - Decks : `@raphplt` (API) / `@soldrix` (UI)
  - Tests & qualité : `@Jounayd` (tests manuels + unitaires)
  - Analyse de deck : `@raphplt` (endpoint prototype)
  - Collection & Wishlist : `@raphplt` (API + UI) / `@aymardl` (UI)


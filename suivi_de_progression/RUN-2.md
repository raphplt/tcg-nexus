# Fiche de progression – RUN 2 (2025-07-31)

## 1. Contexte

- Numéro et date du RUN : 2 – 2025-07-31
- Objectifs globaux du RUN :
  - Démarrer **Marketplace** (consultation des ventes) et **Tournaments** (listing + création).
  - Poser les **entités** back (`Listing`, `Tournament`) et les pages front associées.
  - Améliorer l’**authentification** et introduire les **rôles** (`pro`, `customer`).

## 2. Bilan du RUN précédent

- Objectifs visés lors du RUN 1 :
  - Initialiser la structure du monorepo (TurboRepo).
  - Mettre en place un microservice `apps/fetch` récupérant toutes les cartes Pokémon existantes.
  - Créer les bases de l’API NestJS : modèles et routes CRUD pour `cards`, `sets`, `extensions`.
  - Débuter le front-end Next.js : page d’accueil (carte aléatoire), recherche basique et routing.
- Objectifs **atteints** :
  - Monorepo opérationnel + microservice `fetch` ✅
  - API `cards`/`sets`/`extensions` (CRUD) ✅
  - Page d’accueil (carte aléatoire), recherche et routing basique ✅
- Objectifs **partiellement atteints** :
  - Page _tournaments_ initialisée mais sans logique de _join_ ❗
- Objectifs **non atteints** :
  - Auth avancée (roles/guards), Decks, Collection, Recommandations – reportés volontairement au RUN 2/3.

## 3. Avancement des User Stories

| User Story                                                                      | Statut      | Commentaires                                                                                                             |
| ------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Consulter les tournois listés** afin de choisir celui qui m'intéresse.        | In Progress | `apps/web/app/tournaments/page.tsx` : tableau + filtres ; bouton « Rejoindre » manquant (`PATCH /tournaments/:id/join`). |
| **Créer un compte via email/mot de passe** pour accéder aux fonctionnalités.    | In Progress | Auth améliorée (`rememberMe`) ; introduction des rôles `pro`/`customer` ; sécurisation par rôle à terminer côté API.     |
| **Créer un deck** en ajoutant des cartes depuis ma collection.                  | Blocked     | Entité `Deck` non priorisée sur ce RUN.                                                                                  |
| **Mettre en vente une carte** avec un prix fixé.                                | In Progress | Entité **`Listing`** définie ; formulaire `apps/web/app/marketplace/create/page.tsx` ; contrôle des droits fonctionnel.  |
| **Consulter ma collection personnelle** pour suivre mes cartes.                 | Blocked     | Non démarré.                                                                                                             |
| **Recevoir une recommandation de deck** basée sur mes cartes et le méta actuel. | Blocked     | Non démarré.                                                                                                             |
| **Parcourir les cartes en vente (Marketplace)**                                 | **Done**    | `apps/web/app/marketplace/page.tsx` : listing avec filtres et pagination.                                                |
| **Créer un tournoi** (formulaire + création côté API).                          | **Done**    | `apps/web/app/tournaments/create/page.tsx` ; entité **`Tournament`** créée.                                              |

## 4. Problèmes & Blocages

- **Droits & sécurité** : contrôle des rôles/ownership absent sur création de ventes et gestion tournois.
  - Impact : risque d’actions non autorisées ; bloque l’ouverture publique.
  - Actions : `@Roles('pro')` + `RolesGuard`, vérif ownership (`@CurrentUser()`), tests e2e minimal.
- **Tests manquants** (services NestJS).
  - Impact : régressions possibles ; confiance limitée pour merges.
  - Actions : tests unitaires ciblant services `listing` et `tournament` (objectif ≥ 60 % de couverture).
- **UX de chargement** : composants skeleton manquants.
  - Impact : ressenti de lenteur sur marketplace/tournaments.
  - Actions : skeletons sur pages de liste + lazy states.

## 5. Démonstrations & Preuves

- **Front** :
  - `apps/web/app/marketplace/page.tsx` – liste des ventes (capture : `docs/screens/run-2/marketplace-list.png`).
  - `apps/web/app/tournaments/page.tsx` – liste des tournois (capture : `docs/screens/run-2/tournaments-list.png`).
  - `apps/web/app/tournaments/create/page.tsx` – création de tournoi (capture : `docs/screens/run-2/tournament-create.png`).
- **Back** :
  - `apps/api/src/marketplace/entities/listing.entity.ts` – entité Marketplace Listing.
  - `apps/api/src/tournament/entities/tournament.entity.ts` – entité Tournament.
- **Auth & rôles** :
  - Fichiers auth (guards/strategies) ; rôles `pro`/`customer` introduits (ex. champ `isPro` côté user).

## 6. Plan d’action pour le prochain RUN

- **Tournaments** : bouton **Rejoindre** + endpoint `PATCH /tournaments/:id/join` ; affichage des participants ; classement ELO simple.
- **Marketplace** : section **« Mes ventes »** (profil) ; vérification **rôles/droits** sur création/édition/suppression.
- **Qualité** : **tests unitaires** (services `listing`, `tournament`) ; **middleware** de log des requêtes API ; **skeletons** côté front.
- **Responsables** :
  - Tournaments : `@raphplt` (API + UI) / `@aymardl` (UI create)
  - Marketplace : `@raphplt` (API + UI) / `soldrix` (UI create)
  - Qualité et tests : `@Jounayd` (swagger, middleware, retours de l'API)

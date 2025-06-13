# Fiche de progression – RUN 1 (2025-06-13)

## 1. Contexte
- Numéro et date du RUN : 1, 2025-06-13
- Objectifs globaux du RUN : Initialiser la structure du monorepo et mettre en place les premières pages du front-end ainsi que l'API NestJS de base.

## 2. Bilan du RUN précédent
- Objectifs visés lors du RUN précédent : N/A (premier run)
- Objectifs **atteints** :
  - Mise en place du dépôt monorepo avec TurboRepo.
  - Création d'un squelette d'API NestJS et d'une application Next.js.
- Objectifs **partiellement atteints** :
  - Début d'implémentation des modules (tournaments, users, etc.) sans logique métier.
- Objectifs **non atteints** :
  - Aucune fonctionnalité complète livrée pour le moment.

## 3. Avancement des User Stories
| User Story                                                                                   | Statut      | Commentaires |
|----------------------------------------------------------------------------------------------|-------------|--------------|
| En tant qu'utilisateur, je veux consulter les tournois listés afin de choisir celui qui m'intéresse. | In Progress | Page `/tournaments` créée mais sans affichage dynamique. |
| En tant qu'utilisateur, je veux créer un compte via email et mot de passe pour accéder aux fonctionnalités. | In Progress | Module `user` présent côté API mais méthodes encore stubs. |
| En tant qu'utilisateur, je veux créer un deck en ajoutant des cartes depuis ma collection pour me préparer à jouer. | Blocked | Fonctionnalités de deck non présentes dans le dépôt actuel. |
| En tant qu'utilisateur, je veux mettre en vente une carte avec un prix fixé afin de la proposer aux autres. | Blocked | Marketplace prévu mais pas encore codé. |
| En tant qu'utilisateur, je veux consulter ma collection personnelle pour suivre mes cartes.    | Blocked | Aucune route dédiée à la collection pour l'instant. |
| En tant qu'utilisateur, je veux recevoir une recommandation de deck basée sur mes cartes et le méta actuel. | Blocked | Fonctionnalité non commencée. |

## 4. Problèmes & Blocages
- Implémentation des modules API : logique métier manquante (CRUD retournent des messages statiques) ⇒ bloquant pour la suite.
- Pas encore de base de données configurée pour persister les cartes et utilisateurs.
- L'équipe doit définir clairement les modèles de données pour poursuivre.

## 5. Démonstrations & Preuves
- `apps/web/app/tournaments/page.tsx` : page d'accueil des tournois avec titre statique.
- `apps/api/src/pokemon-card/pokemon-card.service.ts` : exemple de service NestJS commençant à interagir avec une base via TypeORM.

## 6. Plan d’action pour le prochain RUN
- Finaliser la configuration de la base de données et brancher TypeORM aux entités existantes.
- Implémenter les routes CRUD réelles pour les tournois et les utilisateurs.
- Débuter la gestion d’authentification (création de compte et connexion).
- Priorité : rendre la liste des tournois consultable depuis le front-end.
- Responsable principal : équipe back-end pour l’API, équipe front-end pour l’interface.

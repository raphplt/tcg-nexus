# ADR-001 — Monorepo Turborepo pour regrouper web, API, mobile et microservices

- **Statut** : Accepté
- **Date** : 2024
- **Auteurs** : équipe TCG Nexus

## Contexte

TCG Nexus a plusieurs surfaces applicatives distinctes :

- un front web (Next.js) destiné au grand public ;
- une API REST (NestJS) qui centralise la logique métier et l'accès à la base ;
- une application mobile (Expo) qui doit consommer la même API et partager des types ;
- un microservice d'import de données (`apps/fetch`) qui alimente la base depuis la TCGdex SDK.

Ces applications partagent des types TypeScript (ex : entités du domaine, DTOs d'API), des composants UI, et une configuration commune (ESLint/Biome, `tsconfig`).

Deux options structurelles se posaient :

1. **Plusieurs dépôts Git séparés**, liés par versioning de paquets npm publiés sur un registre privé.
2. **Un monorepo** qui regroupe tout le code et permet un partage de code direct.

## Décision

Le projet est organisé en **monorepo géré par Turborepo**, avec `npm workspaces` comme mécanisme de gestion des dépendances.

- Les applications sont dans `apps/` (`web`, `api`, `mobile`, `fetch`, `docs`).
- Les paquets partagés sont dans `packages/` (`ui`, `typescript-config`, `eslint-config`, `effect-parser`).
- Turborepo orchestre les tâches (`dev`, `build`, `lint`, `test`) avec un cache incrémental par tâche.

## Alternatives considérées

### Multi-dépôts + paquets npm privés

- **+** Isolation forte entre applications, versioning explicite.
- **−** Complexité de release : pour ajouter un champ à un type partagé il faut releaser le paquet, bump toutes les apps, résoudre les conflits de version.
- **−** Impossible à tenir pour un projet scolaire avec une petite équipe.

### Monorepo sans orchestrateur (npm workspaces seuls)

- **+** Simplicité maximale.
- **−** Aucun cache de build ; chaque commande se relance de zéro sur toutes les apps.
- **−** Pas de graphe de dépendances exploitable en CI.

### Nx ou pnpm workspaces

- Équivalents fonctionnels de Turborepo. Turborepo a été retenu pour son intégration naturelle avec Next.js / Vercel et sa courbe d'apprentissage plus douce.

## Conséquences

### Positives

- Un type ou un composant partagé modifié est immédiatement disponible dans toutes les apps, sans étape de publication.
- Les builds CI bénéficient du cache : seules les apps impactées par un diff sont rebuildées.
- Un seul flux de PR et de versionning pour l'ensemble du produit.

### Négatives / à surveiller

- Le dépôt est plus gros, les `clone` et les installations de dépendances prennent plus de temps.
- Les responsabilités entre apps doivent être explicitement documentées ; sans discipline, on peut se retrouver avec des imports croisés (`apps/web` qui importe d'`apps/api`) qui cassent la modularité. Règle : **seuls les `packages/*` sont importables depuis plusieurs apps**. Les `apps/*` ne s'importent jamais entre elles.
- Les CI doivent être configurés pour ne pas relancer des apps non impactées (c'est le rôle de Turborepo, via `turbo.json`).

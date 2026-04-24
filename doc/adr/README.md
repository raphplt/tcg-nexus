# Architecture Decision Records (ADR)

Ce dossier rassemble les décisions d'architecture qui ont orienté le projet. Chaque ADR documente **une décision**, le **contexte** dans lequel elle a été prise, les **alternatives** considérées et les **conséquences** qu'elle implique.

## Format

Chaque ADR suit la structure standard inspirée de Michael Nygard :

- **Statut** — proposé / accepté / obsolète / remplacé par ADR-XXX
- **Contexte** — ce qui a motivé la décision
- **Décision** — ce qui a été retenu
- **Conséquences** — avantages, inconvénients, implications pour la suite

## Index

| ID | Titre | Statut |
|---|---|---|
| [ADR-001](./001-monorepo-turborepo.md) | Monorepo Turborepo pour regrouper web, API, mobile et microservices | Accepté |
| [ADR-002](./002-jwt-refresh-rotation.md) | JWT access token court + refresh token rotatif avec période de grâce | Accepté |
| [ADR-003](./003-state-management.md) | Séparation server state (React Query) / client state (Zustand) / contexte (React Context) | Accepté |
| [ADR-004](./004-typeorm-synchronize.md) | Désactivation de `synchronize` TypeORM en production et passage aux migrations | Accepté |

## Convention

- Numéroter à la création (ADR-001, ADR-002, etc.).
- Un ADR accepté n'est pas modifié a posteriori : si la décision change, créer un nouvel ADR qui remplace l'ancien (et mettre l'ancien en statut « remplacé par ADR-XXX »).
- Ajouter une ligne dans l'index ci-dessus.

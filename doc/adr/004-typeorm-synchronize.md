# ADR-004 — Désactivation de `synchronize` TypeORM en production et passage aux migrations

- **Statut** : Accepté
- **Date** : 2026-04
- **Auteurs** : équipe TCG Nexus

## Contexte

TypeORM propose une option `synchronize` qui, activée, met automatiquement le schéma de la base PostgreSQL en accord avec les entités décorées `@Entity()` au démarrage de l'application.

Historiquement le projet avait :

```ts
TypeOrmModule.forRoot({
  // ...
  synchronize: true,
})
```

Cette option est pratique en développement : on modifie une entité, on redémarre le serveur, le schéma est à jour.

Elle est **dangereuse en production** :

- Un renommage de colonne peut être interprété comme une suppression + un ajout, effaçant des données.
- Un changement de type (ex : `int` → `bigint`) peut échouer ou tronquer.
- Un déploiement qui roule en arrière (rollback) peut à nouveau exécuter des migrations destructrices.
- L'ordre d'application des modifications de schéma n'est pas versionné, donc pas reproductible.

## Décision

1. `synchronize` est désormais **désactivé par défaut en production** :

   ```ts
   synchronize:
     process.env.DATABASE_SYNCHRONIZE === "true" ||
     process.env.NODE_ENV !== "production",
   ```

   - En dev (`NODE_ENV !== "production"`) : `synchronize: true` comme avant, aucune friction.
   - En prod : `synchronize: false` par défaut, sauf override explicite `DATABASE_SYNCHRONIZE=true` pour un bootstrap.

2. La roadmap prévoit ensuite le passage aux **migrations TypeORM explicites** :
   - génération initiale d'une migration de baseline à partir de la DB de production existante (`typeorm migration:generate`) ;
   - chaque évolution de schéma génère une migration versionnée dans `apps/api/src/migrations/` ;
   - les migrations tournent au démarrage via `migrationsRun: true` ou en CI avant déploiement.

## Alternatives considérées

### Garder `synchronize: true`

- **+** Zéro effort immédiat.
- **−** Risque opérationnel inacceptable à moyen terme. Une simple erreur de typage sur une entité peut dropper une colonne en prod.

### Passer directement aux migrations sans override

- **+** Plus propre sur le papier.
- **−** Nécessite de générer et valider la baseline avant de pouvoir redéployer. Le changement immédiat aurait bloqué la boucle de développement tant que la baseline n'était pas prête.
- La solution retenue (override via env) permet un **passage progressif** : on sécurise par défaut, tout en laissant un garde-fou opérationnel pour débloquer une situation.

### Flyway / Liquibase

- Outils matures, agnostiques de l'ORM.
- **−** Ajoute une dépendance externe et un second langage de migrations (SQL pur ou XML), alors que TypeORM en fournit déjà un suffisant pour nos besoins.

## Conséquences

### Positives

- Plus de risque de modification silencieuse du schéma en production.
- Les évolutions de schéma deviendront traçables en Git via les fichiers de migration.
- Reproduit exactement l'état de la DB d'une branche à l'autre.

### Négatives / à surveiller

- Tant que la première migration de baseline n'a pas été générée, il faut savoir activer `DATABASE_SYNCHRONIZE=true` manuellement pour un premier déploiement. C'est documenté et volontairement explicite.
- Chaque évolution d'entité nécessite maintenant la génération d'une migration — discipline à intégrer dans la revue de PR.
- Les développeurs doivent se rappeler que l'état de leur DB locale peut diverger de la prod s'ils rajoutent une entité sans migration. Un script `npm run db:migrate` facilitera la routine.

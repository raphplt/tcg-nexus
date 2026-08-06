# Migrations de base de données

Le projet utilise les migrations TypeORM. La décision et son historique sont dans [ADR-004](./adr/004-typeorm-synchronize.md).

## Comment ça s'articule avec `synchronize`

| Environnement | `synchronize` | Migrations |
|---|---|---|
| Développement local | `true` (défaut) | jouées à la demande |
| Tests e2e | `true` | non jouées |
| Production | `false` | `DATABASE_MIGRATIONS_RUN=true` au démarrage, ou `npm run migration:run` en CI |

En local, `synchronize` reste actif : on modifie une entité, on redémarre, le schéma suit. La migration est écrite **ensuite**, à partir de la diff.

## Commandes

Toutes depuis `apps/api/` :

```bash
npm run migration:show      # état des migrations sur la base courante
npm run migration:run       # applique les migrations en attente
npm run migration:revert    # annule la dernière migration appliquée
npm run migration:generate src/migrations/NomDeLaMigration
npm run migration:create   src/migrations/NomDeLaMigration   # squelette vide
```

`migration:generate` se connecte à la base configurée dans `.env` et compare son schéma aux entités. Il faut donc que la base soit **dans l'état d'avant** le changement — sinon la migration générée est vide.

## Écrire une migration

1. Modifier l'entité.
2. Lancer `npm run migration:generate src/migrations/MaModif` **avant** de laisser `synchronize` appliquer le changement, ou sur une base repartie de l'état précédent.
3. Relire le SQL généré. TypeORM interprète parfois un renommage comme un `DROP` + `ADD` : sur une colonne qui contient des données, remplacer par un `ALTER TABLE ... RENAME COLUMN`.
4. Vérifier que le `down()` est réellement l'inverse du `up()`.
5. Tester le couple : `npm run migration:run` puis `npm run migration:revert`.

## Baseline

Il n'existe pas encore de migration de baseline couvrant l'ensemble du schéma : la base a historiquement été créée par `synchronize`. Pour la générer sur un nouvel environnement :

```bash
DATABASE_SYNCHRONIZE=true npm run start          # crée le schéma complet, puis arrêter
npm run migration:generate src/migrations/Baseline
```

Sur une base déjà en place, la marquer comme appliquée sans rejouer le SQL :

```sql
INSERT INTO migrations (timestamp, name) VALUES (1785974400000, 'Baseline1785974400000');
```

Tant que cette baseline n'est pas faite, les migrations existantes sont écrites en défensif (`ADD COLUMN IF NOT EXISTS`, `CREATE TYPE` avec rattrapage de `duplicate_object`) : elles s'appliquent aussi bien sur une base créée par `synchronize` que sur une base neuve.

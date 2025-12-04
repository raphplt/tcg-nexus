---
title: Docker & base de données
---

Guide rapide (reprend `doc/README-Docker.md`).

## Démarrage express

```bash
cp env.example .env       # variables DB racine
cd apps/api
npm run docker:db         # lance PostgreSQL
npm run start:dev         # API NestJS locale
```

Services :
- API : http://localhost:3001
- Swagger : http://localhost:3001/api
- Postgres : localhost:5432 (postgres/postgres par défaut)

## Cycle de vie Postgres

```bash
npm run docker:db         # up
npm run docker:db-logs    # logs
npm run docker:db-down    # arrêt
```

Connexion manuelle :

```bash
docker-compose exec postgres psql -U postgres -d tcg_nexus
```

## Seeds

```bash
npm run seed
npm run seed:users
npm run seed:cardstates
```

## Tout dockerisé (API + DB)

```bash
cd apps/api
docker-compose -f ../docker-compose-with-api.yml up
```

Pour nettoyer complètement : `docker-compose down -v`.

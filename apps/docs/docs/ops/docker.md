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

Le compose racine lance aussi un service **`vision`** (microservice Python d'OCR, port 8000, `apps/vision`), utilisé par le scan de cartes — voir [Scan de cartes](../backend/scan).

## Stack complète (API + Web + Docs + DB + Vision)

Pour une stack full-docker de type production, un second fichier compose existe à la racine : `docker-compose.deploy.yml`. Il construit et lance `postgres`, `vision`, `api`, `web` et `docs`.

```bash
cd apps/api
npm run docker:up      # docker-compose -f ../../docker-compose.deploy.yml up
npm run docker:down
npm run docker:logs
```

Ce fichier est pensé pour un déploiement (variables `FRONTEND_URL`, `COOKIE_DOMAIN`, `NODE_ENV=production` en dur) : pour du développement local, préférez `npm run docker:db` + `npm run start:dev`.

Pour nettoyer complètement : `docker-compose down -v`.

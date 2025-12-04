---
title: Installation & démarrage
---

## Prérequis

- Node.js 20+ recommandé (le repo fonctionne à partir de 18 pour l’API/web, mais la doc Docusaurus demande 20)
- npm 10+
- Docker + Docker Compose (pour la base Postgres et l’API dockerisée)
- PostgreSQL 15+ si vous préférez une base locale hors Docker

## Cloner et installer

```bash
git clone https://github.com/raphplt/tcg-nexus.git
cd tcg-nexus
npm install
```

## Variables d’environnement

1. Copiez les exemples :

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

2. Ajustez les valeurs selon votre contexte :

```bash
# apps/api/.env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=tcg_nexus
JWT_SECRET=change-me
JWT_REFRESH_SECRET=change-me-too
PORT=3001

# apps/web/.env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Lancer l’environnement de dev

Option 1 : tout via Turborepo (front + API en parallèle) :

```bash
npm run dev
```

Option 2 : services séparés :

```bash
# Démarrer Postgres en Docker
cd apps/api && npm run docker:db

# Lancer l’API NestJS
npm run start:dev

# Dans un autre terminal, lancer le front Next.js
cd ../web
npm run dev
```

## Construire et servir

```bash
# Build front + API via Turborepo
npm run build

# Build / run un service précis
cd apps/web && npm run build && npm start
cd apps/api && npm run build && npm run start:prod
```

## Documentation Docusaurus

```bash
cd apps/docs
npm start   # http://localhost:3000
```

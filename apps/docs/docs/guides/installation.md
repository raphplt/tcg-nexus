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

2. Ajustez les valeurs selon votre contexte : le strict nécessaire pour démarrer en local est la base et les secrets JWT ; le reste a des valeurs par défaut ou désactive proprement la fonctionnalité concernée si absent.

```bash
# apps/api/.env — essentiel
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=tcg_nexus
DATABASE_MIGRATIONS_RUN=false   # true en prod ; en dev, synchronize suffit (voir Base de données ci-dessous)
JWT_SECRET=change-me
JWT_REFRESH_SECRET=change-me-too
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
PORT=3001

# apps/api/.env — fonctionnalités optionnelles (dégradées proprement si absentes)
OCR_ENGINE=tesseract             # scan de cartes : tesseract (défaut) ou vision (nécessite GOOGLE_VISION_API_KEY)
VISION_SERVICE_URL=http://localhost:8000
R2_ACCOUNT_ID=...                # stockage Cloudflare R2 (images de sets/séries) ; uploads désactivés si absent
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
STRIPE_SECRET_KEY=...            # marketplace ; checkout désactivé proprement si absent
STRIPE_WEBHOOK_SECRET=...
SMTP_HOST=...                    # emails transactionnels

# apps/web/.env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Liste exhaustive à jour dans `apps/api/.env.example`. Voir aussi [API NestJS](../backend/api) pour le détail des variables liées à chaque module, et [Base de données](../architecture/database) pour `DATABASE_MIGRATIONS_RUN` vs `synchronize`.

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

## Base de données : synchronize vs migrations

En dev, `synchronize` (TypeORM) recrée le schéma automatiquement à partir des entités — pratique, mais il gère mal certains changements structurels (ex. transformation d'une clé primaire). Certaines migrations dans `apps/api/src/migrations/` existent justement pour ces cas que `synchronize` ne sait pas appliquer proprement sur une base qui contient déjà des données.

Si l'API refuse de démarrer avec une erreur `QueryFailedError` pendant la synchronisation du schéma (le message ressemble à un problème de connexion mais n'en est pas un), la base est probablement restée sur un schéma plus ancien pendant que `synchronize` tentait une transformation qu'il ne sait pas faire sans perte de données :

```bash
cd apps/api
npm run migration:baseline   # marque comme déjà appliquées les migrations dont l'effet est déjà présent
npm run migration:run        # joue les migrations restantes
```

`migration:baseline` est idempotent et sans danger à relancer.

## Documentation Docusaurus

```bash
cd apps/docs
npm start   # http://localhost:3000
```

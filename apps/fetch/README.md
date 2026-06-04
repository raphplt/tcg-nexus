# Fetch from TCGdex

Ce microservice est une application Express.js qui interagit avec l’API TCGdex pour récupérer des données sur les jeux de cartes à jouer. Il fournit divers endpoints pour récupérer des informations sur les cartes, séries, ensembles et plus.

## Pipeline de données & images (R2)

Les données (séries, sets, cartes) sont stockées dans `data/` et les images sont
ré-hébergées sur Cloudflare R2, exposé via `R2_PUBLIC_URL` (= `https://cdn.tcg-nexus.org`).

Variables d'environnement requises (`.env`) :
`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`.

### Scripts

| Script | Rôle |
| --- | --- |
| `npm run update-data` | Détecte les **nouvelles** séries/sets TCGdex, télécharge leurs cartes, **uploade logos/symboles de sets sur R2**, et met à jour `data/`. Idempotent : ne traite que le nouveau. Les images de **cartes** restent sur TCGdex par défaut ; passer `MIGRATE_CARD_IMAGES_TO_R2=true` pour aussi les ré-héberger sur R2. |
| `npm run migrate-card-images` | Backfill : migre vers R2 les images des cartes **déjà** présentes en local. Reprenable. Options : `--serie=sv`, `--limit=500`, `--quality=high`, `--dry-run`. |
| `npm run update-sealed` | Met à jour les produits scellés (Pokecardex). |

Côté API (`apps/api`) :

| Script | Rôle |
| --- | --- |
| `npm run migrate:fix-image-cdn` | Réécrit en base les URLs d'images de sets de l'ancien hôte `*.r2.dev` vers `cdn.tcg-nexus.org`. |
| `npm run migrate:card-images-cdn` | Bascule en base `card.image` de TCGdex vers le CDN. **À lancer après un backfill complet** (`migrate-card-images` doit reporter « échecs 0 »). |

### Ordre recommandé pour migrer les images de cartes existantes

```sh
# 1) Backfill R2 (de préférence série par série ; reprenable)
cd apps/fetch
npm run migrate-card-images -- --serie=sv
# … relancer jusqu'à « échecs 0 » …

# 2) Bascule la base de données vers le CDN
cd ../api
npm run migrate:card-images-cdn
```

> Volume : ~19 500 cartes × 2 qualités. Privilégier un lancement par série et/ou
> de nuit. TCGdex étant déjà un CDN performant, on peut aussi se contenter du
> mode « go-forward » (les nouvelles cartes passent sur R2 via `update-data`,
> les anciennes restant servies par TCGdex) — le front gère les deux origines.

### Automatisation (récupération des nouvelles séries)

`update-data` est conçu pour tourner périodiquement. Exemple cron (hebdomadaire,
lundi 4h), suivi d'un re-seed côté API :

```cron
0 4 * * 1  cd /opt/tcg-nexus/apps/fetch && npm run update-data >> /var/log/tcg-update.log 2>&1
30 4 * * 1 cd /opt/tcg-nexus/apps/api  && npm run seed:prod   >> /var/log/tcg-seed.log   2>&1
```

Alternative : un workflow GitHub Actions planifié (`schedule:`) exécutant
`update-data` avec les credentials R2 en *secrets*, puis commitant les nouveaux
fichiers `data/` (le déploiement re-seed ensuite la base).

1. Installer les dépendances :
   ```sh
   npm install
   ```

## Usage

1. Démarrer le serveur:

   ```sh
   npm start
   ```

2. Le serveur sera accessible à cette adresse `http://localhost:3005`.

## API Endpoints

- **Get a card by ID**

  ```http
  GET /tcgdex/cards/:id
  ```

- **Get all series**

  ```http
  GET /tcgdex/series
  ```

- **Get series details**

  ```http
  GET /tcgdex/seriesDetails
  ```

- **Get a series by ID**

  ```http
  GET /tcgdex/series/:id
  ```

- **Get a set by ID**

  ```http
  GET /tcgdex/sets/:id
  ```

- **Get all sets**

  ```http
  GET /tcgdex/sets
  ```

- **Get a set with all its cards**

  ```http
  GET /tcgdex/setCard/:id
  ```

- **Get a complete series (bloc) with all its sets and their cards**
  ```http
  GET /tcgdex/bloc/:id
  ```

# Fetch from TCGdex

Ce microservice est une application Express.js qui interagit avec l’API TCGdex pour récupérer des données sur les jeux de cartes à jouer. Il fournit divers endpoints pour récupérer des informations sur les cartes, séries, ensembles et plus.

## Dataset du catalogue

Le catalogue Pokémon (séries, sets, cartes) vit dans `data/`, hors dépôt
(`data/*` est ignoré par git). Il est **publié sur R2** et récupéré par
`npm run data:pull` : aucun transfert manuel entre postes, aucun re-scrape.

```
data/
├── manifest.json                     empreintes des fichiers, base du pull
├── fr/
│   ├── series.json
│   ├── sets.json
│   └── cards/<setId>.ndjson.br       une ligne par carte, compressé Brotli
└── en/                               même structure
```

Le format NDJSON compressé remplace les ~20 000 fichiers JSON indentés :
**80 Mo → 2,7 Mo par langue**, 172 fichiers au lieu de 20 222, et un set entier
se lit d'un coup. Le catalogue complet se charge en moins d'une seconde.

### Démarrer sur un nouveau poste

```sh
cd apps/fetch
npm run data:pull        # récupère le dataset publié (aucune credential requise)
cd ../api
npm run import:catalog   # importe séries, sets, cartes et traductions en base
```

### Variables d'environnement

`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`,
`R2_PUBLIC_URL` — nécessaires pour **écrire** (scraper, `data:push`).
La lecture (`data:pull`) passe par le domaine public et n'en a pas besoin.

`LOCALES=fr,en` restreint les langues traitées par tous les scripts.
`TCG_DATA_DIR` pointe un autre emplacement que `<racine>/data` (conteneurs).

### Scripts

| Script | Rôle |
| --- | --- |
| `npm run data:pull` | Récupère le dataset publié. Ne télécharge que les fichiers dont l'empreinte diffère. `--force` pour tout retélécharger. |
| `npm run data:push` | Publie le dataset local sur R2. Réservé au mainteneur (credentials requises). N'envoie que le delta. |
| `npm run update-data` | Scrape TCGdex langue par langue. `--locale=en` pour une langue, `--refresh` pour re-récupérer les sets déjà connus. Uploade logos/symboles de sets sur R2. |
| `npm run coverage-report` | Compare la couverture entre langues, sans rien écrire. `--remote` confronte au catalogue TCGdex. C'est la métrique qui décide de l'activation d'une langue. |
| `npm run data:migrate-layout` | Conversion unique de l'ancienne arborescence `data/<serie>/<set>/<carte>.json`. `--prune` supprime l'ancienne. |
| `npm run migrate-card-images` | Backfill : migre vers R2 les images des cartes **déjà** présentes en local. Reprenable. Options : `--serie=sv`, `--limit=500`, `--quality=high`, `--dry-run`. |
| `npm run update-sealed` | Met à jour les produits scellés (Pokecardex). |

### Ajouter une langue

```sh
cd apps/fetch
npm run update-data -- --locale=en   # long : ~20 000 cartes
npm run coverage-report              # vérifier la couverture avant d'activer
npm run data:push                    # publier pour les autres postes et la prod
cd ../api && npm run import:catalog
```

Les images de cartes dépendent de la langue (le texte est imprimé sur
l'illustration) : chaque langue a ses propres clés `cards/<locale>/…` sur R2.

Côté API (`apps/api`) :

| Script | Rôle |
| --- | --- |
| `npm run import:catalog` | Importe le dataset en base (cartes + traductions), sans rejouer le seed de démo. Idempotent. |
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

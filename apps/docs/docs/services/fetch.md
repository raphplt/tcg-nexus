---
title: Microservice Fetch (TCGdex)
---

Service Express léger qui proxifie l’API **TCGdex** grâce au SDK `@tcgdex/sdk` (langue `fr`). Idéal pour précharger séries/sets/cartes avant ingestion côté API.

## Démarrer

```bash
cd apps/fetch
npm install   # si besoin
npm start     # port 3005 par défaut (variable PORT supportée)
```

## Endpoints

- `GET /tcgdex/cards/:id` : détail d’une carte.
- `GET /tcgdex/cardsDetailed` : toutes les cartes (pagination interne par lot de 1000 + délai pour éviter le rate-limit).
- `GET /tcgdex/series` / `/seriesDetails` / `/series/:id` : listes et détails des séries.
- `GET /tcgdex/sets` / `/setsDetails` / `/sets/:id` : listes et détails des sets.
- `GET /tcgdex/setCard/:id` : un set avec ses cartes.
- `GET /tcgdex/bloc/:id` : une série complète avec sets + cartes.

## Scripts associés

- `npm run update-data` : exécute `update-data.ts` pour mettre à jour les données TCGdex (via `tsx`).

Les erreurs renvoient un message JSON simple (`{ error: string }`), prêt à être consommé par l’API NestJS ou des scripts de migration.

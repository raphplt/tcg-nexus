---
title: Microservice Fetch (TCGdex)
---

Le microservice **Fetch** (`apps/fetch`) est un service Express léger qui sert de passerelle d'ingestion et de synchronisation des données officielles du JCC Pokémon depuis l'API **TCGdex** grâce au SDK officiel `@tcgdex/sdk`.

---

## 1. Rôle et Architecture

Plutôt que d'interroger directement les APIs externes lors de chaque requête utilisateur (ce qui entraînerait des lenteurs et des risques de dépassement de quota), le microservice Fetch :
1. Télécharge et pagine les séries, extensions et cartes par lots maîtrisés ;
2. Normalise les métadonnées et prépare les jeux de données ;
3. Permet à l'API NestJS ou aux scripts de maintenance de précharger la base PostgreSQL locale de manière fiable et contrôlée.

---

## 2. Endpoints du service

Le service écoute par défaut sur le port `3005` (configurable via `PORT`) :

- `GET /tcgdex/cardsDetailed` : export paginé de l'intégralité des cartes Pokémon avec gestion interne de tempo pour respecter les quotas de débit de l'API source.
- `GET /tcgdex/cards/:id` : fiche complète d'une carte spécifique.
- `GET /tcgdex/series` / `/seriesDetails` / `/series/:id` : liste chronologique et métadonnées détaillées des séries (blocs temporels).
- `GET /tcgdex/sets` / `/setsDetails` / `/sets/:id` : liste et détails des extensions (logos, dates de sortie, totaux de cartes).
- `GET /tcgdex/setCard/:id` : liste de l'ensemble des cartes appartenant à un set précis.
- `GET /tcgdex/bloc/:id` : arborescence complète d'un bloc avec ses extensions et leurs cartes.

---

## 3. Scripts de mise à jour des données

- **`npm run update-data`** : exécute le script `update-data.ts` (via `tsx`) pour rapatrier les derniers sets parus et mettre à jour le catalogue local.
- **Migration des visuels vers Cloudflare R2** : scripts `migrate-card-images-r2.ts` permettant de transférer les illustrations des cartes vers le CDN optimisé de la plateforme.

---

## 4. Démarrage en local

```bash
cd apps/fetch
npm install
npm start     # Serveur prêt sur http://localhost:3005
```

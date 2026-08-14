---
title: Cartes Pokémon
---

Catalogue TCG (cartes, sets, séries). Les données peuvent être alimentées par le microservice Fetch TCGdex.

- **Base path** : `/pokemon-card`
- **Auth requise** : la plupart des lectures sont publiques, mais **`GET /pokemon-card` (liste complète) nécessite un JWT** — c'est la seule route de lecture sans `@Public()`. Création/édition/suppression réservées aux rôles admin/modérateur.

## Cartes

- `POST /pokemon-card/sync` (ADMIN) : déclenche manuellement la synchronisation des cartes depuis TCGdex.
- `POST /pokemon-card` (ADMIN, MODERATOR) : créer une carte.
- `GET /pokemon-card` (**authentifié**) : toutes les cartes.
- `GET /pokemon-card/paginated` (public) : pagination (`page`, `limit`, `search`, `setId`, `serieId`, `rarity`, `type`).
- `GET /pokemon-card/search/:search` (public) : recherche plein texte.
- `GET /pokemon-card/random` (public) : carte aléatoire, filtres `serieId`, `rarity`, `set`.
- `POST /pokemon-card/scan-match` (public) : cœur du scan mobile — reçoit les champs extraits par OCR (`cardName`, `localId`, `setName`, `setNumber`, `setTotal`) et retourne les cartes candidates scorées. Voir [Scan de cartes](./scan).
- `GET /pokemon-card/:id` (public) : détail d’une carte.
- `PATCH /pokemon-card/:id` (ADMIN, MODERATOR) : mise à jour.
- `DELETE /pokemon-card/:id` (ADMIN, MODERATOR) : suppression.

## Séries & sets

- Séries : `/pokemon-series` (CRUD similaire, lecture publique)
- Sets : `/pokemon-set` (CRUD similaire, lecture publique)

Consultez Swagger pour les DTO (`CreatePokemonCardDto`, `UpdatePokemonCardDto`) et les champs exacts attendus.

---
title: Cartes Pokémon
---

Catalogue TCG (cartes, sets, séries). Les données peuvent être alimentées par le microservice Fetch TCGdex.

- **Base path** : `/pokemon-card`
- **Auth requise** : lecture publique ; création/édition réservées aux rôles admin/modérateur.

## Cartes

- `POST /pokemon-card` (ADMIN, MODERATOR) : créer une carte.
- `GET /pokemon-card` (public) : toutes les cartes.
- `GET /pokemon-card/paginated` (public) : pagination (`page`, `limit`).
- `GET /pokemon-card/search/:search` (public) : recherche plein texte.
- `GET /pokemon-card/random` (public) : carte aléatoire, filtres `serieId`, `rarity`, `set`.
- `GET /pokemon-card/:id` (public) : détail d’une carte.
- `PATCH /pokemon-card/:id` (ADMIN, MODERATOR) : mise à jour.
- `DELETE /pokemon-card/:id` (ADMIN, MODERATOR) : suppression.

## Séries & sets

- Séries : `/pokemon-series` (CRUD similaire, lecture publique)
- Sets : `/pokemon-set` (CRUD similaire, lecture publique)

Consultez Swagger pour les DTO (`CreatePokemonCardDto`, `UpdatePokemonCardDto`) et les champs exacts attendus.

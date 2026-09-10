---
title: Cartes Pokémon & Produits Scellés
---

Le module Catalogue gère les entités officielles du jeu de cartes Pokémon (cartes à l'unité, extensions, séries et produits scellés). Il s'alimente principalement via le microservice [Fetch TCGdex](../services/fetch) ou les packages de données versionnés.

---

## 1. Cartes Pokémon (`/pokemon-card`)

- **Base path** : `/pokemon-card`
- **Authentification** : la majorité des routes de lecture sont publiques. Seule la récupération brute de toutes les cartes (`GET /pokemon-card`) requiert une authentification JWT. Les créations, modifications et suppressions sont réservées aux rôles `admin` et `moderator`.

### Endpoints
- `GET /pokemon-card/paginated` (Public) : recherche paginée avec filtres multiples (`page`, `limit`, `search`, `setId`, `serieId`, `rarity`, `type`).
- `GET /pokemon-card/search/:search` (Public) : recherche textuelle rapide.
- `GET /pokemon-card/random` (Public) : tirage d'une carte aléatoire (filtres possibles : `serieId`, `rarity`, `set`).
- `GET /pokemon-card/:id` (Public) : fiche technique détaillée d'une carte (identifiants, PV, types, attaques, talents, faiblesses, prix marché et visuel localisé).
- `POST /pokemon-card/scan-match` (Public) : matching de carte pour le scanner mobile à partir de champs pré-extraits (`cardName`, `localId`, `setName`, `setNumber`). Voir [Scan de cartes](./scan).
- `POST /pokemon-card/sync` (ADMIN) : déclenche la synchronisation manuelle du catalogue depuis le microservice Fetch.
- `POST /pokemon-card`, `PATCH /pokemon-card/:id`, `DELETE /pokemon-card/:id` (ADMIN / MODERATOR) : gestion manuelle du catalogue.

---

## 2. Séries & Extensions (`/pokemon-series`, `/pokemon-set`)

Les cartes sont regroupées hiérarchiquement au sein de **séries** (blocs temporels : Écarlate et Violet, Épée et Bouclier, etc.) et de **sets** (extensions : 151, Flammes Obsidiennes, etc.).

### Séries (`/pokemon-series`)
- `GET /pokemon-series` (Public) : liste de toutes les séries Pokémon ordonnées chronologiquement.
- `GET /pokemon-series/:id` (Public) : détail d'une série avec son logo et ses traductions.
- `POST`, `PATCH`, `DELETE` (ADMIN / MODERATOR) : administration des séries.

### Extensions / Sets (`/pokemon-set`)
- `GET /pokemon-set` (Public) : liste des extensions avec nombre de cartes et dates de sortie.
- `GET /pokemon-set/serie/:serieId` (Public) : extensions rattachées à une série donnée.
- `GET /pokemon-set/:id` (Public) : détail d'une extension et de son logo officiel.
- `POST`, `PATCH`, `DELETE` (ADMIN / MODERATOR) : administration des extensions.

---

## 3. Produits Scellés (`/sealed-products`)

Le catalogue de produits scellés couvre les emballages non ouverts (boîtes de boosters/displays, coffrets Elite Trainer Boxes, packs spéciaux, tripacks et boosters sous blister).

- **Base path** : `/sealed-products`
- **Authentification** : lecture publique, mutations réservées aux administrateurs.
- **Traductions** : noms localisés portés par `SealedProductLocale` (voir [Traductions](./translations)).

### Endpoints
- `GET /sealed-products` / `/paginated` (Public) : liste des produits scellés avec recherche et filtres.
- `GET /sealed-products/recent` (Public) : nouveautés récemment référencées.
- `GET /sealed-products/popular` (Public) : produits scellés les plus consultés.
- `GET /sealed-products/:id` (Public) : fiche détaillée du produit et rattachement à son extension.
- `GET /sealed-products/:id/stats` (Public) : statistiques de prix sur la place de marché (prix min, moyen, max des annonces actives).
- `POST /sealed-products`, `PATCH /:id`, `DELETE /:id` (ADMIN / MODERATOR) : création et mise à jour.
- `POST /sealed-products/seed` (ADMIN) : génération et initialisation du référentiel de produits scellés.

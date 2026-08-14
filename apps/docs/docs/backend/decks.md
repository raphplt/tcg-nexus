---
title: Decks
---

Gestion des decks avec visibilité publique, bibliothèque personnelle, import/export et analyse par IA.

- **Base path** : `/deck`
- **Auth requise** : oui pour créer/éditer/dupliquer/sauvegarder ; lecture (detail, export, decks publics) et analyse publiques.

## CRUD & consultation

- `POST /deck` : créer un deck (user courant auteur).
- `GET /deck` (public) : lister les decks (filtres/pagination via `FindAllDecksParams`).
- `GET /deck/me` : decks du user connecté.
- `GET /deck/:id` (public) : détail + cartes du deck.
- `GET /deck/user/:userId/public` (public) : decks publics d'un utilisateur.
- `PATCH /deck/:id` : mettre à jour un deck (owner).
- `DELETE /deck/:id` : supprimer un deck (owner).
- `POST /deck/:id/clone` : dupliquer le deck vers l’utilisateur courant.
- `POST /deck/:id/view` (public) : incrémenter le compteur de vues.

## Bibliothèque personnelle

Distincte des decks dont on est l'auteur : permet de sauvegarder en bibliothèque des decks publics d'autres utilisateurs.

- `GET /deck/saved` : decks sauvegardés en bibliothèque.
- `GET /deck/saved/ids` : IDs des decks sauvegardés (pour affichage rapide d'un état "sauvegardé").
- `POST /deck/:id/save` : ajouter un deck public à sa bibliothèque.
- `DELETE /deck/:id/save` : retirer un deck de sa bibliothèque.

## Export, import, partage

- `GET /deck/export/:id` (public) : exporter un deck au format JSON.
- `POST /deck/import-json` : importer un deck depuis un JSON exporté.
- `POST /deck/:id/share` : générer un code de partage pour un deck.
- `GET /deck/import/:code` (public) : consulter le deck associé à un code de partage.
- `POST /deck/import/:code` : importer le deck associé à un code de partage vers son propre compte.

## Analyse IA

- `POST /deck/:id/analyze` (public) : analyse un deck et retourne des recommandations (`AnalyzeDeckResultDto`), via le module `ai` (`POST /ai/analyzeDeck`).

## Formats & cartes

- Formats : `/deck-format` (CRUD basique, rôles admin/modérateur).
- Cartes d’un deck : `/deck-card` (CRUD) pour ajouter/mettre à jour les cartes liées à un deck.

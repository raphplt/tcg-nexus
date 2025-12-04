---
title: Decks
---

Gestion des decks avec visibilité publique et fonctions collaboratives basiques.

- **Base path** : `/deck`
- **Auth requise** : oui pour créer/éditer/dupliquer ; lecture publique.

## Endpoints

- `POST /deck` : créer un deck (user courant auteur).
- `GET /deck` (public) : lister les decks (filtres/pagination via `FindAllDecksParams`).
- `GET /deck/me` : decks du user connecté.
- `GET /deck/:id` (public) : détail + cartes du deck.
- `PATCH /deck/:id` : mettre à jour un deck (owner).
- `DELETE /deck/:id` : supprimer un deck (owner).
- `POST /deck/:id/clone` : dupliquer le deck vers l’utilisateur courant.
- `POST /deck/:id/view` (public) : incrémenter le compteur de vues.

## Formats & cartes

- Formats : `/deck-format` (CRUD basique, rôles admin/modérateur).
- Cartes d’un deck : `/deck-card` (CRUD) pour ajouter/mettre à jour les cartes liées à un deck.

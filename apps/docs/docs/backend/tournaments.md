---
title: Tournois
---

Module complet pour créer, gérer et suivre les tournois (états, brackets, inscriptions, matches).

- **Base path** : `/tournaments`
- **Auth requise** : création/gestion protégées, lecture publique (liste, détails, stats, brackets...).

## Parcours principal

- `POST /tournaments` (ADMIN, MODERATOR) : créer un tournoi.
- `GET /tournaments` (public) : liste avec filtres (`TournamentQueryDto` : statut, pagination...).
- `GET /tournaments/upcoming` / `past` (public) : prochains ou passés.
- `GET /tournaments/:id` (public) : détail.
- `GET /tournaments/:id/stats` (public) : statistiques agrégées.

## Inscriptions & participants

- `POST /tournaments/:id/register` : inscription du joueur courant (ou `playerId` fourni). Guard `TournamentParticipantGuard` pour valider l’éligibilité.
- `DELETE /tournaments/:id/register/:playerId` : désinscrire un joueur.
- `GET /tournaments/player/:playerId` : tournois d’un joueur.

## Gestion (organisateurs/owner)

- `PATCH /tournaments/:id` : mise à jour générale (owner/admin).
- `PATCH /tournaments/:id/status` : changer l’état (owner/admin).
- `POST /tournaments/:id/start` / `finish` / `cancel` : workflow du tournoi.
- `POST /tournaments/:id/advance-round` : passer au round suivant.
- `GET /tournaments/:id/state/transitions` : transitions possibles.
- `POST /tournaments/:id/state/validate` : valider une transition proposée.
- `DELETE /tournaments/:id` : suppression (owner).

## Bracket, pairings, matches

- `GET /tournaments/:id/bracket` : bracket courant.
- `GET /tournaments/:id/pairings` : appariements d’un round (option `round`).
- `GET /tournaments/:id/matches` : liste des matches (filtres round/status).
- `GET /tournaments/:id/matches/:matchId` : détail d’un match.

## Rankings & progressions

- `GET /tournaments/:id/rankings` : classement courant.
- `GET /tournaments/:id/progress` : état d’avancement.

## Inscriptions (admin/organizers)

- `GET /tournaments/:id/registrations` : inscriptions (filtre `status`).
- `PATCH /tournaments/:id/registrations/:registrationId/confirm` : confirmer.
- `PATCH /tournaments/:id/registrations/:registrationId/cancel` : annuler (avec raison optionnelle).
- `PATCH /tournaments/:id/registrations/:registrationId/check-in` : check-in joueur.

## Rôles & guards

- `JwtAuthGuard` + `RolesGuard` globaux ; `TournamentOrganizerGuard` et `TournamentOrganizerRoles` gèrent owner/admin/modérateur.
- `TournamentParticipantGuard` sécurise les inscriptions.

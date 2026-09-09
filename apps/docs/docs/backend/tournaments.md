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
- `GET /tournaments/:id/matches/me` : matches du joueur courant dans ce tournoi.
- `GET /tournaments/:id/matches/:matchId` : détail d’un match.
- `PATCH /tournaments/:id/matches/:matchId` (organisateur/admin) : mettre à jour un match (score, statut).
- `POST /tournaments/:id/matches/bulk-start` (organisateur/admin) : démarrer plusieurs matches d’un coup.

## Rankings & progressions

- `GET /tournaments/:id/rankings` : classement courant.
- `GET /tournaments/:id/progress` : état d’avancement.

## Inscriptions (admin/organizers)

- `GET /tournaments/:id/registrations` : inscriptions (filtre `status`).
- `POST /tournaments/:id/registrations/bulk-action` (organisateur/admin) : confirmer/annuler/check-in plusieurs inscriptions en une requête.
- `PATCH /tournaments/:id/registrations/:registrationId/confirm` : confirmer.
- `PATCH /tournaments/:id/registrations/:registrationId/cancel` : annuler (avec raison optionnelle).
- `PATCH /tournaments/:id/registrations/:registrationId/check-in` : check-in joueur.
- `POST /tournaments/:id/fill-with-players` (organisateur/admin) : compléter un tournoi avec des joueurs (tests/démo).
- `POST /tournaments/:id/check-in-all` (organisateur/admin) : check-in de tous les inscrits d’un coup.

## Rôles & guards

- `JwtAuthGuard` + `RolesGuard` globaux ; `TournamentOrganizerGuard` et `TournamentOrganizerRoles` gèrent owner/admin/modérateur.
- `TournamentParticipantGuard` sécurise les inscriptions.

## Deck legality, score confirmation and corrections

A submitted list is checked against the catalog and the rule data actually stored: a card the catalog does not know is refused, more than four copies of anything but basic energy is refused, and a card the rule set marks illegal is refused. When a rule cannot be read — an unknown rule set, a card without legality data, a missing format — the list is recorded as `unverified` rather than valid. `legalityStatus` therefore has three values, and `isValid` means "every checked rule passed".

Every submission is appended to `tournament_deck_snapshot_revision` with the legality decided for it, so a correction never erases what a player registered or what the rules said at the time. An organizer can settle a list with `POST /tournaments/:id/deck-snapshots/:snapshotId/legality`, which records who decided, why, and what the computed status was; a new submission clears that decision. `GET /tournaments/:id/deck-snapshots/:snapshotId/revisions` returns the history.

Score confirmation is one transaction: the match row is locked, the proposal is confirmed and the official result is reported inside it, so a score the tournament rejects leaves no confirmed proposal behind. Concurrent proposals on one match are serialized by the same lock, and only one stays pending. Dispute arbitration follows the same path. Effects that need their own connection — final standings and notifications — run after that transaction commits, through `applyPostScoreEffects`.

A score correction refuses to run when later matches of the same players are already played or running, unless the operator acknowledges it with `acknowledgeDownstreamImpact`; the affected match identifiers are returned by the preview, by the correction and in its audit record. This release does not re-pair those matches, and says so rather than implying it did. The rating the corrected match applied is reversed before the corrected outcome is rated: `ranked_match_history` keeps the row, marks it `reversedAt` with its reason, and a reversed rating no longer counts as applied.

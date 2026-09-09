---
title: Tournois
---

Module complet pour créer, gérer et suivre les tournois Pokémon TCG (états, brackets, inscriptions, appariements, horloge de round, vérification de légalité des decks, classements avec départages explicites et corrections rétroactives).

- **Base path** : `/tournaments`
- **Auth requise** : Création/gestion protégées par JWT et rôles d'organisation (`TournamentOrganizerGuard`), lecture publique des informations publiques (liste, détails, stats, brackets, classements) sous réserve de visibilité (`TournamentVisibilityGuard`).

---

## 1. Parcours principal & cycle de vie

- `POST /tournaments` (ADMIN, MODERATOR) : Créer un tournoi.
- `GET /tournaments` (public) : Liste avec filtres (`TournamentQueryDto` : statut, format, type, pagination...).
- `GET /tournaments/upcoming` (public) : Tournois à venir.
- `GET /tournaments/past` (public) : Tournois passés/terminés.
- `GET /tournaments/:id` (public) : Détail d’un tournoi.
- `GET /tournaments/:id/stats` (public) : Statistiques agrégées (nombre de participants, matches joués, distribution).
- `PATCH /tournaments/:id` (organisateur/admin) : Mise à jour générale des propriétés du tournoi.
- `PATCH /tournaments/:id/status` (organisateur/admin) : Transition d’état explicite.
- `POST /tournaments/:id/start` (organisateur/admin) : Démarrer le tournoi (génère le round 1 et les appariements).
- `POST /tournaments/:id/finish` (organisateur/admin) : Clôturer le tournoi et finaliser les classements.
- `POST /tournaments/:id/cancel` (organisateur/admin) : Annuler le tournoi.
- `DELETE /tournaments/:id` (owner) : Supprimer un tournoi.

### Transitions d'état & machine d'états
- `GET /tournaments/:id/state/transitions` : Liste des transitions autorisées depuis l'état courant.
- `POST /tournaments/:id/state/validate` : Valide la conformité d'une transition cible sans l'appliquer.
- `POST /tournaments/:id/advance-round` (organisateur/admin) : Clôture le round actif et génère le round suivant (Swiss / Elimination).

---

## 2. Inscriptions & participants

- `POST /tournaments/:id/register` : Inscription du joueur courant (ou d'un `playerId` cible si autorisé). Protégé par `TournamentParticipantGuard`.
- `DELETE /tournaments/:id/register/:playerId` : Désinscrire un joueur (le joueur lui-même ou l'organisateur).
- `GET /tournaments/player/:playerId` : Historique des tournois d’un joueur.
- `GET /tournaments/organizer/:organizerId` : Liste des tournois gérés par un organisateur.
- `GET /tournaments/:id/registrations` (organisateur/admin) : Liste des inscriptions avec filtre de statut optionnel (`REGISTERED`, `CHECKED_IN`, `CONFIRMED`, `CANCELLED`).
- `POST /tournaments/:id/registrations/bulk-action` (organisateur/admin) : Action en masse sur les inscriptions (confirmation, annulation).
- `PATCH /tournaments/:id/registrations/:registrationId/confirm` (organisateur/admin) : Confirmer une inscription.
- `PATCH /tournaments/:id/registrations/:registrationId/cancel` (organisateur/admin) : Annuler une inscription avec motif.
- `PATCH /tournaments/:id/registrations/:registrationId/check-in` : Check-in du joueur pour valider sa présence avant le démarrage.
- `POST /tournaments/:id/check-in-all` (organisateur/admin) : Check-in en masse de tous les inscrits.
- `POST /tournaments/:id/fill-with-players` (admin uniquement) : Compléter automatiquement avec des joueurs fictifs pour tests et simulations.

---

## 3. Brackets, appariements & matches

- `GET /tournaments/:id/bracket` (public) : Structure complète de l'arbre ou du tableau du tournoi.
- `GET /tournaments/:id/pairings` (public) : Appariements du round actif (ou d'un `round` spécifique).
- `GET /tournaments/:id/matches` (public) : Liste des matches paginée avec filtres optionnels (`round`, `status`).
- `GET /tournaments/:id/matches/me` : Match en cours ou en attente du joueur authentifié.
- `GET /tournaments/:id/matches/:matchId` (public) : Détails d’un match spécifique.
- `PATCH /tournaments/:id/matches/:matchId` (organisateur/admin) : Mettre à jour les scores et le statut d'un match.
- `POST /tournaments/:id/matches/bulk-start` (organisateur/admin) : Passer un ensemble de matches au statut en cours en une seule opération.

---

## 4. Légualité des Decks & Snapshots (TRN-02)

Chaque participant soumet sa liste de deck (snapshot) avant la date limite. Le moteur de règles évalue automatiquement la conformité :
- Vérification d'existence dans le catalogue de cartes.
- Respect de la règle des 4 exemplaires maximum (hors énergies de base).
- Respect du format du tournoi (Standard, Expanded, etc.).
- Les cartes non identifiées ou dont la règle est absente placent le deck en statut `unverified`.

### Endpoints
- `POST /tournaments/:id/deck-snapshot` : Soumettre ou modifier la liste de deck du joueur connecté.
- `GET /tournaments/:id/my-deck-snapshot` : Consulter la liste de deck actuellement enregistrée pour le joueur connecté.
- `GET /tournaments/:id/deck-snapshots` : Liste des snapshots du tournoi (visibilité restreinte aux organisateurs avant le début du tournoi ou publication de la liste).
- `POST /tournaments/:id/deck-snapshots/:snapshotId/legality` (organisateur/admin) : Dérogation ou arbitrage manuel de l'organisateur sur la légalité d'un deck avec justification.
- `GET /tournaments/:id/deck-snapshots/:snapshotId/revisions` : Historique d'audit complet de toutes les soumissions et révisions de deck pour un joueur.

---

## 5. Horloge de round & contrôles d'arbitrage (TRN-03)

Gestion en temps réel du chronomètre officiel pour chaque round de jeu :
- `POST /tournaments/:id/round-clock` (organisateur/admin) : Actions sur l'horloge :
  - `START` : Démarre le chronomètre pour la durée configurée.
  - `PAUSE` : Met en pause l'horloge (ex. litige, incident technique).
  - `RESUME` : Reprend le décompte.
  - `EXTEND` : Prolonge la durée du round (en minutes) avec saisie obligatoire d'un motif.
- `GET /tournaments/:id/round-clock` (public) : Statut de l'horloge, temps restant et temps écoulé.

---

## 6. Classements & départages explicites (TRN-04)

Calcul déterministe des classements selon les standards officiels de tournois de cartes (système Suisse & départages) :
- `GET /tournaments/:id/rankings` : Classement synthétique standard.
- `GET /tournaments/:id/standings` : Classement complet et explicable, détaillant les métriques de tiebreak pour chaque joueur :
  - **Match Points** (Victoire = 3, Match nul = 1, Défaite = 0)
  - **OMW%** (Opponent Match Win Percentage)
  - **GW%** (Game Win Percentage)
  - **OGW%** (Opponent Game Win Percentage)
- `GET /tournaments/:id/progress` : Métriques globales de progression (rounds complétés, matches restants).

---

## 7. Dashboard joueur & gestion des incidents (TRN-05)

- `GET /tournaments/:id/player-dashboard` : Tableau de bord personnel du joueur (appariement courant, statut du match, fiche de l'adversaire, statut de check-in et d'abandon).
- `POST /tournaments/:id/drop-player` : Déclarer l'abandon (drop) d'un joueur, soit par le joueur lui-même, soit forcé par l'arbitre.
- `POST /tournaments/:id/score-correction/preview` (organisateur/admin) : Simuler et visualiser l'impact d'une correction de score rétroactive sur les classements et départages sans altérer la base de données.
- `POST /tournaments/:id/score-correction/apply` (organisateur/admin) : Appliquer une correction de score rétroactive avec traçabilité complète dans les registres d'incidents et inversion des classements ELO/points.

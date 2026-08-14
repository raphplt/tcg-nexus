---
title: Parties en ligne
---

Le module `match` couvre quatre notions liées mais distinctes : le **match de tournoi** (bracket), la **session de jeu en ligne** attachée à un match, les **parties casuelles** (matchmaking hors tournoi) et les **parties d'entraînement** (contre une IA). Le moteur de jeu et le temps réel sont partagés entre les trois modes jouables.

## Match de tournoi (`Match`)

- **Base path** : `/matches`
- Représente une rencontre planifiée dans un bracket (`tournament`, `round`, `phase`, `playerA`/`playerB`/`winner`, `playerAScore`/`playerBScore`). Distinct de la partie jouée en elle-même : voir [Tournois](./tournaments) pour le cycle de vie côté bracket.

Endpoints :

- `GET /matches/play-hub` : point d'entrée agrégé pour l'écran "jouer" (matches en cours, invitations...).
- `POST /matches` (organisateur/admin) : créer un match.
- `GET /matches` : liste (filtres).
- `GET /matches/:id` : détail.
- `PATCH /matches/:id` : mise à jour (score, notes).
- `DELETE /matches/:id` : suppression.
- `POST /matches/:id/start` / `report-score` / `reset` : cycle de vie du match.
- `GET /matches/tournament/:tournamentId/round/:round` : matches d'un round.
- `GET /matches/player/:playerId/tournament/:tournamentId` : matches d'un joueur dans un tournoi.

## Session de jeu en ligne (`OnlineMatchSession`)

Rattachée en `@OneToOne` à un `Match`. Stocke l'état complet sérialisé du moteur de jeu (`serializedState`), un seed aléatoire déterministe et l'historique des actions (`eventLog`) — nécessaire pour la reconnexion après coupure et le replay.

- `GET /matches/:id/online/deck-eligibility` : vérifie que le deck du joueur est valide pour démarrer.
- `GET /matches/:id/online/session` : récupère (ou initialise) la session de jeu du match.
- `POST /matches/:id/online/session` : crée/écrase la session.

## Parties casuelles (`casual-matches`, matchmaking)

Parties 1v1 hors tournoi, via file d'attente. `CasualMatchSession` (états `CasualMatchSessionStatus`) porte les mêmes mécaniques de moteur/replay que la session en ligne, sans rattachement à un `Match`/`Tournament`.

- `GET /casual-matches/lobby` : état du lobby.
- `GET /casual-matches/:id` : détail d'une session casuelle.
- `POST /casual-matches/:id/deck` : sélectionner son deck pour la partie.
- `POST /casual-matches/:id/action` : jouer une action (hors WebSocket, repli HTTP).
- `POST /casual-matches/:id/prompt` : répondre à un prompt du moteur (choix requis en cours de partie).

La mise en relation (matchmaking) se fait via WebSocket (`matchmaking_join` / `matchmaking_leave`), pas par un endpoint REST dédié.

## Parties d'entraînement (`training-matches`, contre l'IA)

Même mécanique que les parties casuelles, mais contre une IA locale (`TrainingAiService`), avec un niveau de difficulté (`TrainingDifficulty`) et un côté vainqueur dédié (`TrainingMatchWinnerSide`).

- `GET /training-matches/lobby` : configuration disponible (difficultés...).
- `POST /training-matches` : créer une partie d'entraînement.
- `GET /training-matches/:id` : détail.
- `POST /training-matches/:id/action` : jouer une action.
- `POST /training-matches/:id/prompt` : répondre à un prompt.

## Temps réel — `MatchGateway` (Socket.IO, namespace `/match`)

La progression pendant une partie (actions jouées, prompts, changements d'état) passe par WebSocket plutôt que par polling REST. Événements principaux (`@SubscribeMessage`) :

| Événement | Portée |
|---|---|
| `join_match` / `leave_match` | Rejoindre/quitter la room d'un match de tournoi |
| `dispatch_action` | Jouer une action dans une partie de tournoi |
| `respond_prompt` | Répondre à un prompt du moteur |
| `matchmaking_join` / `matchmaking_leave` | File d'attente casuelle |
| `casual_join` / `casual_leave` | Rejoindre/quitter la room d'une partie casuelle |
| `casual_dispatch_action` / `casual_respond_prompt` | Équivalents casuels de `dispatch_action`/`respond_prompt` |

La gateway gère la reconnexion avec grâce : un socket qui tombe à zéro connexion pour un `(match, user)` déclenche un timer de grâce (30s) avant de notifier l'adversaire, pour distinguer "l'autre onglet est encore ouvert" de "le joueur est vraiment parti". Un timeout d'inactivité (5 min) termine une partie abandonnée.

## Moteur de jeu (`engine/GameEngine.ts`)

Moteur de règles pur (actions, effets, prompts), indépendant du transport. Reçoit une `PlayerAction` (jouer une carte, attaquer, attacher de l'énergie, évoluer, battre en retraite...), applique les effets (`AnyEffect` — dégâts dynamiques, pioche, déplacement d'énergie...) et retourne le nouvel état + d'éventuels prompts à destination du joueur. Utilisé identiquement par les sessions de tournoi, casuelles et d'entraînement — seul le transport (WebSocket temps réel vs IA locale) diffère.

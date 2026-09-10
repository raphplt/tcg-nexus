---
title: Gamification & Réseau Social
---

TCG Nexus intègre des mécaniques d'engagement communautaire et de fidélisation réparties entre la gamification (défis et badges), le suivi social (abonnements et fil d'actualité) et le classement mondial des joueurs.

---

## 1. Gamification : Défis & Badges

### Badges (`/badges`)
Les badges récompensent les accomplissements notables sur la plateforme (premier achat, première victoire en tournoi, collectionneur de 500 cartes, deck master, etc.).

- `GET /badges` (Public) : catalogue des badges existants.
- `GET /badges/user/:userId` (Public) : badges débloqués par un utilisateur avec la date d'obtention.

### Défis (`/challenges`)
Les défis proposent des missions ponctuelles ou récurrentes avec gains d'expérience (XP) ou récompenses cosmétiques.

- `GET /challenges/active` (Public) : liste des défis en cours (objectifs, période de validité, récompenses).
- `GET /challenges/user/progress` (JWT) : suivi de la progression de l'utilisateur connecté sur les défis actifs.
- `POST /challenges/:id/claim` (JWT) : réclamer la récompense d'un défi complété avec succès.

---

## 2. Réseau Social : Abonnements & Fil d'actualité

### Suivi d'utilisateurs (`/users/:id/follow`)
Permet à un joueur de s'abonner aux activités d'autres collectionneurs, organisateurs ou compétiteurs.

- `POST /users/:id/follow` (JWT) : s'abonner au profil d'un utilisateur cible.
- `DELETE /users/:id/follow` (JWT) : se désabonner d'un profil.
- `GET /users/:id/followers` (Public) : liste des abonnés d'un utilisateur.
- `GET /users/:id/following` (Public) : liste des abonnements d'un utilisateur.

### Fil d'actualité personnalisé (`/feed`)
Flux d'événements temps réel généré pour l'utilisateur connecté d'après les actions de ses abonnements :

- Nouvelles annonces mises en vente sur la place de marché ;
- Decks publics créés ou partagés ;
- Inscriptions et résultats notables en tournoi ;
- Badges d'accomplissement débloqués.

Endpoints :
- `GET /feed` (JWT) : récupération paginée des dernières activités du réseau de l'utilisateur (`page`, `limit`).

---

## 3. Classement Mondial des Joueurs (`/ranking`)

Distinct du classement restreint à un tournoi précis ([Tournois](./tournaments)), le module `/ranking` suit la performance globale des joueurs toutes compétitions et parties confondues.

- **Score ELO** : calculé à l'issue de chaque match officiel ou partie casuelle classée.
- **Points d'expérience (XP) & Niveaux** : cumulés par l'activité sur la plateforme (tournois, défis, victoires).

### Endpoints
- `GET /ranking/global` (Public) : top des meilleurs joueurs au classement général mondial.
- `GET /ranking/me` (JWT) : position et statistiques détaillées du joueur connecté.
- `GET /ranking/elo/me` (JWT) : historique d'évolution de la cote ELO du joueur connecté.
- `GET /ranking` (Public) : recherche paginée et filtrée sur l'ensemble des joueurs classés.
- `POST /ranking`, `PATCH /ranking/:id`, `DELETE /ranking/:id` (ADMIN / MODERATOR) : administration manuelle et arbitrages exceptionnels de cotes.

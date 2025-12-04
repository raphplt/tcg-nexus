---
title: Utilisateurs & rôles
---

Gestion des comptes et rôles (admin, moderator, pro, user). Endpoints protégés par `JwtAuthGuard` + `RolesGuard` selon les actions.

- **Base path** : `/users`
- **Auth requise** : oui (sauf certaines lectures publiques inexistantes ici)

## Endpoints

- `POST /users` (ADMIN) : créer un utilisateur (email, password, rôle...).
- `GET /users` (ADMIN, MODERATOR) : lister tous les utilisateurs.
- `GET /users/me` : récupérer son profil complet.
- `GET /users/:id` (ADMIN, MODERATOR) : lire un utilisateur.
- `PATCH /users/:id` (ADMIN) : mise à jour d’un utilisateur.
- `PATCH /users/me` : mettre à jour son propre profil.
- `DELETE /users/:id` (ADMIN) : suppression.

## Notes d’usage

- Combinez avec `/auth/profile` pour un profil léger côté front.
- Les rôles sont définis dans `src/common/enums/user.ts`.
- Utilisez les cookies JWT émis par `/auth/login` pour authentifier les requêtes.

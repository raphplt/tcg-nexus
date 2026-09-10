---
title: Utilisateurs, Profils & Rôles
---

Le module Utilisateurs gère les comptes membres, leurs préférences personnelles et leurs profils de joueur public.

- **Base path** : `/users`
- **Authentification** : requise pour la gestion de son profil et l'administration ; consultation du profil public accessible sans token.

---

## 1. Rôles applicatifs & Permissions (RBAC)

Les rôles d'accès sont définis dans `src/common/enums/user.ts` :

| Rôle | Portée des permissions |
|---|---|
| **`user`** | Rôle standard attribué par défaut. Accès à la marketplace, collections, decks, tournois et matches. |
| **`moderator`** | Modération des annonces marketplace, arbitrage des litiges et supervision des tournois. |
| **`admin`** | Accès sans restriction : gestion des utilisateurs, exécution des opérations de compensation et réglages globaux. |

> [!NOTE]
> Le statut vendeur professionnel est représenté par l'attribut booléen `isPro` sur l'entité `User`, distinct du système de rôles RBAC.

---

## 2. Profil Joueur (`Player`)

Chaque utilisateur est associé en relation 1-to-1 avec une entité `Player` qui conserve ses statistiques de jeu :
- **Score ELO** : cote de niveau compétitif mise à jour après chaque match classé ou tournoi officiel ;
- **Expérience (`xp`) & Niveau (`level`)** : progression cumulée par l'activité sur la plateforme ;
- **Historique de parties** : nombre de victoires, de défaites et de matches nuls.

---

## 3. Endpoints de l'API

- `GET /users/me` (JWT) : récupérer les informations complètes du compte connecté (profil, adresse de livraison, langue préférée `preferredLocale`).
- `PATCH /users/me` (JWT) : mettre à jour ses informations personnelles (prénom, nom, langue, mot de passe).
- `GET /users/:id/public` (Public) : consulter la fiche publique d'un joueur (pseudo, avatar, niveau ELO, collection publique et badges).
- `POST /users` (ADMIN) : création manuelle d'un compte avec attribution explicite de rôle.
- `GET /users` (ADMIN / MODERATOR) : annuaire paginé des utilisateurs enregistrés avec filtres de recherche.
- `GET /users/:id` (ADMIN / MODERATOR) : consultation administrative d'un compte.
- `PATCH /users/:id` (ADMIN) : mise à jour administrative d'un compte (changement de rôle, bannissement).
- `DELETE /users/:id` (ADMIN) : suppression d'un compte.

Pour les fonctionnalités de réseau social (abonnements et abonnés), consultez [Gamification & Réseau Social](./social-gamification).

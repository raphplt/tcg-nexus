---
title: Authentification & Sessions
---

L'authentification de l'API de **TCG Nexus** s'appuie sur une architecture **double token JWT** (access token à durée courte et refresh token rotatif) stockés dans des **cookies sécurisés httpOnly**, éliminant les vulnérabilités de vol de session par injection de scripts (XSS).

- **Base path** : `/auth`
- **Authentification requise** : non pour la connexion, l'inscription et le rafraîchissement ; requise pour la déconnexion et la consultation du profil.

---

## 1. Cycle de vie des jetons & Sécurité

1. **Connexion / Inscription** :
   - Le serveur génère un `accessToken` (durée de vie : 15 minutes) et un `refreshToken` (durée de vie : 7 jours par défaut, ou 30 jours si le header `x-remember-me: true` est fourni).
   - Les jetons sont injectés dans la réponse sous forme de cookies `Set-Cookie` avec les attributs `httpOnly`, `SameSite=Lax` (ou `None` en production multi-domaines) et `Secure`.
2. **Rotation transparente des Refresh Tokens** :
   - Lors de l'expiration de l'`accessToken`, le client Web déclenche automatiquement un appel à `POST /auth/refresh`.
   - L'ancien `refreshToken` est invalidé et remplacé par une nouvelle paire de jetons.
3. **Protection contre le CSRF** :
   - Le middleware `csrf-origin.middleware.ts` compare systématiquement l'en-tête `Origin` de chaque requête modifiante (`POST`, `PUT`, `PATCH`, `DELETE`) à la variable de configuration autorisée `FRONTEND_URL`.

---

## 2. Endpoints de l'API

| Méthode | Route | Accès | Description |
|---|---|---|---|
| `POST` | `/auth/login` | Public | Authentification par email et mot de passe. Émet les cookies de session. |
| `POST` | `/auth/register` | Public | Création d'un nouveau compte utilisateur (`email`, `password`, `firstName`, `lastName`). |
| `POST` | `/auth/refresh` | Cookie requis | Renouvelle la paire de tokens et prolonge la session. |
| `POST` | `/auth/logout` | JWT | Invalide le refresh token en base et supprime les cookies du navigateur. |
| `GET` | `/auth/profile` | JWT | Retourne les données de profil du compte connecté (`id`, `email`, rôles, `isPro`). |

---

## 3. Rôles & Autorisations

- L'accès aux routes protégées est régulé par la combinaison du guard global `JwtAuthGuard` et du guard de rôles `RolesGuard`.
- Les routes publiques sont explicitement exemptées à l'aide du décorateur `@Public()`.

---
title: Authentification & sessions
---

Auth API basée sur JWT avec stockage des tokens en cookies httpOnly. Swagger disponible sur `/api` en dev.

- **Base path** : `/auth`
- **Auth requise** : non pour `login`/`register`/`refresh` (refresh via cookie), oui pour `logout` et `profile`

## Endpoints

- `POST /auth/login` (public) : email + password, option `x-remember-me: true` dans les headers pour des cookies plus longs. Retour : `user`, cookies `accessToken` + `refreshToken` (httpOnly, sameSite=lax en dev).
- `POST /auth/register` (public) : email, password, firstName, lastName. Retour : `user` + cookies.
- `POST /auth/refresh` : nécessite cookie `refreshToken`, renvoie nouveaux tokens (cookies mis à jour).
- `POST /auth/logout` : supprime les cookies et invalide le refresh token.
- `POST /auth/profile` : renvoie le profil courant (id, email, nom, rôle, isPro).

## Sécurité

- Guard global `JwtAuthGuard` + rate limiting (Throttler) sur login/register/refresh.
- CORS : `http://localhost:3000` en dev (ou `FRONTEND_URL` en prod).
- Cookies sécurisés (`secure` + `sameSite=none`) en production, domaine ajusté via `COOKIE_DOMAIN` ou `FRONTEND_URL`.

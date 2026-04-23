# ADR-002 — JWT access token court + refresh token rotatif avec période de grâce

- **Statut** : Accepté
- **Date** : 2024
- **Auteurs** : équipe TCG Nexus

## Contexte

Le projet nécessite une authentification utilisateur pour la plupart des fonctionnalités (marketplace, decks, collection, tournois). Deux grandes familles de solutions existaient :

1. **Sessions côté serveur** (ex : `express-session` avec store Redis/Postgres). Le serveur garde l'état des sessions.
2. **JWT** (tokens signés, auto-porteurs). Le serveur ne retient pas d'état, l'authentification est vérifiable à partir de la signature.

Un client mobile (`apps/mobile`) doit pouvoir s'authentifier sur la même API que le client web. L'expérience utilisateur impose que le token puisse être rafraîchi sans redemander le mot de passe à intervalles courts.

## Décision

Le projet utilise un **access token JWT court (15 min par défaut)** + un **refresh token long (30 j)** stocké côté serveur dans l'entité `User`. Les deux sont transportés en **cookies HttpOnly** pour le web, et en réponse JSON pour les clients non-navigateur (mobile).

Le refresh token est **rotatif** : à chaque utilisation, il est régénéré et le précédent est conservé quelques secondes dans `previousRefreshToken` (période de grâce) pour absorber les requêtes concurrentes.

Détails :

- Les secrets JWT et les TTL sont lus via `ConfigService` (`JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`).
- Le `JwtAuthGuard` est appliqué globalement via `APP_GUARD` ; une route publique doit être explicitement décorée `@Public()`.
- Côté frontend, un intercepteur Axios sur `secureApi` déclenche un refresh unique partagé (mutex via une `Promise` stockée) quand une requête reçoit un 401.

## Alternatives considérées

### Sessions serveur classiques

- **+** Invalidation immédiate possible (kill session côté serveur).
- **+** Simplicité conceptuelle.
- **−** État côté serveur à gérer (Redis ou table DB) ; complexité additionnelle.
- **−** Moins naturel pour un client mobile qui préférerait un token à passer dans un header.

### JWT sans rotation

- **+** Plus simple à implémenter.
- **−** Si le refresh token fuite, il reste valide jusqu'à son expiration (30 j) — impact sécuritaire important.

### JWT + rotation stricte (sans période de grâce)

- **+** Sécurité maximale.
- **−** Casse les cas réels où plusieurs requêtes partent en parallèle (ex : onglet inactif qui se réveille et fait 5 requêtes d'un coup) : la première consomme le refresh token, les 4 autres se retrouvent avec un token invalide.

## Conséquences

### Positives

- Les tokens volés côté client (XSS) sont limités dans le temps (15 min pour l'access token).
- La rotation détecte indirectement les vols de refresh token : si l'attaquant utilise un token expiré, la vérification échoue et l'utilisateur légitime est déconnecté à son prochain refresh (pattern classique de détection de compromission).
- La période de grâce évite les déconnexions intempestives dans des conditions réelles (multi-onglets, reconnexion réseau).
- Les cookies HttpOnly rendent impossible la lecture des tokens depuis JavaScript, ce qui limite fortement l'impact d'une XSS.

### Négatives / à surveiller

- La rotation côté backend nécessite des écritures en base à chaque refresh. À volume élevé, ce point pourrait devenir un hotspot (cible : index + transaction courte).
- La logique de refresh côté client (intercepteur Axios + middleware Next.js) doit être maintenue avec soin ; toute régression conduit soit à des boucles de refresh, soit à des déconnexions silencieuses. Des tests sur `utils/fetch.ts` sont prévus dans la roadmap qualité.
- Le secret JWT doit être provisionné par l'environnement (jamais en dur). La révocation d'une session arbitraire nécessite actuellement d'invalider le `refreshToken` en base ; il n'y a pas encore de blacklist d'access tokens (à ajouter si un vrai besoin opérationnel émerge).

---
title: Front-end Next.js
---

## Stack

- **Next.js 16** (App Router) + **React 19**
- Styling : **Tailwind CSS 4**, animations `framer-motion`
- Données : **@tanstack/react-query**, **axios**, gestion d’état **zustand**
- UI : composants Radix UI, icônes **lucide-react**, librairie interne `@repo/ui`
- Paiement : **Stripe** (`@stripe/react-stripe-js`)

## Architecture & routing

- App Router (`apps/web/app/*`), layouts par dossier, routes publiques vs protégées sous `app/(protected)/*`.
- Espace admin : `app/(protected)/admin` (ex. tableau commandes : `app/(protected)/admin/_components/AdminOrdersTable.tsx`).
- Pages clés : `app/auth`, `app/dashboard`, `app/collection`, `app/decks`, `app/pokemon`, `app/marketplace`, `app/tournaments`, `app/result`, `app/strategy`.
- Thème global brutalist dans `app/globals.css` (variables OKLCH, boutons ombrés, grilles animées).

## Accès API & data fetching

- Base API : `NEXT_PUBLIC_API_URL` (fallback `http://localhost:3001` en dev).
- Client axios mutualisé `utils/fetch.ts` :
  - `api` pour appels publics, `secureApi` avec `withCredentials`.
  - `fetcher` et `authedFetch` pour `react-query` / appels typés.
- Services dédiés (ex. `services/auth.service.ts`) : intercepteur 401 + refresh auto des tokens via `/auth/refresh` et header `x-remember-me`.
- Données cache/queries : `@tanstack/react-query` (chargements, invalidations).
- Etat local : stores `zustand` pour des contextes ciblés.

## Authentification côté front

- Cookies httpOnly émis par l’API (`/auth/login`/`register`), rafraîchis par intercepteur axios.
- `authService.scheduleRefresh` planifie un refresh proactif avant expiration.
- Les requêtes protégées utilisent `secureApi`/`authedFetch` pour inclure les cookies et gérer les 401.

## UX / UI

- Thème : variables CSS dans `app/globals.css` (OKLCH, shadows, gradients). Ajouter vos couleurs en changeant les tokens `--color-*`.
- Composants Radix pour l’accessibilité, `@repo/ui` pour les briques internes.
- Animations : classes utilitaires (`animate-fade-in`, `animate-slide-up`, etc.).
- Icônes : `lucide-react`, typographie Lato (définie dans les variables CSS).

## Fonctionnalités couvertes (vues principales)

- **Auth** : login/register, cookies httpOnly, refresh auto.
- **Marketplace** : listing cartes + stats prix, paiement Stripe (intégration côté API), vues vendeur/acheteur.
- **Collections** : gestion des collections, favoris, wishlist, pagination/recherche des items.
- **Decks** : création/édition, duplication, compteur de vues, formats (`/deck-format`) et cartes associées (`/deck-card`).
- **Tournois** : liste/upcoming/past, détails, inscriptions, brackets/matches (consomme `/tournaments`).
- **Pokémon** : catalogue cartes/sets/séries, recherche et sélection.

## Configuration

```bash
# apps/web/.env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Le CORS côté API autorise `http://localhost:3000` en développement.

## Démarrage & build

```bash
cd apps/web
npm run dev      # http://localhost:3000
npm run build && npm start
```

## Qualité

- Lint : `npm run lint` ou `npm run lint:fix`
- Types : `npm run check-types`
- Tests : `npm run test` (Vitest + Testing Library, JSDOM)

## Bonnes pratiques pour contribuer

- Utiliser `authedFetch`/`secureApi` pour toutes les routes protégées afin de profiter du refresh auto.
- Centraliser les clés de cache `react-query` (ex. `['tournaments']`, `['marketplace','listings']`) pour invalider correctement après mutation.
- Respecter les variables de thème (`--color-*`, `--font-*`) pour rester aligné avec le design.
- Tester les formulaires sensibles (auth, checkout, création de deck/collection) avec `npm run test` + scénarios manuels contre l’API locale.

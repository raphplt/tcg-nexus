---
title: Front-end Next.js
---

## Stack

- **Next.js 16** (App Router) + **React 19**
- Styling : **Tailwind CSS 4**, animations `framer-motion`
- Données : **@tanstack/react-query**, **axios**, gestion d’état **zustand**
- UI : composants Radix UI, icônes **lucide-react**, librairie interne `@repo/ui`
- Paiement : **Stripe** (`@stripe/react-stripe-js`)

## Structure des pages

- `app/auth` : flux d’authentification.
- `app/dashboard`, `app/result`, `app/strategy` : vues loggées (insights, recherches).
- `app/collection`, `app/decks`, `app/pokemon`, `app/marketplace`, `app/tournaments` : fonctionnalités principales (collections, decks, catalogue, marketplace, tournois).
- `app/(protected)/admin` : espace admin (ex. tableau des commandes : `app/(protected)/admin/_components/AdminOrdersTable.tsx`).

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

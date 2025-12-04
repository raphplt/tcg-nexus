---
title: Marketplace & paiements
---

Gestion des listings, commandes et analytics de cartes. Deux ensembles d’endpoints existent :
- `/marketplace/*` (nouveaux)
- `/listings/*` (compatibilité rétro)

**Auth** : `JwtAuthGuard` requis pour publier/acheter, rôles `pro` ou `ADMIN/MODERATOR` selon l’action. Lecture publique pour les listings et stats.

## Listings (v2 `/marketplace`)

- `POST /marketplace/listings` (role `pro`) : publier une annonce.
- `GET /marketplace/listings` (public) : lister (filtres via `FindAllListingsQuery` : recherche, setId, serieId, prix min/max, rareté, état, tri...).
- `GET /marketplace/listings/my-listings` : annonces du vendeur courant.
- `GET /marketplace/listings/:id` (public) : détail d’une annonce.
- `PATCH /marketplace/listings/:id` (auth) : éditer son annonce.
- `DELETE /marketplace/listings/:id` (auth) : supprimer son annonce.

## Listings (legacy `/listings`)

Équivalents pour compatibilité : `POST /listings`, `GET /listings`, `GET /listings/my-listings`, `GET /listings/:id`, `PATCH /listings/:id`, `DELETE /listings/:id`.

## Commandes

- `POST /marketplace/orders` : créer une commande depuis un listing.
- `GET /marketplace/orders` : commandes de l’acheteur courant.
- `GET /marketplace/orders/:id` : détail d’une commande (acheteur).
- `GET /marketplace/admin/orders` (ADMIN/MODERATOR) : commandes avec filtres admin.
- `GET /marketplace/admin/orders/:id` (ADMIN/MODERATOR) : détail admin.
- `PATCH /marketplace/admin/orders/:id/status` : changer le statut (expédiée, annulée, etc.).

## Données cartes & stats

- `GET /marketplace/cards` (public) : cartes enrichies marketplace avec pagination/tri (`page`, `limit`, `search`, `setId`, `serieId`, `rarity`, `currency`, `cardState`, `priceMin`, `priceMax`, `sortBy`, `sortOrder`).
- `GET /marketplace/cards/:id/stats` (public) : stats prix/état d’une carte (filtres `currency`, `cardState`).
- `GET /marketplace/best-sellers` (public) : top vendeurs (`limit`).
- `GET /marketplace/sellers/:id` (public) : stats d’un vendeur.
- `GET /marketplace/sellers/:id/listings` (public) : annonces d’un vendeur.

## Webhooks & paiement

Stripe est configuré côté module (`payment.controller.ts`, `webhook.controller.ts`), les routes webhook sont exposées sous `/webhook/*` et `/payments/*` pour la confirmation de paiement (voir Swagger pour les schémas). Pensez à configurer la clé Stripe et l’URL webhook en environnement.

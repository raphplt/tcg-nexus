---
title: Front-end Next.js
---

L'application Web de **TCG Nexus** (`apps/web`) est construite avec **Next.js 16** (App Router) et **React 19**. Elle offre une interface moderne, réactive et internationalisée pour les collectionneurs, marchands et compétiteurs.

---

## 1. Stack technique

- **Framework** : **Next.js 16** avec architecture **App Router** et Server Components.
- **Rendu & État** : **React 19**, **@tanstack/react-query** (cache et mutations asynchrones) et **zustand** pour l'état client localisé.
- **Styling & Design** : **Tailwind CSS 4**, animations fluides avec **framer-motion**, icônes vectorielles **lucide-react**, et primitives accessibles **Radix UI**.
- **Composants d'affichage résilients** : composant `SmartImage` avec gestionnaire de repli automatique (*fallback*) en cas d'indisponibilité ou d'erreur de chargement d'image CDN.
- **Paiements** : **Stripe Elements** (`@stripe/react-stripe-js`).
- **Internationalisation** : **next-intl** avec détection automatique et routes préfixées `/[locale]` (Français et Anglais).

---

## 2. Organisation du Routing (`app/[locale]/`)

Le routing est structuré par groupes fonctionnels :

```
apps/web/app/[locale]/
├── auth/                      -> Écrans de connexion, inscription et réinitialisation
├── (main)/                    -> Layout applicatif standard avec barre de navigation et footer
│   ├── (protected)/           -> Pages nécessitant une authentification JWT
│   │   ├── admin/             -> Backoffice d'administration (commandes, utilisateurs, ops)
│   │   ├── cart/              -> Panier d'achat multi-vendeurs
│   │   ├── feed/              -> Fil d'actualité des activités de ses abonnements
│   │   ├── orders/            -> Suivi des commandes passées et bons de réception
│   │   ├── seller/            -> Espace vendeur (gestion des ventes, expéditions et solde)
│   │   └── support/           -> Messagerie et tickets de support client
│   ├── blog/                  -> Articles et actualités officielles
│   ├── challenges/            -> Défis communautaires et réclamation des récompenses
│   ├── collection/            -> Gestion des collections, wishlists et imports CSV
│   ├── dashboard/             -> Tableau de bord synthétique du joueur connecté
│   ├── decks/                 -> Deck builder, listes de decks, bibliothèque et analyses IA
│   ├── faq/                   -> Foire aux questions dynamique
│   ├── marketplace/           -> Exploration des annonces, filtres, fiches de vente et checkout
│   ├── play/                  -> Hub d'accès aux parties en ligne et matchmaking
│   ├── pokemon/               -> Catalogue officiel, séries, extensions et mini-jeux
│   ├── ranking/               -> Classement mondial ELO/XP des joueurs
│   ├── tournaments/           -> Liste des tournois, inscriptions, brackets et horloges
│   └── users/                 -> Profils publics des joueurs et suivi
└── (match)/
    └── play/                  -> Layout immersif plein-écran dédié aux matches en direct
```

---

## 3. Fonctionnalités majeures de l'interface

### Place de Marché & Achat sécurisé
- Recherche avancée de cartes et de produits scellés par état d'usure, langue, extension et prix.
- Création et édition d'annonces à l'aide d'un explorateur de catalogue partagé.
- Panier d'achat multi-vendeurs avec vérification de devise cohérente.
- Formulaire de paiement sécurisé Stripe Elements avec gestion du `clientSecret`.
- Tableau de bord vendeur : suivi des commandes à expédier, renseignement du numéro de suivi (`trackingNumber`) et consultation du grand livre de settlement.

### Constructeur de Decks & Intelligence Artificielle
- Interface interactive d'assemblage de decks respectant la règle des 60 cartes.
- Panneau d'analyse en temps réel via le moteur local :
  - Graphiques radar de consistance, courbe d'énergie et distribution des types ;
  - Diagnostics automatiques des faiblesses et des lignes d'évolution orphelines ;
  - Détection de l'archétype et carrousel de decks similaires (`pgvector`) ;
  - Suggestions intelligentes de cartes basées sur le taux d'adoption des compétiteurs.
- Bibliothèque de decks personnels (`/decks/me`), duplication en un clic et génération de code de partage.

### Tournois & Arbitrage
- Consultation des arbres de tournois (rondes suisses et élimination directe).
- Dépôt et audit de conformité de deck avant tournoi (TRN-02).
- Affichage synchronisé de l'horloge officielle de round (TRN-03).
- Classements dynamiques avec calcul des métriques officielles de départage (Match Points, OMW%, GW%, OGW% - TRN-04).
- Tableau de bord personnel du participant avec statut de son match actif (TRN-05).

### Mini-jeux interactifs (`/pokemon/mini-games`)
- **Le Juste Prix** : estimation de cotes chronométrée avec affichage du score de précision.
- **Case Opening** : simulation visuelle d'ouverture de boosters avec animation de révélation des cartes et calcul des gains comparés.
- **Pokédle, Who's that Pokémon & Smash or Pass** : jeux d'animation communautaires.

---

## 4. Communication API & Gestion des sessions

- **Client Axios unifié** (`utils/fetch.ts`) :
  - `api` : requêtes publiques sans accréditations ;
  - `secureApi` : requêtes authentifiées avec transmission automatique des cookies httpOnly (`withCredentials: true`) ;
  - Intercepteur 401 automatique : tente un rafraîchissement transparent du jeton de session via `POST /auth/refresh` avant de rejouer la requête d'origine.
- **Requêtes asynchrones** : hooks typés s'appuyant sur `@tanstack/react-query` pour la mise en cache, la déduplication et l'invalidation automatique après mutation.

---

## 5. Commandes de développement

```bash
cd apps/web

# Démarrer le serveur de développement (http://localhost:3000)
npm run dev

# Vérification des types TypeScript
npm run check-types

# Linter avec Biome
npm run lint
npm run lint:fix

# Exécuter les tests unitaires et de composants avec Vitest
npm run test

# Compiler pour la production
npm run build && npm start
```

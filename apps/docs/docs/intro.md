---
title: TCG Nexus
slug: /
---

Bienvenue dans la documentation technique officielle de **TCG Nexus**.

TCG Nexus est une plateforme écosystème complète dédiée aux passionnés, joueurs compétitifs et collectionneurs du jeu de cartes à collectionner Pokémon (**Pokémon TCG**).

Orchestré sous forme de monorepo moderne propulsé par **Turborepo** et les **workspaces npm**, le projet réunit :

- **Front-end Web (`apps/web`)** : application Next.js 16 (React 19, Tailwind CSS 4, Radix UI) offrant la marketplace, la gestion de collection avec import/export CSV, le constructeur de deck assisté par IA, la gestion des tournois, le hub de jeu en ligne temps réel et les mini-jeux interactifs ;
- **API Backend (`apps/api`)** : serveur NestJS 11 et TypeORM sur PostgreSQL avec extension `pgvector` (authentification JWT/cookies sécurisés, catalogue multilingue, logique marketplace avec verrous pessimistes et Stripe, moteur de tournois et rondes suisses, moteur d'analyse de decks déterministe et passerelles WebSocket) ;
- **Application Mobile (`apps/mobile`)** : application nomade Expo / React Native (Expo 56) avec reconnaissance de cartes physiques par photo (double pipeline on-device et serveur), notifications push et consultation de collection ;
- **Microservice Vision (`apps/vision`)** : service Python (FastAPI) de détection de cartes, recadrage de perspective, OCR multi-frame Tesseract, matching visuel ORB et vectorisation d'embeddings CLIP (512 dimensions) ;
- **Microservice Fetch (`apps/fetch`)** : service Express proxifiant l'API TCGdex pour le préchargement et la synchronisation continue du catalogue ;
- **Documentation (`apps/docs`)** : portail documentaire technique propulsé par Docusaurus 3 ;
- **Packages partagés (`packages/*`)** : contrats TypeScript (`@repo/scan-contract`), moteur de parsing d'effets de cartes (`@repo/effect-parser`), dataset versionné (`@repo/pokemon-dataset`), bibliothèque UI (`@repo/ui`) et configurations TypeScript partagées (`@repo/typescript-config`).

---

## Guide de lecture

- **[Prise en main](./guides/installation)** : prérequis, variables d'environnement et guide pas-à-pas pour lancer le projet en local ;
- **[Architecture globale](./architecture/monorepo)** : organisation du monorepo, flux d'échange entre microservices et modèle relationnel de données ;
- **[Packages partagés](./architecture/packages)** : rôles et contrats des bibliothèques internes réutilisables ;
- **[Backend NestJS](./backend/api)** : architecture de l'API, catalogue, decks, marketplace, tournois, moteur de jeu, IA, mini-jeux et services internes ;
- **[Front-end & Mobile](./frontend/web)** : architectures client Next.js et Expo React Native ;
- **[Services & Microservices](./services/vision)** : pipelines de vision par ordinateur, OCR, CLIP et ingestion TCGdex ;
- **[Exploitation & Déploiement](./ops/deployment)** : conteneurisation Docker, suites de tests de validation, déploiement Coolify et topologie Cloudflare Tunnel.

---
title: TCG Nexus
slug: /
---

Bienvenue dans la documentation technique de **TCG Nexus**. Ce dépôt mono-repo (Turborepo + workspaces npm) regroupe :

- un front-end Next.js (`apps/web`) pour la place de marché et la gestion de collections ;
- une API NestJS (`apps/api`) branchée sur PostgreSQL pour l’authentification, le catalogue et les fonctions métier ;
- un microservice Express pour synchroniser les données TCGdex (`apps/fetch`) ;
- des paquets partagés (`packages/*`) pour les configs TypeScript, ESLint et l’UI ;
- cette documentation Docusaurus (`apps/docs`).

Cette doc détaille l’installation, l’architecture, les modules front/back, l’exploitation (Docker) et les commandes utiles pour développer ou démontrer le POC.

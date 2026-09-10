---
title: Tests, Qualité & Intégration Continue
---

TCG Nexus applique une stratégie de test et de validation rigoureuse sur l'ensemble de ses applications et bibliothèques partagées.

---

## 1. API NestJS (`apps/api`)

### Tests Unitaires & Intégration
Développés avec **Jest** et exécutés sans dépendances externes réseau :

```bash
cd apps/api

# Lancer la suite complète de tests unitaires
npm run test

# Exécuter les tests en mode watch
npm run test:watch

# Mesurer la couverture de code
npm run test:cov

# Tester un module spécifique (ex: IA, Tournois ou Marketplace)
npm test -- src/ai
npm test -- src/tournament
npm test -- src/marketplace
```

### Tests End-to-End (E2E) sur PostgreSQL Éphémère
Les tests E2E des flux critiques (cycle de vie complet d'un tournoi, passages de commande marketplace et réservations de stock) s'exécutent sur une instance PostgreSQL dédiée et jetable :

```bash
cd apps/api

# Lance un conteneur Postgres sur le port 55432, joue les scénarios et détruit le conteneur
npm run test:e2e:tournament

# Tests E2E de collections et commandes
npm run test:e2e
```
Ce mécanisme garantit que la base de développement locale n'est jamais polluée ou altérée par les tests E2E.

---

## 2. Front-end Next.js (`apps/web`)

### Tests Unitaires & Composants
Propulsés par **Vitest** et **React Testing Library** dans un environnement DOM simulé (JSDOM) :

```bash
cd apps/web

# Exécuter les tests Vitest
npm run test

# Lancer les tests en mode interactif (watch)
npm run test:watch

# Contrôle des types TypeScript
npm run check-types
```

---

## 3. Microservice Vision (`apps/vision`)

Les tests du service Python 3.12 valident la chaîne de traitement d'image, le redressement géométrique, l'OCR Tesseract, le matching ORB et la protection anti-SSRF :

```bash
# Depuis la racine avec l'environnement virtuel Python
.venv-vision/bin/python scripts/run-vision-tests.py
```
Le runner dédié vérifie que chaque test requis a été réellement exécuté sans être silencieusement ignoré (*skipped*).

---

## 4. Contrôles de Qualité Globaux (Monorepo)

Turborepo unifie les contrôles de conformité sur l'ensemble du monorepo depuis la racine :

```bash
# Vérification stricte des types TypeScript sur tous les workspaces
npm run check-types

# Linter avec Biome (détection de code mort, variables inutilisées, formatage)
npm run lint

# Formatage automatique
npm run format

# Exécution de l'intégralité des suites de tests du projet
npm test
```

---

## 5. Pipeline d'Intégration Continue (GitHub Actions)

À chaque ouverture de Pull Request ou commit sur la branche principale, le workflow CI exécute automatiquement :
1. La vérification de formatage et de linting Biome ;
2. La validation des types TypeScript sur l'API, le Web, le Mobile, les microservices et les packages ;
3. Les suites de tests unitaires (Web, API, Fetch, Vision, Parser d'effets) ;
4. Les scénarios E2E sur PostgreSQL éphémère.

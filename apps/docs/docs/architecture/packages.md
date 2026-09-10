---
title: Packages partagés
---

Le monorepo TCG Nexus mutualise plusieurs bibliothèques et contrats au sein du dossier `packages/`. Ces paquets sont consommés par les applications (`apps/api`, `apps/web`, `apps/mobile`) via les workspaces npm.

```
packages/
├── scan-contract/     -> DTOs et contrats d'échange pour le pipeline de scan
├── effect-parser/     -> Moteur de parsing et structuration des effets de cartes
├── pokemon-dataset/   -> Données statiques et seeds versionnés du catalogue
├── ui/                -> Bibliothèque de composants React partagés
└── typescript-config/ -> Configurations TypeScript communes (tsconfig)
```

---

## 1. `@repo/scan-contract`

Contrat TypeScript partagé entre l'API NestJS (`apps/api`) et l'application mobile Expo (`apps/mobile`) pour assurer la cohérence des échanges dans le pipeline de reconnaissance de cartes physiques.

### Rôle et contenu

- **DTOs de requête** : types pour les envois d'images brutes ou de champs pré-extraits (`ScanRecognizeDto`, etc.).
- **Modèles de réponse** : structure de `ScanRecognizeResponse` renvoyée par `POST /scan/recognize`.
- **Candidats et scoring** : définition des candidats scorés (`ScanCardCandidate`), avec score de confiance global, similarité textuelle, score visuel et statut de correspondance.
- **Régions d'intérêt (ROI)** : coordonnées normalisées des boîtes de détection pour le nom et le numéro de set (`BoundingBox`, `DetectionBox`).
- **Niveaux de confiance** : énumération `ScanConfidenceLevel` (`HIGH`, `MEDIUM`, `LOW`, `NONE`) indiquant au client si un arbitrage manuel de l'utilisateur est nécessaire.

```typescript
import type { ScanRecognizeResponse, ScanCardCandidate, ScanConfidenceLevel } from "@repo/scan-contract";
```

---

## 2. `@repo/effect-parser`

Moteur d'analyse lexicale et syntaxique des textes d'attaques et de talents (capacités) des cartes Pokémon. Il transforme le texte libre non structuré fourni par TCGdex en structures de données exploitables par le moteur de règles et l'analyseur IA.

### Fonctionnalités

- **Normalisation de texte** : nettoyage des symboles d'énergie, ponctuation, casse et formulations officielles du JCC Pokémon.
- **Classification d'effets** :
  - **Dégâts** : dégâts de base, modificateurs conditionnels, dégâts de banc, auto-dégâts.
  - **Énergie** : attachement depuis le deck ou la défausse, accélération, coût de retraite, défausse d'énergie.
  - **Pioche & Recherche** : cartes piochées, tuteur (recherche ciblée de Pokémon, dresseurs, objets), mélange de deck.
  - **États spéciaux** : Poison, Brûlure, Sommeil, Paralysie, Confusion.
  - **Effets passifs et restrictions** : blocage de repli, prévention de dégâts, blocage de talents.
- **Sortie structurée** : produit un schéma d'effets typé (`ParsedEffect`, `EffectCondition`, `EffectTarget`) persisté dans le catalogue de cartes sous le champ `parsedEffects`.
- **Consommation** :
  - Alimente le script de synchronisation `npm run sync:effects` pour enrichir la base de données.
  - Consommé par le module IA (`apps/api/src/ai/engine/card-roles.ts`) pour calculer les ratios de pioche, recherche et accélération d'un deck.

---

## 3. `@repo/pokemon-dataset`

Ensemble de données statiques versionnées du catalogue Pokémon. Il sert de source de données locale autonome pour les tests et l'initialisation de l'environnement de développement.

### Rôle et contenu

- **Référentiel des séries et des sets** : liste ordonnée des extensions (depuis le Bloc Écarlate et Violet jusqu'aux séries historiques).
- **Cartes préchargées** : jeux de données de cartes avec leurs identifiants officiels, types, points de vie (HP), raretés et URLs d'illustrations.
- **Traductions FR / EN** : correspondances linguistiques pour les noms de cartes, de séries et de sets.
- **Utilisation** :
  - Utilisé par le script `npm run seed` en mode hors-ligne sans solliciter directement les APIs tierces.
  - Utilisé comme fixtures de référence pour les tests de régression de l'API et de l'analyseur de decks.

---

## 4. `@repo/ui`

Bibliothèque interne de composants d'interface graphique React, stylisés avec Tailwind CSS et intégrant les primitives accessibles de Radix UI.

### Contenu

- Boutons et déclencheurs d'actions (`Button`, `IconButton`).
- Composants de formulaire accessibles (`Input`, `Select`, `Checkbox`, `Label`).
- Conteneurs et cartes (`Card`, `Badge`, `Avatar`, `Separator`).
- Éléments interactifs complexes (`Dialog`, `DropdownMenu`, `Tabs`, `Tooltip`).

---

## 5. `@repo/typescript-config`

Partage des configurations du compilateur TypeScript (`tsconfig.json`) pour garantir des règles de typage strictes et homogènes à travers tout le monorepo :

- `base.json` : options de compilation strictes communes (`strict: true`, `noImplicitAny: true`, etc.).
- `nextjs.json` : configuration adaptée au bundler et à l'App Router de Next.js.
- `nestjs.json` : configuration avec support des décorateurs expérimentaux (`experimentalDecorators`, `emitDecoratorMetadata`) requis par NestJS et TypeORM.
- `react-library.json` : configuration pour les bibliothèques de composants React partagées.

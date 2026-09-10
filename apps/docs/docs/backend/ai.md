---
title: Module IA & Analyse de Decks
---

Le module **IA & Deck Intelligence** de TCG Nexus fournit une suite d'outils analytiques avancés pour évaluer la viabilité d'un deck de cartes Pokémon, diagnostiquer ses forces et faiblesses, identifier son archétype et suggérer des améliorations stratégiques.

Fidèle aux principes de souveraineté et de reproductibilité du projet, ce module fonctionne **sans aucun appel à un service LLM payant externe** (pas de clé d'API tierce, coût nul, fonctionnement hors-ligne garanti) :
1. Un **moteur déterministe local** fondé sur l'analyse de règles métier et des effets de cartes parsés ;
2. Un système de **similarité vectorielle d'archétypes** basé sur l'extension PostgreSQL `pgvector` et des embeddings CLIP (512 dimensions).

---

## 1. Architecture interne

Le moteur analytique est isolé dans `apps/api/src/ai/` et mis à disposition de l'ensemble de l'application via `AiEngineModule` :

| Composant | Fichier source | Rôle |
|---|---|---|
| Rôles fonctionnels | `src/ai/engine/card-roles.ts` | Déduit les rôles d'une carte (pioche, tuteur, accélération d'énergie...) depuis ses `parsedEffects`. |
| Lignes d'évolution | `src/ai/engine/evolution-lines.ts` | Reconstitue les chaînes Évolution (Base → Niveau 1 → Niveau 2) et signale les incohérences. |
| Diagnostics & Règles | `src/ai/engine/deck-diagnostics.ts` | Catalogue de règles expertes bilingues (FR/EN) avec sévérité (`INFO`, `WARNING`, `CRITICAL`). |
| Système de notation | `src/ai/engine/deck-scoring.ts` | Calcule les sous-scores dimensionnels et le score global avec traçabilité complète des contributions. |
| Moteur principal | `src/ai/engine/deck-metrics.service.ts` | Orchestrateur déterministe qui agrège l'ensemble des métriques d'un deck. |
| Similarité vectorielle | `src/ai/similarity/deck-similarity.service.ts` | Recherche d'archétypes similaires et suggestions par cosinus de distance `pgvector`. |

---

## 2. Analyse déterministe (`DeckInsightsDto`)

L'évaluation d'un deck produit un objet d'analyse complet contenant :

### A. Composition & Structure
- Décompte total de cartes (règle standard : 60 cartes).
- Distribution par catégorie (Pokémon, Dresseurs, Énergies) et par type élémentaire.
- Courbe d'énergie et coût d'attaque moyen (cible optimale : ~2 énergies).
- Coût de retraite moyen et respect de la limite de 4 exemplaires par carte (hors énergies de base).

### B. Rôles fonctionnels
Dérivés directement de `parsedEffects` (générés par `@repo/effect-parser`) :
- **Moteur de pioche** : cartes permettant de renouveler la main.
- **Tuteurs & Recherche** : recherche ciblée de Pokémon de base/évolués ou de cartes Dresseur.
- **Accélération d'énergie** : pose d'énergies supplémentaires depuis le deck ou la défausse.
- **Récupération** : recyclage de cartes depuis la pile de défausse.
- **Mobilité & Repli** : cartes d'échange et réduction du coût de retraite.
- **Contrôle & Perturbation** : cartes de défausse adverse, blocage ou changement forcé de Pokémon actif (effets de type "Ordres du Boss").

> [!NOTE]
> **Règle de consistance tour 1** : Les effets de pioche ou de tutorat attachés aux attaques des Pokémon sont volontairement exclus du calcul de consistance de départ. Une attaque qui pioche ne permet pas de stabiliser une sortie au tour 1 si le Pokémon n'est pas encore prêt.

### C. Lignes d'évolution
Vérification des dépendances entre Pokémon :
- Lignes **orphelines** (`orphan`) : Pokémon évolué présent alors que sa sous-évolution de base est absente du deck.
- Lignes **sous-dimensionnées** (`under-supported`) : nombre insuffisant de Pokémon de base pour soutenir le nombre d'évolutions.

### D. Système de scoring multi-axes
Chaque deck est évalué sur un score de base de **100**, modulé par des contributions signées explicites :

| Dimension | Poids | Facteurs clés analysés |
|---|:---:|---|
| **`legality`** | 25% | Conformité au format de jeu officiel (Standard, Expanded) via `DeckLegalityService`. |
| **`consistency`** | 25% | Taille du deck, densité du moteur de pioche, tuteurs, accès aux bases. |
| **`energy`** | 20% | Équilibre du nombre d'énergies, adéquation avec les coûts d'attaque et présence d'accélérateurs. |
| **`curve`** | 15% | Répartition des coûts en énergie des attaques et coût moyen de retraite. |
| **`evolution`** | 10% | Cohérence et complétude des chaînes d'évolution. |
| **`focus`** | 5% | Cohérence typologique (pénalise l'éparpillement non synergique sur trop de types d'énergie différents). |

### E. Honnêteté et garde-fous
- **Indice de confiance (`scores.confidence`)** : si la couverture des effets parsés du deck est inférieure à 50%, le moteur refuse d'affirmer un manque de pioche ou de tuteur (le code d'avertissement `EFFECTS_COVERAGE_LOW` est émis).
- **Statut de légalité explicite** : si le format ou les cartes d'un deck ne peuvent être pleinement audités, le statut `unverified` ou `not-checked` est retourné à la place de `valid`.

---

## 3. Similarité vectorielle & Archétypes (`pgvector`)

Pour détecter l'archétype d'un deck et recommander des cartes adaptées, le système projette chaque deck dans un espace vectoriel :

1. **Vecteurs de cartes (`card_embedding`)** : chaque illustration de carte possède un vecteur d'embedding de **512 dimensions** généré par le microservice [Vision](../services/vision) à l'aide d'un modèle CLIP.
2. **Vecteur d'archétype (`deck_embedding`)** : calculé comme la **moyenne pondérée par les quantités** des vecteurs de ses cartes constitutives :
   - Un playset de 4 exemplaires pèse 4 fois plus lourd qu'un exemplaire unique ;
   - **Les énergies de base sont exclues du calcul** : communes à tous les decks, elles fausseraient la distance vectorielle en rapprochant artificiellement des archétypes distincts.
3. **Suggestions de cartes** : calculées par le taux d'adoption statistique au sein des decks voisins les plus proches (*« Cette carte est jouée par 80% des decks de cet archétype, en moyenne en 3 exemplaires »*).

```bash
# Générer les embeddings visuels des cartes (nécessite le microservice Vision)
npm run embed:cards -w api

# Calculer les embeddings vectoriels des decks existants (100% SQL, aucun réseau)
npm run embed:decks -w api
```

### Dégradation gracieuse
Si l'extension `pgvector` n'est pas installée, si la table est absente ou si aucun voisin n'est identifié, les routes de similarité répondent avec un code HTTP `200` et un payload explicatif (`{ available: false, reason: "...", items: [] }`), permettant au front-end d'afficher un message informatif sans provoquer d'erreur.

---

## 4. Endpoints de l'API

| Méthode | Route | Accès | Description |
|---|---|---|---|
| `POST` | `/deck/:id/analyze` | Public | Analyse complète d'un deck persisté en base (respecte la visibilité privée). |
| `POST` | `/ai/decks/analyze` | Public (rate limited) | Analyse d'un ensemble de cartes temporaire/en cours d'édition dans le Deck Builder (`AnalyzePoolDto`). |
| `GET` | `/ai/decks/:id/similar` | Public | Liste les decks publics les plus proches par cosinus de similarité vectorielle. |
| `GET` | `/ai/decks/:id/suggestions` | Public | Propose des cartes recommandées absentes du deck de référence mais surreprésentées chez ses voisins. |

# Plan — Remise à niveau du module IA

> **Statut au 2026-09-09 : phases 0 à 3, 5 et 6 livrées.** La phase 4 (couche
> Claude) est écartée — budget nul, tout tourne en local. La documentation du
> module tel que livré est dans [`doc/module-ia.md`](../module-ia.md).
>
> | Phase | Statut |
> |---|---|
> | 0 — contrat | ✅ `/ai/analyzeDeck` supprimée, `DeckInsightsDto`, diagnostics codés + i18n |
> | 1 — déduplication + sécurité | ✅ moteur unique, `assertCanViewDeck` sur toutes les routes |
> | 2 — moteur déterministe | ✅ rôles via `parsedEffects`, lignes d'évolution, légalité, scores traçables |
> | 3 — similarité vectorielle | ✅ `deck_embedding`, `embed:decks`, 2 endpoints, dégradation gracieuse |
> | 4 — couche Claude | ❌ écartée (budget nul, local uniquement) |
> | 5 — front | ✅ web (légalité, scores serveur, voisins) et mobile (score + légalité) |
> | 6 — tests | ✅ 49 tests sur le module, aucun appel réseau |

Date : 2026-09-09
Périmètre : `apps/api/src/ai`, `apps/api/src/deck` (analyse), `packages/effect-parser`, front web/mobile.

---

## 1. État des lieux

### 1.1 Le module `ai` ne contient aucune IA et n'est utilisé par personne

`apps/api/src/ai/` = 983 lignes dont 517 de tests, pour un seul endpoint `POST /ai/analyzeDeck`.

**Endpoint mort.** Les deux clients appellent une autre route :

- `apps/web/services/decks.service.ts:89` → `POST /deck/:id/analyze`
- `apps/mobile/services/deck.service.ts:77` → `POST /deck/:id/analyze`

C'est `DeckService.analyzeDeck` (`apps/api/src/deck/deck.service.ts:292`) qui sert le produit. `/ai/analyzeDeck` n'a aucun consommateur.

**Doublon dégradé.** `AiService.performAnalysis` (`ai.service.ts:76`) refait ce que fait `DeckService.analyzeDeck`, en moins bien :

| Capacité | `DeckService.analyzeDeck` | `AiService.performAnalysis` |
|---|---|---|
| Résolution des libellés localisés | oui (`CatalogLocalizationService`) | non → casse en FR |
| Mapping catégories FR/EN (`energie`/`dresseur`) | oui | non |
| Règle des 4 exemplaires hors énergies | oui | non (`qty > 1` = « doublon ») |
| Contrôle d'accès deck privé | `assertCanViewDeck` | **aucun** (`@Public()`) |
| Ratio énergie/Pokémon, coût moyen | oui | non |

### 1.2 Défauts propres au module

- `@Public()` sur `ai.controller.ts:23` + zéro contrôle d'accès = analyse de n'importe quel deck privé par ID.
- Chaînes utilisateur en français codées en dur dans le service (`ai.service.ts:153-175`, `212-241`) alors que le projet est i18n.
- `detectSynergies` compte les cartes **distinctes**, pas les quantités (`cardIds.length >= 3`) : 3 exemplaires d'une carte ne déclenchent pas la synergie, 3 cartes différentes oui.
- Chaîne d'évolution comparée par `name.toLowerCase()` (`ai.service.ts:234`) : dépend de la locale résolue, donc non déterministe.
- Branche `cardIds` : les quantités sont comptées sur le tableau d'entrée mais la requête déduplique — un pool de 60 cartes avec doublons produit un `totalCards` incohérent.
- Les « synergies » sont trois `if` sur des seuils arbitraires (3 cartes du même type, 5 dresseurs). Ce n'est ni de l'IA ni une analyse de deck.

### 1.3 Ce qui existe déjà et n'est pas exploité

| Actif | Où | Utilisé par |
|---|---|---|
| pgvector + `card_embedding` (CLIP) | `src/scripts/embed-cards.ts`, service vision | scan uniquement |
| Effets de cartes structurés (`parsedEffects` jsonb) | `pokemon-card-details.entity.ts:92` | moteur de jeu online |
| Pipeline LLM offline multi-providers | `packages/effect-parser/src/providers/` | CLI de parsing d'effets |
| Validation de légalité réelle | `tournament/services/deck-legality.service.ts` | tournois |

Autrement dit : le projet a de la vraie matière (vecteurs, effets structurés, règles de légalité) et le « module IA » n'en utilise rien.

### 1.4 Contraintes d'infra

- Pas de Redis / `CacheModule` → tout cache doit être en base.
- `ThrottlerModule` global à 300 req/min, aucune limite spécifique.
- `packages/effect-parser/src/providers/anthropic.ts:14` cible `claude-sonnet-4-6`, modèle de génération précédente, et fait du `fetch` manuel au lieu du SDK officiel.

### 1.5 Rappel du critère produit

`doc/roadmap/plan-pre-soutenance.md:116` (parcours C) :

> l'analyse retourne un résultat lisible même si le fournisseur IA est indisponible

Ce critère dicte l'architecture : **moteur déterministe obligatoire, LLM en surcouche facultative**.

---

## 2. Cible

```
                POST /deck/:id/analyze        (existant, inchangé pour les clients)
                POST /ai/decks/analyze        (nouveau, pool ad-hoc du deck builder)
                            |
                    AiModule (moteur)
                            |
   +------------------------+------------------------+
   |                        |                        |
DeckMetricsService   DeckSimilarityService     DeckNarrativeService
(déterministe)       (pgvector)                (Claude, optionnel)
   |                        |                        |
parsedEffects        deck_embedding            dégradation gracieuse
DeckLegalityService  card_embedding            si pas de clé / timeout
```

Règle d'or : les phases 1→3 produisent un résultat complet **sans** appel réseau. La phase 4 n'ajoute que de la restitution en langage naturel et des justifications ; sa panne n'enlève rien.

---

## 3. Phases

### Phase 0 — Geler le contrat (0,5 j)

1. Supprimer `POST /ai/analyzeDeck` (aucun consommateur → pas de rupture).
2. `AiModule` devient le moteur de domaine ; `DeckController` conserve sa route publique et délègue.
3. Ajouter `POST /ai/decks/analyze` pour l'analyse d'un pool de cartes non persisté (deck builder).
4. DTO unique `DeckInsightsDto` : warnings et recommandations deviennent des objets machine
   `{ code: "DECK_INCOMPLETE", severity: "error", params: { count: 58 } }`,
   traduits côté client via `apps/web/messages/`. Fin des chaînes FR dans le service.

**Livrable :** DTO + routes figées, front encore sur l'ancien rendu.

### Phase 1 — Dédupliquer et sécuriser (1 j)

1. Déplacer la logique de `DeckService.analyzeDeck` vers `ai/engine/deck-metrics.service.ts` (c'est la version correcte).
2. `DeckService.analyzeDeck` délègue → **zéro changement pour web et mobile**.
3. Supprimer `AiService.performAnalysis` et `detectSynergies`.
4. Retirer `@Public()` ; appliquer `assertCanViewDeck` (deck public → anonyme autorisé, deck privé → propriétaire seul).
5. Corriger le comptage des quantités sur la branche `cardIds`.
6. Rebrancher `ai.service.spec.ts` et `deck.analyze.spec.ts` sur le service unifié.

**Critère de sortie :** `npm run check-types` + suites `api` vertes, réponse de `/deck/:id/analyze` identique à l'octet près hors nouveaux champs.

### Phase 2 — Moteur déterministe crédible (2–3 j)

C'est la phase qui fait que le module cesse d'être « à la ramasse ». Aucune dépendance externe.

1. **Classification fonctionnelle via `parsedEffects`** : pour chaque carte, dériver ses rôles (`draw`, `search`, `energy-acceleration`, `recovery`, `switch`, `disruption`). Le champ existe déjà et est peuplé par `sync:effects`.
2. **Indicateurs de consistance réels** : nombre de pioches, de recherches, de cartes de retour en jeu — au lieu de « ajoutez plus de cartes Dresseur ».
3. **Courbe d'énergie pondérée** par les coûts d'attaque réels et le coût de retraite, mise en regard des accélérations d'énergie détectées.
4. **Lignes d'évolution par identifiant**, plus par nom localisé. Détecter les lignes incomplètes (4 pré-évolutions / 1 évolution, ou l'inverse).
5. **Légalité** : injecter `DeckLegalityService` → l'analyse dit si le deck est jouable en Standard / Expanded et pourquoi non.
6. **Score explicable** : sous-scores consistance / énergie / légalité / courbe, chacun accompagné des règles qui l'ont fait bouger. Pas de note opaque.

**Critère de sortie :** un deck compétitif connu score haut, un deck de 60 cartes aléatoires score bas, et chaque point de score est traçable à une règle.

### Phase 3 — Recommandations par similarité vectorielle (2 j)

1. Table `deck_embedding` (pgvector), vecteur d'archétype = agrégat pondéré des `card_embedding` des cartes du deck + features symboliques (répartition types / catégories / rôles de la phase 2).
2. Script `embed:decks` sur le modèle de `embed:cards`.
   ⚠️ Ne pas restaurer les vecteurs depuis un export QoreDB (corruption connue) — toujours régénérer.
3. `POST /ai/decks/:id/similar` → decks voisins publics.
4. `GET /ai/decks/:id/suggestions` → cartes fréquentes chez les voisins et absentes du deck, avec la fréquence comme justification (« 78 % des decks similaires jouent X en 4 exemplaires »).
5. Dégradation : extension pgvector ou embeddings absents → l'endpoint renvoie une liste vide, jamais une erreur.

### Phase 4 — Couche Claude (2 j, optionnelle)

**Elle ne calcule rien.** Elle reçoit le JSON des phases 2–3 et produit une synthèse lisible et un plan de substitutions justifié.

1. Extraire `packages/effect-parser/src/providers/` vers `packages/llm`, migrer sur le SDK officiel `@anthropic-ai/sdk` (le `fetch` manuel actuel ne gère ni retries, ni erreurs typées, ni streaming).
2. Modèle : `claude-opus-5` par défaut, surchargeable par env ; `claude-haiku-4-5` pour un mode économique.
   Au passage, corriger `claude-sonnet-4-6` codé en dur dans `providers/anthropic.ts` (génération précédente).
3. **Structured outputs** (`output_config: { format: ... }`) pour un JSON validé — pas de parsing de bloc markdown comme aujourd'hui (`anthropic.ts:47`).
4. **Prompt caching** : le system prompt (règles TCG + format de sortie) est stable → `cache_control: { type: "ephemeral" }` dessus ; le deck, volatil, passe après le point de césure. Vérifier `usage.cache_read_input_tokens > 0`, sinon un invalidateur silencieux traîne dans le prefix.
5. **Coût par analyse** (~3–4 k tokens en entrée, ~1 k en sortie) :
   - `claude-opus-5` — 5 $ / 25 $ par Mtok → ≈ 0,04 $, ≈ 0,005 $ en lecture de cache
   - `claude-haiku-4-5` — 1 $ / 5 $ par Mtok → ≈ 0,008 $
6. **Garde-fous, non négociables** :
   - timeout 5 s + coupe-circuit après N échecs consécutifs ;
   - `ANTHROPIC_API_KEY` absente → HTTP 200, `narrative: null`, `degraded: true` ;
   - `@Throttle` dédié (≈ 5/min/utilisateur), le throttler global à 300/min ne protège rien ici ;
   - cache des résultats en table `ai_analysis_cache`, clé = `deckId + deck.updatedAt + version du moteur` (pas de Redis dans le projet) ;
   - journalisation tokens/coût dans le module `audit` ;
   - n'envoyer que des identifiants et noms de cartes — jamais d'e-mail ni de données utilisateur.

**Critère de sortie :** clé API retirée → l'analyse reste complète et le front l'affiche sans erreur. C'est le critère du plan pré-soutenance.

### Phase 5 — Front (1–2 j)

1. `apps/web/app/[locale]/(main)/decks/[id]/analysis/page.tsx` (145 lignes) : scores et sous-scores, badge de légalité, suggestions cliquables, bandeau discret en mode dégradé.
2. États de chargement / erreur / vide (chantier UX-01 du plan pré-soutenance).
3. Mobile : même contrat, `deck.service.ts` inchangé.

### Phase 6 — Tests et CI

1. Fixtures de decks : légal, illégal, ligne d'évolution cassée, pauvre en pioche, 60 cartes aléatoires.
2. Tests unitaires du moteur — c'est là que se trouve la valeur, et c'est testable sans réseau.
3. Un test « provider indisponible → 200 dégradé ».
4. Aucun appel réseau en CI ; provider LLM mocké.
5. Optionnel : jeu d'évaluation de 10–20 decks annotés pour mesurer la pertinence des suggestions dans le temps.

---

## 4. Effort

| Phase | Charge | Bloquante |
|---|---:|---|
| 0 — contrat | 0,5 j | oui |
| 1 — déduplication + sécurité | 1 j | oui |
| 2 — moteur déterministe | 2–3 j | oui |
| 3 — similarité vectorielle | 2 j | non |
| 4 — couche Claude | 2 j | non |
| 5 — front | 1–2 j | oui |
| 6 — tests | inclus | oui |

**Chemin minimal crédible : phases 0 → 2 → 5, soit environ 4,5 jours, sans un centime de coût d'API.**

---

## 5. Décisions à trancher

1. **Budget LLM.** Y a-t-il une clé Anthropic et un budget ? Si non, on s'arrête aux phases 0–3 : le module reste honnête, explicable et gratuit. La phase 4 est un ajout de confort, pas une fondation.
2. **Suppression de `/ai/analyzeDeck`.** Recommandé — zéro consommateur. À confirmer si une intégration externe non trouvée en dépend.
3. **Adversaire IA du mini-game.** Le parcours C du plan pré-soutenance mentionne « une partie d'entraînement contre l'IA » à l'étape 5. Aucun bot n'existe dans `mini-game` ni dans `match/online`. C'est un chantier distinct (bot heuristique au-dessus du moteur de règles existant), à planifier séparément — il n'est pas couvert ici.

---

## 6. Risques

| Risque | Mitigation |
|---|---|
| `parsedEffects` incomplet sur le catalogue | mesurer le taux de couverture avant la phase 2 ; les cartes sans effets parsés retombent sur les heuristiques de catégorie |
| Embeddings de decks coûteux à générer | script reprenable comme `embed:cards`, exécution hors ligne |
| Coût LLM non maîtrisé | cache en base + throttle dédié + journal de coût ; `haiku` en mode économique |
| Régression sur `/deck/:id/analyze` | phase 1 = pure délégation, réponse comparée octet à octet avant/après |

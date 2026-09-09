# Module IA — analyse de deck

Le module s'appelle « IA » mais ne fait appel à **aucun fournisseur externe**.
Tout est calculé localement : règles déterministes sur les données du catalogue,
et similarité vectorielle dans PostgreSQL. Il n'y a ni clé d'API, ni budget, ni
dépendance réseau — une analyse rend le même résultat en ligne et hors ligne.

---

## 1. Où vit quoi

| Chemin | Rôle |
|---|---|
| `apps/api/src/ai/engine/card-roles.ts` | `parsedEffects` → rôles fonctionnels d'une carte |
| `apps/api/src/ai/engine/evolution-lines.ts` | Reconstruction des lignes d'évolution |
| `apps/api/src/ai/engine/deck-diagnostics.ts` | Catalogue des codes de règle + rendu fr/en |
| `apps/api/src/ai/engine/deck-scoring.ts` | Sous-scores et score global, avec traçabilité |
| `apps/api/src/ai/engine/deck-metrics.service.ts` | Le moteur : orchestre tout ce qui précède |
| `apps/api/src/ai/similarity/deck-similarity.service.ts` | Voisins et suggestions par pgvector |
| `apps/api/src/scripts/embed-decks.ts` | Pré-calcul des vecteurs d'archétype |
| `apps/api/src/migrations/1789600000000-DeckEmbeddings.ts` | Table `deck_embedding` |

Le moteur est fourni par `AiEngineModule`, importé à la fois par `DeckModule` et
`AiModule` : la route historique et les nouvelles routes appliquent
**exactement les mêmes règles**, elles ne peuvent pas diverger.

---

## 2. Endpoints

| Route | Auth | Description |
|---|---|---|
| `POST /deck/:id/analyze` | publique, visibilité vérifiée | Analyse d'un deck persisté (route historique, contrat élargi) |
| `POST /ai/decks/analyze` | publique, 30/min | Analyse d'un pool de cartes non persisté (deck builder) |
| `GET /ai/decks/:id/similar` | publique, visibilité vérifiée | Decks publics les plus proches |
| `GET /ai/decks/:id/suggestions` | publique, visibilité vérifiée | Cartes jouées par les voisins et absentes du deck |

Un deck privé reste privé sur toutes les routes : le chargement et le contrôle
d'accès passent systématiquement par `DeckService`.

---

## 3. Ce que produit l'analyse

`DeckInsightsDto` contient :

- **Composition** : totaux, distributions par type / catégorie / coût d'attaque,
  coût de retraite moyen, doublons au-delà de 4 exemplaires (énergies de base
  exemptées).
- **Rôles** (`roles`) : nombre d'**exemplaires** assurant la pioche, la
  recherche, l'accélération d'énergie, la récupération, le repli, la
  perturbation, le soin — dérivés de `parsedEffects`.
- **Lignes d'évolution** (`evolutionLines`) : chaque étape, avec les lignes
  `orphan` (pré-évolution absente) et `under-supported` (moins de
  pré-évolutions que d'évolutions).
- **Légalité** (`legality`) : `valid` / `invalid` / `unverified` / `not-checked`,
  via le même `DeckLegalityService` que les tournois.
- **Scores** (`scores`) : score global + 6 dimensions, chacune accompagnée de
  ses `contributions` signées.
- **Diagnostics** (`diagnostics`) : `{ code, severity, category, params, message }`.
  `warnings` et `suggestions` en sont dérivés pour les clients existants.

### Rôles reconnus

Les rôles sont lus dans `playEffects` / `passiveEffects` (dresseurs) et dans
l'effet de capacité (Pokémon). **Les effets d'attaque sont volontairement
exclus** : un Pokémon qui pioche en attaquant ne rend pas une liste consistante
au tour 1, et le compter gonfle artificiellement le signal de pioche.

### Scores

| Dimension | Poids | Ce qu'elle mesure |
|---|---:|---|
| `legality` | 0,25 | Conformité au règlement du format |
| `consistency` | 0,25 | Taille, pioche, recherche, récupération, repli, limite de copies |
| `energy` | 0,20 | Proportion d'énergies, accélération face au coût moyen |
| `curve` | 0,15 | Coût d'attaque moyen (cible 2) et coût de retraite |
| `evolution` | 0,10 | Lignes complètes et suffisamment soutenues |
| `focus` | 0,05 | Nombre de types joués |

Chaque dimension part de **100** et ne bouge que par des contributions nommées :
un score se retrace toujours jusqu'aux règles qui l'ont produit. Une dimension
non évaluable (légalité sans format) porte `value: null`, `weight: 0`, et le
score global est renormalisé sur les dimensions restantes.

### Honnêteté du moteur

Trois garde-fous, à ne pas retirer :

1. **Sous 50 % de couverture d'effets**, les diagnostics de consistance ne sont
   pas émis. Le moteur ne peut pas distinguer « ce deck n'a pas de pioche » de
   « je n'ai pas su lire les effets » : il signale la couverture (`EFFECTS_COVERAGE_LOW`)
   au lieu d'affirmer une carence.
2. **`scores.confidence`** expose cette couverture pour que l'interface puisse
   pondérer ce qu'elle affiche.
3. **Une légalité non vérifiable n'est jamais présentée comme valide** :
   `unverified` et `not-checked` sont des statuts distincts de `valid`.

---

## 4. Similarité de decks

Le vecteur d'archétype d'un deck est la **moyenne pondérée par les quantités**
des embeddings visuels de ses cartes (`card_embedding`, 512 dimensions, produits
par le service vision). Deux choix expliqués :

- chaque exemplaire compte (`generate_series` sur `qty`) — quatre Dracaufeu
  doivent tirer l'archétype plus fort qu'un seul ;
- **les énergies de base sont exclues** — présentes dans presque toutes les
  listes, elles rapprochent artificiellement tous les archétypes.

Les suggestions de cartes sont justifiées par le **taux d'adoption** mesuré chez
les voisins (« 75 % des decks similaires jouent cette carte, ×3,7 en moyenne »),
pas par un score opaque.

### Mise en route

```bash
npm run embed:cards -w api     # vecteurs de cartes (nécessite le service vision)
npm run embed:decks -w api     # vecteurs d'archétype (100 % SQL, aucun réseau)
```

Le service revectorise un deck à la demande, mais **seulement s'il a changé**
(`deck_embedding.deck_updated_at` comparé à `deck."updatedAt"`) : une lecture
publique ne déclenche pas d'écriture inutile.

⚠️ Ne jamais restaurer ces vecteurs depuis un export : ils se régénèrent.

### Dégradation

pgvector absent, table absente, deck non vectorisé, aucun voisin : les endpoints
répondent **200** avec `{ available, reason, items: [] }`. L'interface affiche le
message correspondant. Aucune de ces situations n'est une erreur serveur.

---

## 5. Tests

```bash
npm --prefix apps/api test -- --no-watchman src/ai
```

- `card-roles.spec.ts` — extraction des rôles, effets inconnus ignorés
- `deck-scoring.spec.ts` — pondération, renormalisation, bornes
- `deck-metrics.service.spec.ts` — composition, évolutions, légalité, i18n
- `deck-similarity.service.spec.ts` — dégradation et mapping des résultats
- `ai.service.spec.ts` / `ai.controller.spec.ts` — orchestration

Aucun test n'ouvre de connexion réseau.

---

## 6. Ce qui n'est pas fait

- **Pas de couche LLM.** Le plan initial (`doc/roadmap/module-ia-plan.md`,
  phase 4) prévoyait une synthèse en langage naturel via Claude. Écartée :
  budget nul, tout doit tourner en local. L'architecture la garde possible —
  elle consommerait le JSON du moteur sans rien recalculer.
- **Pas d'adversaire IA** pour le mini-jeu (parcours C du plan pré-soutenance).
  Aucun bot n'existe dans `mini-game` ni `match/online` : c'est un chantier
  distinct.

# Effect Parser — Ce qu'il reste à faire

## État actuel

| Phase | Statut | Description |
|-------|--------|-------------|
| 1 | ✅ | Système d'effets étendu (39 EffectTypes + DYNAMIC_DAMAGE + CountSource) |
| 2 | ✅ | Package `packages/effect-parser` (schema Zod, 3 providers, CLI, batch processor) |
| 3 | ✅ | Pipeline CSV → CardInput[] + checkpoint/resume + Ctrl+C safe |
| 4 | ⬜ | Intégration dans le moteur de jeu |
| 5 | ⬜ | Validation & Tests |

## Action immédiate : Lancer le parsing

```bash
cd packages/effect-parser
npx tsx src/cli.ts parse-file cards-to-parse.json card-effects-registry.json
```

- **Ctrl+C** pour interrompre → sauvegarde dans `card-effects-registry.json.checkpoint`
- **Relancer la même commande** pour reprendre où on s'est arrêté
- ~3 500 batchs de 5 cartes, ~17 312 cartes au total
- Free tier Gemini : 1 500 RPD → peut nécessiter 2-3 jours

---

## Phase 4 — Intégration dans le moteur de jeu

### 4.1 Remplacer le registry hardcodé

**Fichier :** `apps/api/src/match/online/online-card-registry.ts`

- Charger `card-effects-registry.json` au démarrage (ou via un import JSON)
- Supprimer le `ONLINE_SUPPORTED_CARD_REGISTRY` hardcodé (4 cartes actuellement)
- Adapter `isOnlineSupportedCard()` : une carte est supportée si elle est dans le registry JSON **OU** si c'est une énergie de base
- Adapter `getOnlineSupportedCardDefinition()` : lire depuis le registry JSON

```typescript
// Avant
export const ONLINE_SUPPORTED_CARD_REGISTRY: Record<string, SupportedCardDefinition> = {
  "xy7-5": { ... },
  // 4 cartes hardcodées
};

// Après
import registryData from "../../../card-effects-registry.json";
export const ONLINE_SUPPORTED_CARD_REGISTRY: Record<string, SupportedCardDefinition> = registryData;
```

### 4.2 Implémenter les EffectResolver handlers manquants (TODO Phase 4)

Les effets suivants dans `EffectResolver.ts` délèguent à des méthodes `initiate*()` du GameEngine qui sont actuellement des stubs (émettent un event mais ne créent pas de prompt). Il faut :

| Méthode stub | Prompt à créer | Description |
|---|---|---|
| `initiateSearchDeck()` | `ChooseCardFromDeck` | Afficher les cartes filtrées du deck, le joueur choisit |
| `initiateSearchDiscard()` | `ChooseCardFromDiscard` | Afficher les cartes de la défausse, le joueur choisit |
| `initiateDiscardFromHand()` | `ChooseCardFromHand` | Le joueur choisit quelle(s) carte(s) défausser |
| `initiateMoveEnergy()` | `ChooseEnergyToMove` | Choisir l'énergie source et la cible |
| `initiateAttachEnergyFromDeck()` | `ChooseCardFromDeck` (filtre énergie) | Chercher énergie dans le deck |
| `initiateAttachEnergyFromDiscard()` | `ChooseCardFromDiscard` (filtre énergie) | Chercher énergie dans la défausse |
| `initiateSwitchOpponentActive()` | `ChooseOpponentBenchTarget` | Choisir quel Pokémon adverse monter |
| `initiateSwitchOwnActive()` | `ChooseBenchTarget` | Choisir quel Pokémon monter |
| `initiateRevive()` | `ChooseCardFromDiscard` (filtre Basic) | Choisir un Pokémon de base à ressusciter |
| `initiateCopyAttack()` | `ChooseAttackToCopy` | Choisir quelle attaque copier |

Pour chaque méthode :
1. Créer un `PendingPrompt` avec le bon `PromptType` (déjà ajoutés dans `enums.ts`)
2. Mettre le prompt sur `state.pendingPrompt`
3. Stocker le contexte de l'effet en cours (ex: dans `state.pendingTrainerPlay` ou un nouveau champ)
4. Implémenter la résolution dans `respondToPrompt()` du GameEngine

### 4.3 Système d'effets temporels

Actuellement `applyTemporaryEffect()`, `applyPlayerEffect()` et `applyGlobalEffect()` sont des stubs. Il faut :

1. **Ajouter un champ `temporaryEffects` sur `PokemonCardInGame`** :
```typescript
interface PokemonCardInGame {
  // ... existant
  temporaryEffects: TemporaryEffect[];
}

interface TemporaryEffect {
  type: string; // "PREVENT_DAMAGE" | "REDUCE_DAMAGE" | "CANT_ATTACK" | "CANT_RETREAT" | "BOOST_DAMAGE" | "CANT_USE_SAME_ATTACK"
  amount?: number;
  attackName?: string; // Pour CANT_USE_SAME_ATTACK
  expiresAt: { turnNumber: number; playerId: string }; // Expire à la fin de ce tour de ce joueur
}
```

2. **Ajouter `playerEffects` sur `PlayerState`** :
```typescript
interface PlayerState {
  // ... existant
  playerEffects: PlayerEffect[];
}

interface PlayerEffect {
  type: string; // "TRAINER_LOCK"
  lockType?: string; // "ALL" | "ITEM" | "SUPPORTER" | "STADIUM"
  expiresAt: { turnNumber: number; playerId: string };
}
```

3. **Vérifier les effets temporels** dans :
   - `attack()` → vérifier `CANT_ATTACK`, `CANT_USE_SAME_ATTACK` avant d'autoriser l'attaque
   - `retreat()` → vérifier `CANT_RETREAT` avant d'autoriser la retraite
   - `playTrainer()` → vérifier `TRAINER_LOCK` avant d'autoriser les cartes Dresseur
   - Calcul de dégâts → appliquer `REDUCE_DAMAGE` et `PREVENT_DAMAGE`
   - Calcul de dégâts → appliquer `BOOST_DAMAGE`

4. **Nettoyer les effets expirés** dans `endTurn()` / début du tour suivant

### 4.4 DYNAMIC_DAMAGE dans le calcul d'attaque

Actuellement `computeDynamicDamage()` est implémenté dans GameEngine, mais l'attaque dans `attack()` ne l'utilise pas encore pour les dégâts de base dynamiques (30+, 80-, 10×).

**Fichier :** `GameEngine.ts` → méthode `attack()`

Modifier le calcul de dégâts pour :
1. Lire le `damage` de base de l'attaque (ex: "30+", "80-", "10x")
2. Si c'est un string avec +/-/×, chercher l'effet `DYNAMIC_DAMAGE` dans les effects de l'attaque
3. Appliquer : `baseDamage + dynamicAmount` (pour +), `max(0, baseDamage - dynamicAmount)` (pour -), ou `dynamicAmount` (pour ×, les dégâts de base sont 0)

---

## Phase 5 — Validation & Tests

### 5.1 Gold standard (50 cartes vérifiées manuellement)

Créer un fichier `packages/effect-parser/tests/fixtures/gold-standard.json` avec 50 cartes dont les effets ont été vérifiés à la main. Couvrir :
- 5 cartes avec `DYNAMIC_DAMAGE` (par énergie, par marqueur, par banc, par main, par récompense)
- 5 cartes avec `COIN_FLIP` (simple, multi, until tails)
- 5 cartes avec `DISCARD_ENERGY` (fixe, ALL, type spécifique)
- 5 cartes avec `APPLY_SPECIAL_CONDITION` (chaque condition)
- 5 cartes avec `PREVENT_DAMAGE` / `REDUCE_DAMAGE`
- 5 cartes avec `SEARCH_DECK` / `SEARCH_DISCARD`
- 5 cartes avec `SWITCH_*`
- 5 cartes Dresseur (Item, Supporter avec différents effets)
- 5 cartes avec effets combinés complexes
- 5 cartes avec talents (abilities)

### 5.2 Test de précision du parsing

```typescript
// packages/effect-parser/tests/accuracy.test.ts
import goldStandard from "./fixtures/gold-standard.json";
import registry from "../card-effects-registry.json";

for (const [cardId, expected] of Object.entries(goldStandard)) {
  test(`${cardId} should match gold standard`, () => {
    expect(registry[cardId]).toEqual(expected);
  });
}
```

### 5.3 Métriques à mesurer

- **Taux de parsing** : % de cartes parsées sans erreur Zod
- **Taux de précision** : % de cartes correspondant au gold standard
- **Couverture des EffectTypes** : combien des 39 types apparaissent dans le registry
- **Taux de `effects: []`** sur des attaques qui ont un texte d'effet → devrait être proche de 0 après ajout de DYNAMIC_DAMAGE

### 5.4 Tests d'intégration (matchs automatiques)

Créer dans `apps/api/src/match/engine/` un test qui :
1. Monte un match avec 2 decks contenant des cartes du registry
2. Simule des actions (jouer Pokémon, attacher énergie, attaquer)
3. Vérifie que les effets se résolvent correctement (dégâts dynamiques, coin flips, états spéciaux)

### 5.5 Script CI

```bash
# Dans .github/workflows ou en script npm
# Re-parse un subset de 50 cartes et compare au gold standard
npx tsx src/cli.ts parse-file tests/fixtures/gold-standard-input.json test-output.json
# Comparer test-output.json avec gold-standard.json
```

---

## Améliorations futures (hors scope initial)

- **Parsing des talents complexes** : actuellement les talents avec des mécaniques avancées (déplacer marqueurs, bloquer par type, etc.) donnent `effects: []`. Ajouter des EffectTypes dédiés si nécessaire.
- **Énergies Spéciales** : parser les effets des cartes Énergie Spéciale (Rainbow, Double Turbo, etc.)
- **Re-parsing ciblé** : script qui identifie les cartes avec `effects: []` malgré un texte d'effet, et les re-parse après ajout de nouveaux EffectTypes.
- **Versionning du registry** : stocker la version du schema utilisée pour chaque parsing, permettre le re-parsing incrémental.

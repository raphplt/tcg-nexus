# Effect Parser & Jeu en ligne — Ce qu'il reste à faire

> Dernière mise à jour : 2026-03-27

## État actuel

| Phase | Statut | Description |
|-------|--------|-------------|
| 1 | ✅ | Système d'effets étendu (39 EffectTypes + DYNAMIC_DAMAGE + CountSource) |
| 2 | ✅ | Package `packages/effect-parser` (schema Zod, 3 providers, CLI, batch processor) |
| 3 | ✅ | Pipeline CSV → CardInput[] + checkpoint/resume + Ctrl+C safe |
| 4 | ✅ | Intégration dans le moteur de jeu (EffectResolver, initiate*, effets temporels, DYNAMIC_DAMAGE) |
| 5 | ⬜ | Validation & Tests |
| 6 | ⬜ | Parsing complet des 17 312 cartes |

---

## Ce qui est implémenté (recap)

### Moteur de jeu (`apps/api/src/match/engine/`)

- **32 EffectTypes** entièrement gérés dans `EffectResolver.ts` (DAMAGE, DYNAMIC_DAMAGE, HEAL, COIN_FLIP, SEARCH_DECK, TRAINER_LOCK, etc.)
- **10 méthodes initiate*** avec prompts joueur :
  - `initiateSearchDeck()` → prompt `ChooseCardFromDeck` avec filtres
  - `initiateSearchDiscard()` → prompt `ChooseCardFromDiscard`
  - `initiateDiscardFromHand()` → prompt `ChooseCardFromHand`
  - `initiateMoveEnergy()` → résolution directe
  - `initiateAttachEnergyFromDeck()` → résolution directe + shuffle
  - `initiateAttachEnergyFromDiscard()` → résolution directe
  - `initiateSwitchOpponentActive()` → auto-switch ou prompt `ChooseOpponentBenchTarget`
  - `initiateSwitchOwnActive()` → auto-switch ou prompt `ChooseBenchTarget`
  - `initiateRevive()` → prompt `ChooseCardFromDiscard` (filtre Basic)
  - `initiateCopyAttack()` → auto-select ou prompt `ChooseAttackToCopy`
- **DYNAMIC_DAMAGE** intégré dans `attack()` avec 18 CountSources (énergie, marqueurs, banc, main, défausse, prizes, lost zone)
- **Effets temporels** sur `PokemonCardInGame.temporaryEffects[]` (PREVENT_DAMAGE, REDUCE_DAMAGE, CANT_ATTACK, CANT_RETREAT, BOOST_DAMAGE, CANT_USE_SAME_ATTACK)
- **Effets joueur** sur `PlayerState.playerEffects[]` (TRAINER_LOCK avec lockType)
- **Effets globaux** sur `GameState.globalEffects[]` (ABILITY_LOCK)
- **Expiration automatique** des effets selon leur durée (UNTIL_YOUR_NEXT_TURN, UNTIL_NEXT_OPPONENT_TURN, etc.)
- **Vérifications** : CANT_ATTACK avant attaque, CANT_RETREAT avant retraite, TRAINER_LOCK avant jeu de dresseur

### Registry de cartes (`apps/api/src/match/online/online-card-registry.ts`)

- Charge `card-effects-registry.json` au démarrage
- Fallback sur 5 cartes hardcodées si le fichier n'existe pas
- Merge des deux registres (parsé prioritaire)

### Parsing (`packages/effect-parser/`)

- 730 cartes parsées avec succès (92.4% de taux de succès sur les cartes tentées)
- 60 cartes en échec de parsing
- **16 522 cartes restantes à parser**
- Checkpoint sauvegardé dans `card-effects-registry.json.checkpoint`

---

## Ce qu'il reste à faire

### 1. 🔴 Parsing complet des cartes (bloqueur principal)

Le moteur est prêt mais n'a les effets que de 730 cartes sur 17 312.

```bash
cd packages/effect-parser
npx tsx src/cli.ts parse-file cards-to-parse.json card-effects-registry.json
```

- **Ctrl+C** pour interrompre → sauvegarde dans `.checkpoint`
- **Relancer la même commande** pour reprendre
- ~3 350 batchs restants de 5 cartes

| Provider | Option CLI | Estimation |
|----------|-----------|------------|
| Gemini (gratuit) | `--provider gemini` (défaut) | 2-3 jours (1 500 RPD free tier) |
| Anthropic | `--provider anthropic` | Plus rapide (payant) |
| OpenAI | `--provider openai` | Plus rapide (payant) |

Options utiles :
- `--batch-size 10` — plus de cartes par batch (moins d'appels API, mais plus de risque d'erreur)
- `--delay 500` — délai entre batchs en ms
- `--limit 100` — limiter pour tester

### 2. 🟡 Fix EXTRA_PRIZE (1 seul TODO dans le moteur)

**Fichier :** `GameEngine.ts` → `markExtraPrize()`

```typescript
// TODO actuel :
public markExtraPrize(playerId: string, amount: number) {
  // TODO: Add pendingExtraPrize field to GameState
}
```

**À faire :**
1. Ajouter `pendingExtraPrize: number` sur `PlayerState` (défaut 0)
2. Dans `markExtraPrize()` : incrémenter `player.pendingExtraPrize += amount`
3. Dans la logique de prise de prizes (après KO) : prendre `1 + pendingExtraPrize` prizes puis reset à 0

### 3. 🟡 Phase 5 — Validation & Tests

#### 3.1 Gold standard (50 cartes vérifiées manuellement)

Créer `packages/effect-parser/tests/fixtures/gold-standard.json` avec 50 cartes couvrant :

| Catégorie | Nb | EffectTypes couverts |
|-----------|-----|---------------------|
| Dégâts dynamiques | 5 | DYNAMIC_DAMAGE (par énergie, marqueurs, banc, main, prizes) |
| Lancers de pièce | 5 | COIN_FLIP, MULTI_COIN_FLIP, FLIP_UNTIL_TAILS |
| Défausse d'énergie | 5 | DISCARD_ENERGY (fixe, ALL, type spécifique) |
| États spéciaux | 5 | APPLY_SPECIAL_CONDITION (chaque condition) |
| Protection | 5 | PREVENT_DAMAGE, REDUCE_DAMAGE |
| Recherche | 5 | SEARCH_DECK, SEARCH_DISCARD |
| Switch | 5 | SWITCH_OPPONENT_ACTIVE, SWITCH_OWN_ACTIVE |
| Dresseurs | 5 | Item, Supporter avec effets variés |
| Effets combinés | 5 | Cartes avec 3+ effets |
| Talents | 5 | Abilities avec effets variés |

#### 3.2 Test de précision

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

#### 3.3 Métriques à mesurer

- **Taux de parsing** : % de cartes parsées sans erreur Zod (cible : >95%)
- **Taux de précision** : % de cartes correspondant au gold standard (cible : >90%)
- **Couverture des EffectTypes** : combien des 39 types apparaissent dans le registry
- **Taux d'effets vides** : attaques avec texte d'effet mais `effects: []` (cible : <5%)

#### 3.4 Tests d'intégration (matchs automatiques)

Créer dans `apps/api/src/match/engine/` un test qui :
1. Monte un match avec 2 decks contenant des cartes du registry
2. Simule des actions (jouer Pokémon, attacher énergie, attaquer)
3. Vérifie que les effets se résolvent correctement

---

## Gap catalog vs parser

Le catalog (`doc/effect-types-catalog.md`) liste **199 types d'effets** mais le parser/moteur n'en gère que **39**. Les types non couverts sont des variantes qui sont **composées** à partir des 39 types de base :

| Catégorie manquante | Nb | Impact |
|---------------------|-----|--------|
| Conditions/triggers (IF_COIN_HEADS, IF_MORE_PRIZES...) | 16 | Moyen — certains effets conditionnels ne se déclenchent pas |
| Talents types (passive, between turns, active only...) | 7 | Faible — le moteur gère les abilities mais pas leurs sous-types |
| Règles Pokémon (ex, GX, V, VSTAR...) | 16 | Faible — règles de prizes/noms, pas d'effets mécaniques |
| Énergies Spéciales | 9 | Moyen — Double Turbo, Rainbow, etc. pas parsées |
| Ancient Traits | 8 | Faible — cartes anciennes, peu jouées |
| Once-per-game (GX attack, VSTAR power) | 3 | Moyen — pas de restriction d'usage unique |

**Note :** Les 39 types actuels couvrent la majorité des mécaniques de jeu courantes. Les types manquants affectent surtout les cartes de formats compétitifs récents (GX, V, VSTAR) et les énergies spéciales.

---

## Améliorations futures (hors scope immédiat)

- **Conditions/triggers** : Ajouter IF_* dans le schema pour les effets conditionnels (ex: "Si ce Pokémon a au moins 3 énergies attachées...")
- **Énergies Spéciales** : Parser les effets des cartes Énergie Spéciale
- **Once-per-game** : Tracker l'utilisation des attaques GX / pouvoirs VSTAR
- **Re-parsing ciblé** : Script qui identifie les cartes avec `effects: []` malgré un texte d'effet et les re-parse
- **Versioning du registry** : Stocker la version du schema pour permettre le re-parsing incrémental

# Plan de fix — Système d'effets TCG Nexus

> Objectif : reproduire à l'identique le jeu Pokémon TCG Online. Aucun compromis.
> 25 problèmes identifiés, classés par couche (Moteur › Parseur › Schéma) et par sévérité.

---

## Sommaire

- [Phase 1 — Moteur : bugs critiques](#phase-1--moteur--bugs-critiques-5-tickets)
- [Phase 2 — Moteur : bugs majeurs](#phase-2--moteur--bugs-majeurs-6-tickets)
- [Phase 3 — Moteur : bugs moyens](#phase-3--moteur--bugs-moyens-2-tickets)
- [Phase 4 — Parseur](#phase-4--parseur-7-tickets)
- [Phase 5 — Schéma](#phase-5--schéma-5-tickets)

---

## Phase 1 — Moteur : bugs critiques (5 tickets)

### FIX-01 · DYNAMIC_DAMAGE doit être inclus dans le calcul faiblesse/résistance

**Fichiers** : `apps/api/src/match/engine/GameEngine.ts`, `apps/api/src/match/engine/effects/EffectResolver.ts`

**Problème** : La méthode `attack()` calcule les dégâts de base via `calculateAttackDamage()` (qui applique ×2 faiblesse et −N résistance), puis `EffectResolver` ajoute les DYNAMIC_DAMAGE directement dans `targetMon.damageCounters` *après coup*. La partie dynamique bypass donc entièrement faiblesse et résistance.

**Règle TCG** : `total = (baseDamage + dynamicDamage) × weakness − resistance`

**Fix** :
1. Dans `attack()`, avant d'appeler `calculateAttackDamage()`, pré-calculer le total DYNAMIC_DAMAGE en appelant `engine.computeDynamicDamage()` pour chaque effet DYNAMIC_DAMAGE de l'attaque.
2. Sommer les contributions `+` et soustraire les contributions `−` au `baseDamage` avant le passage dans `calculateAttackDamage()`.
3. Retirer le bloc DYNAMIC_DAMAGE de `EffectResolver.resolveEffect()` (ou le rendre no-op si baseDamage a déjà été pris en compte) pour éviter la double application.

```typescript
// Dans attack(), avant calculateAttackDamage() :
let dynamicBonus = 0;
for (const effect of attack.parsedEffects ?? []) {
  if (effect.type === EffectType.DYNAMIC_DAMAGE) {
    const amount = this.computeDynamicDamage(effect, sourcePlayerId, opponentId);
    if (effect.operator === '+') dynamicBonus += amount;
    if (effect.operator === '-') dynamicBonus -= amount;
    if (effect.operator === '×') dynamicBonus = baseDamage * amount - baseDamage;
  }
}
const adjustedBase = Math.max(0, baseDamage + dynamicBonus);
const finalDamage = this.calculateAttackDamage(adjustedBase, attacker, defender);
```

**Tests à écrire** : attaque 10+10/énergie contre Pokémon ×2 faiblesse, 2 énergies → attendu 60, pas 40.

---

### FIX-02 · La retraite ne doit pas supprimer Poison et Brûlure

**Fichier** : `apps/api/src/match/engine/GameEngine.ts` (méthode `retreat()`)

**Problème** :
```typescript
activePokemon.specialConditions = []; // supprime TOUT
```

**Règle TCG** : Seuls Endormi (`Asleep`), Confus (`Confused`) et Paralysé (`Paralyzed`) sont retirés à la retraite. Empoisonné (`Poisoned`) et Brûlé (`Burned`) persistent.

**Fix** :
```typescript
const REMOVED_ON_RETREAT: SpecialCondition[] = ['Asleep', 'Confused', 'Paralyzed'];
activePokemon.specialConditions = activePokemon.specialConditions.filter(
  (c) => !REMOVED_ON_RETREAT.includes(c),
);
```

**Tests à écrire** : Pokémon Empoisonné + Confus qui se retire → Confus retiré, Empoisonné conservé.

---

### FIX-03 · Vérifier la Confusion avant d'attaquer

**Fichier** : `apps/api/src/match/engine/GameEngine.ts` (méthode `attack()`)

**Problème** : Un Pokémon Confus attaque normalement. Dans le TCG, il doit d'abord lancer une pièce.

**Règle TCG** :
- Pile → l'attaque échoue, le Pokémon s'inflige 30 dégâts, fin du tour.
- Face → l'attaque se déroule normalement.

**Fix** — à insérer dans `attack()` juste après la vérification `CANT_ATTACK`, avant l'exécution des effets :

```typescript
if (attacker.specialConditions.includes('Confused')) {
  const flipResult = this.flipCoin(); // heads = true
  events.push({ type: 'CONFUSION_FLIP', result: flipResult ? 'heads' : 'tails' });

  if (!flipResult) {
    // Tails : 30 dégâts sur soi-même, pas d'attaque
    attacker.damageCounters += 30;
    events.push({ type: 'CONFUSION_SELF_DAMAGE', targetInstanceId: attacker.instanceId, amount: 30 });
    this.resolveKnockoutAfterAction(sourcePlayerId, opponentId, events);
    this.endTurn(sourcePlayerId, events);
    return { success: true, events };
  }
  // Heads : l'attaque se déroule normalement
}
```

**Tests à écrire** : Pokémon Confus, flip = tails → 30 dégâts sur soi, pas d'effet d'attaque, fin de tour. Flip = heads → attaque normale.

---

### FIX-04 · Implémenter `markExtraPrize()` pour les Pokémon-EX/GX/V/VSTAR

**Fichiers** : `apps/api/src/match/engine/models/GameState.ts`, `apps/api/src/match/engine/GameEngine.ts`

**Problème** : `markExtraPrize()` est un stub vide. Les KO sur des Pokémon valant 2 ou 3 Prix n'accordent toujours qu'1 Prix.

**Fix en deux étapes** :

**Étape A** — Ajouter `pendingExtraPrizes` à `GameState` :
```typescript
// Dans GameState
pendingExtraPrizes: Record<string, number>; // playerId → nombre de prix supplémentaires
```

**Étape B** — Implémenter `markExtraPrize()` :
```typescript
public markExtraPrize(playerId: string, amount: number) {
  this.state.pendingExtraPrizes[playerId] =
    (this.state.pendingExtraPrizes[playerId] ?? 0) + amount;
}
```

**Étape C** — Dans `knockOutActivePokemon()` / `resolveKnockoutAfterAction()`, utiliser `baseCard.prizeCards ?? 1` et appeler `markExtraPrize` pour `prizeCards - 1` si > 1 :
```typescript
const prizeCount = knockedOut.baseCard.prizeCards ?? 1;
if (prizeCount > 1) {
  this.markExtraPrize(winningPlayerId, prizeCount - 1);
}
// Puis lors de la prise de Prix, ajouter pendingExtraPrizes[playerId] Prix supplémentaires
```

**Tests à écrire** : KO d'un Pokémon-EX (prizeCards=2) → adversaire prend 2 Prix.

---

### FIX-05 · Résoudre les effets des Stades au moment de leur pose

**Fichiers** : `apps/api/src/match/engine/GameEngine.ts` (méthode `playTrainer()`), `apps/api/src/match/engine/effects/EffectResolver.ts`

**Problème** : Quand un Stade est joué, seule sa référence est stockée dans `this.state.stadium`. Ses effets ne sont jamais résolus.

**Fix** :

1. Les effets de Stade sont **passifs/continus**, pas ponctuels. Il faut distinguer deux catégories :
   - **Effets déclenchés** (ex. "quand un Pokémon est posé sur le Banc, soignez 30 dégâts") → hookable.
   - **Effets permanents** (ex. "tous les Pokémon de base ont 30 PV de plus") → évalués dynamiquement.

2. À court terme, pour les effets ponctuels au moment de la pose (rares mais existants) : appeler `EffectResolver.resolveEffects(stadiumCard.parsedEffects, ...)` dans `playTrainer()` après avoir stocké le Stade.

3. Pour les effets permanents : créer un système de hooks dans le moteur (`onDamageCalculated`, `onPokemonPlaced`, etc.) que le Stade actif peut intercepter. Le `stadium` en `GameState` suffit comme référence — chaque méthode concernée doit consulter `this.state.stadium?.baseCard.parsedEffects` et appliquer les modificateurs.

> ⚠️ Ce fix est le plus architectural. Une implémentation complète nécessite d'inventorier les catégories d'effets de Stade existants dans le dataset et de créer les hooks correspondants. À planifier en sprint dédié.

---

## Phase 2 — Moteur : bugs majeurs (6 tickets)

### FIX-06 · EXTRA_ENERGY_ON_SELF doit compter les énergies au-delà du coût

**Fichier** : `apps/api/src/match/engine/GameEngine.ts` (méthode `computeDynamicDamage()`)

**Problème** : Le `case CountSource.EXTRA_ENERGY_ON_SELF` compte toutes les énergies attachées au lieu des énergies en excès du coût de l'attaque.

**Fix** :
```typescript
case CountSource.EXTRA_ENERGY_ON_SELF: {
  const totalEnergy = source.active?.attachedEnergies.filter(
    (e) => !effect.energyType || e.baseCard.provides?.includes(effect.energyType),
  ).length ?? 0;
  // Coût de l'attaque en cours
  const attackCost = currentAttack?.cost?.length ?? 0;
  count = Math.max(0, totalEnergy - attackCost);
  break;
}
```
> Nécessite de passer la référence à `currentAttack` dans `computeDynamicDamage()`.

---

### FIX-07 · `pokemonCheckup()` — Sleep flip uniquement pour le Pokémon Actif du joueur actif

**Fichier** : `apps/api/src/match/engine/GameEngine.ts` (méthode `pokemonCheckup()`)

**Règle TCG** : Le lancer de pièce pour se réveiller du Sommeil (Asleep) ne concerne que le **Pokémon Actif du joueur dont le tour vient de se terminer**. Poison et Brûlure s'appliquent à tous les Pokémon des deux joueurs portant ces états (y compris sur le banc si un Pokémon empoisonné s'est retiré).

**Fix** :
```typescript
// Pour Poison/Burn : itérer sur tous les Pokémon des DEUX joueurs
// Pour Sleep flip : uniquement active du joueur actif
private pokemonCheckup(activePlayerId: string, events: any[]) {
  for (const [playerId, player] of Object.entries(this.state.players)) {
    const allPokemon = [player.active, ...player.bench].filter(Boolean);
    for (const pokemon of allPokemon) {
      this.applyPoisonBurn(pokemon, events); // les deux joueurs
    }
  }
  // Sleep uniquement pour l'actif du joueur actif
  const activePlayer = this.state.players[activePlayerId];
  if (activePlayer.active?.specialConditions.includes('Asleep')) {
    this.applySleepCheck(activePlayer.active, events);
  }
}
```

---

### FIX-08 · BOOST_DAMAGE doit être consommé après une seule utilisation

**Fichier** : `apps/api/src/match/engine/GameEngine.ts`

**Problème** : BOOST_DAMAGE expire au tour N+2, mais devrait être consommé dès la première attaque utilisant le bonus.

**Fix** : Dans `attack()`, après avoir appliqué le BOOST_DAMAGE au calcul des dégâts, retirer immédiatement cet effet du tableau `temporaryEffects` du Pokémon attaquant :
```typescript
attacker.temporaryEffects = attacker.temporaryEffects.filter(
  (e) => e.type !== 'BOOST_DAMAGE' || !e.consumedThisTurn,
);
// Marquer comme consommé avant la résolution des effets
const boostEffect = attacker.temporaryEffects.find(e => e.type === 'BOOST_DAMAGE');
if (boostEffect) boostEffect.consumedThisTurn = true;
```
> Alternative plus propre : supprimer directement l'effet juste après son application dans `calculateAttackDamage()`.

---

### FIX-09 · `CANT_USE_SAME_ATTACK` doit stocker le nom de l'attaque de façon fiable

**Fichier** : `apps/api/src/match/engine/GameEngine.ts` (méthode `applyTemporaryEffect()`)

**Problème** : La lookup dans `events` pour trouver `ATTACK_USED` est fragile — l'événement peut ne pas encore être dans le tableau au moment où l'effet est résolu.

**Fix** : Passer le nom de l'attaque directement en paramètre de contexte lors de la résolution des effets, ou ajouter un champ `currentAttackName` dans le contexte de résolution (`EffectContext`) et l'utiliser dans `applyTemporaryEffect()` :
```typescript
// Dans EffectResolver, lors du CANT_USE_SAME_ATTACK :
engine.applyTemporaryEffect(sourcePokemon.instanceId, {
  ...effect,
  attackName: context.currentAttackName, // passé depuis attack()
}, events);
```

---

### FIX-10 · `handleChooseCardFromDeck()` doit gérer la destination `TOP_DECK`

**Fichier** : `apps/api/src/match/engine/GameEngine.ts`

**Fix** :
```typescript
} else if (effect.destination === 'TOP_DECK') {
  // Replacer la carte en tête de deck (position 0)
  player.deck.unshift(card);
  // Si plusieurs cartes choisies, le joueur doit les ordonner → prompt supplémentaire
  // Pour l'instant : ordre de sélection = ordre dans le deck
}
```
> Si plusieurs cartes sont placées sur le dessus du deck, il faut un prompt d'ordonnancement (cf. règle TCG "dans l'ordre de votre choix").

---

### FIX-11 · `devolvePokemon()` — mauvais instanceId mis en défausse

**Fichier** : `apps/api/src/match/engine/GameEngine.ts`

**Problème** :
```typescript
const topEvo = pokemon.attachedEvolutions.pop()!;
player.discard.push({
  instanceId: pokemon.instanceId, // ← devrait être topEvo.instanceId
  baseCard: pokemon.baseCard,     // ← devrait être topEvo.baseCard
  ...
});
pokemon.baseCard = topEvo.baseCard;
```

**Fix** :
```typescript
const topEvo = pokemon.attachedEvolutions.pop()!;
player.discard.push({
  instanceId: topEvo.instanceId,
  ownerId: pokemon.ownerId,
  baseCard: topEvo.baseCard,
});
pokemon.baseCard = topEvo.baseCard;
pokemon.specialConditions = [];
```

---

## Phase 3 — Moteur : bugs moyens (2 tickets)

### FIX-12 · `initiateDiscardFromHand()` — la défausse obligatoire ne doit pas pouvoir être passée

**Fichier** : `apps/api/src/match/engine/GameEngine.ts`

**Fix** :
```typescript
// allowPass uniquement si le joueur n'a pas assez de cartes éligibles
allowPass: matchingCards.length < discardAmount,
```
Cela permet au joueur de "passer" uniquement s'il n'a physiquement pas assez de cartes à défausser (ce qui déclenche un "défaussez ce que vous pouvez"), mais pas s'il a suffisamment de cartes.

---

### FIX-13 · `LOOK_AT_TOP_DECK` doit proposer un choix d'ordre au joueur

**Fichier** : `apps/api/src/match/engine/GameEngine.ts`

Pour les effets type "Regardez les X premières cartes de votre deck, replacez-les dans l'ordre de votre choix" :

1. Révéler les cartes au joueur (déjà fait).
2. Créer un prompt `PromptType.ReorderCards` permettant au joueur de définir l'ordre.
3. Dans le handler de réponse, replacer les cartes dans `player.deck` selon l'ordre choisi.

> Nécessite d'ajouter `ReorderCards` à `PromptType` et le handler correspondant.

---

## Phase 4 — Parseur (7 tickets)

### FIX-14 · Ajouter `tryShuffleDeck` dans `SIMPLE_PARSERS`

**Fichier** : `packages/effect-parser/src/rule-based-parser.ts`

**Problème** : La fonction `tryShuffleDeck` existe mais n'est pas dans le tableau `SIMPLE_PARSERS`.

**Fix** : Ajouter l'entrée manquante dans le tableau :
```typescript
const SIMPLE_PARSERS: Array<(text: string) => AnyEffect[]> = [
  // ... parseurs existants ...
  tryShuffleDeck, // ← à ajouter
];
```

---

### FIX-15 · `MOVE_ENERGY` — parser les combinaisons from/to réelles

**Fichier** : `packages/effect-parser/src/rule-based-parser.ts`

**Problème** : `tryMoveEnergy` génère toujours `from: "SELF"` et `to: "PLAYER_BENCH"`.

**Patterns français à couvrir** :

| Texte | from | to |
|---|---|---|
| "de ce Pokémon / de votre Actif" | `SELF` | `PLAYER_BENCH` |
| "de votre Banc à votre Actif" | `PLAYER_BENCH` | `PLAYER_ACTIVE` |
| "du Pokémon Actif adverse" | `OPPONENT_ACTIVE` | `SELF` |
| "entre vos Pokémon comme vous le souhaitez" | `ANY` | `ANY` |

**Fix** : Remplacer le parseur actuel par une détection à deux passes (from puis to) avec les patterns correspondants.

---

### FIX-16 · `trySpecialCondition` — ne pas s'arrêter au premier match

**Fichier** : `packages/effect-parser/src/rule-based-parser.ts`

**Fix** : Remplacer `break` par `continue` pour collecter toutes les conditions présentes dans le texte :
```typescript
// Supprimer le break — laisser la boucle continuer
// effects.push(...) pour chaque condition trouvée
```
> Attention : le schéma doit supporter plusieurs `APPLY_SPECIAL_CONDITION` dans le même tableau d'effets, ce qui est déjà le cas.

---

### FIX-17 · `DYNAMIC_DAMAGE` — parser le `maxCount`

**Fichier** : `packages/effect-parser/src/rule-based-parser.ts`

**Fix** : Ajouter un regex après extraction de `amountPerUnit` et `countSource` :
```typescript
const maxM = /\(maximum (\d+) d[eé]g[aâ]ts? suppl[eé]mentaires?\)/i.exec(t);
if (maxM) {
  extra.maxCount = Math.floor(parseInt(maxM[1]!) / amountPerUnit);
}
```

---

### FIX-18 · Garantir l'ordre des effets selon le texte de la carte

**Fichier** : `packages/effect-parser/src/rule-based-parser.ts`

**Problème** : Les effets sont produits dans l'ordre du tableau `SIMPLE_PARSERS`, pas dans l'ordre du texte.

**Fix** : Après la collecte de tous les effets, les trier par position d'apparition dans le texte :
```typescript
// Pour chaque effet, stocker sa position d'apparition (index du premier match)
// puis trier par position avant de retourner
interface EffectWithPos { effect: AnyEffect; pos: number; }
// ... logique de tri ...
```
> Alternative pragmatique : pour les cas importants (DISCARD_ENERGY avant SEARCH_DECK ou après), documenter les ordres connus et les forcer explicitement.

---

### FIX-19 · Séparer le parsing Talent / Attaque

**Fichier** : `packages/effect-parser/src/rule-based-parser.ts`, `packages/effect-parser/src/schema.ts`

**Problème** : Les Talents et les Attaques reçoivent les mêmes parseurs. Un Talent "Ce Pokémon ne peut pas être Empoisonné" ne devrait pas générer `APPLY_SPECIAL_CONDITION` mais un effet de protection passive.

**Fix** :
1. Distinguer dans `CardInput` si le texte provient d'une `ability` ou d'une `attack`.
2. Dans `parseEffectsFromText()`, utiliser un sous-ensemble de parseurs adapté selon la source :
   - Attaques → tous les parseurs actuels.
   - Talents → parseurs `PREVENT_DAMAGE`, `ABILITY_LOCK`, `TRAINER_LOCK`, `HEAL`, `DRAW_CARD`, effets passifs uniquement.

---

### FIX-20 · `detectEnergyType` — normaliser la casse avant comparaison

**Fichier** : `packages/effect-parser/src/rule-based-parser.ts`

**Fix** : Comparer en minuscule pour éviter les ratés sur les variantes textuelles :
```typescript
const textLower = text.toLowerCase();
for (const t of types) {
  if (textLower.includes(t.toLowerCase())) { ... }
}
```

---

## Phase 5 — Schéma (5 tickets)

### FIX-21 · Ajouter le support des effets conditionnels

**Fichier** : `packages/effect-parser/src/schema.ts`

Les effets conditionnels sont présents sur des dizaines de cartes compétitives. Il faut ajouter un wrapper conditionnel au schéma :

```typescript
const ConditionalEffectSchema = z.object({
  type: z.literal('CONDITIONAL'),
  condition: z.discriminatedUnion('type', [
    z.object({ type: z.literal('IF_COIN_HEADS') }),
    z.object({ type: z.literal('IF_COIN_TAILS') }),
    z.object({ type: z.literal('IF_MORE_PRIZES'), than: z.enum(['OPPONENT', 'SELF']) }),
    z.object({ type: z.literal('IF_LESS_HP'), threshold: z.number() }),
    z.object({ type: z.literal('IF_KNOCKED_OUT') }),
    // ... autres conditions
  ]),
  thenEffects: z.array(EffectSchema),
  elseEffects: z.array(EffectSchema).optional(),
});
```

Le moteur devra alors évaluer `condition` avant d'exécuter `thenEffects` ou `elseEffects`.

---

### FIX-22 · Ajouter le flag `oncePerGame` sur les attaques

**Fichier** : `packages/effect-parser/src/schema.ts`, `apps/api/src/match/engine/models/Card.ts`

```typescript
// Dans AttackSchema :
oncePerGame: z.boolean().optional(),

// Dans PokemonCardInGame (runtime) :
usedOncePerGameAttacks: string[]; // noms des attaques déjà utilisées
```

Dans `attack()`, vérifier et bloquer si l'attaque est `oncePerGame` et figure dans `usedOncePerGameAttacks`. Mettre à jour la liste après utilisation.

---

### FIX-23 · `SEARCH_DECK.destination` — ajouter `TOP_DECK`

**Fichier** : `packages/effect-parser/src/schema.ts`

```typescript
destination: z.enum(['HAND', 'BENCH', 'TOP_DECK']),
```

Synchroniser avec le handler dans GameEngine (cf. FIX-10).

---

### FIX-24 · `COPY_ATTACK.source` — ajouter `OPPONENT_BENCH`

**Fichier** : `packages/effect-parser/src/schema.ts`

```typescript
source: z.enum(['OPPONENT_ACTIVE', 'OWN_BENCH', 'OPPONENT_BENCH', 'ANY_BENCH']),
```

Mettre à jour `initiateCopyAttack()` dans GameEngine pour résoudre la source `OPPONENT_BENCH` via un prompt de sélection.

---

### FIX-25 · `DISCARD_ENERGY.amount` — ajouter `RANDOM`

**Fichier** : `packages/effect-parser/src/schema.ts`

```typescript
amount: z.union([z.number(), z.literal('ALL'), z.literal('RANDOM')]),
```

Dans `EffectResolver`, pour `amount === 'RANDOM'` : choisir une énergie au hasard parmi celles attachées via `this.nextRandom()`.

---

## Ordre d'exécution recommandé

```
Sprint 1 (fondamental — brise le jeu si absent)
  FIX-01  DYNAMIC_DAMAGE + faiblesse/résistance
  FIX-02  Retraite preserve Poison/Brûlure
  FIX-03  Confusion avant attaque
  FIX-04  markExtraPrize
  FIX-11  devolvePokemon instanceId

Sprint 2 (complétude mécanique)
  FIX-05  Effets de Stade (passifs continus)
  FIX-06  EXTRA_ENERGY_ON_SELF
  FIX-07  pokemonCheckup timing
  FIX-08  BOOST_DAMAGE consommé 1 fois
  FIX-09  CANT_USE_SAME_ATTACK nom fiable
  FIX-10  TOP_DECK destination
  FIX-12  allowPass défausse obligatoire

Sprint 3 (parseur)
  FIX-14  SHUFFLE_DECK dans SIMPLE_PARSERS (trivial — 1 ligne)
  FIX-15  MOVE_ENERGY from/to
  FIX-16  Double statut
  FIX-17  DYNAMIC_DAMAGE maxCount
  FIX-19  Talents vs Attaques
  FIX-20  detectEnergyType casse
  FIX-18  Ordre des effets

Sprint 4 (schéma — avant nouveau parsing de masse)
  FIX-23  TOP_DECK dans schéma
  FIX-24  OPPONENT_BENCH dans COPY_ATTACK
  FIX-25  RANDOM dans DISCARD_ENERGY
  FIX-22  oncePerGame
  FIX-21  Effets conditionnels (le plus structurel)
  FIX-13  LOOK_AT_TOP_DECK prompt d'ordre
```

---

## Complexité estimée

| Fix | Complexité | Risque de régression |
|-----|-----------|----------------------|
| FIX-01 | Moyenne | Élevé — touche tous les calculs de dégâts |
| FIX-02 | Triviale | Faible |
| FIX-03 | Faible | Faible |
| FIX-04 | Moyenne | Moyen — touche la condition de victoire |
| FIX-05 | Élevée | Moyen — nouveau sous-système |
| FIX-06 | Faible | Faible |
| FIX-07 | Faible | Faible |
| FIX-08 | Faible | Faible |
| FIX-09 | Faible | Faible |
| FIX-10 | Faible | Faible |
| FIX-11 | Triviale | Faible |
| FIX-12 | Triviale | Faible |
| FIX-13 | Moyenne | Faible |
| FIX-14 | Triviale | Faible |
| FIX-15 | Faible | Faible |
| FIX-16 | Triviale | Faible |
| FIX-17 | Faible | Faible |
| FIX-18 | Moyenne | Moyen |
| FIX-19 | Moyenne | Moyen |
| FIX-20 | Triviale | Faible |
| FIX-21 | Élevée | Élevé — changement schéma + moteur |
| FIX-22 | Moyenne | Faible |
| FIX-23 | Triviale | Faible |
| FIX-24 | Faible | Faible |
| FIX-25 | Faible | Faible |

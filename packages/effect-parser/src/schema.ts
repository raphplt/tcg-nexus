import { z } from "zod";

// ─── Enums ───────────────────────────────────────────────────

export const EffectTypeSchema = z.enum([
  // Damage
  "DAMAGE",
  "PLACE_DAMAGE_COUNTERS",
  "DYNAMIC_DAMAGE",
  // Healing
  "HEAL",
  // Special Conditions
  "APPLY_SPECIAL_CONDITION",
  "REMOVE_SPECIAL_CONDITION",
  // Draw / Search
  "DRAW_CARD",
  "DRAW_UNTIL_HAND_SIZE",
  "SEARCH_DECK",
  "LOOK_AT_TOP_DECK",
  "SEARCH_DISCARD",
  // Hand Disruption
  "DISCARD_FROM_HAND",
  "SHUFFLE_HAND_DRAW",
  "MILL",
  // Energy
  "DISCARD_ENERGY",
  "MOVE_ENERGY",
  "ATTACH_ENERGY_FROM_DECK",
  "ATTACH_ENERGY_FROM_DISCARD",
  // Board Manipulation
  "SWITCH_OPPONENT_ACTIVE",
  "SWITCH_OWN_ACTIVE",
  "RETURN_TO_HAND",
  "SHUFFLE_INTO_DECK",
  "SHUFFLE_DECK",
  "DEVOLVE",
  "REVIVE",
  // Protection / Defense
  "PREVENT_DAMAGE",
  "REDUCE_DAMAGE",
  // Restrictions / Locks
  "CANT_ATTACK_NEXT_TURN",
  "CANT_USE_SAME_ATTACK",
  "OPPONENT_CANT_RETREAT",
  "TRAINER_LOCK",
  "ABILITY_LOCK",
  // Damage Boost
  "BOOST_NEXT_TURN_DAMAGE",
  // Coin Flip
  "COIN_FLIP",
  "MULTI_COIN_FLIP",
  "FLIP_UNTIL_TAILS",
  // Copy / Transform
  "COPY_ATTACK",
  // Lost Zone
  "SEND_TO_LOST_ZONE",
  // Prizes
  "EXTRA_PRIZE",
  // Conditional
  "CONDITIONAL",
  // Stadium Passive
  "STADIUM_PASSIVE_DAMAGE_BOOST",
  "STADIUM_PASSIVE_DAMAGE_REDUCE",
]);

export const TargetTypeSchema = z.enum([
  "SELF",
  "PLAYER_ACTIVE",
  "OPPONENT_ACTIVE",
  "PLAYER_BENCH",
  "OPPONENT_BENCH",
  "ALL_PLAYER_BENCH",
  "ALL_OPPONENT_BENCH",
  "ALL_PLAYER_POKEMON",
  "ALL_OPPONENT_POKEMON",
  "ALL_POKEMON",
  "SELECTED_OWN_POKEMON",
  "SELECTED_OPPONENT_POKEMON",
  "ANY",
]);

export const EffectDurationSchema = z.enum([
  "INSTANT",
  "UNTIL_END_OF_TURN",
  "UNTIL_NEXT_OPPONENT_TURN",
  "UNTIL_YOUR_NEXT_TURN",
  "WHILE_ACTIVE",
]);

export const SpecialConditionSchema = z.enum([
  "Asleep",
  "Burned",
  "Confused",
  "Paralyzed",
  "Poisoned",
]);

export const EffectAmountSchema = z.union([
  z.number(),
  z.literal("ALL"),
  z.literal("RANDOM"),
]);

export const CountSourceSchema = z.enum([
  "ENERGY_ON_SELF",
  "ENERGY_ON_TARGET",
  "ENERGY_ON_SELF_SPECIFIC",
  "ENERGY_ON_TARGET_SPECIFIC",
  "EXTRA_ENERGY_ON_SELF",
  "DAMAGE_COUNTERS_ON_SELF",
  "DAMAGE_COUNTERS_ON_TARGET",
  "BENCH_POKEMON_SELF",
  "BENCH_POKEMON_OPPONENT",
  "BENCH_POKEMON_BOTH",
  "CARDS_IN_HAND_SELF",
  "CARDS_IN_HAND_OPPONENT",
  "CARDS_IN_DISCARD_SELF",
  "CARDS_IN_DISCARD_OPPONENT",
  "PRIZES_TAKEN_SELF",
  "PRIZES_TAKEN_OPPONENT",
  "PRIZES_REMAINING_SELF",
  "PRIZES_REMAINING_OPPONENT",
  "POKEMON_IN_DISCARD_SELF",
  "CARDS_IN_LOST_ZONE_SELF",
]);

export const SearchFilterSchema = z
  .object({
    cardCategory: z.enum(["Pokémon", "Dresseur", "Énergie"]).optional(),
    pokemonStage: z.enum(["De base", "Niveau 1", "Niveau 2"]).optional(),
    pokemonType: z.string().optional(),
    energyType: z.string().optional(),
    trainerType: z
      .enum(["Objet", "Supporter", "Stade", "Outil Pokémon"])
      .optional(),
  })
  .optional();

// ─── Effect Schemas ──────────────────────────────────────────

// Forward-declare for recursive types (coin flip contains effects)
export type ParsedEffect = z.infer<typeof AnyEffectSchema>;

const DamageEffectSchema = z.object({
  type: z.literal("DAMAGE"),
  amount: z.number(),
  target: TargetTypeSchema,
  ignoreResistance: z.boolean().optional(),
  ignoreWeakness: z.boolean().optional(),
});

const PlaceDamageCountersEffectSchema = z.object({
  type: z.literal("PLACE_DAMAGE_COUNTERS"),
  amount: z.number(),
  target: TargetTypeSchema,
});

const DynamicDamageEffectSchema = z.object({
  type: z.literal("DYNAMIC_DAMAGE"),
  amountPerUnit: z.number(),
  countSource: CountSourceSchema,
  energyType: z.string().optional(),
  target: TargetTypeSchema,
  operator: z.enum(["+", "-", "×"]),
  maxCount: z.number().optional(),
});

const HealEffectSchema = z.object({
  type: z.literal("HEAL"),
  amount: EffectAmountSchema,
  target: TargetTypeSchema,
  removeSpecialConditions: z.boolean().optional(),
});

const ApplySpecialConditionSchema = z.object({
  type: z.literal("APPLY_SPECIAL_CONDITION"),
  condition: SpecialConditionSchema,
  target: TargetTypeSchema,
  poisonDamage: z.number().optional(),
});

const RemoveSpecialConditionSchema = z.object({
  type: z.literal("REMOVE_SPECIAL_CONDITION"),
  condition: SpecialConditionSchema.optional(),
  target: TargetTypeSchema,
});

const DrawCardSchema = z.object({
  type: z.literal("DRAW_CARD"),
  amount: z.number(),
});

const DrawUntilHandSizeSchema = z.object({
  type: z.literal("DRAW_UNTIL_HAND_SIZE"),
  handSize: z.number(),
});

const SearchDeckSchema = z.object({
  type: z.literal("SEARCH_DECK"),
  amount: z.number(),
  filter: SearchFilterSchema,
  destination: z.enum(["HAND", "BENCH", "ATTACHED", "TOP_DECK"]),
  shuffleAfter: z.boolean().optional(),
});

const LookAtTopDeckSchema = z.object({
  type: z.literal("LOOK_AT_TOP_DECK"),
  amount: z.number(),
});

const SearchDiscardSchema = z.object({
  type: z.literal("SEARCH_DISCARD"),
  amount: z.number(),
  filter: SearchFilterSchema,
  destination: z.enum(["HAND", "BENCH", "ATTACHED", "TOP_DECK"]),
});

const DiscardFromHandSchema = z.object({
  type: z.literal("DISCARD_FROM_HAND"),
  amount: EffectAmountSchema,
  target: z.enum(["SELF", "OPPONENT"]),
  filter: SearchFilterSchema,
});

const ShuffleHandDrawSchema = z.object({
  type: z.literal("SHUFFLE_HAND_DRAW"),
  target: z.enum(["SELF", "OPPONENT", "BOTH"]),
  drawAmount: z.number(),
});

const MillSchema = z.object({
  type: z.literal("MILL"),
  amount: z.number(),
  target: z.enum(["SELF", "OPPONENT"]),
});

const DiscardEnergySchema = z.object({
  type: z.literal("DISCARD_ENERGY"),
  amount: EffectAmountSchema,
  target: TargetTypeSchema,
  energyType: z.string().optional(),
});

const MoveEnergySchema = z.object({
  type: z.literal("MOVE_ENERGY"),
  amount: z.number(),
  from: TargetTypeSchema,
  to: TargetTypeSchema,
  energyType: z.string().optional(),
});

const AttachEnergyFromDeckSchema = z.object({
  type: z.literal("ATTACH_ENERGY_FROM_DECK"),
  amount: z.number(),
  energyType: z.string().optional(),
  target: TargetTypeSchema,
  shuffleAfter: z.boolean().optional(),
});

const AttachEnergyFromDiscardSchema = z.object({
  type: z.literal("ATTACH_ENERGY_FROM_DISCARD"),
  amount: z.number(),
  energyType: z.string().optional(),
  target: TargetTypeSchema,
});

const SwitchOpponentActiveSchema = z.object({
  type: z.literal("SWITCH_OPPONENT_ACTIVE"),
});

const SwitchOwnActiveSchema = z.object({
  type: z.literal("SWITCH_OWN_ACTIVE"),
});

const ReturnToHandSchema = z.object({
  type: z.literal("RETURN_TO_HAND"),
  target: TargetTypeSchema,
});

const ShuffleIntoDeckSchema = z.object({
  type: z.literal("SHUFFLE_INTO_DECK"),
  target: TargetTypeSchema,
});

const ShuffleDeckSchema = z.object({
  type: z.literal("SHUFFLE_DECK"),
});

const DevolveSchema = z.object({
  type: z.literal("DEVOLVE"),
  target: TargetTypeSchema,
});

const ReviveSchema = z.object({
  type: z.literal("REVIVE"),
  filter: SearchFilterSchema,
});

const PreventDamageSchema = z.object({
  type: z.literal("PREVENT_DAMAGE"),
  target: TargetTypeSchema,
  duration: EffectDurationSchema,
});

const ReduceDamageSchema = z.object({
  type: z.literal("REDUCE_DAMAGE"),
  amount: z.number(),
  target: TargetTypeSchema,
  duration: EffectDurationSchema,
});

const CantAttackNextTurnSchema = z.object({
  type: z.literal("CANT_ATTACK_NEXT_TURN"),
  target: TargetTypeSchema,
});

const CantUseSameAttackSchema = z.object({
  type: z.literal("CANT_USE_SAME_ATTACK"),
});

const OpponentCantRetreatSchema = z.object({
  type: z.literal("OPPONENT_CANT_RETREAT"),
});

const TrainerLockSchema = z.object({
  type: z.literal("TRAINER_LOCK"),
  lockType: z.enum(["ALL", "ITEM", "SUPPORTER", "STADIUM"]),
  duration: EffectDurationSchema,
});

const AbilityLockSchema = z.object({
  type: z.literal("ABILITY_LOCK"),
  duration: EffectDurationSchema,
});

const BoostNextTurnDamageSchema = z.object({
  type: z.literal("BOOST_NEXT_TURN_DAMAGE"),
  amount: z.number(),
});

// Recursive schemas for coin flip effects
const CoinFlipSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    type: z.literal("COIN_FLIP"),
    onHeads: z.array(AnyEffectSchema).optional(),
    onTails: z.array(AnyEffectSchema).optional(),
  }),
);

const MultiCoinFlipSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    type: z.literal("MULTI_COIN_FLIP"),
    count: z.number(),
    perHeads: z.array(AnyEffectSchema).optional(),
  }),
);

const FlipUntilTailsSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    type: z.literal("FLIP_UNTIL_TAILS"),
    perHeads: z.array(AnyEffectSchema).optional(),
  }),
);

const CopyAttackSchema = z.object({
  type: z.literal("COPY_ATTACK"),
  source: z.enum([
    "OPPONENT_ACTIVE",
    "SELF",
    "OWN_BENCH",
    "OPPONENT_BENCH",
    "ANY_BENCH",
  ]),
});

const SendToLostZoneSchema = z.object({
  type: z.literal("SEND_TO_LOST_ZONE"),
  target: TargetTypeSchema,
});

const ExtraPrizeSchema = z.object({
  type: z.literal("EXTRA_PRIZE"),
  amount: z.number(),
});

// ── Conditional Effects ─────────────────────────────────────

const ConditionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("IF_COIN_HEADS") }),
  z.object({ type: z.literal("IF_COIN_TAILS") }),
  z.object({
    type: z.literal("IF_MORE_PRIZES"),
    than: z.enum(["OPPONENT", "SELF"]),
  }),
  z.object({
    type: z.literal("IF_LESS_HP"),
    threshold: z.number(),
  }),
  z.object({ type: z.literal("IF_KNOCKED_OUT") }),
  z.object({ type: z.literal("IF_OPPONENT_POISONED") }),
  z.object({ type: z.literal("IF_OPPONENT_HAS_SPECIAL_CONDITION") }),
]);

const ConditionalEffectSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    type: z.literal("CONDITIONAL"),
    condition: ConditionSchema,
    thenEffects: z.array(AnyEffectSchema),
    elseEffects: z.array(AnyEffectSchema).optional(),
  }),
);

// ─── Union Schema ────────────────────────────────────────────

export const AnyEffectSchema: z.ZodType<any> = z.lazy(() =>
  z.union([
    DamageEffectSchema,
    PlaceDamageCountersEffectSchema,
    DynamicDamageEffectSchema,
    HealEffectSchema,
    ApplySpecialConditionSchema,
    RemoveSpecialConditionSchema,
    DrawCardSchema,
    DrawUntilHandSizeSchema,
    SearchDeckSchema,
    LookAtTopDeckSchema,
    SearchDiscardSchema,
    DiscardFromHandSchema,
    ShuffleHandDrawSchema,
    MillSchema,
    DiscardEnergySchema,
    MoveEnergySchema,
    AttachEnergyFromDeckSchema,
    AttachEnergyFromDiscardSchema,
    SwitchOpponentActiveSchema,
    SwitchOwnActiveSchema,
    ReturnToHandSchema,
    ShuffleIntoDeckSchema,
    ShuffleDeckSchema,
    DevolveSchema,
    ReviveSchema,
    PreventDamageSchema,
    ReduceDamageSchema,
    CantAttackNextTurnSchema,
    CantUseSameAttackSchema,
    OpponentCantRetreatSchema,
    TrainerLockSchema,
    AbilityLockSchema,
    BoostNextTurnDamageSchema,
    CoinFlipSchema,
    MultiCoinFlipSchema,
    FlipUntilTailsSchema,
    CopyAttackSchema,
    SendToLostZoneSchema,
    ExtraPrizeSchema,
    ConditionalEffectSchema,
    // Stadium Passive
    z.object({
      type: z.literal("STADIUM_PASSIVE_DAMAGE_BOOST"),
      amount: z.number(),
      pokemonType: z.string().optional(),
      pokemonStage: z.string().optional(),
    }),
    z.object({
      type: z.literal("STADIUM_PASSIVE_DAMAGE_REDUCE"),
      amount: z.number(),
      pokemonType: z.string().optional(),
      pokemonStage: z.string().optional(),
    }),
  ]),
);

// ─── Card-level schemas ──────────────────────────────────────

export const AttackEffectsSchema = z.object({
  effects: z.array(AnyEffectSchema),
  oncePerGame: z.boolean().optional(),
});

export const PokemonCardEffectsSchema = z.object({
  kind: z.literal("pokemon"),
  attacks: z.record(z.string(), AttackEffectsSchema),
  ability: z
    .object({
      name: z.string(),
      effects: z.array(AnyEffectSchema),
    })
    .optional(),
});

export const TrainerCardEffectsSchema = z.object({
  kind: z.literal("trainer"),
  playEffects: z.array(AnyEffectSchema),
  targetStrategy: z.string().optional(),
  passiveEffects: z.array(AnyEffectSchema).optional(),
});

export const CardEffectsSchema = z.discriminatedUnion("kind", [
  PokemonCardEffectsSchema,
  TrainerCardEffectsSchema,
]);

export type CardEffects = z.infer<typeof CardEffectsSchema>;
export type PokemonCardEffects = z.infer<typeof PokemonCardEffectsSchema>;
export type TrainerCardEffects = z.infer<typeof TrainerCardEffectsSchema>;

// ─── Registry schema ─────────────────────────────────────────

export const CardEffectsRegistrySchema = z.record(
  z.string(),
  CardEffectsSchema,
);

export type CardEffectsRegistry = z.infer<typeof CardEffectsRegistrySchema>;

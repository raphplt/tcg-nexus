// ─── Effect Types ────────────────────────────────────────────
// Each EffectType maps to an interface below and a handler
// in EffectResolver.resolveSingleEffect().

export enum EffectType {
  // ── Damage ──────────────────────────────────────────────
  DAMAGE = "DAMAGE",
  PLACE_DAMAGE_COUNTERS = "PLACE_DAMAGE_COUNTERS",

  // ── Healing ─────────────────────────────────────────────
  HEAL = "HEAL",

  // ── Special Conditions ──────────────────────────────────
  APPLY_SPECIAL_CONDITION = "APPLY_SPECIAL_CONDITION",
  REMOVE_SPECIAL_CONDITION = "REMOVE_SPECIAL_CONDITION",

  // ── Draw / Search ───────────────────────────────────────
  DRAW_CARD = "DRAW_CARD",
  DRAW_UNTIL_HAND_SIZE = "DRAW_UNTIL_HAND_SIZE",
  SEARCH_DECK = "SEARCH_DECK",
  LOOK_AT_TOP_DECK = "LOOK_AT_TOP_DECK",
  SEARCH_DISCARD = "SEARCH_DISCARD",

  // ── Hand Disruption ─────────────────────────────────────
  DISCARD_FROM_HAND = "DISCARD_FROM_HAND",
  SHUFFLE_HAND_DRAW = "SHUFFLE_HAND_DRAW",
  MILL = "MILL",

  // ── Energy ──────────────────────────────────────────────
  DISCARD_ENERGY = "DISCARD_ENERGY",
  MOVE_ENERGY = "MOVE_ENERGY",
  ATTACH_ENERGY_FROM_DECK = "ATTACH_ENERGY_FROM_DECK",
  ATTACH_ENERGY_FROM_DISCARD = "ATTACH_ENERGY_FROM_DISCARD",

  // ── Board Manipulation ──────────────────────────────────
  SWITCH_OPPONENT_ACTIVE = "SWITCH_OPPONENT_ACTIVE",
  SWITCH_OWN_ACTIVE = "SWITCH_OWN_ACTIVE",
  RETURN_TO_HAND = "RETURN_TO_HAND",
  SHUFFLE_INTO_DECK = "SHUFFLE_INTO_DECK",
  SHUFFLE_DECK = "SHUFFLE_DECK",
  DEVOLVE = "DEVOLVE",
  REVIVE = "REVIVE",

  // ── Protection / Defense ────────────────────────────────
  PREVENT_DAMAGE = "PREVENT_DAMAGE",
  REDUCE_DAMAGE = "REDUCE_DAMAGE",

  // ── Restrictions / Locks ────────────────────────────────
  CANT_ATTACK_NEXT_TURN = "CANT_ATTACK_NEXT_TURN",
  CANT_USE_SAME_ATTACK = "CANT_USE_SAME_ATTACK",
  OPPONENT_CANT_RETREAT = "OPPONENT_CANT_RETREAT",
  TRAINER_LOCK = "TRAINER_LOCK",
  ABILITY_LOCK = "ABILITY_LOCK",

  // ── Damage Boost ────────────────────────────────────────
  BOOST_NEXT_TURN_DAMAGE = "BOOST_NEXT_TURN_DAMAGE",

  // ── Coin Flip ───────────────────────────────────────────
  COIN_FLIP = "COIN_FLIP",
  MULTI_COIN_FLIP = "MULTI_COIN_FLIP",
  FLIP_UNTIL_TAILS = "FLIP_UNTIL_TAILS",

  // ── Copy / Transform ────────────────────────────────────
  COPY_ATTACK = "COPY_ATTACK",

  // ── Lost Zone ───────────────────────────────────────────
  SEND_TO_LOST_ZONE = "SEND_TO_LOST_ZONE",

  // ── Prizes ──────────────────────────────────────────────
  EXTRA_PRIZE = "EXTRA_PRIZE",
}

// ─── Target Types ────────────────────────────────────────────

export enum TargetType {
  SELF = "SELF",
  PLAYER_ACTIVE = "PLAYER_ACTIVE",
  OPPONENT_ACTIVE = "OPPONENT_ACTIVE",
  PLAYER_BENCH = "PLAYER_BENCH",
  OPPONENT_BENCH = "OPPONENT_BENCH",
  ALL_PLAYER_BENCH = "ALL_PLAYER_BENCH",
  ALL_OPPONENT_BENCH = "ALL_OPPONENT_BENCH",
  ALL_PLAYER_POKEMON = "ALL_PLAYER_POKEMON",
  ALL_OPPONENT_POKEMON = "ALL_OPPONENT_POKEMON",
  ALL_POKEMON = "ALL_POKEMON",
  SELECTED_OWN_POKEMON = "SELECTED_OWN_POKEMON",
  SELECTED_OPPONENT_POKEMON = "SELECTED_OPPONENT_POKEMON",
  ANY = "ANY",
}

// ─── Duration (for temporary effects) ───────────────────────

export enum EffectDuration {
  INSTANT = "INSTANT",
  UNTIL_END_OF_TURN = "UNTIL_END_OF_TURN",
  UNTIL_NEXT_OPPONENT_TURN = "UNTIL_NEXT_OPPONENT_TURN",
  UNTIL_YOUR_NEXT_TURN = "UNTIL_YOUR_NEXT_TURN",
  WHILE_ACTIVE = "WHILE_ACTIVE",
}

// ─── Search Filters (for SEARCH_DECK, SEARCH_DISCARD) ──────

export interface SearchFilter {
  cardCategory?: "Pokémon" | "Dresseur" | "Énergie";
  pokemonStage?: "De base" | "Niveau 1" | "Niveau 2";
  pokemonType?: string;
  energyType?: string;
  trainerType?: "Objet" | "Supporter" | "Stade" | "Outil Pokémon";
}

// ─── Quantity Helpers ────────────────────────────────────────

export type EffectAmount = number | "ALL";

// ─── Effect Interfaces ──────────────────────────────────────

export interface BaseEffect {
  type: EffectType;
}

// ── Damage ────────────────────────────────────────────────

export interface DamageEffect extends BaseEffect {
  type: EffectType.DAMAGE;
  amount: number;
  target: TargetType;
  ignoreResistance?: boolean;
  ignoreWeakness?: boolean;
}

export interface PlaceDamageCountersEffect extends BaseEffect {
  type: EffectType.PLACE_DAMAGE_COUNTERS;
  amount: number;
  target: TargetType;
}

// ── Healing ───────────────────────────────────────────────

export interface HealEffect extends BaseEffect {
  type: EffectType.HEAL;
  amount: number | "ALL";
  target: TargetType;
  removeSpecialConditions?: boolean;
}

// ── Special Conditions ────────────────────────────────────

export interface ApplySpecialConditionEffect extends BaseEffect {
  type: EffectType.APPLY_SPECIAL_CONDITION;
  condition: string;
  target: TargetType;
  poisonDamage?: number;
}

export interface RemoveSpecialConditionEffect extends BaseEffect {
  type: EffectType.REMOVE_SPECIAL_CONDITION;
  condition?: string;
  target: TargetType;
}

// ── Draw / Search ─────────────────────────────────────────

export interface DrawCardEffect extends BaseEffect {
  type: EffectType.DRAW_CARD;
  amount: number;
}

export interface DrawUntilHandSizeEffect extends BaseEffect {
  type: EffectType.DRAW_UNTIL_HAND_SIZE;
  handSize: number;
}

export interface SearchDeckEffect extends BaseEffect {
  type: EffectType.SEARCH_DECK;
  amount: number;
  filter?: SearchFilter;
  destination: "HAND" | "BENCH" | "ATTACHED";
  shuffleAfter?: boolean;
}

export interface LookAtTopDeckEffect extends BaseEffect {
  type: EffectType.LOOK_AT_TOP_DECK;
  amount: number;
}

export interface SearchDiscardEffect extends BaseEffect {
  type: EffectType.SEARCH_DISCARD;
  amount: number;
  filter?: SearchFilter;
  destination: "HAND" | "BENCH" | "ATTACHED" | "TOP_DECK";
}

// ── Hand Disruption ───────────────────────────────────────

export interface DiscardFromHandEffect extends BaseEffect {
  type: EffectType.DISCARD_FROM_HAND;
  amount: EffectAmount;
  target: "SELF" | "OPPONENT";
  filter?: SearchFilter;
}

export interface ShuffleHandDrawEffect extends BaseEffect {
  type: EffectType.SHUFFLE_HAND_DRAW;
  target: "SELF" | "OPPONENT" | "BOTH";
  drawAmount: number;
}

export interface MillEffect extends BaseEffect {
  type: EffectType.MILL;
  amount: number;
  target: "SELF" | "OPPONENT";
}

// ── Energy ────────────────────────────────────────────────

export interface DiscardEnergyEffect extends BaseEffect {
  type: EffectType.DISCARD_ENERGY;
  amount: EffectAmount;
  target: TargetType;
  energyType?: string;
}

export interface MoveEnergyEffect extends BaseEffect {
  type: EffectType.MOVE_ENERGY;
  amount: number;
  from: TargetType;
  to: TargetType;
  energyType?: string;
}

export interface AttachEnergyFromDeckEffect extends BaseEffect {
  type: EffectType.ATTACH_ENERGY_FROM_DECK;
  amount: number;
  energyType?: string;
  target: TargetType;
  shuffleAfter?: boolean;
}

export interface AttachEnergyFromDiscardEffect extends BaseEffect {
  type: EffectType.ATTACH_ENERGY_FROM_DISCARD;
  amount: number;
  energyType?: string;
  target: TargetType;
}

// ── Board Manipulation ────────────────────────────────────

export interface SwitchOpponentActiveEffect extends BaseEffect {
  type: EffectType.SWITCH_OPPONENT_ACTIVE;
}

export interface SwitchOwnActiveEffect extends BaseEffect {
  type: EffectType.SWITCH_OWN_ACTIVE;
}

export interface ReturnToHandEffect extends BaseEffect {
  type: EffectType.RETURN_TO_HAND;
  target: TargetType;
}

export interface ShuffleIntoDeckEffect extends BaseEffect {
  type: EffectType.SHUFFLE_INTO_DECK;
  target: TargetType;
}

export interface ShuffleDeckEffect extends BaseEffect {
  type: EffectType.SHUFFLE_DECK;
}

export interface DevolveEffect extends BaseEffect {
  type: EffectType.DEVOLVE;
  target: TargetType;
}

export interface ReviveEffect extends BaseEffect {
  type: EffectType.REVIVE;
  filter?: SearchFilter;
}

// ── Protection / Defense ──────────────────────────────────

export interface PreventDamageEffect extends BaseEffect {
  type: EffectType.PREVENT_DAMAGE;
  target: TargetType;
  duration: EffectDuration;
}

export interface ReduceDamageEffect extends BaseEffect {
  type: EffectType.REDUCE_DAMAGE;
  amount: number;
  target: TargetType;
  duration: EffectDuration;
}

// ── Restrictions / Locks ──────────────────────────────────

export interface CantAttackNextTurnEffect extends BaseEffect {
  type: EffectType.CANT_ATTACK_NEXT_TURN;
  target: TargetType;
}

export interface CantUseSameAttackEffect extends BaseEffect {
  type: EffectType.CANT_USE_SAME_ATTACK;
}

export interface OpponentCantRetreatEffect extends BaseEffect {
  type: EffectType.OPPONENT_CANT_RETREAT;
}

export interface TrainerLockEffect extends BaseEffect {
  type: EffectType.TRAINER_LOCK;
  lockType: "ALL" | "ITEM" | "SUPPORTER" | "STADIUM";
  duration: EffectDuration;
}

export interface AbilityLockEffect extends BaseEffect {
  type: EffectType.ABILITY_LOCK;
  duration: EffectDuration;
}

// ── Damage Boost ──────────────────────────────────────────

export interface BoostNextTurnDamageEffect extends BaseEffect {
  type: EffectType.BOOST_NEXT_TURN_DAMAGE;
  amount: number;
}

// ── Coin Flip ─────────────────────────────────────────────

export interface CoinFlipEffect extends BaseEffect {
  type: EffectType.COIN_FLIP;
  onHeads?: AnyEffect[];
  onTails?: AnyEffect[];
}

export interface MultiCoinFlipEffect extends BaseEffect {
  type: EffectType.MULTI_COIN_FLIP;
  count: number;
  perHeads?: AnyEffect[];
}

export interface FlipUntilTailsEffect extends BaseEffect {
  type: EffectType.FLIP_UNTIL_TAILS;
  perHeads?: AnyEffect[];
}

// ── Copy / Transform ──────────────────────────────────────

export interface CopyAttackEffect extends BaseEffect {
  type: EffectType.COPY_ATTACK;
  source: "OPPONENT_ACTIVE" | "SELF";
}

// ── Lost Zone ─────────────────────────────────────────────

export interface SendToLostZoneEffect extends BaseEffect {
  type: EffectType.SEND_TO_LOST_ZONE;
  target: TargetType;
}

// ── Prizes ────────────────────────────────────────────────

export interface ExtraPrizeEffect extends BaseEffect {
  type: EffectType.EXTRA_PRIZE;
  amount: number;
}

// ─── Union Type ──────────────────────────────────────────────

export type AnyEffect =
  // Damage
  | DamageEffect
  | PlaceDamageCountersEffect
  // Healing
  | HealEffect
  // Special Conditions
  | ApplySpecialConditionEffect
  | RemoveSpecialConditionEffect
  // Draw / Search
  | DrawCardEffect
  | DrawUntilHandSizeEffect
  | SearchDeckEffect
  | LookAtTopDeckEffect
  | SearchDiscardEffect
  // Hand Disruption
  | DiscardFromHandEffect
  | ShuffleHandDrawEffect
  | MillEffect
  // Energy
  | DiscardEnergyEffect
  | MoveEnergyEffect
  | AttachEnergyFromDeckEffect
  | AttachEnergyFromDiscardEffect
  // Board Manipulation
  | SwitchOpponentActiveEffect
  | SwitchOwnActiveEffect
  | ReturnToHandEffect
  | ShuffleIntoDeckEffect
  | ShuffleDeckEffect
  | DevolveEffect
  | ReviveEffect
  // Protection / Defense
  | PreventDamageEffect
  | ReduceDamageEffect
  // Restrictions / Locks
  | CantAttackNextTurnEffect
  | CantUseSameAttackEffect
  | OpponentCantRetreatEffect
  | TrainerLockEffect
  | AbilityLockEffect
  // Damage Boost
  | BoostNextTurnDamageEffect
  // Coin Flip
  | CoinFlipEffect
  | MultiCoinFlipEffect
  | FlipUntilTailsEffect
  // Copy / Transform
  | CopyAttackEffect
  // Lost Zone
  | SendToLostZoneEffect
  // Prizes
  | ExtraPrizeEffect;

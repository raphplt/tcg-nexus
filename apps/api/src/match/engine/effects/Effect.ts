export enum EffectType {
  DAMAGE = 'DAMAGE',
  HEAL = 'HEAL',
  DRAW_CARD = 'DRAW_CARD',
  DISCARD_ENERGY = 'DISCARD_ENERGY',
  APPLY_SPECIAL_CONDITION = 'APPLY_SPECIAL_CONDITION',
  COIN_FLIP = 'COIN_FLIP',
  PREVENT_DAMAGE = 'PREVENT_DAMAGE',
}

export enum TargetType {
  SELF = 'SELF', // Whoever used the effect
  OPPONENT_ACTIVE = 'OPPONENT_ACTIVE',
  PLAYER_ACTIVE = 'PLAYER_ACTIVE',
  OPPONENT_BENCH = 'OPPONENT_BENCH',
  PLAYER_BENCH = 'PLAYER_BENCH',
  ANY = 'ANY'
}

export interface BaseEffect {
  type: EffectType;
}

export interface DamageEffect extends BaseEffect {
  type: EffectType.DAMAGE;
  amount: number;
  target: TargetType;
  ignoreResistance?: boolean;
}

export interface HealEffect extends BaseEffect {
  type: EffectType.HEAL;
  amount: number;
  target: TargetType;
  removeSpecialConditions?: boolean;
}

export interface ApplySpecialConditionEffect extends BaseEffect {
  type: EffectType.APPLY_SPECIAL_CONDITION;
  condition: string; // from SpecialCondition enum
  target: TargetType;
}

export interface CoinFlipEffect extends BaseEffect {
  type: EffectType.COIN_FLIP;
  onHeads?: AnyEffect[];
  onTails?: AnyEffect[];
}

export interface DiscardEnergyEffect extends BaseEffect {
  type: EffectType.DISCARD_ENERGY;
  amount: number;
  target: TargetType;
}

export interface DrawCardEffect extends BaseEffect {
  type: EffectType.DRAW_CARD;
  amount: number;
}

export type AnyEffect = DamageEffect | HealEffect | ApplySpecialConditionEffect | CoinFlipEffect | DiscardEnergyEffect | DrawCardEffect;

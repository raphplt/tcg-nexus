import { PokemonCardsType } from "../../common/enums/pokemonCardsType";

/**
 * Functional role a card plays in a deck's engine, derived from its parsed
 * effects rather than from its category alone.
 */
export enum DeckCardRoleTag {
  Draw = "draw",
  Search = "search",
  EnergyAcceleration = "energy-acceleration",
  Recovery = "recovery",
  Switch = "switch",
  Disruption = "disruption",
  Healing = "healing",
}

/** Minimal shape the role extractor needs from a catalog card. */
export interface RoleSourceCard {
  id: string;
  category?: string | null;
  parsedEffects?: Record<string, unknown> | null;
}

/** A role detected on a card, with the effect types that justified it. */
export interface DetectedRole {
  role: DeckCardRoleTag;
  evidence: string[];
}

type EffectLike = { type?: unknown; target?: unknown };

/**
 * Effect types that map to a role regardless of their target.
 *
 * NOTE: kept in sync with `EffectTypeSchema` in `packages/effect-parser`. An
 * unknown effect type is ignored rather than guessed at, so a parser that gains
 * new types degrades to "no role" instead of to a wrong role.
 */
const UNCONDITIONAL_ROLES: Record<string, DeckCardRoleTag> = {
  DRAW_CARD: DeckCardRoleTag.Draw,
  DRAW_UNTIL_HAND_SIZE: DeckCardRoleTag.Draw,
  SHUFFLE_HAND_DRAW: DeckCardRoleTag.Draw,
  LOOK_AT_TOP_DECK: DeckCardRoleTag.Draw,
  SEARCH_DECK: DeckCardRoleTag.Search,
  SEARCH_DISCARD: DeckCardRoleTag.Recovery,
  REVIVE: DeckCardRoleTag.Recovery,
  ATTACH_ENERGY_FROM_DECK: DeckCardRoleTag.EnergyAcceleration,
  ATTACH_ENERGY_FROM_DISCARD: DeckCardRoleTag.EnergyAcceleration,
  MOVE_ENERGY: DeckCardRoleTag.EnergyAcceleration,
  SWITCH_OWN_ACTIVE: DeckCardRoleTag.Switch,
  SWITCH_OPPONENT_ACTIVE: DeckCardRoleTag.Disruption,
  TRAINER_LOCK: DeckCardRoleTag.Disruption,
  ABILITY_LOCK: DeckCardRoleTag.Disruption,
  OPPONENT_CANT_RETREAT: DeckCardRoleTag.Disruption,
  DEVOLVE: DeckCardRoleTag.Disruption,
  HEAL: DeckCardRoleTag.Healing,
  REMOVE_SPECIAL_CONDITION: DeckCardRoleTag.Healing,
};

/**
 * Effect types whose role depends on who they hit: milling your own deck is a
 * cost, milling the opponent's is disruption.
 */
const OPPONENT_ONLY_DISRUPTION = new Set([
  "MILL",
  "DISCARD_FROM_HAND",
  "DISCARD_ENERGY",
  "RETURN_TO_HAND",
]);

const OPPONENT_TARGETS = new Set([
  "OPPONENT",
  "OPPONENT_ACTIVE",
  "OPPONENT_BENCH",
  "ALL_OPPONENT_BENCH",
  "ALL_OPPONENT_POKEMON",
  "SELECTED_OPPONENT_POKEMON",
]);

const isEffectArray = (value: unknown): value is EffectLike[] =>
  Array.isArray(value);

/**
 * Flattens the effect lists that count towards a deck's engine.
 *
 * Attack effects are deliberately excluded: a Pokémon that draws a card when it
 * attacks is not what makes a list consistent on turn one, and counting it
 * inflates the draw signal. Attack costs are analyzed separately by the metrics
 * service.
 */
const collectEngineEffects = (
  parsedEffects: Record<string, unknown> | null | undefined,
): EffectLike[] => {
  if (!parsedEffects || typeof parsedEffects !== "object") return [];

  const effects: EffectLike[] = [];

  if (parsedEffects.kind === "trainer") {
    if (isEffectArray(parsedEffects.playEffects)) {
      effects.push(...parsedEffects.playEffects);
    }
    if (isEffectArray(parsedEffects.passiveEffects)) {
      effects.push(...parsedEffects.passiveEffects);
    }
  }

  if (parsedEffects.kind === "pokemon") {
    const ability = parsedEffects.ability as
      | { effects?: unknown }
      | undefined
      | null;
    if (ability && isEffectArray(ability.effects)) {
      effects.push(...ability.effects);
    }
  }

  // CONDITIONAL wraps the effects it guards; unwrap one level so a
  // "flip a coin, then draw 3" trainer still registers as draw.
  const nested: EffectLike[] = [];
  for (const effect of effects) {
    const branches = (effect as { effects?: unknown }).effects;
    if (isEffectArray(branches)) nested.push(...branches);
  }

  return [...effects, ...nested];
};

/**
 * Derives the functional roles of a card from its parsed effects.
 *
 * @param card Catalog card with its `parsedEffects` payload.
 * @returns Roles detected, each with the effect types that produced it.
 */
export function detectCardRoles(card: RoleSourceCard): DetectedRole[] {
  const byRole = new Map<DeckCardRoleTag, Set<string>>();

  const record = (role: DeckCardRoleTag, effectType: string): void => {
    const evidence = byRole.get(role) ?? new Set<string>();
    evidence.add(effectType);
    byRole.set(role, evidence);
  };

  for (const effect of collectEngineEffects(card.parsedEffects)) {
    const type = typeof effect?.type === "string" ? effect.type : null;
    if (!type) continue;

    const unconditional = UNCONDITIONAL_ROLES[type];
    if (unconditional) {
      record(unconditional, type);
      continue;
    }

    if (
      OPPONENT_ONLY_DISRUPTION.has(type) &&
      typeof effect.target === "string" &&
      OPPONENT_TARGETS.has(effect.target)
    ) {
      record(DeckCardRoleTag.Disruption, type);
    }
  }

  return Array.from(byRole.entries()).map(([role, evidence]) => ({
    role,
    evidence: Array.from(evidence).sort(),
  }));
}

/**
 * Whether a card carries effect data at all.
 *
 * Basic energies legitimately have no effects, so they are excluded from the
 * coverage denominator: counting them would understate how much of the deck the
 * engine could actually read.
 */
export function hasReadableEffects(card: RoleSourceCard): boolean {
  return !!card.parsedEffects && Object.keys(card.parsedEffects).length > 0;
}

/** Whether a card should be expected to carry parsed effects. */
export function expectsEffects(card: RoleSourceCard): boolean {
  return card.category !== PokemonCardsType.Energy;
}

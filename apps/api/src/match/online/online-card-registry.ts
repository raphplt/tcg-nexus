import { AnyEffect, EffectType, TargetType } from "../engine/effects/Effect";

export interface SupportedAttackDefinition {
  effects?: AnyEffect[];
  ignoreResistance?: boolean;
}

export interface SupportedPokemonCardDefinition {
  kind: "pokemon";
  prizeCards?: number;
  attacks: Record<string, SupportedAttackDefinition>;
}

export interface SupportedTrainerCardDefinition {
  kind: "trainer";
  targetStrategy?: "OWN_POKEMON";
  playEffects: AnyEffect[];
}

export type SupportedCardDefinition =
  | SupportedPokemonCardDefinition
  | SupportedTrainerCardDefinition;

export const ONLINE_SUPPORTED_CARD_REGISTRY: Record<
  string,
  SupportedCardDefinition
> = {
  "np-6": {
    kind: "pokemon",
    attacks: {
      Picpic: {},
    },
  },
  "xy7-5": {
    kind: "pokemon",
    attacks: {
      Sécrétion: {
        effects: [
          {
            type: EffectType.COIN_FLIP,
            onHeads: [
              {
                type: EffectType.APPLY_SPECIAL_CONDITION,
                target: TargetType.OPPONENT_ACTIVE,
                condition: "Paralyzed",
              },
            ],
          },
        ],
      },
    },
  },
  "xy3-107": {
    kind: "pokemon",
    prizeCards: 2,
    attacks: {
      "Coup Propulsé": {
        ignoreResistance: true,
      },
      "Tire-Bouchon Fracassant": {
        effects: [
          {
            type: EffectType.DRAW_UNTIL_HAND_SIZE,
            handSize: 6,
          },
        ],
      },
      Culbutopied: {},
    },
  },
  "swsh4-185": {
    kind: "trainer",
    targetStrategy: "OWN_POKEMON",
    playEffects: [
      {
        type: EffectType.HEAL,
        amount: 60,
        target: TargetType.SELECTED_OWN_POKEMON,
        removeSpecialConditions: true,
      },
    ],
  },
};

export const ONLINE_SUPPORTED_BASIC_ENERGY_NAMES: Record<string, string[]> = {
  plante: ["Plante"],
  feu: ["Feu"],
  eau: ["Eau"],
  electrique: ["Électrique"],
  psy: ["Psy"],
  combat: ["Combat"],
  obscurite: ["Obscurité"],
  metal: ["Métal"],
  fee: ["Fée"],
};

export const normalizeOnlineCardName = (value?: string | null): string =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase();

export const isOnlineSupportedCard = (
  tcgDexId?: string | null,
  name?: string | null,
): boolean => {
  if (tcgDexId && ONLINE_SUPPORTED_CARD_REGISTRY[tcgDexId]) {
    return true;
  }

  return Boolean(
    ONLINE_SUPPORTED_BASIC_ENERGY_NAMES[normalizeOnlineCardName(name)],
  );
};

export const getOnlineSupportedCardDefinition = (
  tcgDexId?: string | null,
): SupportedCardDefinition | null =>
  tcgDexId ? ONLINE_SUPPORTED_CARD_REGISTRY[tcgDexId] || null : null;

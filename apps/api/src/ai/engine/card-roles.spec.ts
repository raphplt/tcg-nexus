import { PokemonCardsType } from "../../common/enums/pokemonCardsType";
import {
  DeckCardRoleTag,
  detectCardRoles,
  expectsEffects,
  hasReadableEffects,
} from "./card-roles";

describe("detectCardRoles", () => {
  it("reads draw and search from a trainer's play effects", () => {
    const roles = detectCardRoles({
      id: "t1",
      category: PokemonCardsType.Trainer,
      parsedEffects: {
        kind: "trainer",
        playEffects: [
          { type: "SHUFFLE_HAND_DRAW", target: "SELF", drawAmount: 7 },
          { type: "SEARCH_DECK", amount: 1, destination: "HAND" },
        ],
      },
    });

    expect(roles.map((entry) => entry.role).sort()).toEqual([
      DeckCardRoleTag.Draw,
      DeckCardRoleTag.Search,
    ]);
  });

  it("unwraps conditional effects so a coin-flip draw still counts", () => {
    const roles = detectCardRoles({
      id: "t2",
      parsedEffects: {
        kind: "trainer",
        playEffects: [
          {
            type: "CONDITIONAL",
            effects: [{ type: "DRAW_CARD", amount: 3 }],
          },
        ],
      },
    });

    expect(roles).toEqual([
      { role: DeckCardRoleTag.Draw, evidence: ["DRAW_CARD"] },
    ]);
  });

  it("ignores attack effects, which do not make a list consistent", () => {
    const roles = detectCardRoles({
      id: "p1",
      parsedEffects: {
        kind: "pokemon",
        attacks: {
          "Card Draw": { effects: [{ type: "DRAW_CARD", amount: 2 }] },
        },
      },
    });

    expect(roles).toEqual([]);
  });

  it("counts a Pokémon ability that accelerates energy", () => {
    const roles = detectCardRoles({
      id: "p2",
      parsedEffects: {
        kind: "pokemon",
        attacks: {},
        ability: {
          name: "Dark Patch",
          effects: [{ type: "ATTACH_ENERGY_FROM_DISCARD", amount: 1 }],
        },
      },
    });

    expect(roles).toEqual([
      {
        role: DeckCardRoleTag.EnergyAcceleration,
        evidence: ["ATTACH_ENERGY_FROM_DISCARD"],
      },
    ]);
  });

  it("treats milling as disruption only when it hits the opponent", () => {
    const ownMill = detectCardRoles({
      id: "t3",
      parsedEffects: {
        kind: "trainer",
        playEffects: [{ type: "MILL", amount: 2, target: "SELF" }],
      },
    });
    const opponentMill = detectCardRoles({
      id: "t4",
      parsedEffects: {
        kind: "trainer",
        playEffects: [{ type: "MILL", amount: 2, target: "OPPONENT" }],
      },
    });

    expect(ownMill).toEqual([]);
    expect(opponentMill.map((entry) => entry.role)).toEqual([
      DeckCardRoleTag.Disruption,
    ]);
  });

  it("ignores effect types it does not know instead of guessing", () => {
    const roles = detectCardRoles({
      id: "t5",
      parsedEffects: {
        kind: "trainer",
        playEffects: [{ type: "SOME_FUTURE_EFFECT", target: "OPPONENT" }],
      },
    });

    expect(roles).toEqual([]);
  });

  it("returns nothing when the card has no parsed effects", () => {
    expect(detectCardRoles({ id: "x", parsedEffects: null })).toEqual([]);
  });
});

describe("effect coverage helpers", () => {
  it("does not expect effects on basic energy", () => {
    expect(
      expectsEffects({ id: "e1", category: PokemonCardsType.Energy }),
    ).toBe(false);
    expect(
      expectsEffects({ id: "t1", category: PokemonCardsType.Trainer }),
    ).toBe(true);
  });

  it("reports whether effects could be read", () => {
    expect(hasReadableEffects({ id: "a", parsedEffects: null })).toBe(false);
    expect(hasReadableEffects({ id: "b", parsedEffects: {} })).toBe(false);
    expect(
      hasReadableEffects({ id: "c", parsedEffects: { kind: "trainer" } }),
    ).toBe(true);
  });
});

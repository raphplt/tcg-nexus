import { CardCategory } from "../engine/models/enums";
import { OnlinePlaySupportService } from "./online-play-support.service";

describe("OnlinePlaySupportService", () => {
  let service: OnlinePlaySupportService;
  let cardRepository: { find: jest.Mock };

  beforeEach(() => {
    cardRepository = {
      find: jest.fn(),
    };
    service = new OnlinePlaySupportService(cardRepository as any);
  });

  it("should validate an eligible online deck", () => {
    const result = service.evaluateDeckEligibility(
      {
        id: 7,
        name: "Deck MVP",
        user: { id: 4 },
        cards: [
          {
            qty: 4,
            role: "main",
            card: {
              id: "card-basic",
              tcgDexId: "np-6",
              name: "Piafabec",
              category: "Pokémon",
              pokemonDetails: {
                stage: "De base",
                hp: 50,
                attacks: [{ name: "Picpic", cost: [], damage: 10 }],
                types: ["Plante"],
              },
            },
          },
          {
            qty: 56,
            role: "main",
            card: {
              id: "card-energy",
              name: "Feu",
              pokemonDetails: {
                energyType: "Basic",
              },
            },
          },
        ],
      } as any,
      4,
    );

    expect(result.eligible).toBe(true);
    expect(result.totalCards).toBe(60);
    expect(result.reasons).toHaveLength(0);
  });

  it("should resolve a reference preset with synthetic basic energies", async () => {
    cardRepository.find.mockResolvedValue([
      {
        id: "basic-1",
        tcgDexId: "np-6",
        name: "Piafabec",
        image: null,
        pokemonDetails: {
          stage: "De base",
          hp: 50,
          attacks: [{ name: "Picpic", cost: [], damage: 10 }],
          types: ["Plante"],
          weaknesses: [],
          resistances: [],
          retreat: 1,
        },
      },
      {
        id: "basic-2",
        tcgDexId: "xy7-5",
        name: "Aspicot",
        image: null,
        pokemonDetails: {
          stage: "De base",
          hp: 50,
          attacks: [{ name: "Sécrétion", cost: [], damage: 0 }],
          types: ["Plante"],
          weaknesses: [],
          resistances: [],
          retreat: 1,
        },
      },
      {
        id: "trainer-1",
        tcgDexId: "swsh4-185",
        name: "Potion",
        image: null,
        pokemonDetails: {
          trainerType: "Item",
          effect: "Heal",
        },
      },
    ]);

    const cards = await service.mapReferenceDeckToEngineCards(
      "mvp-blaziken-lite",
      "training-ai",
    );

    expect(cards).toHaveLength(60);
    expect(
      cards.some((card) => card.baseCard.category === CardCategory.Energy),
    ).toBe(true);
  });
});

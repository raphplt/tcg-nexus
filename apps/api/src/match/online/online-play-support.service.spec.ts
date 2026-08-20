import { NotFoundException } from "@nestjs/common";
import { CardCategory } from "../engine/models/enums";
import { OnlinePlaySupportService } from "./online-play-support.service";

describe("OnlinePlaySupportService", () => {
  let service: OnlinePlaySupportService;
  let cardRepository: { find: jest.Mock };
  let cardTranslationRepository: { find: jest.Mock };
  let localization: { resolveLabels: jest.Mock };

  beforeEach(() => {
    cardRepository = {
      find: jest.fn(),
    };
    cardTranslationRepository = {
      find: jest.fn().mockResolvedValue([]),
    };
    localization = {
      resolveLabels: jest.fn(async (payload) => payload),
    };
    service = new OnlinePlaySupportService(
      cardRepository as any,
      cardTranslationRepository as any,
      localization as any,
    );
  });

  describe("reference deck presets", () => {
    it("should list reference deck presets", () => {
      const list = service.listReferenceDeckPresets();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
    });

    it("should get reference deck preset by id", () => {
      const preset = service.getReferenceDeckPreset("mvp-blaziken-lite");
      expect(preset).toBeDefined();
      expect(preset.id).toBe("mvp-blaziken-lite");
    });

    it("should throw NotFoundException for unknown preset", () => {
      expect(() => service.getReferenceDeckPreset("unknown-preset")).toThrow(
        NotFoundException,
      );
    });
  });

  describe("evaluateDeckEligibility", () => {
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
                category: "Énergie",
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

    it("should reject decks with wrong size, missing basic pokemon, or wrong owner", () => {
      const wrongSize = service.evaluateDeckEligibility(
        {
          id: 1,
          user: { id: 4 },
          cards: [{ qty: 10, role: "main", card: { name: "P" } }],
        } as any,
        4,
      );
      expect(wrongSize.eligible).toBe(false);
      expect(wrongSize.reasons.some((r) => r.code === "INVALID_SIZE")).toBe(
        true,
      );

      const notOwner = service.evaluateDeckEligibility(
        {
          id: 2,
          user: { id: 99 },
          cards: [],
        } as any,
        4,
      );
      expect(notOwner.eligible).toBe(false);
      expect(notOwner.reasons.some((r) => r.code === "NOT_OWNER")).toBe(true);
    });
  });

  describe("createInitialGameState", () => {
    it("should create initial game state with coin toss and setup prompt", () => {
      const state = service.createInitialGameState({
        gameId: "game-123",
        seed: "test-seed",
        players: [
          { playerId: "p1", name: "Player 1", deck: [] },
          { playerId: "p2", name: "Player 2", deck: [] },
        ],
      });

      expect(state.id).toBe("game-123");
      expect(state.playerIds).toEqual(["p1", "p2"]);
      expect(state.pendingPrompt?.type).toBe("CHOOSE_FIRST_PLAYER");
      expect(state.setup?.coinFlipWinnerId).toBeDefined();
    });
  });

  describe("mapReferenceDeckToEngineCards", () => {
    it("should resolve a reference preset with synthetic basic energies", async () => {
      cardRepository.find.mockResolvedValue([
        {
          id: "basic-1",
          tcgDexId: "np-6",
          name: "Piafabec",
          category: "Pokémon",
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
          category: "Pokémon",
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
          category: "Dresseur",
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
});

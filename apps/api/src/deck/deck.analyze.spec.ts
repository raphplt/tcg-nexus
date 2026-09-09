import { CatalogLocalizationService } from "../card/catalog-localization.service";
import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Card } from "../card/entities/card.entity";
import { DeckMetricsService } from "../ai/engine/deck-metrics.service";
import { DeckCard } from "../deck-card/entities/deck-card.entity";
import { DeckFormat } from "../deck-format/entities/deck-format.entity";
import { DeckService } from "./deck.service";
import { Deck } from "./entities/deck.entity";
import { DeckShare } from "./entities/deck-share.entity";
import { SavedDeck } from "./entities/saved-deck.entity";

/**
 * `analyzeDeck` owns loading and visibility; every rule lives in
 * `DeckMetricsService` and is covered by its own suite.
 */
describe("DeckService analyzeDeck", () => {
  let service: DeckService;

  const deckRepo = { findOne: jest.fn() };
  const metrics = { analyze: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeckService,
        { provide: getRepositoryToken(DeckCard), useValue: {} },
        { provide: getRepositoryToken(Card), useValue: {} },
        { provide: getRepositoryToken(DeckFormat), useValue: {} },
        { provide: getRepositoryToken(Deck), useValue: deckRepo },
        { provide: getRepositoryToken(DeckShare), useValue: {} },
        { provide: getRepositoryToken(SavedDeck), useValue: {} },
        {
          provide: CatalogLocalizationService,
          useValue: {
            localize: jest.fn(async (payload) => payload),
            resolveLabels: jest.fn(async (payload) => payload),
          },
        },
        { provide: DeckMetricsService, useValue: metrics },
      ],
    }).compile();

    service = module.get<DeckService>(DeckService);
    metrics.analyze.mockResolvedValue({ deckId: 1 });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("throws when deck is not found", async () => {
    deckRepo.findOne.mockResolvedValue(null);

    await expect(service.analyzeDeck(99)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(metrics.analyze).not.toHaveBeenCalled();
  });

  it("refuses to analyze a private deck for an anonymous caller", async () => {
    deckRepo.findOne.mockResolvedValue({
      id: 1,
      isPublic: false,
      user: { id: 7 },
      cards: [],
    });

    await expect(service.analyzeDeck(1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(metrics.analyze).not.toHaveBeenCalled();
  });

  it("analyzes a private deck for its owner", async () => {
    deckRepo.findOne.mockResolvedValue({
      id: 1,
      isPublic: false,
      user: { id: 7 },
      cards: [],
    });

    await expect(service.analyzeDeck(1, { id: 7 } as never)).resolves.toEqual({
      deckId: 1,
    });
  });

  it("passes the deck's cards, format and locale to the engine", async () => {
    deckRepo.findOne.mockResolvedValue({
      id: 4,
      isPublic: true,
      format: { id: 2, type: "Standard" },
      cards: [
        { qty: 4, card: { id: "p1" } },
        { qty: 0, card: { id: "p2" } },
      ],
    });

    await service.analyzeDeck(4, undefined, "en");

    expect(metrics.analyze).toHaveBeenCalledWith(
      [
        { card: { id: "p1" }, qty: 4 },
        { card: { id: "p2" }, qty: 0 },
      ],
      { deckId: 4, formatId: 2, formatType: "Standard", locale: "en" },
    );
  });
});

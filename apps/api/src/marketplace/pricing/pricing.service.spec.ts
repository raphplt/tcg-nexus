import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Card, CardPricingData } from "src/card/entities/card.entity";
import { CardPopularityService } from "../card-popularity.service";
import { PriceHistory } from "../entities/price-history.entity";
import { PricingCache } from "./pricing.cache";
import { ExternalPricingService } from "./pricing.service";

// Mock de la SDK TCGdex — stub global (le constructeur retourne un objet avec
// un `fetch` remplaçable d'instance à instance via __tcgdexFetchMock).
const tcgdexFetchMock = jest.fn();
jest.mock("@tcgdex/sdk", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    fetch: tcgdexFetchMock,
  })),
}));

describe("ExternalPricingService", () => {
  let service: ExternalPricingService;
  let cardRepo: any;
  let historyRepo: any;
  let cache: PricingCache;
  let popularityService: any;

  beforeEach(async () => {
    tcgdexFetchMock.mockReset();

    cardRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
    };
    historyRepo = {
      create: jest.fn((x) => x),
      save: jest.fn().mockResolvedValue([]),
    };
    popularityService = {
      getPopularCards: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExternalPricingService,
        PricingCache,
        { provide: getRepositoryToken(Card), useValue: cardRepo },
        { provide: getRepositoryToken(PriceHistory), useValue: historyRepo },
        { provide: CardPopularityService, useValue: popularityService },
      ],
    }).compile();

    service = module.get(ExternalPricingService);
    cache = module.get(PricingCache);
  });

  describe("isStale", () => {
    it("considère un pricing null comme périmé", () => {
      expect(service.isStale(null)).toBe(true);
      expect(service.isStale(undefined)).toBe(true);
    });

    it("considère un pricing < 48h comme frais", () => {
      const pricing: CardPricingData = {
        cardmarket: { updated: new Date().toISOString() } as any,
      };
      expect(service.isStale(pricing)).toBe(false);
    });

    it("considère un pricing > 48h comme périmé", () => {
      const old = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const pricing: CardPricingData = {
        cardmarket: { updated: old } as any,
      };
      expect(service.isStale(pricing)).toBe(true);
    });
  });

  describe("getOrRefresh", () => {
    it("renvoie directement le cache si présent", async () => {
      const cached: CardPricingData = { cardmarket: { trend: 5 } as any };
      cache.set("c1", cached);
      const res = await service.getOrRefresh("c1");
      expect(res).toBe(cached);
      expect(cardRepo.findOne).not.toHaveBeenCalled();
    });

    it("retourne le pricing DB si frais, sans appeler TCGdex", async () => {
      const fresh: CardPricingData = {
        cardmarket: {
          trend: 5,
          updated: new Date().toISOString(),
        } as any,
      };
      cardRepo.findOne.mockResolvedValue({ id: "c1", pricing: fresh });
      const res = await service.getOrRefresh("c1");
      expect(res).toBe(fresh);
      expect(tcgdexFetchMock).not.toHaveBeenCalled();
    });

    it("déclenche un refresh TCGdex si le pricing est périmé", async () => {
      const stale: CardPricingData = {
        cardmarket: {
          trend: 5,
          updated: new Date(Date.now() - 5 * 86400000).toISOString(),
        } as any,
      };
      const refreshed: CardPricingData = {
        cardmarket: {
          trend: 8,
          updated: new Date().toISOString(),
        } as any,
      };
      cardRepo.findOne.mockResolvedValue({
        id: "c1",
        tcgDexId: "swsh3-1",
        pricing: stale,
      });
      tcgdexFetchMock.mockResolvedValue({ pricing: refreshed });

      const res = await service.getOrRefresh("c1");
      expect(tcgdexFetchMock).toHaveBeenCalledWith("cards", "swsh3-1");
      expect(res).toBe(refreshed);
      expect(cardRepo.update).toHaveBeenCalled();
    });

    it("retombe sur le pricing existant en cas d'échec TCGdex", async () => {
      const stale: CardPricingData = {
        cardmarket: {
          trend: 5,
          updated: new Date(Date.now() - 5 * 86400000).toISOString(),
        } as any,
      };
      cardRepo.findOne.mockResolvedValue({
        id: "c1",
        tcgDexId: "swsh3-1",
        pricing: stale,
      });
      tcgdexFetchMock.mockRejectedValue(new Error("network down"));

      const res = await service.getOrRefresh("c1");
      expect(res).toBe(stale);
    });

    it("retourne null si la carte est absente", async () => {
      cardRepo.findOne.mockResolvedValue(null);
      const res = await service.getOrRefresh("unknown");
      expect(res).toBeNull();
    });
  });
});

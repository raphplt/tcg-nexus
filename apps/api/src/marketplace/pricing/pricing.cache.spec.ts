import { CardPricingData } from "src/card/entities/card.entity";
import { PricingCache } from "./pricing.cache";

describe("PricingCache", () => {
  let cache: PricingCache;
  const pricing: CardPricingData = {
    cardmarket: { trend: 10 } as any,
    tcgplayer: null,
  };

  beforeEach(() => {
    cache = new PricingCache();
  });

  it("retourne null pour une clé absente", () => {
    expect(cache.get("x")).toBeNull();
  });

  it("stocke et renvoie la même valeur avant expiration", () => {
    cache.set("c1", pricing, 1000);
    expect(cache.get("c1")).toBe(pricing);
  });

  it("invalide automatiquement une entrée expirée", () => {
    cache.set("c1", pricing, 10);
    jest.useFakeTimers();
    jest.setSystemTime(Date.now() + 100);
    expect(cache.get("c1")).toBeNull();
    jest.useRealTimers();
  });

  it("invalide explicitement une entrée", () => {
    cache.set("c1", pricing, 1000);
    cache.invalidate("c1");
    expect(cache.get("c1")).toBeNull();
  });

  it("reporte correctement la taille", () => {
    cache.set("c1", pricing);
    cache.set("c2", pricing);
    expect(cache.size()).toBe(2);
  });
});

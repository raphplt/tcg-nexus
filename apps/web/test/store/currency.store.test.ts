import { describe, it, expect, afterEach } from "vitest";
import { useCurrencyStore, Currency } from "@/store/currency.store";

describe("currency store", () => {
  afterEach(() => {
    useCurrencyStore.getState().setCurrency(Currency.EUR);
    localStorage.clear();
  });

  it("convertit un prix USD vers l'EUR", () => {
    const store = useCurrencyStore.getState();
    store.setCurrency(Currency.EUR);

    const converted = store.convertPrice(10, Currency.USD);
    expect(converted).toBeCloseTo(9.26, 2);
  });

  it("formate le prix dans la devise sélectionnée", () => {
    const store = useCurrencyStore.getState();
    store.setCurrency(Currency.GBP);

    const formatted = store.formatPrice(100, Currency.EUR);
    expect(formatted.toUpperCase()).toMatch(/GBP|£/);
  });

  it("ne convertit pas lorsque la devise source correspond", () => {
    const store = useCurrencyStore.getState();
    store.setCurrency(Currency.CHF);

    const sameCurrency = store.convertPrice(50, Currency.CHF);
    expect(sameCurrency).toBe(50);
  });
});

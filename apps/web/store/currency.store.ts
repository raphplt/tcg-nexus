import { create } from "zustand";
import { persist } from "zustand/middleware";

export enum Currency {
  EUR = "EUR",
  USD = "USD",
  GBP = "GBP",
  JPY = "JPY",
  CHF = "CHF",
  CAD = "CAD",
}

const EXCHANGE_RATES: Record<Currency, number> = {
  [Currency.EUR]: 1,
  [Currency.USD]: 1.08,
  [Currency.GBP]: 0.85,
  [Currency.JPY]: 163.5,
  [Currency.CHF]: 0.96,
  [Currency.CAD]: 1.47,
};

interface CurrencyState {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  convertPrice: (price: number, fromCurrency: string) => number;
  formatPrice: (price: number, fromCurrency: string) => string;
  formatExact: (price: number, currency: string) => string;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      currency: Currency.EUR,
      setCurrency: (currency) => set({ currency }),
      convertPrice: (price: number, fromCurrency: string) => {
        const targetCurrency = get().currency;

        if (fromCurrency === targetCurrency) return price;

        const rateFrom = EXCHANGE_RATES[fromCurrency as Currency] || 1;
        const priceInEur = price / rateFrom;

        const rateTo = EXCHANGE_RATES[targetCurrency] || 1;
        return priceInEur * rateTo;
      },
      formatPrice: (price: number, fromCurrency: string) => {
        const targetCurrency = get().currency;
        const convertedPrice = get().convertPrice(price, fromCurrency);

        const formatted = new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: targetCurrency,
        }).format(convertedPrice);

        const isConverted = !!fromCurrency && fromCurrency !== targetCurrency;
        return isConverted ? `≈ ${formatted}` : formatted;
      },

      formatExact: (price: number, currency: string) => {
        try {
          return new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: currency || Currency.EUR,
          }).format(price);
        } catch {
          return `${price} ${currency}`;
        }
      },
    }),
    {
      name: "currency-storage",
    },
  ),
);

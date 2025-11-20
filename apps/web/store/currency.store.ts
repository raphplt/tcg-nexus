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

// Taux de change statiques basés sur l'EUR (1 EUR = x Currency)
// Ces taux sont approximatifs pour la démo
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
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      currency: Currency.EUR,
      setCurrency: (currency) => set({ currency }),
      convertPrice: (price: number, fromCurrency: string) => {
        const targetCurrency = get().currency;
        
        // Si la devise source est la même que la cible, pas de conversion
        if (fromCurrency === targetCurrency) return price;

        // Convertir d'abord en EUR (devise de base)
        const rateFrom = EXCHANGE_RATES[fromCurrency as Currency] || 1;
        const priceInEur = price / rateFrom;

        // Convertir ensuite vers la devise cible
        const rateTo = EXCHANGE_RATES[targetCurrency] || 1;
        return priceInEur * rateTo;
      },
      formatPrice: (price: number, fromCurrency: string) => {
        const convertedPrice = get().convertPrice(price, fromCurrency);
        const targetCurrency = get().currency;

        return new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: targetCurrency,
        }).format(convertedPrice);
      },
    }),
    {
      name: "currency-storage",
    }
  )
);

"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Currency, useCurrencyStore } from "@/store/currency.store";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  [Currency.EUR]: "\u20AC",
  [Currency.USD]: "$",
  [Currency.GBP]: "\u00A3",
  [Currency.JPY]: "\u00A5",
  [Currency.CHF]: "CHF",
  [Currency.CAD]: "CA$",
};

export function CurrencySelector() {
  const { currency, setCurrency } = useCurrencyStore();
  const { user } = useAuth();

  useEffect(() => {
    const stored = localStorage.getItem("currency-storage");
    if (stored) return;
    if (
      user?.preferredCurrency &&
      Object.values(Currency).includes(user.preferredCurrency as Currency)
    ) {
      setCurrency(user.preferredCurrency as Currency);
    }
  }, [user, setCurrency]);

  return (
    <Select
      value={currency}
      onValueChange={(value) => setCurrency(value as Currency)}
    >
      <SelectTrigger className="w-22.5 h-8">
        <SelectValue placeholder="Devise" />
      </SelectTrigger>
      <SelectContent>
        {Object.values(Currency).map((curr) => (
          <SelectItem key={curr} value={curr}>
            {CURRENCY_SYMBOLS[curr]} {curr}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

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

export function CurrencySelector() {
  const { currency, setCurrency } = useCurrencyStore();
  const { user } = useAuth();

  // Synchroniser avec la préférence utilisateur si disponible
  useEffect(() => {
    if (user?.preferredCurrency && Object.values(Currency).includes(user.preferredCurrency as Currency)) {
      setCurrency(user.preferredCurrency as Currency);
    }
  }, [user, setCurrency]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground hidden sm:inline">Devise:</span>
      <Select
        value={currency}
        onValueChange={(value) => setCurrency(value as Currency)}
      >
        <SelectTrigger className="w-[100px]">
          <SelectValue placeholder="Devise" />
        </SelectTrigger>
        <SelectContent>
          {Object.values(Currency).map((curr) => (
            <SelectItem key={curr} value={curr}>
              {curr}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

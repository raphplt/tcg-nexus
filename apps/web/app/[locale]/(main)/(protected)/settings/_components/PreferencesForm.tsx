"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings2, Sun, Moon, Monitor, Loader2 } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Currency, useCurrencyStore } from "@/store/currency.store";
import { userService } from "@/services/user.service";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-hot-toast";

const CURRENCY_LABELS: Record<Currency, string> = {
  [Currency.EUR]: "Euro (EUR)",
  [Currency.USD]: "Dollar US (USD)",
  [Currency.GBP]: "Livre sterling (GBP)",
  [Currency.JPY]: "Yen japonais (JPY)",
  [Currency.CHF]: "Franc suisse (CHF)",
  [Currency.CAD]: "Dollar canadien (CAD)",
};

export const PreferencesForm = () => {
  const { theme, setTheme, mounted } = useTheme();
  const { currency, setCurrency } = useCurrencyStore();
  const { refreshUser } = useAuth();
  const [saving, setSaving] = React.useState(false);

  const handleCurrencyChange = async (value: string) => {
    const newCurrency = value as Currency;
    setCurrency(newCurrency);

    try {
      setSaving(true);
      await userService.updateProfile({ preferredCurrency: newCurrency });
      await refreshUser();
      toast.success("Devise mise à jour");
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;

  return (
    <Card className="p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Settings2 className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold">Préférences</h2>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <label className="text-sm font-medium">Thème</label>
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => setTheme("light")}
            >
              <Sun className="w-5 h-5" />
              <span className="text-xs">Clair</span>
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => setTheme("dark")}
            >
              <Moon className="w-5 h-5" />
              <span className="text-xs">Sombre</span>
            </Button>
            <Button
              variant={theme === "system" ? "default" : "outline"}
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => setTheme("system")}
            >
              <Monitor className="w-5 h-5" />
              <span className="text-xs">Système</span>
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium">Devise d&apos;affichage</label>
          <div className="flex items-center gap-3">
            <Select value={currency} onValueChange={handleCurrencyChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choisir une devise" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(Currency).map((c) => (
                  <SelectItem key={c} value={c}>
                    {CURRENCY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {saving && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
          </div>
        </div>
      </div>
    </Card>
  );
};

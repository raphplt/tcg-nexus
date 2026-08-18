"use client";

import { useTranslations } from "next-intl";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useState } from "react";
import usePlacesAutocomplete from "use-places-autocomplete";
import { Button } from "@/components/ui/button";
import { GoogleMapsScript } from "@/components/GoogleMapsScript";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Props {
  onSubmit: (shippingAddress: string) => void;
  isSubmitting: boolean;
  error: string | null;
}

export default function ShippingAddressForm({
  onSubmit,
  isSubmitting,
  error,
}: Props) {
  const t = useTranslations("ShippingAddress");
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [isManualMode, setIsManualMode] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const {
    init: initializePlaces,
    ready,
    value,
    setValue,
    suggestions: { status, data },
    clearSuggestions,
  } = usePlacesAutocomplete({ debounce: 300, initOnMount: false });

  const handleSelect = (selected: string) => {
    setValue(selected, false);
    setAddress(selected);
    clearSuggestions();
    setValidationError(null);
    setOpen(false);
  };

  const handleUseTypedValue = () => {
    if (value.trim()) {
      handleSelect(value.trim());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = address.trim();

    if (trimmed.length < 10) {
      setValidationError(t("incompleteAddress"));
      return;
    }

    setValidationError(null);
    onSubmit(trimmed);
  };

  const isComboboxActive = ready && !isManualMode;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <GoogleMapsScript onReady={initializePlaces} />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="shipping-address">{t("title")}</Label>
          {ready && (
            <button
              type="button"
              onClick={() => setIsManualMode((prev) => !prev)}
              className="text-xs text-primary hover:underline font-medium"
            >
              {isManualMode ? "Recherche automatique" : "Saisie manuelle"}
            </button>
          )}
        </div>

        {isComboboxActive ? (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between text-left font-normal"
              >
                <span className="truncate">
                  {address || t("searchPlaceholder")}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[var(--radix-popover-trigger-width)] p-0"
              align="start"
            >
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder={t("searchPlaceholder")}
                  value={value}
                  onValueChange={(val) => {
                    setValue(val);
                    if (val) {
                      setAddress(val);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && value.trim()) {
                      e.preventDefault();
                      handleUseTypedValue();
                    }
                  }}
                />
                <CommandList>
                  {value.trim().length >= 3 && (
                    <CommandGroup heading="Saisie directe">
                      <CommandItem
                        value={value.trim()}
                        onSelect={handleUseTypedValue}
                        className="font-medium text-primary cursor-pointer"
                      >
                        <Check className="mr-2 h-4 w-4 opacity-50" />
                        Utiliser &quot;{value.trim()}&quot;
                      </CommandItem>
                    </CommandGroup>
                  )}
                  <CommandEmpty>
                    <div className="p-2 text-center text-sm">
                      <p className="text-muted-foreground mb-2">
                        {t("noAddressFound")}
                      </p>
                      {value.trim().length > 0 && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={handleUseTypedValue}
                        >
                          Utiliser &quot;{value.trim()}&quot;
                        </Button>
                      )}
                    </div>
                  </CommandEmpty>
                  <CommandGroup>
                    {status === "OK" &&
                      data.map(({ place_id, description }) => (
                        <CommandItem
                          key={place_id}
                          value={description}
                          onSelect={handleSelect}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              address === description
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          {description}
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        ) : (
          <Input
            id="shipping-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t("addressExample")}
            autoComplete="street-address"
          />
        )}

        <p className="text-xs text-muted-foreground">{t("notice")}</p>
      </div>

      {(validationError || error) && (
        <p role="alert" className="text-sm text-destructive">
          {validationError || error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Continuer vers le paiement
      </Button>
    </form>
  );
}

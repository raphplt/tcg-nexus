"use client";

import { useTranslations } from "next-intl";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useState } from "react";
import usePlacesAutocomplete from "use-places-autocomplete";
import { Button } from "@/components/ui/button";
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
  const [validationError, setValidationError] = useState<string | null>(null);

  const {
    ready,
    value,
    setValue,
    suggestions: { status, data },
    clearSuggestions,
  } = usePlacesAutocomplete({ debounce: 300 });

  const handleSelect = (selected: string) => {
    setValue(selected, false);
    setAddress(selected);
    clearSuggestions();
    setValidationError(null);
    setOpen(false);
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="shipping-address">{t("title")}</Label>

        {ready ? (
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
                  onValueChange={setValue}
                />
                <CommandList>
                  <CommandEmpty>{t("noAddressFound")}</CommandEmpty>
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

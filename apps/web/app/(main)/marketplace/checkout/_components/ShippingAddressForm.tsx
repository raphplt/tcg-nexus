"use client";

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
      setValidationError(
        "Renseignez une adresse de livraison complète (numéro, rue, ville, code postal).",
      );
      return;
    }

    setValidationError(null);
    onSubmit(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="shipping-address">Adresse de livraison</Label>

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
                  {address || "Rechercher une adresse..."}
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
                  placeholder="Rechercher une adresse..."
                  value={value}
                  onValueChange={setValue}
                />
                <CommandList>
                  <CommandEmpty>Aucune adresse trouvée.</CommandEmpty>
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
            placeholder="12 rue des Cartes, 75001 Paris, France"
            autoComplete="street-address"
          />
        )}

        <p className="text-xs text-muted-foreground">
          Cette adresse sera transmise aux vendeurs pour l&apos;expédition et
          conservée sur la commande.
        </p>
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

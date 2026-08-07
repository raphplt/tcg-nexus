"use client";

import * as React from "react";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/ui/popover";
import { Button } from "@components/ui/button";
import { cn } from "@lib/utils";
import { authedFetch } from "@utils/fetch";
import { Input } from "@components/ui/input";
import { PokemonCardType } from "@/types/cardPokemon";

interface CardComboboxProps {
  onSelect: (card: PokemonCardType) => void;
  resetSignal?: number;
}

export function CardSelector({ onSelect, resetSignal }: CardComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [input, setInput] = React.useState("");
  const [cards, setCards] = React.useState<PokemonCardType[]>([]);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [isSearching, setIsSearching] = React.useState(false);
  const [selectedCard, setSelectedCard] =
    React.useState<PokemonCardType | null>(null);
  const timeoutRef = React.useRef<number | undefined>(undefined);

  const listRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setSelectedCard(null);
    setValue("");
    setInput("");
    setCards([]);
    setPage(1);
  }, [resetSignal]);

  React.useEffect(() => {
    if (!open) return;
    const fetchCards = async () => {
      setLoading(true);
      try {
        const res = await authedFetch(
          "GET",
          `/pokemon-card/paginated?page=${page}&limit=100`,
        );
        setIsSearching(false);
        const resData =
          typeof res === "object" && res !== null && "data" in res
            ? (res as { data: unknown }).data
            : [];
        const newCards = Array.isArray(resData)
          ? (resData as PokemonCardType[])
          : [];
        setCards((prev) => [...prev, ...newCards]);
        setHasMore(newCards.length === 100);
      } catch (err) {
        console.error("Erreur fetch cartes :", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
  }, [page, open]);

  // Scroll to bottom pour pagination
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom =
      e.currentTarget.scrollTop + e.currentTarget.clientHeight >=
      e.currentTarget.scrollHeight - 50;
    if (bottom && !loading && hasMore && !isSearching) {
      setPage((p) => p + 1);
    }
  };

  const handleSelect = (cardId: string) => {
    const selected = cards.find((c) => c.id === cardId);
    if (selected) {
      setValue(cardId);
      setSelectedCard(selected);
      onSelect(selected);
      setOpen(false);
    }
  };

  const handleOnChange = async (search: string) => {
    setLoading(true);
    try {
      const res = await authedFetch(
        "GET",
        `/pokemon-card/search/${encodeURIComponent(search)}`,
      );
      setIsSearching(true);
      setCards([]);
      setCards(res as PokemonCardType[]);
      setHasMore(false);
    } catch (err) {
      console.error("Erreur fetch cartes :", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(state) => {
        setOpen(state);
        if (state) {
          setPage(1);
          setCards([]);
          setInput("");
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedCard ? (selectedCard.name ?? "") : "Sélectionner une carte"}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <Input
            placeholder="Rechercher une carte..."
            value={input}
            onChange={(e) => {
              const val = e.target.value;
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current!);
              }
              timeoutRef.current = window.setTimeout(() => {
                if (val.length > 0) {
                  handleOnChange(val);
                }
              }, 500);

              setInput(val);
              // setPage(1)
              // setCards([])
              // setHasMore(true)
            }}
          />
          <CommandList
            ref={(el) => {
              listRef.current = el;
            }}
            onScroll={handleScroll}
          >
            <CommandEmpty>
              {input.length < 2
                ? "Commencez à taper pour rechercher."
                : "Aucune carte trouvée."}
            </CommandEmpty>
            <CommandGroup>
              {cards.map((card) => (
                <CommandItem
                  key={card.id}
                  value={card.id}
                  onSelect={() => handleSelect(card.id)}
                >
                  <CheckIcon
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === card.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {card.name ?? ""}
                </CommandItem>
              ))}
              {loading && (
                <div className="p-2 text-sm text-muted-foreground">
                  Chargement...
                </div>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

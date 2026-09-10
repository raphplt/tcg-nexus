"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Search, X, Check } from "lucide-react";
import { SmartImage } from "@/components/ui/SmartImage";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { pokemonCardService } from "@/services/pokemonCard.service";
import type { PokemonCardType } from "@/types/cardPokemon";
import { getOfficialArtworkUrl, normalizeSpeciesName } from "./pokedleLogic";

interface PokedleSearchProps {
  onSelect: (card: PokemonCardType) => void;
  disabled?: boolean;
  guessedDexIds: number[];
}

/**
 * Deduplicates raw card search results into unique Pokémon species candidates.
 * Prioritizes cards that have a valid dexId and official types.
 */
function deduplicateSpecies(cards: PokemonCardType[]): PokemonCardType[] {
  const seenDexIds = new Set<number>();
  const seenNames = new Set<string>();
  const unique: PokemonCardType[] = [];

  for (const card of cards) {
    const dexId = card.dexId?.[0];
    const normalized = normalizeSpeciesName(card.name);

    if (dexId && dexId > 0) {
      if (!seenDexIds.has(dexId)) {
        seenDexIds.add(dexId);
        if (normalized) seenNames.add(normalized);
        unique.push(card);
      }
    } else if (normalized && !seenNames.has(normalized)) {
      seenNames.add(normalized);
      unique.push(card);
    }
  }

  return unique;
}

/**
 * Accessible debounced autocomplete dropdown for selecting Pokémon species in Pokedle.
 */
export function PokedleSearch({
  onSelect,
  disabled = false,
  guessedDexIds,
}: PokedleSearchProps) {
  const t = useTranslations("Pokedle");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PokemonCardType[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);

  // Debounced search query
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const rawResults = await pokemonCardService.search(trimmed, 25);
        const speciesList = deduplicateSpecies(rawResults).slice(0, 10);
        setResults(speciesList);
        setActiveIndex(-1);
      } catch (err) {
        console.error("Failed to search Pokémon cards:", err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [query]);

  // Dismiss dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (card: PokemonCardType) => {
      const dexId = card.dexId?.[0] || 0;
      if (dexId > 0 && guessedDexIds.includes(dexId)) {
        return;
      }
      onSelect(card);
      setQuery("");
      setResults([]);
      setIsOpen(false);
      setActiveIndex(-1);
    },
    [guessedDexIds, onSelect],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) {
      if (e.key === "ArrowDown" && results.length > 0) {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < results.length) {
          const selected = results[activeIndex];
          if (selected) {
            handleSelect(selected);
          }
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none" />
        <Input
          type="text"
          value={query}
          disabled={disabled}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchAriaLabel")}
          aria-expanded={isOpen}
          aria-autocomplete="list"
          role="combobox"
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10 h-12 rounded-xl bg-card border-border/80 focus-visible:ring-2 focus-visible:ring-primary/40 font-bold text-sm shadow-sm"
        />

        {/* Action icons (loading spinner or clear query button) */}
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
          {!isLoading && query.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setResults([]);
                setIsOpen(false);
              }}
              className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              aria-label={t("clearSearch")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      <AnimatePresence>
        {isOpen && query.trim().length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            ref={listboxRef}
            role="listbox"
            className="absolute z-50 left-0 right-0 mt-2 bg-popover/95 backdrop-blur-md border border-border shadow-2xl rounded-xl max-h-72 overflow-y-auto divide-y divide-border/50"
          >
            {results.length === 0 && !isLoading && (
              <div className="p-4 text-center text-xs font-semibold text-muted-foreground">
                {t("noResultsFound")}
              </div>
            )}

            {results.map((card, idx) => {
              const dexId = card.dexId?.[0] || 0;
              const isAlreadyGuessed = dexId > 0 && guessedDexIds.includes(dexId);
              const isActive = idx === activeIndex;
              const artwork = getOfficialArtworkUrl(dexId);
              const types = card.types || [];

              return (
                <div
                  key={card.id || `${dexId}-${card.name}`}
                  role="option"
                  aria-selected={isActive}
                  aria-disabled={isAlreadyGuessed}
                  onClick={() => !isAlreadyGuessed && handleSelect(card)}
                  className={`p-3 flex items-center justify-between transition-colors select-none ${
                    isAlreadyGuessed
                      ? "opacity-45 cursor-not-allowed bg-muted/10"
                      : "cursor-pointer"
                  } ${
                    isActive && !isAlreadyGuessed
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted/30 text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative h-8 w-8 rounded-full overflow-hidden shrink-0 bg-muted/30 flex items-center justify-center border border-border/50">
                      <SmartImage
                        src={artwork}
                        alt={card.name}
                        fallbackSrc="/images/carte-pokemon-dos.jpg"
                        noSkeleton
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-foreground truncate">
                          {card.name}
                        </span>
                        {dexId > 0 && (
                          <span className="text-[11px] font-semibold text-muted-foreground">
                            #{dexId}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {types.map((tp, tIdx) => (
                          <span
                            key={tIdx}
                            className="text-[10px] px-1.5 py-0.2 rounded bg-muted/50 text-muted-foreground font-semibold"
                          >
                            {tp}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {isAlreadyGuessed ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] text-muted-foreground border-border/60 shrink-0 gap-1"
                    >
                      <Check className="h-3 w-3" />
                      {t("alreadyGuessed")}
                    </Badge>
                  ) : (
                    <span className="text-xs font-bold text-muted-foreground/60 shrink-0">
                      Gen {card.dexId?.[0] ? Math.min(9, Math.ceil(card.dexId[0] / 100)) : 1}
                    </span>
                  )}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

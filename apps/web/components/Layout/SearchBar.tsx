"use client";

import {
  Command,
  Hash,
  Search,
  SearchIcon,
  ShoppingCart,
  Trophy,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import { useSearchKeyboard } from "@/hooks/useSearchKeyboard";
import type { SearchResultItem } from "@/services/search.service";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import {
  getSearchItemIcon,
  SearchItemButton,
} from "./SearchItemButton";

const FALLBACK_SHORTCUTS = [
  { query: "Pikachu", label: "Cartes populaires", icon: Hash },
  { query: "tournoi", label: "Tournois actifs", icon: Trophy },
  { query: "joueur", label: "Top joueurs", icon: Users },
  { query: "marketplace", label: "Marketplace", icon: ShoppingCart },
];

const SearchBar = () => {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { results, suggestions, isLoading } = useGlobalSearch({
    query,
    enabled: isOpen,
  });

  const hasQuery = query.length > 0;
  const activeItems = hasQuery ? results : suggestions;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const handleResultClick = useCallback(
    (result: SearchResultItem) => {
      router.push(result.url);
      close();
    },
    [router, close],
  );

  const handleSelect = useCallback(
    (index: number) => {
      if (hasQuery) {
        const result = results[index];
        if (result) handleResultClick(result);
      } else {
        const suggestion = suggestions[index];
        if (suggestion) setQuery(suggestion.title);
      }
    },
    [hasQuery, results, suggestions, handleResultClick],
  );

  useSearchKeyboard({
    isOpen,
    itemCount: activeItems.length,
    selectedIndex,
    onOpen: () => setIsOpen(true),
    onClose: close,
    onSelect: handleSelect,
    onSelectedIndexChange: setSelectedIndex,
  });

  return (
    <>
      <div className="flex items-center justify-center w-full">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Ouvrir la recherche globale (Ctrl+K)"
          className="flex items-center gap-2 bg-card rounded-md p-2 border border-border hover:border-primary transition-all duration-300 w-full max-w-md cursor-pointer"
        >
          <SearchIcon className="text-muted-foreground size-4" aria-hidden="true" />
          <p className="text-muted-foreground text-sm">
            Tapez / pour rechercher
          </p>
          <div className="ml-auto flex items-center gap-1">
            <Command className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
            <span className="text-xs text-muted-foreground">K</span>
          </div>
        </button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl mx-auto p-0">
          <div className="p-4">
            <DialogTitle className="sr-only">Rechercher</DialogTitle>

            <div className="flex items-center gap-2 mb-4">
              <Search className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                ref={inputRef}
                placeholder="Rechercher des cartes, tournois, joueurs..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Champ de recherche"
                className="border-0 shadow-none focus-visible:ring-0 text-base"
              />
            </div>

            {hasQuery ? (
              <SearchResultsSection
                isLoading={isLoading}
                results={results}
                query={query}
                selectedIndex={selectedIndex}
                onSelect={handleResultClick}
              />
            ) : (
              <SearchSuggestionsSection
                suggestions={suggestions}
                selectedIndex={selectedIndex}
                onPickSuggestion={(title) => setQuery(title)}
                onPickShortcut={(q) => setQuery(q)}
              />
            )}

            <SearchFooterHints />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

function SearchResultsSection({
  isLoading,
  results,
  query,
  selectedIndex,
  onSelect,
}: {
  isLoading: boolean;
  results: SearchResultItem[];
  query: string;
  selectedIndex: number;
  onSelect: (result: SearchResultItem) => void;
}) {
  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="text-center py-8 text-muted-foreground"
      >
        <Search className="w-8 h-8 mx-auto mb-2 opacity-50 animate-pulse" aria-hidden="true" />
        <p>Recherche en cours...</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Search className="w-8 h-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
        <p>Aucun résultat trouvé pour « {query} »</p>
      </div>
    );
  }

  return (
    <ul className="space-y-1" role="listbox" aria-label="Résultats de recherche">
      {results.map((result, index) => (
        <li key={result.id}>
          <SearchItemButton
            type={result.type}
            title={result.title}
            subtitle={result.description}
            selected={index === selectedIndex}
            showArrow
            onClick={() => onSelect(result)}
          />
        </li>
      ))}
    </ul>
  );
}

function SearchSuggestionsSection({
  suggestions,
  selectedIndex,
  onPickSuggestion,
  onPickShortcut,
}: {
  suggestions: { id: string | number; type: "card" | "tournament" | "player" | "marketplace"; title: string; subtitle?: string; image?: string }[];
  selectedIndex: number;
  onPickSuggestion: (title: string) => void;
  onPickShortcut: (q: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-3">
        Suggestions populaires
      </div>
      {suggestions.length > 0 ? (
        <ul className="space-y-1" role="listbox" aria-label="Suggestions populaires">
          {suggestions.map((suggestion, index) => (
            <li key={`${suggestion.type}-${suggestion.id}`}>
              <SearchItemButton
                type={suggestion.type}
                title={suggestion.title}
                subtitle={suggestion.subtitle}
                image={suggestion.image}
                selected={index === selectedIndex}
                onClick={() => onPickSuggestion(suggestion.title)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {FALLBACK_SHORTCUTS.map(({ query, label, icon: Icon }) => (
            <button
              key={query}
              type="button"
              onClick={() => onPickShortcut(query)}
              className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 text-left"
            >
              <Icon className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm">{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SearchFooterHints() {
  return (
    <div className="mt-4 pt-4 border-t text-xs text-muted-foreground flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1">
          <kbd className="px-1 py-0.5 bg-muted rounded text-xs">↑</kbd>
          <kbd className="px-1 py-0.5 bg-muted rounded text-xs">↓</kbd>
          <span>pour naviguer</span>
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1 py-0.5 bg-muted rounded text-xs">↵</kbd>
          <span>pour sélectionner</span>
        </span>
      </div>
      <span className="flex items-center gap-1">
        <kbd className="px-1 py-0.5 bg-muted rounded text-xs">esc</kbd>
        <span>pour fermer</span>
      </span>
    </div>
  );
}

// Re-export pour usage externe éventuel (ex : menu customisé)
export { getSearchItemIcon };

export default SearchBar;

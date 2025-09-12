import { useRouter } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";
import { Input } from "../ui/input";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import {
  Search,
  SearchIcon,
  Command,
  ArrowRight,
  Hash,
  Users,
  Trophy,
  ShoppingCart,
} from "lucide-react";
import {
  searchService,
  SearchResultItem,
  SuggestionPreviewItem,
} from "@/services/search.service";

const SearchBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionPreviewItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }

      if (e.key === "Escape") {
        setIsOpen(false);
        setQuery("");
        setSelectedIndex(0);
        setSuggestions([]);
      }

      if (e.key === "/" && !isOpen) {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      const totalItems = query.length > 0 ? results.length : suggestions.length;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, totalItems - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (query.length > 0 && results[selectedIndex]) {
          router.push(results[selectedIndex].url);
          setIsOpen(false);
        } else if (query.length === 0 && suggestions[selectedIndex]) {
          setQuery(suggestions[selectedIndex].title);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, suggestions, selectedIndex, router, query]);

  // Recherche réelle avec l'API
  useEffect(() => {
    const searchWithAPI = async () => {
      if (query.length > 1) {
        setIsLoading(true);
        try {
          const searchResult = await searchService.globalSearch({
            query,
            limit: 10,
            sortBy: "relevance",
            sortOrder: "DESC",
          });
          setResults(searchResult.results);
          setSelectedIndex(0);
        } catch (error) {
          console.error("Erreur lors de la recherche:", error);
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setResults([]);
      }
    };

    // Debounce pour éviter trop de requêtes
    const timeoutId = setTimeout(searchWithAPI, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  // Charger les suggestions au démarrage
  useEffect(() => {
    const loadSuggestions = async () => {
      if (query.length === 0) {
        try {
          const suggestionsResult = await searchService.getSuggestionsPreview(
            "",
            8,
          );
          setSuggestions(suggestionsResult.suggestions);
        } catch (error) {
          console.error("Erreur lors du chargement des suggestions:", error);
          setSuggestions([]);
        }
      } else {
        setSuggestions([]);
      }
    };

    loadSuggestions();
  }, [query]);

  const getIcon = (
    type: SearchResultItem["type"] | SuggestionPreviewItem["type"],
  ) => {
    switch (type) {
      case "card":
        return <Hash className="w-4 h-4" />;
      case "tournament":
        return <Trophy className="w-4 h-4" />;
      case "player":
        return <Users className="w-4 h-4" />;
      case "marketplace":
        return <ShoppingCart className="w-4 h-4" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };

  const handleResultClick = (result: SearchResultItem) => {
    router.push(result.url);
    setIsOpen(false);
    setQuery("");
  };

  const handleSuggestionClick = (suggestion: SuggestionPreviewItem) => {
    setQuery(suggestion.title);
  };

  return (
    <>
      <div className="flex items-center justify-center w-full">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-card rounded-md p-2 border border-border hover:border-primary transition-all duration-300 w-full max-w-md cursor-pointer"
        >
          <SearchIcon className="text-muted-foreground size-4" />
          <p className="text-muted-foreground text-sm">
            Tapez / pour rechercher
          </p>
          <div className="ml-auto flex items-center gap-1">
            <Command className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">K</span>
          </div>
        </button>
      </div>

      <Dialog
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <DialogContent className="max-w-2xl mx-auto p-0">
          <div className="p-4">
            <DialogTitle className="sr-only">Rechercher</DialogTitle>
            <div className="flex items-center gap-2 mb-4">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Rechercher des cartes, tournois, joueurs..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="border-0 shadow-none focus-visible:ring-0 text-base"
              />
            </div>

            {query.length > 0 && (
              <div className="space-y-1">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-50 animate-pulse" />
                    <p>Recherche en cours...</p>
                  </div>
                ) : results.length > 0 ? (
                  results.map((result, index) => (
                    <button
                      key={result.id}
                      onClick={() => handleResultClick(result)}
                      className={`w-full flex items-center gap-3 p-3 rounded-md text-left transition-colors ${
                        index === selectedIndex
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/50"
                      }`}
                    >
                      <div className="text-muted-foreground">
                        {getIcon(result.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {result.title}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {result.description}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Aucun résultat trouvé pour "{query}"</p>
                  </div>
                )}
              </div>
            )}

            {query.length === 0 && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground mb-3">
                  Suggestions populaires
                </div>
                <div className="space-y-1">
                  {suggestions.length > 0 ? (
                    suggestions.map((suggestion, index) => (
                      <button
                        key={`${suggestion.type}-${suggestion.id}`}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className={`w-full flex items-center gap-3 p-3 rounded-md text-left transition-colors ${
                          index === selectedIndex
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent/50"
                        }`}
                      >
                        <div className="text-muted-foreground">
                          {getIcon(suggestion.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {suggestion.title}
                          </div>
                          {suggestion.subtitle && (
                            <div className="text-sm text-muted-foreground truncate">
                              {suggestion.subtitle}
                            </div>
                          )}
                        </div>
                        {suggestion.image && (
                          <img
                            src={suggestion.image}
                            alt={suggestion.title}
                            className="w-8 h-8 rounded object-cover"
                          />
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setQuery("Pikachu")}
                        className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 text-left"
                      >
                        <Hash className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Cartes populaires</span>
                      </button>
                      <button
                        onClick={() => setQuery("tournoi")}
                        className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 text-left"
                      >
                        <Trophy className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Tournois actifs</span>
                      </button>
                      <button
                        onClick={() => setQuery("joueur")}
                        className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 text-left"
                      >
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Top joueurs</span>
                      </button>
                      <button
                        onClick={() => setQuery("marketplace")}
                        className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 text-left"
                      >
                        <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Marketplace</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

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
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SearchBar;

import { useRouter } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";
import { Input } from "../ui/input";
import { Dialog, DialogContent } from "../ui/dialog";
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
import { searchService, SearchResultItem } from "@/services/search.service";

const SearchBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
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

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (results[selectedIndex]) {
          router.push(results[selectedIndex].url);
          setIsOpen(false);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex, router]);

  // Recherche réelle avec l'API
  useEffect(() => {
    const searchWithAPI = async () => {
      if (query.length > 1) {
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
        }
      } else {
        setResults([]);
      }
    };

    // Debounce pour éviter trop de requêtes
    const timeoutId = setTimeout(searchWithAPI, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  const getIcon = (type: SearchResultItem["type"]) => {
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

  return (
    <>
      <div className="flex items-center justify-center w-full max-w-2xl mx-auto">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-card rounded-md p-2 border border-border hover:border-primary transition-all duration-300 w-1/2 cursor-pointer"
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
                {results.length > 0 ? (
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
                  Suggestions rapides
                </div>
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

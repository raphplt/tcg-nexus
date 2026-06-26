"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Layers, RotateCcw, Search, Sparkles, HelpCircle, Loader2 } from "lucide-react";
import { PageWrapper } from "@/components/Layout/PageWrapper";
import { H1, H3 } from "@/components/Shared/Titles";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { pokemonCardService } from "@/services/pokemonCard.service";
import { getCardImage } from "@/utils/images";
import type { PokemonCardType } from "@/types/cardPokemon";

interface GuessRow {
  card: PokemonCardType;
  checks: {
    name: "correct" | "incorrect";
    types: "correct" | "partial" | "incorrect";
    generation: "correct" | "higher" | "lower";
    hp: "correct" | "higher" | "lower";
    stage: "correct" | "incorrect";
    rarity: "correct" | "incorrect";
  };
  typesVal: string;
  genVal: number;
  hpVal: number;
  stageVal: string;
  rarityVal: string;
}

export default function PokedlePage() {
  const [targetCard, setTargetCard] = useState<PokemonCardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PokemonCardType[]>([]);
  const [guesses, setGuesses] = useState<GuessRow[]>([]);
  const [gameState, setGameState] = useState<"playing" | "won" | "lost">("playing");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const maxGuesses = 6;

  // Generate target card
  const initGame = useCallback(async () => {
    setLoading(true);
    setGuesses([]);
    setGameState("playing");
    setSearchQuery("");
    setSearchResults([]);

    try {
      let card = await pokemonCardService.getRandom();
      let attempts = 0;
      while (attempts < 5 && (!card || !card.dexId || card.dexId.length === 0)) {
        card = await pokemonCardService.getRandom();
        attempts++;
      }

      if (card) {
        setTargetCard(card);
      } else {
        setTargetCard({
          id: "fallback-pokedle",
          name: "Pikachu",
          dexId: [25],
          hp: 60,
          types: ["Lightning"],
          stage: "Basic",
          rarity: "Common",
          image: "https://images.pokemontcg.io/cel25/4_hires.png",
          set: { name: "Célébrations" }
        } as any);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  // Search autocomplete
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const results = await pokemonCardService.search(searchQuery);
        const unique = results
          .filter((card) => card.dexId && card.dexId.length > 0)
          .slice(0, 8);
        setSearchResults(unique);
      } catch (e) {
        console.error(e);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const getGeneration = (dexId?: number): number => {
    if (!dexId) return 1;
    if (dexId <= 151) return 1;
    if (dexId <= 251) return 2;
    if (dexId <= 386) return 3;
    if (dexId <= 493) return 4;
    if (dexId <= 649) return 5;
    if (dexId <= 721) return 6;
    if (dexId <= 809) return 7;
    if (dexId <= 898) return 8;
    return 9;
  };

  const checkGuess = (guessCard: PokemonCardType) => {
    if (!targetCard) return;

    const tId = targetCard.dexId?.[0] || 0;
    const gId = guessCard.dexId?.[0] || 0;

    const tGen = getGeneration(tId);
    const gGen = getGeneration(gId);

    const tTypes = targetCard.types || [];
    const gTypes = guessCard.types || [];

    const tHp = targetCard.hp || 0;
    const gHp = guessCard.hp || 0;

    const tStage = targetCard.stage || "Basic";
    const gStage = guessCard.stage || "Basic";

    const tRarity = targetCard.rarity || "Common";
    const gRarity = guessCard.rarity || "Common";

    const nameMatch = guessCard.name?.toLowerCase() === targetCard.name?.toLowerCase();

    let typeCheck: "correct" | "partial" | "incorrect" = "incorrect";
    const commonTypes = gTypes.filter((t) => tTypes.includes(t));
    if (commonTypes.length === tTypes.length && gTypes.length === tTypes.length) {
      typeCheck = "correct";
    } else if (commonTypes.length > 0) {
      typeCheck = "partial";
    }

    let genCheck: "correct" | "higher" | "lower" = "correct";
    if (gGen < tGen) genCheck = "higher";
    else if (gGen > tGen) genCheck = "lower";

    let hpCheck: "correct" | "higher" | "lower" = "correct";
    if (gHp < tHp) hpCheck = "higher";
    else if (gHp > tHp) hpCheck = "lower";

    const stageCheck = gStage === tStage ? "correct" : "incorrect";
    const rarityCheck = gRarity === tRarity ? "correct" : "incorrect";

    const row: GuessRow = {
      card: guessCard,
      checks: {
        name: nameMatch ? "correct" : "incorrect",
        types: typeCheck,
        generation: genCheck,
        hp: hpCheck,
        stage: stageCheck,
        rarity: rarityCheck,
      },
      typesVal: gTypes.join(", ") || "Aucun",
      genVal: gGen,
      hpVal: gHp,
      stageVal: gStage,
      rarityVal: gRarity,
    };

    const newGuesses = [...guesses, row];
    setGuesses(newGuesses);
    setSearchQuery("");
    setShowSearchDropdown(false);

    if (nameMatch) {
      setGameState("won");
    } else if (newGuesses.length >= maxGuesses) {
      setGameState("lost");
    }
  };

  const blurAmount = Math.max(0, 30 - guesses.length * 6);

  return (
    <PageWrapper maxWidth="xl" gradient="secondary" className="space-y-6">
      {/* Header */}
      <div className="tcg-surface p-4 flex items-center justify-between bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link href="/pokemon/mini-games">
            <Button size="sm" variant="outline" className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <H1 className="text-lg! sm:text-xl!">Pokédle</H1>
            <p className="text-[10px] text-muted-foreground">Devine le Pokémon mystère à partir des attributs</p>
          </div>
        </div>
        <Badge variant="outline" className="border-border px-3 py-1 text-xs font-semibold">
          Essai {guesses.length}/{maxGuesses}
        </Badge>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
          <p className="text-xs font-semibold text-muted-foreground">Choix du Pokémon mystère...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Visual Deblur Area */}
          <div className="lg:col-span-4 flex flex-col items-center gap-4">
            <Card className="tcg-surface overflow-hidden w-full max-w-60 shadow-md">
              <CardContent className="p-4 flex justify-center items-center relative aspect-[5/7] bg-zinc-950/5 dark:bg-zinc-950/20">
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] [background-size:12px_12px]" />
                {targetCard && (
                  <div className="relative w-full h-full">
                    <Image
                      src={getCardImage(targetCard)}
                      alt="Mystère"
                      fill
                      className="object-contain transition-all duration-500"
                      style={{
                        filter: gameState === "playing" ? `blur(${blurAmount}px)` : "none",
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
            <Badge variant="secondary" className="border border-border font-bold">
              Flou : {blurAmount > 0 ? `${blurAmount}px` : "Net !"}
            </Badge>
          </div>

          {/* Input & Table */}
          <div className="lg:col-span-8 space-y-6">
            {/* Game states */}
            {gameState === "won" && (
              <div className="rounded-lg border border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400 p-6 text-center space-y-3">
                <h3 className="text-lg font-black uppercase">Félicitations !</h3>
                <p className="text-sm font-bold">
                  Tu as trouvé <span className="underline font-black">{targetCard?.name}</span> en {guesses.length} essai{guesses.length > 1 ? "s" : ""} !
                </p>
                <Button onClick={initGame} className="bg-gradient-to-r from-primary to-secondary text-white font-semibold">
                  <RotateCcw className="h-4 w-4 mr-2" /> Nouvelle partie
                </Button>
              </div>
            )}

            {gameState === "lost" && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 text-red-500 p-6 text-center space-y-3">
                <h3 className="text-lg font-black uppercase">Dommage !</h3>
                <p className="text-sm font-bold">
                  Le Pokémon mystère était {targetCard?.name}.
                </p>
                <Button onClick={initGame} className="bg-gradient-to-r from-primary to-secondary text-white font-semibold">
                  <RotateCcw className="h-4 w-4 mr-2" /> Réessayer
                </Button>
              </div>
            )}

            {/* Input Box */}
            {gameState === "playing" && (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Entrez le nom d'un Pokémon..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSearchDropdown(true);
                    }}
                    onFocus={() => setShowSearchDropdown(true)}
                    className="pl-9 h-11 border-border/80 rounded-lg bg-card focus:border-primary/50 text-foreground font-semibold"
                  />
                </div>

                {/* Dropdown list */}
                {showSearchDropdown && searchResults.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-2 bg-popover border border-border shadow-xl rounded-lg max-h-60 overflow-y-auto divide-y divide-border/60">
                    {searchResults.map((res) => (
                      <div
                        key={res.id}
                        onClick={() => checkGuess(res)}
                        className="p-3 hover:bg-accent/40 cursor-pointer flex items-center justify-between font-bold text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">#{res.dexId?.[0] || "??"}</span>
                          <span>{res.name}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] border border-border/50 bg-background/50">
                          {res.set?.name || "Set"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Guess Table */}
            {guesses.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-heading text-sm font-bold uppercase text-muted-foreground tracking-wider">Essais précédents</h3>
                <div className="overflow-x-auto border border-border rounded-xl shadow-sm bg-card">
                  <table className="w-full text-center border-collapse">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border text-[10px] font-bold uppercase text-muted-foreground">
                        <th className="p-3">Pokémon</th>
                        <th className="p-3">Types</th>
                        <th className="p-3">Génération</th>
                        <th className="p-3">HP</th>
                        <th className="p-3">Stage</th>
                        <th className="p-3">Rareté</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-semibold text-xs">
                      {guesses.map((g, idx) => (
                        <tr key={idx} className="hover:bg-muted/10 transition-colors">
                          {/* Name */}
                          <td className={`p-3 font-bold ${
                            g.checks.name === "correct"
                              ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/10"
                              : "bg-red-500/5 text-red-500/80 border border-red-500/5"
                          }`}>
                            {g.card.name}
                          </td>
                          {/* Types */}
                          <td className={`p-3 font-bold ${
                            g.checks.types === "correct"
                              ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/10"
                              : g.checks.types === "partial"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/10"
                                : "bg-red-500/5 text-red-500/80 border border-red-500/5"
                          }`}>
                            {g.typesVal}
                          </td>
                          {/* Generation */}
                          <td className={`p-3 font-bold ${
                            g.checks.generation === "correct"
                              ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/10"
                              : "bg-red-500/5 text-red-500/80 border border-red-500/5"
                          }`}>
                            Gen {g.genVal} {g.checks.generation === "higher" ? "⬆️" : g.checks.generation === "lower" ? "⬇️" : ""}
                          </td>
                          {/* HP */}
                          <td className={`p-3 font-bold ${
                            g.checks.hp === "correct"
                              ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/10"
                              : "bg-red-500/5 text-red-500/80 border border-red-500/5"
                          }`}>
                            {g.hpVal} {g.checks.hp === "higher" ? "⬆️" : g.checks.hp === "lower" ? "⬇️" : ""}
                          </td>
                          {/* Stage */}
                          <td className={`p-3 font-bold ${
                            g.checks.stage === "correct"
                              ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/10"
                              : "bg-red-500/5 text-red-500/80 border border-red-500/5"
                          }`}>
                            {g.stageVal}
                          </td>
                          {/* Rarity */}
                          <td className={`p-3 font-bold ${
                            g.checks.rarity === "correct"
                              ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/10"
                              : "bg-red-500/5 text-red-500/80 border border-red-500/5"
                          }`}>
                            {g.rarityVal}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </PageWrapper>
  );
}

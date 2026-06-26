"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Layers, RotateCcw, Search, Sparkles, HelpCircle } from "lucide-react";
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
      // Find a random pokemon card with valid dexId and types
      let card = await pokemonCardService.getRandom();
      
      // Let's draw until we get a pokemon card (has dexId or types) if possible,
      // or just fallback
      let attempts = 0;
      while (attempts < 5 && (!card || !card.dexId || card.dexId.length === 0)) {
        card = await pokemonCardService.getRandom();
        attempts++;
      }

      if (card) {
        setTargetCard(card);
      } else {
        // Fallback card
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
        // filter duplicates or only keep pokemon
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

  // Map Pokedex ID to Generation
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

    // Name check
    const nameMatch = guessCard.name?.toLowerCase() === targetCard.name?.toLowerCase();

    // Type check
    let typeCheck: "correct" | "partial" | "incorrect" = "incorrect";
    const commonTypes = gTypes.filter((t) => tTypes.includes(t));
    if (commonTypes.length === tTypes.length && gTypes.length === tTypes.length) {
      typeCheck = "correct";
    } else if (commonTypes.length > 0) {
      typeCheck = "partial";
    }

    // Gen check
    let genCheck: "correct" | "higher" | "lower" = "correct";
    if (gGen < tGen) genCheck = "higher"; // target is higher (newer)
    else if (gGen > tGen) genCheck = "lower"; // target is lower (older)

    // HP check
    let hpCheck: "correct" | "higher" | "lower" = "correct";
    if (gHp < tHp) hpCheck = "higher";
    else if (gHp > tHp) hpCheck = "lower";

    // Stage check
    const stageCheck = gStage === tStage ? "correct" : "incorrect";

    // Rarity check
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

  // Deblur value based on guess length
  const blurAmount = Math.max(0, 30 - guesses.length * 6);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background/95 px-4 py-8 flex flex-col justify-start items-center">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="tcg-surface border-2 border-border p-4 shadow-[4px_4px_0px_0px_hsl(var(--border))] flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/pokemon/mini-games">
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0 border-2 border-border shadow-[1px_1px_0px_0px_hsl(var(--border))]"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex h-8 w-8 items-center justify-center border-2 border-primary bg-primary/10 shadow-[2px_2px_0px_0px_hsl(var(--border))]">
              <Layers className="h-4 w-4 text-primary" />
            </div>
            <div>
              <H1 className="text-lg! sm:text-xl!">Pokédle</H1>
              <p className="text-[10px] text-muted-foreground">Devine le Pokémon mystère de la session</p>
            </div>
          </div>
          <div className="border-2 border-foreground bg-primary px-3 py-1 font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            Essai {guesses.length}/{maxGuesses}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
            <p className="text-sm font-bold text-muted-foreground">Choix du Pokémon mystère...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Visual Deblur Area */}
            <div className="lg:col-span-4 flex flex-col items-center gap-4">
              <Card className="border-4 border-foreground bg-zinc-800 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden w-full max-w-64">
                <CardContent className="p-4 flex justify-center items-center relative aspect-[5/7]">
                  {/* Background graphic */}
                  <div className="absolute inset-0 bg-[radial-gradient(#ffffff04_1px,transparent_1px)] [background-size:12px_12px]" />

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
              <div className="text-center">
                <Badge variant="secondary" className="border border-border font-bold">
                  Indice de flou : {blurAmount > 0 ? `${blurAmount}px` : "Net !"}
                </Badge>
              </div>
            </div>

            {/* Game Input & Attributes Table */}
            <div className="lg:col-span-8 space-y-6">
              {/* Game ending states */}
              {gameState === "won" && (
                <div className="border-4 border-foreground bg-green-400 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-center space-y-3">
                  <h3 className="text-xl font-black uppercase">Félicitations !</h3>
                  <p className="text-sm font-bold">
                    Tu as trouvé {targetCard?.name} en {guesses.length} essai{guesses.length > 1 ? "s" : ""} !
                  </p>
                  <Button onClick={initGame} className="border-2 border-foreground bg-background text-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black uppercase">
                    <RotateCcw className="h-4 w-4 mr-2" /> Nouvelle partie
                  </Button>
                </div>
              )}

              {gameState === "lost" && (
                <div className="border-4 border-foreground bg-red-400 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-center space-y-3">
                  <h3 className="text-xl font-black uppercase">Dommage !</h3>
                  <p className="text-sm font-bold">
                    Le Pokémon mystère était {targetCard?.name}.
                  </p>
                  <Button onClick={initGame} className="border-2 border-foreground bg-background text-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black uppercase">
                    <RotateCcw className="h-4 w-4 mr-2" /> Réessayer
                  </Button>
                </div>
              )}

              {/* Input Area */}
              {gameState === "playing" && (
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Rechercher un Pokémon par nom..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setShowSearchDropdown(true);
                        }}
                        onFocus={() => setShowSearchDropdown(true)}
                        className="pl-9 h-12 border-2 border-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-background text-foreground font-semibold"
                      />
                    </div>
                  </div>

                  {/* Dropdown */}
                  {showSearchDropdown && searchResults.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-2 bg-popover border-4 border-foreground shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] max-h-60 overflow-y-auto divide-y-2 divide-border">
                      {searchResults.map((res) => (
                        <div
                          key={res.id}
                          onClick={() => checkGuess(res)}
                          className="p-3 hover:bg-accent cursor-pointer flex items-center justify-between font-bold"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">#{res.dexId?.[0] || "??"}</span>
                            <span>{res.name}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px] border border-border">
                            {res.set?.name || "Set"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Guesses Table */}
              {guesses.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-heading text-lg font-black uppercase">Essais précédents</h3>
                  <div className="overflow-x-auto border-4 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-card">
                    <table className="w-full text-center border-collapse">
                      <thead>
                        <tr className="bg-muted border-b-4 border-foreground text-[11px] font-black uppercase text-foreground">
                          <th className="p-3 border-r-2 border-foreground">Pokémon</th>
                          <th className="p-3 border-r-2 border-foreground">Types</th>
                          <th className="p-3 border-r-2 border-foreground">Génération</th>
                          <th className="p-3 border-r-2 border-foreground">HP</th>
                          <th className="p-3 border-r-2 border-foreground">Stage</th>
                          <th className="p-3">Rareté</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y-2 divide-foreground font-bold text-xs">
                        {guesses.map((g, idx) => (
                          <tr key={idx} className="bg-card">
                            {/* Name */}
                            <td className={`p-3 border-r-2 border-foreground text-foreground ${
                              g.checks.name === "correct" ? "bg-green-400 text-black" : "bg-red-400 text-black"
                            }`}>
                              {g.card.name}
                            </td>
                            {/* Types */}
                            <td className={`p-3 border-r-2 border-foreground text-foreground ${
                              g.checks.types === "correct"
                                ? "bg-green-400 text-black"
                                : g.checks.types === "partial"
                                  ? "bg-amber-400 text-black"
                                  : "bg-red-400 text-black"
                            }`}>
                              {g.typesVal}
                            </td>
                            {/* Generation */}
                            <td className={`p-3 border-r-2 border-foreground text-foreground ${
                              g.checks.generation === "correct" ? "bg-green-400 text-black" : "bg-red-400 text-black"
                            }`}>
                              Gen {g.genVal} {g.checks.generation === "higher" ? "⬆️" : g.checks.generation === "lower" ? "⬇️" : ""}
                            </td>
                            {/* HP */}
                            <td className={`p-3 border-r-2 border-foreground text-foreground ${
                              g.checks.hp === "correct" ? "bg-green-400 text-black" : "bg-red-400 text-black"
                            }`}>
                              {g.hpVal} {g.checks.hp === "higher" ? "⬆️" : g.checks.hp === "lower" ? "⬇️" : ""}
                            </td>
                            {/* Stage */}
                            <td className={`p-3 border-r-2 border-foreground text-foreground ${
                              g.checks.stage === "correct" ? "bg-green-400 text-black" : "bg-red-400 text-black"
                            }`}>
                              {g.stageVal}
                            </td>
                            {/* Rarity */}
                            <td className={`p-3 text-foreground ${
                              g.checks.rarity === "correct" ? "bg-green-400 text-black" : "bg-red-400 text-black"
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
      </div>
    </div>
  );
}

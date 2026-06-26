"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, HelpCircle, RotateCcw, Award, Clock } from "lucide-react";
import { H1, H3 } from "@/components/Shared/Titles";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { pokemonCardService } from "@/services/pokemonCard.service";
import { getCardImage } from "@/utils/images";

const POPULAR_POKEMON = [
  "Pikachu", "Dracaufeu", "Tortank", "Florizarre", "Mewtwo", "Mew", "Evoli",
  "Aquali", "Voltali", "Pyroli", "Mentali", "Noctali", "Gengar", "Alakazam",
  "Dracolosse", "Leviator", "Lucario", "Amphinobi", "Rayquaza", "Arceus",
  "Salameche", "Carapuce", "Bulbizarre", "Ronflex", "Lugia", "Ho-Oh",
  "Suicune", "Entei", "Raikou", "Carchacrok", "Gardevoir", "Ectoplasma"
];

export default function WhosThatPokemonPage() {
  const [card, setCard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [maxRounds] = useState(10);
  const [timeLeft, setTimeLeft] = useState(15);
  const [gameOver, setGameOver] = useState(false);
  const [gameState, setGameState] = useState<"playing" | "round_end">("playing");

  // Generate 4 options: correct name + 3 distractors
  const options = useMemo(() => {
    if (!card) return [];
    const correctName = card.name || "Pokémon";
    const distractors = POPULAR_POKEMON
      .filter((name) => name.toLowerCase() !== correctName.toLowerCase())
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    
    return [correctName, ...distractors].sort(() => 0.5 - Math.random());
  }, [card]);

  const fetchRandomCard = useCallback(async () => {
    setLoading(true);
    setRevealed(false);
    setSelectedOption(null);
    setTimeLeft(15);
    setGameState("playing");

    try {
      // Fetch a random pokemon card
      const response = await pokemonCardService.getRandom();
      if (response && response.name) {
        setCard(response);
      } else {
        // Mock fallback
        setCard({
          id: "fallback",
          name: "Dracaufeu",
          image: "https://images.pokemontcg.io/cel25/4_hires.png",
          set: { name: "Célébrations" }
        });
      }
    } catch (error) {
      console.error("Error fetching card:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Init
  useEffect(() => {
    fetchRandomCard();
  }, [fetchRandomCard]);

  // Timer
  useEffect(() => {
    if (gameState !== "playing" || loading || gameOver) return;

    if (timeLeft <= 0) {
      handleAnswer(null); // Time out
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, gameState, loading, gameOver]);

  const handleAnswer = (option: string | null) => {
    setSelectedOption(option);
    setRevealed(true);
    setGameState("round_end");

    if (option && option.toLowerCase() === card?.name?.toLowerCase()) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNextRound = () => {
    if (round < maxRounds) {
      setRound((prev) => prev + 1);
      fetchRandomCard();
    } else {
      setGameOver(true);
    }
  };

  const handleRestart = () => {
    setScore(0);
    setRound(1);
    setGameOver(false);
    fetchRandomCard();
  };

  const cardImg = card ? getCardImage(card) : "";

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background/95 px-4 py-8 flex flex-col justify-center items-center">
      <div className="w-full max-w-2xl">
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
              <HelpCircle className="h-4 w-4 text-primary" />
            </div>
            <div>
              <H1 className="text-lg! sm:text-xl!">Qui est ce Pokémon ?</H1>
              <p className="text-[10px] text-muted-foreground">Devine le Pokémon à partir de sa silhouette</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm font-black">
            <div>
              Manche <span className="text-primary">{round}</span>/{maxRounds}
            </div>
            <div className="border-2 border-foreground bg-primary px-3 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              Score: {score}
            </div>
          </div>
        </div>

        {gameOver ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="tcg-surface border-4 border-foreground p-8 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-card"
          >
            <Award className="h-16 w-16 mx-auto text-primary mb-4" />
            <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Partie Terminée !</h2>
            <p className="text-muted-foreground mb-6">
              Tu as obtenu un score de <span className="text-foreground font-black text-xl">{score}</span> sur <span className="text-foreground font-black text-xl">{maxRounds}</span>.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/pokemon/mini-games">
                <Button variant="outline" className="border-2 border-foreground font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  Retour au Hub
                </Button>
              </Link>
              <Button onClick={handleRestart} className="border-2 border-foreground font-bold bg-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <RotateCcw className="h-4 w-4 mr-2" /> Rejouer
              </Button>
            </div>
          </motion.div>
        ) : (
          <Card className="border-4 border-foreground bg-card shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            <CardContent className="p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
                  <p className="text-sm font-bold text-muted-foreground">Génération de la silhouette...</p>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                  {/* Visual Silhouette Area */}
                  <div className="relative flex flex-col items-center justify-center w-full max-w-64">
                    {/* Timer circular badge */}
                    <div className="absolute -top-3 -right-3 z-30 flex items-center gap-1.5 border-2 border-foreground bg-amber-400 px-3 py-1 text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <Clock className="h-3.5 w-3.5" />
                      {timeLeft}s
                    </div>

                    <div className="relative aspect-[5/7] w-full border-4 border-foreground bg-zinc-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex items-center justify-center">
                      {/* Background design */}
                      <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:16px_16px]" />
                      
                      <div className="relative w-[85%] h-[85%]">
                        <Image
                          src={cardImg}
                          alt="Pokémon"
                          fill
                          className={`object-contain transition-all duration-700 ${
                            revealed ? "filter-none scale-100" : "brightness-0 contrast-200 scale-95 select-none pointer-events-none"
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Guess / Options Area */}
                  <div className="flex-1 w-full flex flex-col justify-between gap-6">
                    {gameState === "playing" ? (
                      <div className="space-y-4">
                        <H3 className="text-lg font-black uppercase text-center md:text-left">
                          Qui est ce Pokémon ?
                        </H3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {options.map((option) => (
                            <Button
                              key={option}
                              variant="outline"
                              onClick={() => handleAnswer(option)}
                              className="h-14 border-2 border-foreground text-sm font-black uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[0.5px] hover:translate-x-[0.5px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] bg-background text-foreground"
                            >
                              {option}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4 text-center md:text-left"
                      >
                        {selectedOption === null ? (
                          <div className="border-4 border-foreground bg-amber-400 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <p className="text-sm font-black uppercase">Temps écoulé !</p>
                          </div>
                        ) : selectedOption.toLowerCase() === card?.name?.toLowerCase() ? (
                          <div className="border-4 border-foreground bg-green-400 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <p className="text-sm font-black uppercase">Bien joué !</p>
                            <p className="text-xs font-semibold">C'est bien {card?.name} !</p>
                          </div>
                        ) : (
                          <div className="border-4 border-foreground bg-red-400 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <p className="text-sm font-black uppercase">Faux !</p>
                            <p className="text-xs font-semibold">Tu as choisi {selectedOption}. La bonne réponse était {card?.name}.</p>
                          </div>
                        )}

                        <div className="text-xs font-bold text-muted-foreground mt-2">
                          Carte de l'extension : <span className="text-foreground">{card?.set?.name || "Inconnue"}</span>
                        </div>

                        <Button
                          onClick={handleNextRound}
                          className="w-full border-2 border-foreground bg-primary shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-black uppercase h-12"
                        >
                          {round < maxRounds ? "Manche suivante ➡️" : "Voir les résultats 🏁"}
                        </Button>
                      </motion.div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

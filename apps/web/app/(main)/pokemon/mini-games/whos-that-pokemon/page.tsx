"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, HelpCircle, RotateCcw, Award, Clock } from "lucide-react";
import { PageWrapper } from "@/components/Layout/PageWrapper";
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
      const response = await pokemonCardService.getRandom();
      if (response && response.name) {
        setCard(response);
      } else {
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
    <PageWrapper maxWidth="xl" gradient="secondary" className="space-y-6 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="tcg-surface p-4 flex items-center justify-between bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Link href="/pokemon/mini-games">
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <HelpCircle className="h-4 w-4" />
            </div>
            <div>
              <H1 className="text-lg! sm:text-xl!">Qui est ce Pokémon ?</H1>
              <p className="text-[10px] text-muted-foreground">Estime la silhouette cachée de la carte</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm font-semibold">
            <Badge variant="outline" className="border-border">
              Manche {round}/{maxRounds}
            </Badge>
            <Badge className="bg-primary text-white border-0">
              Score: {score}
            </Badge>
          </div>
        </div>

        {gameOver ? (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="tcg-surface p-8 text-center bg-card shadow-md space-y-6"
          >
            <Award className="h-12 w-12 mx-auto text-primary" />
            <div className="space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-tight">Partie Terminée !</h2>
              <p className="text-muted-foreground text-sm">
                Ton score final est de <span className="text-foreground font-black text-lg">{score}</span> sur <span className="text-foreground font-black text-lg">{maxRounds}</span>.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <Button asChild variant="outline">
                <Link href="/pokemon/mini-games">Retour au Hub</Link>
              </Button>
              <Button onClick={handleRestart} className="bg-gradient-to-r from-primary to-secondary text-white font-semibold">
                <RotateCcw className="h-4 w-4 mr-2" /> Rejouer
              </Button>
            </div>
          </motion.div>
        ) : (
          <Card className="tcg-surface bg-card/85 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="animate-spin h-8 w-8 text-primary" />
                  <p className="text-xs font-semibold text-muted-foreground">Création de la silhouette...</p>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                  {/* Silhouette Visual */}
                  <div className="relative flex flex-col items-center justify-center w-full max-w-60 shrink-0">
                    {/* Timer circular badge */}
                    <div className="absolute -top-3 -right-3 z-30 flex items-center gap-1.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 text-xs font-black">
                      <Clock className="h-3.5 w-3.5" />
                      {timeLeft}s
                    </div>

                    <div className="relative aspect-[5/7] w-full border border-border/50 bg-zinc-950/20 dark:bg-zinc-950/40 shadow-inner rounded-xl overflow-hidden flex items-center justify-center">
                      <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] [background-size:12px_12px]" />
                      <div className="relative w-[85%] h-[85%]">
                        <Image
                          src={cardImg}
                          alt="Silhouette"
                          fill
                          className={`object-contain transition-all duration-700 ${
                            revealed ? "filter-none scale-100" : "brightness-0 contrast-200 scale-95 select-none pointer-events-none"
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Guess options */}
                  <div className="flex-1 w-full flex flex-col justify-between gap-6">
                    {gameState === "playing" ? (
                      <div className="space-y-4">
                        <H3 className="text-lg font-black text-center md:text-left text-foreground">
                          Qui est ce Pokémon ?
                        </H3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {options.map((option) => (
                            <Button
                              key={option}
                              variant="outline"
                              onClick={() => handleAnswer(option)}
                              className="h-12 font-bold justify-center border-border hover:border-primary/50 hover:bg-primary/5 bg-card/50 transition-all rounded-lg"
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
                          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-500 p-4 font-bold text-sm">
                            Temps écoulé !
                          </div>
                        ) : selectedOption.toLowerCase() === card?.name?.toLowerCase() ? (
                          <div className="rounded-lg border border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400 p-4 font-bold text-sm">
                            Bien joué ! C'est bien {card?.name} !
                          </div>
                        ) : (
                          <div className="rounded-lg border border-red-500/20 bg-red-500/10 text-red-500 p-4 font-bold text-sm">
                            Faux ! La bonne réponse était {card?.name}.
                          </div>
                        )}

                        <div className="text-[11px] font-bold text-muted-foreground">
                          Extension de la carte : <span className="text-foreground">{card?.set?.name || "Inconnue"}</span>
                        </div>

                        <Button
                          onClick={handleNextRound}
                          className="w-full bg-gradient-to-r from-primary to-secondary text-white font-semibold h-11"
                        >
                          {round < maxRounds ? "Manche suivante" : "Voir les résultats"}
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
    </PageWrapper>
  );
}

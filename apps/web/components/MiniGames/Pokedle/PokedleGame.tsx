"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Layers,
  Loader2,
  RotateCcw,
  Share2,
  Swords,
  Trophy,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PageWrapper } from "@/components/Layout/PageWrapper";
import { H1 } from "@/components/Shared/Titles";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { pokemonCardService } from "@/services/pokemonCard.service";
import type { PokemonCardType } from "@/types/cardPokemon";
import {
  evaluateGuess,
  generateShareText,
  getDailyState,
  getPokedleStats,
  getTimeUntilMidnight,
  POKEDLE_MAX_GUESSES,
  recordGameResult,
  saveDailyState,
  type PokedleGuessRow,
  type PokedleStats,
} from "./pokedleLogic";
import { PokedleCard } from "./PokedleCard";
import { PokedleSearch } from "./PokedleSearch";
import { PokedleTable } from "./PokedleTable";
import { PokedleStatsModal } from "./PokedleStatsModal";

type PokedleTab = "daily" | "training";

/**
 * Main game orchestrator component for Pokédle.
 * Supports Daily Challenge mode with shared seed and Free Play training mode.
 */
export function PokedleGame() {
  const t = useTranslations("Pokedle");

  const [activeTab, setActiveTab] = useState<PokedleTab>("daily");
  const [targetCard, setTargetCard] = useState<PokemonCardType | null>(null);
  const [guesses, setGuesses] = useState<PokedleGuessRow[]>([]);
  const [gameState, setGameState] = useState<"playing" | "won" | "lost">("playing");
  const [loading, setLoading] = useState(true);
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [stats, setStats] = useState<PokedleStats>(getPokedleStats());
  const [countdown, setCountdown] = useState(getTimeUntilMidnight());

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Update midnight countdown interval
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getTimeUntilMidnight());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize Daily Game Mode
  const initDailyGame = useCallback(async () => {
    setLoading(true);

    // 1. Check local storage for existing session today
    const saved = getDailyState(todayStr);
    if (saved && saved.targetCard) {
      setTargetCard(saved.targetCard);
      setGuesses(saved.guesses || []);
      setGameState(saved.gameState || "playing");
      setLoading(false);
      return;
    }

    // 2. Fetch deterministic daily card from API
    try {
      const dailyCard = await pokemonCardService.getDailySpecies(todayStr);
      if (dailyCard) {
        setTargetCard(dailyCard);
        setGuesses([]);
        setGameState("playing");
        saveDailyState({
          date: todayStr,
          targetCard: dailyCard,
          guesses: [],
          gameState: "playing",
        });
      } else {
        // Fallback default
        const fallback: PokemonCardType = {
          id: "daily-fallback",
          name: "Pikachu",
          dexId: [25],
          hp: 60,
          retreat: 1,
          types: ["Électrik"],
          set: { name: "Célébrations" },
        } as PokemonCardType;
        setTargetCard(fallback);
        setGuesses([]);
        setGameState("playing");
      }
    } catch (err) {
      console.error("Failed to fetch daily species:", err);
    } finally {
      setLoading(false);
    }
  }, [todayStr]);

  // Initialize Free Play / Training Mode
  const initTrainingGame = useCallback(async () => {
    setLoading(true);
    setGuesses([]);
    setGameState("playing");

    try {
      let card = await pokemonCardService.getRandom(undefined, undefined, undefined, {
        category: "Pokemon",
      });

      let attempts = 0;
      while (attempts < 5 && (!card || !card.dexId || card.dexId.length === 0)) {
        card = await pokemonCardService.getRandom(undefined, undefined, undefined, {
          category: "Pokemon",
        });
        attempts++;
      }

      if (card) {
        setTargetCard(card);
      } else {
        setTargetCard({
          id: "training-fallback",
          name: "Salamèche",
          dexId: [4],
          hp: 60,
          retreat: 1,
          types: ["Feu"],
          set: { name: "151" },
        } as PokemonCardType);
      }
    } catch (err) {
      console.error("Failed to load training card:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle tab switches
  useEffect(() => {
    if (activeTab === "daily") {
      initDailyGame();
    } else {
      initTrainingGame();
    }
  }, [activeTab, initDailyGame, initTrainingGame]);

  // Submit guess
  const handleSelectGuess = (guessCard: PokemonCardType) => {
    if (!targetCard || gameState !== "playing") return;

    const row = evaluateGuess(targetCard, guessCard);
    const updatedGuesses = [...guesses, row];
    setGuesses(updatedGuesses);

    const isWon = row.checks.name === "correct";
    const isLost = !isWon && updatedGuesses.length >= POKEDLE_MAX_GUESSES;

    let nextState: "playing" | "won" | "lost" = "playing";
    if (isWon) nextState = "won";
    else if (isLost) nextState = "lost";

    setGameState(nextState);

    // Save Daily State
    if (activeTab === "daily") {
      saveDailyState({
        date: todayStr,
        targetCard,
        guesses: updatedGuesses,
        gameState: nextState,
      });
    }

    // Record stats on game end
    if (nextState !== "playing") {
      const updatedStats = recordGameResult(
        isWon,
        updatedGuesses.length,
        activeTab === "daily" ? todayStr : undefined,
      );
      setStats(updatedStats);

      // Open stats modal after brief reveal
      setTimeout(() => {
        setStatsModalOpen(true);
      }, 1000);
    }
  };

  const guessedDexIds = useMemo(
    () => guesses.map((g) => g.dexId).filter((id) => id > 0),
    [guesses],
  );

  const shareText = useMemo(() => {
    if (!targetCard) return "";
    return generateShareText({
      date: todayStr,
      isDaily: activeTab === "daily",
      guesses,
      won: gameState === "won",
    });
  }, [activeTab, gameState, guesses, targetCard, todayStr]);

  const isCardRevealed = gameState === "won" || gameState === "lost";

  return (
    <PageWrapper maxWidth="xl" gradient="secondary" className="space-y-6 pb-12">
      {/* Top Header Bar */}
      <div className="tcg-surface p-4 flex flex-wrap items-center justify-between gap-4 bg-card/60 backdrop-blur-sm rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/pokemon/mini-games">
            <Button size="sm" variant="outline" className="h-9 w-9 p-0 rounded-xl">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <H1 className="text-lg! sm:text-xl! font-black">{t("title")}</H1>
            <p className="text-[11px] text-muted-foreground font-semibold">
              {t("subtitle")}
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs & Stats Trigger */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-muted/40 border border-border/60">
            <button
              type="button"
              onClick={() => setActiveTab("daily")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                activeTab === "daily"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>{t("dailyMode")}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("training")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                activeTab === "training"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Swords className="h-3.5 w-3.5" />
              <span>{t("trainingMode")}</span>
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setStatsModalOpen(true)}
            className="h-9 w-9 p-0 rounded-xl"
            title={t("statistics")}
          >
            <Trophy className="h-4 w-4 text-amber-500" />
          </Button>

          <Badge
            variant="outline"
            className="border-border px-3 py-1.5 text-xs font-bold rounded-xl hidden sm:inline-flex"
          >
            {t("guessCount", {
              current: guesses.length,
              max: POKEDLE_MAX_GUESSES,
            })}
          </Badge>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="animate-spin h-9 w-9 text-primary" />
          <p className="text-xs font-bold text-muted-foreground">
            {t("choosingPokemon")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Mystery Card */}
          <div className="lg:col-span-4 w-full">
            <PokedleCard
              card={targetCard}
              isRevealed={isCardRevealed}
              guessCount={guesses.length}
              maxGuesses={POKEDLE_MAX_GUESSES}
            />
          </div>

          {/* Right Column: Search, Banners, and Guess History Table */}
          <div className="lg:col-span-8 space-y-5">
            {/* Victory Outcome Banner */}
            {gameState === "won" && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 p-5 text-center space-y-3 shadow-md">
                <h3 className="text-base sm:text-lg font-black uppercase tracking-wide">
                  {t("congratulations")}
                </h3>
                <p className="text-sm font-bold">
                  {t("wonMessage", {
                    name: targetCard?.name || "",
                    count: guesses.length,
                    plural: guesses.length > 1 ? "s" : "",
                  })}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                  <Button
                    onClick={() => setStatsModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    {t("share")}
                  </Button>
                  {activeTab === "training" && (
                    <Button
                      variant="outline"
                      onClick={initTrainingGame}
                      className="font-bold border-emerald-500/40 hover:bg-emerald-500/10 rounded-xl"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      {t("newGame")}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Defeat Outcome Banner */}
            {gameState === "lost" && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 p-5 text-center space-y-3 shadow-md">
                <h3 className="text-base sm:text-lg font-black uppercase tracking-wide">
                  {t("tooBad")}
                </h3>
                <p className="text-sm font-bold">
                  {t("lostMessage", { name: targetCard?.name || "" })}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                  <Button
                    onClick={() => setStatsModalOpen(true)}
                    variant="outline"
                    className="font-bold rounded-xl"
                  >
                    <Trophy className="h-4 w-4 mr-2 text-amber-500" />
                    {t("statistics")}
                  </Button>
                  {activeTab === "training" && (
                    <Button
                      onClick={initTrainingGame}
                      className="bg-gradient-to-r from-primary to-secondary text-white font-black rounded-xl shadow-md"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      {t("retry")}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Daily Completed Status Info */}
            {activeTab === "daily" && isCardRevealed && (
              <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary" />
                  {t("dailyAlreadyPlayed")}
                </span>
                <span className="font-mono font-bold text-foreground">
                  {countdown.hours.toString().padStart(2, "0")}:
                  {countdown.minutes.toString().padStart(2, "0")}:
                  {countdown.seconds.toString().padStart(2, "0")}
                </span>
              </div>
            )}

            {/* Autocomplete Search Bar (active while playing) */}
            {gameState === "playing" && (
              <PokedleSearch
                onSelect={handleSelectGuess}
                guessedDexIds={guessedDexIds}
              />
            )}

            {/* Guess History Table & Interactive Legend */}
            <PokedleTable
              guesses={guesses}
              maxGuesses={POKEDLE_MAX_GUESSES}
            />
          </div>
        </div>
      )}

      {/* Wordle Statistics Modal */}
      <PokedleStatsModal
        isOpen={statsModalOpen}
        onClose={() => setStatsModalOpen(false)}
        stats={stats}
        shareText={shareText}
        isDaily={activeTab === "daily"}
        countdown={countdown}
      />
    </PageWrapper>
  );
}

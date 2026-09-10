"use client";

import { motion } from "framer-motion";
import {
  Award,
  Clock,
  Flame,
  HelpCircle,
  Loader2,
  RotateCcw,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageWrapper } from "@/components/Layout/PageWrapper";
import { H3 } from "@/components/Shared/Titles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GameHeader } from "../GameHeader";
import { LoadError } from "../LoadError";
import { WhosThatPokemonCard } from "./WhosThatPokemonCard";
import {
  ACCENT_CLASSES,
  DIFFICULTIES,
  type Difficulty,
  buildOptions,
  calculateGain,
  formatClue,
} from "./whosThatPokemonLogic";
import {
  type PokemonSpecies,
  pokemonCardService,
} from "@/services/pokemonCard.service";
import type { PokemonCardType } from "@/types/cardPokemon";
import { PokemonCardsType } from "@/types/enums/pokemonCardsType";

const MAX_ROUNDS = 10;

const DIFFICULTY_ICONS = {
  easy: Sparkles,
  medium: Zap,
  hard: Flame,
} as const;

/**
 * Main game shell for Who's That Pokémon.
 *
 * Implements a 10-round guessing quiz against distinct Pokémon targets with
 * difficulty levels, server-drawn localized distractors, silhouette masking,
 * streak bonuses, and zero fake fallback data.
 */
export function WhosThatPokemonGame() {
  const t = useTranslations("WhosThatPokemon");
  const tPokedex = useTranslations("Pokedex");

  const [mode, setMode] = useState<"select" | "play">("select");
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);

  const [card, setCard] = useState<PokemonCardType | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [lastGain, setLastGain] = useState<number | null>(null);
  const [round, setRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(15);
  const [gameOver, setGameOver] = useState(false);
  const [gameState, setGameState] = useState<"playing" | "round_end">(
    "playing",
  );

  const poolRef = useRef<PokemonSpecies[]>([]);
  const seenCardIdsRef = useRef<string[]>([]);

  const cfg = difficulty ? DIFFICULTIES[difficulty] : null;

  const loadSpeciesPool = useCallback(async () => {
    try {
      const species = await pokemonCardService.getRandomSpecies(40);
      poolRef.current = species;
      return species;
    } catch {
      poolRef.current = [];
      return [];
    }
  }, []);

  const drawTargetCard =
    useCallback(async (): Promise<PokemonCardType | null> => {
      try {
        const drawn = await pokemonCardService.getRandom(
          undefined,
          undefined,
          undefined,
          {
            category: PokemonCardsType.Pokemon,
            excludeIds: seenCardIdsRef.current,
          },
        );
        if (drawn?.id) {
          seenCardIdsRef.current.push(drawn.id);
        }
        return drawn;
      } catch {
        return null;
      }
    }, []);

  const startRound = useCallback(
    async (d: Difficulty) => {
      const currentCfg = DIFFICULTIES[d];
      setLoading(true);
      setHasError(false);
      setRevealed(false);
      setSelectedOption(null);
      setLastGain(null);
      setTimeLeft(currentCfg.time);
      setGameState("playing");

      const target = await drawTargetCard();
      if (!target || !target.name) {
        setHasError(true);
        setLoading(false);
        return;
      }

      setCard(target);
      setOptions(buildOptions(target, poolRef.current, currentCfg));
      setLoading(false);
    },
    [drawTargetCard],
  );

  const startGame = useCallback(
    async (d: Difficulty) => {
      setDifficulty(d);
      setMode("play");
      setScore(0);
      setStreak(0);
      setBestStreak(0);
      setRound(1);
      setGameOver(false);
      setHasError(false);
      seenCardIdsRef.current = [];

      await loadSpeciesPool();
      await startRound(d);
    },
    [loadSpeciesPool, startRound],
  );

  const handleAnswer = useCallback(
    (option: string | null) => {
      if (gameState !== "playing") return;
      setSelectedOption(option);
      setRevealed(true);
      setGameState("round_end");

      const isCorrect =
        Boolean(option) &&
        Boolean(card?.name) &&
        option?.trim().toLowerCase() === card?.name?.trim().toLowerCase();

      if (isCorrect && cfg) {
        const newStreak = streak + 1;
        const gained = calculateGain(timeLeft, cfg.time, cfg.mult, newStreak);
        setScore((prev) => prev + gained);
        setStreak(newStreak);
        setBestStreak((prev) => Math.max(prev, newStreak));
        setLastGain(gained);
      } else {
        setStreak(0);
        setLastGain(0);
      }
    },
    [gameState, card, cfg, timeLeft, streak],
  );

  const handleNextRound = () => {
    if (!difficulty) return;
    if (round < MAX_ROUNDS) {
      setRound((prev) => prev + 1);
      startRound(difficulty);
    } else {
      setGameOver(true);
    }
  };

  useEffect(() => {
    if (
      mode !== "play" ||
      gameState !== "playing" ||
      loading ||
      gameOver ||
      hasError
    ) {
      return;
    }
    if (timeLeft <= 0) {
      handleAnswer(null);
      return;
    }
    const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, gameState, loading, gameOver, hasError, mode, handleAnswer]);

  const clueText = formatClue(card, cfg, tPokedex, t);

  return (
    <PageWrapper
      maxWidth="xl"
      gradient="secondary"
      className="flex flex-col items-center space-y-6"
    >
      <div className="w-full max-w-2xl space-y-6">
        <GameHeader
          icon={<HelpCircle className="h-4 w-4" />}
          title={t("title")}
          subtitle={t("subtitle")}
          onQuit={
            mode === "play"
              ? () => {
                  setMode("select");
                  setGameOver(false);
                }
              : undefined
          }
        >
          {mode === "play" && cfg && (
            <>
              <Badge className={`border ${ACCENT_CLASSES[cfg.accent].chip}`}>
                {t(cfg.labelKey)}
              </Badge>
              {streak > 1 && (
                <Badge className="border border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-400">
                  <Flame className="mr-1 h-3 w-3" />x{streak}
                </Badge>
              )}
              <Badge variant="outline" className="border-border">
                {t("roundOf", { current: round, total: MAX_ROUNDS })}
              </Badge>
              <Badge className="border-0 bg-primary text-white">
                {t("pointsSuffix", { points: score })}
              </Badge>
            </>
          )}
        </GameHeader>

        {mode === "select" && (
          <div className="space-y-4">
            <H3 className="text-center font-heading text-lg font-bold">
              {t("chooseDifficulty")}
            </H3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => {
                const conf = DIFFICULTIES[d];
                const Icon = DIFFICULTY_ICONS[d];
                const ac = ACCENT_CLASSES[conf.accent];
                return (
                  <Card
                    key={d}
                    className="tcg-surface tcg-surface--hover transition-all"
                  >
                    <CardContent className="flex h-full flex-col items-center justify-between gap-4 p-6 text-center">
                      <div className={`rounded-lg p-3 ${ac.icon}`}>
                        <Icon className="h-9 w-9" />
                      </div>
                      <div>
                        <h3 className="mb-1 font-heading text-lg font-bold">
                          {t(conf.labelKey)}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {t(conf.descKey)}
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
                        <span className="rounded bg-muted px-2 py-0.5">
                          <Clock className="mr-1 inline h-3 w-3" />
                          {t("secondsSuffix", { seconds: conf.time })}
                        </span>
                        <span className="rounded bg-muted px-2 py-0.5">
                          ×{conf.mult} pts
                        </span>
                      </div>
                      <Button
                        onClick={() => startGame(d)}
                        className={`h-10 w-full text-xs font-semibold ${ac.btn}`}
                      >
                        {t("play")}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {mode === "play" && gameOver && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="tcg-surface space-y-6 bg-card p-8 text-center shadow-md"
          >
            <Award className="mx-auto h-12 w-12 text-primary" />
            <div className="space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-tight">
                {t("gameOver")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("finalScore")}{" "}
                <span className="text-lg font-black text-foreground">
                  {score}
                </span>{" "}
                {t("pointsIn", { difficulty: cfg ? t(cfg.labelKey) : "" })}
              </p>
              {bestStreak > 1 && (
                <p className="flex items-center justify-center gap-1 text-sm font-semibold text-orange-500">
                  <Trophy className="h-4 w-4" />{" "}
                  {t("bestStreak", { count: bestStreak })}
                </p>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setMode("select");
                  setGameOver(false);
                }}
              >
                {t("changeDifficulty")}
              </Button>
              <Button
                onClick={() => difficulty && startGame(difficulty)}
                className="bg-gradient-to-r from-primary to-secondary font-semibold text-white"
              >
                <RotateCcw className="mr-2 h-4 w-4" /> {t("playAgain")}
              </Button>
            </div>
          </motion.div>
        )}

        {mode === "play" && !gameOver && hasError && (
          <LoadError
            onRetry={() => difficulty && startRound(difficulty)}
            onBack={() => {
              setMode("select");
              setHasError(false);
            }}
          />
        )}

        {mode === "play" && !gameOver && !hasError && (
          <Card className="tcg-surface overflow-hidden bg-card/85 backdrop-blur-sm">
            <CardContent className="p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-xs font-semibold text-muted-foreground">
                    {t("preparingCard")}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-8 md:flex-row">
                  <div className="relative flex w-full max-w-72 shrink-0 flex-col items-center justify-center">
                    <div
                      className={`absolute -right-2 -top-2 z-30 flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black shadow-sm ${
                        timeLeft <= 4 && !revealed
                          ? "border-red-500/30 bg-red-500/15 text-red-500"
                          : "border-amber-500/20 bg-amber-500/10 text-amber-500"
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      {t("secondsSuffix", { seconds: timeLeft })}
                    </div>

                    <WhosThatPokemonCard
                      card={card}
                      revealed={revealed}
                      timeLeft={timeLeft}
                      cfg={cfg}
                    />
                  </div>

                  <div className="flex w-full flex-1 flex-col justify-between gap-6">
                    {gameState === "playing" ? (
                      <div className="space-y-4">
                        <H3 className="text-center font-heading text-lg font-black text-foreground md:text-left">
                          {t("title")}
                        </H3>
                        {clueText && (
                          <p className="text-center text-xs font-semibold text-muted-foreground md:text-left">
                            {t("hint")}{" "}
                            <span className="text-foreground">{clueText}</span>
                          </p>
                        )}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {options.map((option) => (
                            <Button
                              key={option}
                              variant="outline"
                              onClick={() => handleAnswer(option)}
                              className="h-12 justify-center rounded-lg border-border bg-card/50 font-bold transition-all hover:border-primary/50 hover:bg-primary/5"
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
                          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-bold text-amber-500">
                            {t("timeOut", { name: card?.name || "" })}
                          </div>
                        ) : selectedOption.trim().toLowerCase() ===
                          card?.name?.trim().toLowerCase() ? (
                          <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-sm font-bold text-green-600 dark:text-green-400">
                            {t("correct", { name: card?.name || "" })}
                            {lastGain ? (
                              <span className="mt-1 block font-black">
                                {t("pointsGained", { points: lastGain })}
                                {streak > 1
                                  ? ` · ${t("streakFire", { count: streak })}`
                                  : ""}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-500">
                            {t("wrong", { name: card?.name || "" })}
                          </div>
                        )}

                        <div className="text-[11px] font-bold text-muted-foreground">
                          {t("expansion")}{" "}
                          <span className="text-foreground">
                            {card?.set?.name || t("unknownExpansion")}
                          </span>
                        </div>

                        <Button
                          onClick={handleNextRound}
                          className="h-11 w-full bg-gradient-to-r from-primary to-secondary font-semibold text-white"
                        >
                          {round < MAX_ROUNDS
                            ? t("nextRound")
                            : t("viewResults")}
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

"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
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
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageWrapper } from "@/components/Layout/PageWrapper";
import { H1, H3 } from "@/components/Shared/Titles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { pokemonCardService } from "@/services/pokemonCard.service";
import { PokemonCardsType } from "@/types/enums/pokemonCardsType";
import { getCardImage } from "@/utils/images";

// Filet de secours si la base est indisponible / le pool trop petit.
const POPULAR_POKEMON = [
  "Pikachu",
  "Dracaufeu",
  "Tortank",
  "Florizarre",
  "Mewtwo",
  "Mew",
  "Evoli",
  "Aquali",
  "Voltali",
  "Pyroli",
  "Mentali",
  "Noctali",
  "Gengar",
  "Alakazam",
  "Dracolosse",
  "Leviator",
  "Lucario",
  "Amphinobi",
  "Rayquaza",
  "Arceus",
  "Salamèche",
  "Carapuce",
  "Bulbizarre",
  "Ronflex",
  "Lugia",
  "Ho-Oh",
  "Suicune",
  "Entei",
  "Raikou",
  "Carchacrok",
  "Gardevoir",
  "Ectoplasma",
];

const MAX_ROUNDS = 10;

type Difficulty = "easy" | "medium" | "hard";

interface DifficultyConfig {
  label: string;
  desc: string;
  time: number;
  baseBlur: number; // flou au début de la manche (max)
  minBlur: number; // flou plancher en fin de chrono (toujours caché)
  brightness: number;
  mult: number;
  distractors: "far" | "mix" | "similar";
  clue: "typegen" | "type" | "none";
  accent: "green" | "amber" | "red";
  icon: React.ComponentType<{ className?: string }>;
}

const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    label: "Facile",
    desc: "Flou léger, 20s, indices type + génération. Mauvaises réponses très différentes.",
    time: 20,
    baseBlur: 9,
    minBlur: 3,
    brightness: 0.72,
    mult: 1,
    distractors: "far",
    clue: "typegen",
    accent: "green",
    icon: Sparkles,
  },
  medium: {
    label: "Moyen",
    desc: "Flou moyen, 15s, indice de type. Propositions variées.",
    time: 15,
    baseBlur: 13,
    minBlur: 6,
    brightness: 0.55,
    mult: 2,
    distractors: "mix",
    clue: "type",
    accent: "amber",
    icon: Zap,
  },
  hard: {
    label: "Difficile",
    desc: "Flou fort, 10s, aucun indice. Mauvaises réponses proches (même type / génération).",
    time: 10,
    baseBlur: 18,
    minBlur: 10,
    brightness: 0.42,
    mult: 3,
    distractors: "similar",
    clue: "none",
    accent: "red",
    icon: Flame,
  },
};

const ACCENT_CLASSES: Record<
  DifficultyConfig["accent"],
  { chip: string; icon: string; btn: string }
> = {
  green: {
    chip: "border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400",
    icon: "bg-green-500/10 text-green-500",
    btn: "bg-green-500 hover:bg-green-600 text-white",
  },
  amber: {
    chip: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    icon: "bg-amber-500/10 text-amber-500",
    btn: "bg-amber-500 hover:bg-amber-600 text-white",
  },
  red: {
    chip: "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400",
    icon: "bg-red-500/10 text-red-500",
    btn: "bg-red-500 hover:bg-red-600 text-white",
  },
};

interface PoolCard {
  name: string;
  types?: string[];
  dexId?: number[];
}

const genOf = (dexId?: number): number => {
  if (!dexId) return 0;
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

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => 0.5 - Math.random());

/**
 * Construit 4 propositions (1 correcte + 3 distracteurs) à partir du pool réel
 * de cartes. La nature des distracteurs dépend de la difficulté :
 *  - "similar" : partagent un type OU la génération de la cible (piège) ;
 *  - "far"     : ni type ni génération en commun (facile) ;
 *  - "mix"     : n'importe lesquels.
 */
function buildOptions(
  target: { name?: string; types?: string[]; dexId?: number[] },
  pool: PoolCard[],
  cfg: DifficultyConfig,
): string[] {
  const targetName = target.name || "Pokémon";
  const tTypes = target.types || [];
  const tGen = genOf(target.dexId?.[0]);

  const seen = new Set<string>([targetName.toLowerCase()]);
  const uniquePool: PoolCard[] = [];
  for (const c of pool) {
    const n = (c.name || "").trim();
    if (!n || seen.has(n.toLowerCase())) continue;
    seen.add(n.toLowerCase());
    uniquePool.push(c);
  }

  const shareType = (c: PoolCard) =>
    (c.types || []).some((t) => tTypes.includes(t));
  const sameGen = (c: PoolCard) => genOf(c.dexId?.[0]) === tGen && tGen !== 0;

  let candidates: PoolCard[];
  if (cfg.distractors === "similar") {
    candidates = uniquePool.filter((c) => shareType(c) || sameGen(c));
  } else if (cfg.distractors === "far") {
    candidates = uniquePool.filter((c) => !shareType(c) && !sameGen(c));
  } else {
    candidates = uniquePool;
  }
  if (candidates.length < 3) candidates = uniquePool;

  const picks = shuffle(candidates)
    .slice(0, 3)
    .map((c) => c.name);

  // Complément de secours si le pool n'a pas fourni assez de noms.
  for (const cand of shuffle(POPULAR_POKEMON)) {
    if (picks.length >= 3) break;
    if (
      !seen.has(cand.toLowerCase()) &&
      !picks.some((p) => p.toLowerCase() === cand.toLowerCase())
    ) {
      picks.push(cand);
    }
  }

  return shuffle([targetName, ...picks]);
}

export default function WhosThatPokemonPage() {
  const [mode, setMode] = useState<"select" | "play">("select");
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);

  const [card, setCard] = useState<any>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
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

  const poolRef = useRef<PoolCard[]>([]);

  const cfg = difficulty ? DIFFICULTIES[difficulty] : null;

  // Pool de distracteurs (une fois par partie).
  const loadPool = useCallback(async () => {
    try {
      const res = await pokemonCardService.getPaginated({ limit: 120 });
      poolRef.current = (res.data ?? [])
        .filter((c) => c.name && c.category === PokemonCardsType.Pokemon)
        .map((c) => ({ name: c.name!, types: c.types, dexId: c.dexId }));
    } catch {
      poolRef.current = [];
    }
  }, []);

  // Tire une carte Pokémon (pas Dresseur / Énergie) pour la manche.
  const fetchPokemonCard = useCallback(async () => {
    let c = await pokemonCardService.getRandom();
    let tries = 0;
    while (
      tries < 6 &&
      (!c || !c.name || c.category !== PokemonCardsType.Pokemon)
    ) {
      c = await pokemonCardService.getRandom();
      tries += 1;
    }
    if (!c || !c.name) {
      return {
        id: "fallback",
        name: "Dracaufeu",
        types: ["Feu"],
        dexId: [6],
        set: { name: "Célébrations" },
      } as any;
    }
    return c;
  }, []);

  const startRound = useCallback(
    async (d: Difficulty) => {
      const conf = DIFFICULTIES[d];
      setLoading(true);
      setRevealed(false);
      setSelectedOption(null);
      setLastGain(null);
      setTimeLeft(conf.time);
      setGameState("playing");

      const target = await fetchPokemonCard();
      setCard(target);
      setOptions(buildOptions(target, poolRef.current, conf));
      setLoading(false);
    },
    [fetchPokemonCard],
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
      await loadPool();
      await startRound(d);
    },
    [loadPool, startRound],
  );

  const handleAnswer = useCallback(
    (option: string | null) => {
      if (gameState !== "playing") return;
      setSelectedOption(option);
      setRevealed(true);
      setGameState("round_end");

      const correct =
        !!option &&
        !!card?.name &&
        option.toLowerCase() === card.name.toLowerCase();

      if (correct && cfg) {
        const speedRatio = Math.max(0, timeLeft) / cfg.time;
        const base = 60 + Math.round(speedRatio * 40); // 60..100
        const withMult = base * cfg.mult;
        const newStreak = streak + 1;
        const streakBonus = Math.round(
          withMult * Math.min(newStreak - 1, 5) * 0.1,
        );
        const gained = withMult + streakBonus;
        setScore((s) => s + gained);
        setStreak(newStreak);
        setBestStreak((b) => Math.max(b, newStreak));
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
      setRound((r) => r + 1);
      startRound(difficulty);
    } else {
      setGameOver(true);
    }
  };

  // Chrono + défloutage progressif.
  useEffect(() => {
    if (mode !== "play" || gameState !== "playing" || loading || gameOver)
      return;
    if (timeLeft <= 0) {
      handleAnswer(null);
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, gameState, loading, gameOver, mode, handleAnswer]);

  const cardImg = card ? getCardImage(card) : "";
  const blurNow = cfg
    ? cfg.minBlur +
      (cfg.baseBlur - cfg.minBlur) * (Math.max(0, timeLeft) / cfg.time)
    : 0;

  const clueText = (() => {
    if (!cfg || cfg.clue === "none" || !card) return null;
    const types = (card.types || []).join(" / ");
    const gen = genOf(card.dexId?.[0]);
    if (cfg.clue === "typegen") {
      return [types && `Type : ${types}`, gen && `Génération ${gen}`]
        .filter(Boolean)
        .join(" · ");
    }
    return types ? `Type : ${types}` : null;
  })();

  return (
    <PageWrapper
      maxWidth="xl"
      gradient="secondary"
      className="flex flex-col items-center space-y-6"
    >
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="tcg-surface flex items-center justify-between bg-card/50 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Link href="/pokemon/mini-games">
              <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <HelpCircle className="h-4 w-4" />
            </div>
            <div>
              <H1 className="text-lg! sm:text-xl!">Qui est ce Pokémon ?</H1>
              <p className="text-[10px] text-muted-foreground">
                Devine le Pokémon derrière l&apos;image brouillée
              </p>
            </div>
          </div>
          {mode === "play" && (
            <div className="flex items-center gap-2 text-sm font-semibold">
              {cfg && (
                <Badge className={`border ${ACCENT_CLASSES[cfg.accent].chip}`}>
                  {cfg.label}
                </Badge>
              )}
              {streak > 1 && (
                <Badge className="border border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-400">
                  <Flame className="mr-1 h-3 w-3" />x{streak}
                </Badge>
              )}
              <Badge variant="outline" className="border-border">
                {round}/{MAX_ROUNDS}
              </Badge>
              <Badge className="border-0 bg-primary text-white">
                {score} pts
              </Badge>
            </div>
          )}
        </div>

        {/* SELECT DIFFICULTY */}
        {mode === "select" && (
          <div className="space-y-4">
            <H3 className="text-center font-heading text-lg font-bold">
              Choisis ta difficulté
            </H3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => {
                const conf = DIFFICULTIES[d];
                const Icon = conf.icon;
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
                          {conf.label}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {conf.desc}
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
                        <span className="rounded bg-muted px-2 py-0.5">
                          <Clock className="mr-1 inline h-3 w-3" />
                          {conf.time}s
                        </span>
                        <span className="rounded bg-muted px-2 py-0.5">
                          ×{conf.mult} points
                        </span>
                      </div>
                      <Button
                        onClick={() => startGame(d)}
                        className={`h-10 w-full text-xs font-semibold ${ac.btn}`}
                      >
                        Jouer
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* GAME OVER */}
        {mode === "play" && gameOver && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="tcg-surface space-y-6 bg-card p-8 text-center shadow-md"
          >
            <Award className="mx-auto h-12 w-12 text-primary" />
            <div className="space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-tight">
                Partie terminée !
              </h2>
              <p className="text-sm text-muted-foreground">
                Score final :{" "}
                <span className="text-lg font-black text-foreground">
                  {score}
                </span>{" "}
                pts · en {cfg?.label}
              </p>
              {bestStreak > 1 && (
                <p className="flex items-center justify-center gap-1 text-sm font-semibold text-orange-500">
                  <Trophy className="h-4 w-4" /> Meilleure série : {bestStreak}{" "}
                  d&apos;affilée
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
                Changer de difficulté
              </Button>
              <Button
                onClick={() => difficulty && startGame(difficulty)}
                className="bg-gradient-to-r from-primary to-secondary font-semibold text-white"
              >
                <RotateCcw className="mr-2 h-4 w-4" /> Rejouer
              </Button>
            </div>
          </motion.div>
        )}

        {/* PLAYING */}
        {mode === "play" && !gameOver && (
          <Card className="tcg-surface overflow-hidden bg-card/85 backdrop-blur-sm">
            <CardContent className="p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-xs font-semibold text-muted-foreground">
                    Préparation de la carte mystère...
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-8 md:flex-row">
                  {/* Visuel brouillé */}
                  <div className="relative flex w-full max-w-60 shrink-0 flex-col items-center justify-center">
                    <div
                      className={`absolute -right-3 -top-3 z-30 flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${
                        timeLeft <= 5 && !revealed
                          ? "border-red-500/30 bg-red-500/15 text-red-500"
                          : "border-amber-500/20 bg-amber-500/10 text-amber-500"
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      {timeLeft}s
                    </div>

                    <div className="relative flex aspect-[5/7] w-full items-center justify-center overflow-hidden rounded-xl border border-border/50 bg-zinc-950/20 shadow-inner dark:bg-zinc-950/40">
                      <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] [background-size:12px_12px]" />
                      <div className="relative h-[85%] w-[85%]">
                        <Image
                          src={cardImg}
                          alt="Carte mystère"
                          fill
                          className={`object-contain transition-all duration-700 ${
                            revealed
                              ? "scale-100"
                              : "scale-95 select-none pointer-events-none"
                          }`}
                          style={{
                            // Une carte est un rectangle opaque : pas de vraie
                            // silhouette détourée possible. On masque par un flou
                            // obscurci qui s'atténue avec le temps, levé à la révélation.
                            filter: revealed
                              ? "none"
                              : `blur(${blurNow.toFixed(1)}px) brightness(${cfg?.brightness ?? 0.5}) saturate(1.15)`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Réponses / résultat */}
                  <div className="flex w-full flex-1 flex-col justify-between gap-6">
                    {gameState === "playing" ? (
                      <div className="space-y-4">
                        <H3 className="text-center font-heading text-lg font-black text-foreground md:text-left">
                          Qui est ce Pokémon ?
                        </H3>
                        {clueText && (
                          <p className="text-center text-xs font-semibold text-muted-foreground md:text-left">
                            Indice :{" "}
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
                            Temps écoulé ! C&apos;était {card?.name}.
                          </div>
                        ) : selectedOption.toLowerCase() ===
                          card?.name?.toLowerCase() ? (
                          <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-sm font-bold text-green-600 dark:text-green-400">
                            Bien joué ! C&apos;est bien {card?.name} !
                            {lastGain ? (
                              <span className="mt-1 block font-black">
                                +{lastGain} pts
                                {streak > 1 ? ` · série x${streak} 🔥` : ""}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-500">
                            Faux ! La bonne réponse était {card?.name}.
                          </div>
                        )}

                        <div className="text-[11px] font-bold text-muted-foreground">
                          Extension :{" "}
                          <span className="text-foreground">
                            {card?.set?.name || "Inconnue"}
                          </span>
                        </div>

                        <Button
                          onClick={handleNextRound}
                          className="h-11 w-full bg-gradient-to-r from-primary to-secondary font-semibold text-white"
                        >
                          {round < MAX_ROUNDS
                            ? "Manche suivante"
                            : "Voir les résultats"}
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

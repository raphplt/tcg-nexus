"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Award,
  Check,
  Clock,
  Globe,
  Loader2,
  RotateCcw,
  Sparkles,
  Swords,
  TrendingDown,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { PageWrapper } from "@/components/Layout/PageWrapper";
import { H1, H2, H3 } from "@/components/Shared/Titles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { pokemonCardService } from "@/services/pokemonCard.service";
import { sealedProductService } from "@/services/sealed-product.service";
import { API_BASE_URL } from "@/utils/fetch";
import { getCardImage } from "@/utils/images";
import { getSealedImageUrl } from "@/utils/sealedImage";

interface GuessItem {
  type: "card" | "sealed";
  data: any;
  correctPrice: number;
}

interface LocalGuessHistory {
  guess: number;
  direction: "more" | "less" | "correct";
}

interface OnlinePlayer {
  userId: number;
  userName: string;
  score: number;
  ready: boolean;
  hasGuessed: boolean;
  guesses: any[];
}

export default function JustePrixPage() {
  const [mode, setMode] = useState<"select" | "solo" | "local" | "online">(
    "select",
  );

  // --- SOLO & LOCAL PVP STATE ---
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<GuessItem[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [soloGuesses, setSoloGuesses] = useState<LocalGuessHistory[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [roundResult, setRoundResult] = useState<
    "playing" | "success" | "fail"
  >("playing");
  const [soloScore, setSoloScore] = useState(0);

  // Local PvP specifics
  const [p1Guess, setP1Guess] = useState<number | null>(null);
  const [p2Guess, setP2Guess] = useState<number | null>(null);
  const [localPvpTurn, setLocalPvpTurn] = useState<"p1" | "p2" | "reveal">(
    "p1",
  );
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [localGuessesCount, setLocalGuessesCount] = useState(0);

  // --- ONLINE PVP STATE ---
  const socketRef = useRef<Socket | null>(null);
  const [onlineSessionId, setOnlineSessionId] = useState<string | null>(null);
  const [onlineQueueStatus, setOnlineQueueStatus] = useState<
    "idle" | "queued" | "matched"
  >("idle");
  const [onlineOpponent, setOnlineOpponent] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [selfId, setSelfId] = useState<number | null>(null);
  const [onlineSession, setOnlineSession] = useState<any>(null);
  const [onlineReveal, setOnlineReveal] = useState<any>(null);
  const [onlineTimeLeft, setOnlineTimeLeft] = useState(15);
  const [onlineIsConnected, setOnlineIsConnected] = useState(false);

  const socketBaseUrl = useMemo(() => {
    if (API_BASE_URL.startsWith("http")) return API_BASE_URL;
    if (typeof window === "undefined") return "";
    return new URL(API_BASE_URL, window.location.origin).toString();
  }, []);

  // --- SOCKET CONNECTION & EVENTS ---
  useEffect(() => {
    if (mode !== "online" || !socketBaseUrl) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setOnlineIsConnected(false);
      return;
    }

    const socket = io(`${socketBaseUrl}/mini-game`, {
      transports: ["websocket"],
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setOnlineIsConnected(true);
    });

    socket.on("disconnect", () => {
      setOnlineIsConnected(false);
      setOnlineQueueStatus("idle");
    });

    socket.on(
      "minigame_matched",
      (data: {
        sessionId: string;
        opponentName: string;
        opponentId: number;
        selfId?: number;
        items: any[];
      }) => {
        setOnlineSessionId(data.sessionId);
        setOnlineOpponent({ id: data.opponentId, name: data.opponentName });
        setSelfId(data.selfId ?? null);
        setOnlineQueueStatus("matched");
        socket.emit("minigame_join_room", { sessionId: data.sessionId });
      },
    );

    socket.on("minigame_state_update", (session: any) => {
      setOnlineSession(session);
      if (session.state === "playing" && session.round > 0) {
        setOnlineReveal(null);
      }
    });

    socket.on("minigame_round_reveal", (reveal: any) => {
      setOnlineReveal(reveal);
    });

    socket.on("player_disconnected", (data: { userName: string }) => {
      alert(`L'adversaire ${data.userName} s'est déconnecté. Retour au salon.`);
      setMode("select");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [mode, socketBaseUrl]);

  // Online PvP Timer
  useEffect(() => {
    if (
      mode !== "online" ||
      !onlineSession ||
      onlineSession.state !== "playing" ||
      onlineReveal
    )
      return;

    // Reset timer on new round
    setOnlineTimeLeft(15);
  }, [onlineSession?.round, onlineReveal, mode]);

  useEffect(() => {
    if (
      mode !== "online" ||
      !onlineSession ||
      onlineSession.state !== "playing" ||
      onlineReveal
    )
      return;

    if (onlineTimeLeft <= 0) {
      // Auto submit guess if time out and haven't guessed yet
      const me = onlineSession.players.find((p: any) => p.userId === selfId);
      if (me && !me.hasGuessed) {
        handleOnlineSubmitGuess(0); // 0 points guess on time out
      }
      return;
    }

    const timer = setTimeout(() => {
      setOnlineTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [onlineTimeLeft, onlineSession, onlineReveal, mode, onlineOpponent]);

  // --- GAME ACTIONS ---

  const startSoloGame = async () => {
    setLoading(true);
    setSoloScore(0);
    setCurrentRound(1);
    setSoloGuesses([]);
    setRoundResult("playing");
    setInputVal("");

    const newItems = await fetchPricedGameItems(5);
    setItems(newItems);
    setLoading(false);
    setMode("solo");
  };

  const startLocalPvpGame = async () => {
    setLoading(true);
    setP1Score(0);
    setP2Score(0);
    setCurrentRound(1);
    setLocalPvpTurn("p1");
    setP1Guess(null);
    setP2Guess(null);
    setLocalGuessesCount(0);

    const newItems = await fetchPricedGameItems(5);
    setItems(newItems);
    setLoading(false);
    setMode("local");
  };

  const joinOnlineQueue = () => {
    if (!socketRef.current) return;
    setOnlineQueueStatus("queued");
    socketRef.current.emit("minigame_join_queue", {
      gameType: "juste_prix",
      params: { roundCount: 5 },
    });
  };

  const leaveOnlineQueue = () => {
    if (!socketRef.current) return;
    socketRef.current.emit("minigame_leave_queue");
    setOnlineQueueStatus("idle");
  };

  // Helper to fetch priced cards/products
  const fetchPricedGameItems = async (count: number): Promise<GuessItem[]> => {
    const list: GuessItem[] = [];

    // Let's get cards
    try {
      for (let i = 0; i < 3; i++) {
        let card = await pokemonCardService.getRandom();
        let attempts = 0;
        while (
          attempts < 10 &&
          (!card ||
            !card.pricing ||
            (!card.pricing.cardmarket?.trend && !card.pricing.tcgplayer))
        ) {
          card = await pokemonCardService.getRandom();
          attempts++;
        }
        const price = getReferencePrice(card);
        list.push({
          type: "card",
          data: card,
          correctPrice: price,
        });
      }
    } catch (e) {
      console.error(e);
    }

    // Let's get sealed products
    try {
      const allSealed = await sealedProductService.getAll();
      if (allSealed.length > 0) {
        for (let i = 0; i < 2; i++) {
          const randProduct =
            allSealed[Math.floor(Math.random() * allSealed.length)];
          if (randProduct) {
            // mock price as fallback if stats are empty
            let price = 25.0;
            try {
              const stats = await sealedProductService.getStatistics(
                randProduct.id,
              );
              price = stats.avgPrice || stats.minPrice || price;
            } catch {}

            list.push({
              type: "sealed",
              data: randProduct,
              correctPrice: price,
            });
          }
        }
      }
    } catch (e) {
      console.error(e);
    }

    // fallback fill
    while (list.length < count) {
      list.push({
        type: "card",
        data: {
          name: "Dracaufeu",
          set: { name: "Booster Set" },
          // Pas d'image -> getCardImage renvoie le placeholder local (pokemontcg.io n'est pas whitelisté).
        },
        correctPrice: 45.0,
      });
    }

    return list.sort(() => Math.random() - 0.5);
  };

  const getReferencePrice = (card: any): number => {
    if (!card) return 1.0;
    const cm = card.pricing?.cardmarket?.trend || card.pricing?.cardmarket?.avg;
    if (cm) return parseFloat(cm);
    const tcg =
      card.pricing?.tcgplayer?.normal?.marketPrice ||
      card.pricing?.tcgplayer?.holofoil?.marketPrice;
    if (tcg) return parseFloat(tcg);
    return parseFloat((Math.random() * 20 + 2).toFixed(2));
  };

  // Solo Round Submission
  const handleSoloGuess = () => {
    const parsed = parseFloat(inputVal.replace(",", "."));
    if (isNaN(parsed) || parsed <= 0) return;

    const item = items[currentRound - 1];
    if (!item) return;

    const correct = item.correctPrice;
    const diff = Math.abs(correct - parsed);
    const diffPercent = correct > 0 ? diff / correct : 0;

    let dir: "more" | "less" | "correct" = "correct";
    if (parsed < correct - 0.1) dir = "more";
    else if (parsed > correct + 0.1) dir = "less";

    const newHistory: LocalGuessHistory = {
      guess: parsed,
      direction: dir,
    };

    const newGuesses = [...soloGuesses, newHistory];
    setSoloGuesses(newGuesses);
    setInputVal("");

    if (diffPercent <= 0.1) {
      // Guess within 10% is correct!
      setRoundResult("success");
      const points = Math.max(10, 100 - newGuesses.length * 15);
      setSoloScore((prev) => prev + points);
    } else if (newGuesses.length >= 5) {
      setRoundResult("fail");
    }
  };

  const handleNextSoloRound = () => {
    if (currentRound < items.length) {
      setCurrentRound((prev) => prev + 1);
      setSoloGuesses([]);
      setRoundResult("playing");
    } else {
      // Dépasse le dernier index -> currentItem devient undefined -> écran résultats.
      setCurrentRound(items.length + 1);
    }
  };

  // Local PvP turns
  const handleLocalSubmit = () => {
    const parsed = parseFloat(inputVal.replace(",", "."));
    if (isNaN(parsed) || parsed <= 0) return;

    setInputVal("");

    if (localPvpTurn === "p1") {
      setP1Guess(parsed);
      setLocalPvpTurn("p2");
    } else if (localPvpTurn === "p2") {
      setP2Guess(parsed);
      setLocalPvpTurn("reveal");

      // Compare
      const item = items[currentRound - 1];
      if (!item) return;
      const correct = item.correctPrice;

      const p1Diff = Math.abs(correct - p1Guess!);
      const p2Diff = Math.abs(correct - parsed);

      if (p1Diff < p2Diff) {
        setP1Score((prev) => prev + 1);
      } else if (p2Diff < p1Diff) {
        setP2Score((prev) => prev + 1);
      }
    }
  };

  const handleNextLocalRound = () => {
    if (currentRound < items.length) {
      setCurrentRound((prev) => prev + 1);
      setP1Guess(null);
      setP2Guess(null);
      setLocalPvpTurn("p1");
    } else {
      // Dépasse le dernier index -> currentItem undefined -> écran résultats.
      setCurrentRound(items.length + 1);
    }
  };

  // Online PvP Actions
  const handleOnlineSubmitGuess = (customVal?: number) => {
    if (!socketRef.current || !onlineSessionId) return;

    const val =
      customVal !== undefined
        ? customVal
        : parseFloat(inputVal.replace(",", "."));
    if (isNaN(val) || val < 0) return;

    const timeTaken = 15 - onlineTimeLeft;
    socketRef.current.emit("minigame_submit_guess", {
      sessionId: onlineSessionId,
      guess: val,
      timeTaken,
    });
    setInputVal("");
  };

  const handleOnlineReady = () => {
    if (!socketRef.current || !onlineSessionId) return;
    socketRef.current.emit("minigame_ready", { sessionId: onlineSessionId });
  };

  const handleQuit = () => {
    socketRef.current?.emit("minigame_leave_queue");
    setMode("select");
    setOnlineSession(null);
    setOnlineSessionId(null);
    setOnlineQueueStatus("idle");
    setOnlineReveal(null);
  };

  // Render variables
  const currentItem = useMemo(() => {
    if (mode === "online") {
      return onlineSession?.currentItem;
    }
    return items[currentRound - 1];
  }, [mode, items, currentRound, onlineSession]);

  const itemImage = useMemo(() => {
    if (!currentItem) return "";
    const data = currentItem.data;
    if (currentItem.type === "card") {
      return getCardImage(data);
    }
    // Produit scellé : URL CDN via le helper dédié (l'ancien bucket r2.dev est coupé en prod).
    return getSealedImageUrl(data) || "/images/sealed-default.png";
  }, [currentItem]);

  const correctPriceForReveal = useMemo(() => {
    if (mode === "online") return onlineReveal?.correctPrice || 0;
    return items[currentRound - 1]?.correctPrice || 0;
  }, [mode, items, currentRound, onlineReveal]);

  return (
    <PageWrapper maxWidth="xl" gradient="secondary" className="space-y-6">
      {/* Main Header */}
      <div className="tcg-surface p-4 flex items-center justify-between bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link href="/pokemon/mini-games">
            <Button size="sm" variant="outline" className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <H1 className="text-lg! sm:text-xl!">Le Juste Prix</H1>
            <p className="text-[10px] text-muted-foreground">
              Estime la valeur exacte des objets
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {mode === "solo" && (
            <Badge className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 font-semibold">
              Score: {soloScore} pts
            </Badge>
          )}
          {mode === "local" && (
            <div className="flex gap-2">
              <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-semibold">
                P1: {p1Score}
              </Badge>
              <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-semibold">
                P2: {p2Score}
              </Badge>
            </div>
          )}
          {mode === "online" && onlineSession && (
            <div className="flex gap-2">
              {onlineSession.players.map((p: any) => {
                const isMe = p.userId === selfId;
                return (
                  <Badge
                    key={p.userId}
                    className={`font-semibold ${
                      isMe
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                    }`}
                  >
                    {isMe ? "Moi" : p.userName}: {p.score} pts
                  </Badge>
                );
              })}
            </div>
          )}
          {mode !== "select" && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={handleQuit}
            >
              Quitter
            </Button>
          )}
        </div>
      </div>

      {/* LOADING STATE */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="animate-spin h-10 w-10 text-primary" />
          <p className="text-sm font-bold text-muted-foreground">
            Création de la session et tirage des cartes...
          </p>
        </div>
      )}

      {/* MODE SELECTION SCREEN */}
      {!loading && mode === "select" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto pt-6">
          <Card className="tcg-surface tcg-surface--hover transition-all">
            <CardContent className="p-6 flex flex-col items-center text-center justify-between h-full gap-4">
              <div className="p-3 rounded-lg bg-muted text-foreground">
                <User className="h-10 w-10" />
              </div>
              <div>
                <h3 className="font-heading text-xl font-bold mb-2">Solo</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tente de deviner les prix en 5 essais max par manche.
                  Rapproche-toi le plus possible des 10%.
                </p>
              </div>
              <Button
                onClick={startSoloGame}
                className="w-full font-semibold h-10"
              >
                Jouer Solo
              </Button>
            </CardContent>
          </Card>

          <Card className="tcg-surface tcg-surface--hover transition-all">
            <CardContent className="p-6 flex flex-col items-center text-center justify-between h-full gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Users className="h-10 w-10" />
              </div>
              <div>
                <h3 className="font-heading text-xl font-bold mb-2">
                  PVP Local
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Défie un ami sur la même machine. Chacun propose son
                  estimation en secret, la plus proche gagne le point.
                </p>
              </div>
              <Button
                onClick={startLocalPvpGame}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold h-10"
              >
                Jouer Local
              </Button>
            </CardContent>
          </Card>

          <Card className="tcg-surface tcg-surface--hover transition-all">
            <CardContent className="p-6 flex flex-col items-center text-center justify-between h-full gap-4">
              <div className="p-3 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Globe className="h-10 w-10" />
              </div>
              <div>
                <h3 className="font-heading text-xl font-bold mb-2">
                  PVP En Ligne
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Matchmaking en temps réel par socket. Estimations simultanées
                  sous tension avec chrono.
                </p>
              </div>
              <Button
                onClick={() => setMode("online")}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold h-10"
              >
                Jouer en ligne
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ACTIVE GAME: SOLO OR LOCAL */}
      {!loading && (mode === "solo" || mode === "local") && currentItem && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
          {/* Visual Item Display */}
          <div className="lg:col-span-5 flex flex-col items-center gap-4">
            <div className="text-sm font-semibold">
              Manche {currentRound} / {items.length}
            </div>
            <Card className="border border-border bg-zinc-800 dark:bg-zinc-900 rounded-xl shadow-md overflow-hidden w-full max-w-64">
              <CardContent className="p-4 flex justify-center items-center relative aspect-[5/7]">
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff04_1px,transparent_1px)] [background-size:12px_12px]" />
                <div className="relative w-full h-full">
                  <Image
                    src={itemImage}
                    alt={
                      currentItem.data.name ||
                      currentItem.data.nameEn ||
                      "Produit"
                    }
                    fill
                    className="object-contain"
                  />
                </div>
              </CardContent>
            </Card>
            <div className="text-center space-y-1">
              <Badge
                variant="secondary"
                className="border border-border font-bold"
              >
                {currentItem.type === "card"
                  ? "Carte de collection"
                  : "Produit Scellé"}
              </Badge>
              <h3 className="font-heading text-lg font-bold text-foreground truncate max-w-xs">
                {currentItem.data.name ||
                  currentItem.data.nameEn ||
                  "Nom inconnu"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {currentItem.data.set?.name || "Extension inconnue"}
              </p>
            </div>
          </div>

          {/* Game Input & Details Area */}
          <div className="lg:col-span-7 space-y-6">
            {/* SOLO MODE DETAILS */}
            {mode === "solo" && (
              <div className="space-y-4">
                {roundResult === "playing" ? (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Estimation en euros (€)..."
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleSoloGuess()
                        }
                        className="h-12 border border-border bg-background text-foreground font-semibold"
                      />
                      <Button
                        onClick={handleSoloGuess}
                        className="font-semibold h-12 px-6"
                      >
                        Deviner
                      </Button>
                    </div>

                    {/* Solo Guess history */}
                    {soloGuesses.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-muted-foreground uppercase">
                          Tes essais :
                        </p>
                        <div className="space-y-1.5">
                          {soloGuesses.map((g, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-3 border border-border rounded-lg bg-card p-2 text-xs font-bold shadow-sm"
                            >
                              <span>{g.guess.toFixed(2)} €</span>
                              {g.direction === "more" ? (
                                <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex gap-1 items-center">
                                  <TrendingUp className="h-3 w-3" /> C'est plus
                                  !
                                </Badge>
                              ) : (
                                <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex gap-1 items-center">
                                  <TrendingDown className="h-3 w-3" /> C'est
                                  moins !
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`border border-border rounded-xl p-6 shadow-md space-y-4 ${roundResult === "success" ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-red-500/10 text-red-700 dark:text-red-400"}`}
                  >
                    <h3 className="text-xl font-bold">
                      {roundResult === "success" ? "Bravo !" : "Manche ratée !"}
                    </h3>
                    <p className="text-sm font-semibold text-foreground">
                      Le prix correct était de{" "}
                      <span className="underline font-bold">
                        {currentItem.correctPrice.toFixed(2)} €
                      </span>
                      .
                    </p>
                    {roundResult === "success" ? (
                      <p className="text-xs font-semibold">
                        Tu as trouvé en {soloGuesses.length} essai
                        {soloGuesses.length > 1 ? "s" : ""} !
                      </p>
                    ) : (
                      <p className="text-xs font-semibold">
                        Tu as épuisé tes 5 tentatives.
                      </p>
                    )}

                    <Button
                      onClick={handleNextSoloRound}
                      variant="outline"
                      className="w-full font-semibold h-11"
                    >
                      {currentRound < items.length
                        ? "Manche suivante ➡️"
                        : "Voir le récapitulatif 🏁"}
                    </Button>
                  </motion.div>
                )}
              </div>
            )}

            {/* LOCAL PVP MODE DETAILS */}
            {mode === "local" && (
              <div className="space-y-4">
                {localPvpTurn !== "reveal" ? (
                  <div className="space-y-4">
                    <div className="border border-border rounded-xl p-4 bg-muted text-foreground">
                      <p className="text-sm font-semibold">
                        Tour de :{" "}
                        <span
                          className={
                            localPvpTurn === "p1"
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-red-500 dark:text-red-400"
                          }
                        >
                          {localPvpTurn === "p1"
                            ? "Joueur 1 (Bleu)"
                            : "Joueur 2 (Rouge)"}
                        </span>
                      </p>
                      <p className="text-xs font-medium text-muted-foreground">
                        {localPvpTurn === "p1"
                          ? "Joueur 2, ne regardez pas ! Saisissez votre estimation ci-dessous."
                          : "Joueur 1, ne regardez pas ! Saisissez votre estimation ci-dessous."}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Input
                        type="password"
                        pattern="[0-9]*"
                        placeholder="Ton prix secret (€)..."
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleLocalSubmit()
                        }
                        className="h-12 border border-border bg-background text-foreground font-semibold"
                      />
                      <Button
                        onClick={handleLocalSubmit}
                        className="font-semibold h-12 px-6"
                      >
                        Valider
                      </Button>
                    </div>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-border rounded-xl p-6 shadow-md bg-card text-foreground space-y-4"
                  >
                    <h3 className="text-xl font-bold text-center border-b border-border pb-2">
                      Révélation !
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="border border-blue-500/20 rounded-lg p-3 bg-blue-500/10">
                        <p className="text-xs font-bold text-blue-600 dark:text-blue-400">
                          Joueur 1
                        </p>
                        <p className="text-lg font-bold text-foreground">
                          {p1Guess?.toFixed(2)} €
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Diff:{" "}
                          {Math.abs(
                            currentItem.correctPrice - p1Guess!,
                          ).toFixed(2)}{" "}
                          €
                        </p>
                      </div>
                      <div className="border border-red-500/20 rounded-lg p-3 bg-red-500/10">
                        <p className="text-xs font-bold text-red-600 dark:text-red-400">
                          Joueur 2
                        </p>
                        <p className="text-lg font-bold text-foreground">
                          {p2Guess?.toFixed(2)} €
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Diff:{" "}
                          {Math.abs(
                            currentItem.correctPrice - p2Guess!,
                          ).toFixed(2)}{" "}
                          €
                        </p>
                      </div>
                    </div>

                    <div className="text-center p-3 border border-border rounded-lg bg-muted font-semibold text-foreground">
                      Le prix correct était de :{" "}
                      <span className="underline font-bold text-lg">
                        {currentItem.correctPrice.toFixed(2)} €
                      </span>
                    </div>

                    <div className="text-center font-bold text-sm">
                      {Math.abs(currentItem.correctPrice - p1Guess!) ===
                      Math.abs(currentItem.correctPrice - p2Guess!) ? (
                        <span className="text-amber-600">
                          Égalité sur cette manche !
                        </span>
                      ) : Math.abs(currentItem.correctPrice - p1Guess!) <
                        Math.abs(currentItem.correctPrice - p2Guess!) ? (
                        <span className="text-blue-600">
                          Le Joueur 1 gagne le point ! 🔵
                        </span>
                      ) : (
                        <span className="text-red-500">
                          Le Joueur 2 gagne le point ! 🔴
                        </span>
                      )}
                    </div>

                    <Button
                      onClick={handleNextLocalRound}
                      className="w-full font-semibold h-11"
                    >
                      {currentRound < items.length
                        ? "Manche suivante ➡️"
                        : "Voir les résultats 🏁"}
                    </Button>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* RESULTS SCREEN (SOLO OR LOCAL) */}
      {!loading && (mode === "solo" || mode === "local") && !currentItem && (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="tcg-surface border border-border rounded-xl p-8 text-center shadow-md max-w-xl mx-auto bg-card"
        >
          <Award className="h-16 w-16 mx-auto text-primary mb-4" />
          <h2 className="text-2xl font-bold tracking-tight mb-2">
            Partie Terminée !
          </h2>

          {mode === "solo" ? (
            <p className="text-muted-foreground mb-6">
              Score final :{" "}
              <span className="text-foreground font-bold text-xl">
                {soloScore}
              </span>{" "}
              points.
            </p>
          ) : (
            <div className="space-y-4 mb-6">
              <p className="text-sm font-semibold">Résultats des duels :</p>
              <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                <div className="border border-blue-500/20 rounded-lg bg-blue-500/10 p-3">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    Joueur 1
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {p1Score} pts
                  </p>
                </div>
                <div className="border border-red-500/20 rounded-lg bg-red-500/10 p-3">
                  <p className="text-xs font-bold text-red-600 dark:text-red-400">
                    Joueur 2
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {p2Score} pts
                  </p>
                </div>
              </div>
              <h3 className="text-lg font-bold mt-4">
                {p1Score === p2Score ? (
                  <span className="text-amber-500">Égalité parfaite ! 🤝</span>
                ) : p1Score > p2Score ? (
                  <span className="text-blue-600">
                    🏆 Victoire du Joueur 1 ! 🔵
                  </span>
                ) : (
                  <span className="text-red-500">
                    🏆 Victoire du Joueur 2 ! 🔴
                  </span>
                )}
              </h3>
            </div>
          )}

          <div className="flex justify-center gap-4">
            <Button
              onClick={() => setMode("select")}
              variant="outline"
              className="font-semibold"
            >
              Retour
            </Button>
            <Button
              onClick={mode === "solo" ? startSoloGame : startLocalPvpGame}
              className="font-semibold"
            >
              <RotateCcw className="h-4 w-4 mr-2" /> Rejouer
            </Button>
          </div>
        </motion.div>
      )}

      {/* ONLINE LOBBY / MATCHMAKING */}
      {mode === "online" && !onlineSession && (
        <Card className="tcg-surface mx-auto max-w-xl bg-card text-center shadow-sm">
          <CardContent className="space-y-4 p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Globe className="h-8 w-8" />
            </div>
            <H3 className="font-heading text-lg font-bold">
              Matchmaking en ligne
            </H3>
            {!onlineIsConnected ? (
              <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Connexion au
                serveur…
              </p>
            ) : onlineQueueStatus === "queued" ? (
              <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Recherche d&apos;un
                adversaire…
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Lance la recherche pour affronter un joueur en direct.
              </p>
            )}
            <div className="flex justify-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleQuit}
                className="font-semibold"
              >
                Retour
              </Button>
              {onlineQueueStatus === "queued" ? (
                <Button
                  variant="outline"
                  onClick={leaveOnlineQueue}
                  className="font-semibold text-red-500"
                >
                  Annuler
                </Button>
              ) : (
                <Button
                  onClick={joinOnlineQueue}
                  disabled={!onlineIsConnected}
                  className="bg-purple-500 font-semibold text-white hover:bg-purple-600"
                >
                  Chercher un match
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ONLINE PVP MODE GAMEPLAY */}
      {mode === "online" && onlineSession && (
        <div className="space-y-6 pt-4">
          {/* MATCH STATS / STATUS */}
          {onlineSession.state === "waiting" && (
            <div className="text-center py-10 border border-border rounded-xl shadow-sm bg-card">
              <Loader2 className="animate-spin h-8 w-8 mx-auto text-primary mb-3" />
              <h3 className="font-heading text-lg font-bold">
                Synchronisation en cours...
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Cliquez sur Prêt pour démarrer le match !
              </p>
              <div className="flex justify-center gap-4">
                {onlineSession.players.map((p: any) => {
                  const isMe = p.userId === selfId;
                  return (
                    <div
                      key={p.userId}
                      className="flex flex-col items-center border border-border rounded-lg p-3 bg-muted w-36"
                    >
                      <span className="text-xs font-semibold text-foreground">
                        {isMe ? "Moi" : p.userName}
                      </span>
                      {p.ready ? (
                        <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 mt-2">
                          Prêt
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border border-border mt-2"
                        >
                          Pas prêt
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-6">
                {onlineSession.players.find((p: any) => p.userId === selfId)
                  ?.ready ? (
                  <Button disabled className="font-semibold">
                    En attente de l'autre joueur...
                  </Button>
                ) : (
                  <Button onClick={handleOnlineReady} className="font-semibold">
                    Je suis Prêt !
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* ACTIVE PLAYING SCREEN */}
          {onlineSession.state === "playing" && currentItem && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Visual Item Display */}
              <div className="lg:col-span-5 flex flex-col items-center gap-4">
                <div className="text-sm font-semibold">
                  Manche {onlineSession.round} / {onlineSession.maxRounds}
                </div>
                <Card className="border border-border bg-zinc-800 dark:bg-zinc-900 rounded-xl shadow-md overflow-hidden w-full max-w-64">
                  <CardContent className="p-4 flex justify-center items-center relative aspect-[5/7]">
                    {/* Timer bar */}
                    {!onlineReveal && (
                      <div className="absolute -top-3 -right-3 z-30 flex items-center gap-1 border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg px-3 py-1 text-xs font-semibold">
                        <Clock className="h-3.5 w-3.5" />
                        {onlineTimeLeft}s
                      </div>
                    )}
                    <div className="absolute inset-0 bg-[radial-gradient(#ffffff04_1px,transparent_1px)] [background-size:12px_12px]" />
                    <div className="relative w-full h-full">
                      <Image
                        src={itemImage}
                        alt="Produit"
                        fill
                        className="object-contain"
                      />
                    </div>
                  </CardContent>
                </Card>
                <div className="text-center space-y-1">
                  <Badge
                    variant="secondary"
                    className="border border-border font-bold"
                  >
                    {currentItem.type === "card"
                      ? "Carte de collection"
                      : "Produit Scellé"}
                  </Badge>
                  <h3 className="font-heading text-lg font-bold text-foreground truncate max-w-xs">
                    {currentItem.data.name ||
                      currentItem.data.nameEn ||
                      "Nom inconnu"}
                  </h3>
                </div>
              </div>

              {/* Input guess or reveal */}
              <div className="lg:col-span-7 space-y-6">
                {!onlineReveal ? (
                  <div className="space-y-4">
                    <div className="border border-border rounded-xl p-4 bg-muted text-foreground">
                      <h4 className="text-sm font-semibold">
                        Entre ton estimation
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Saisis le prix rapidement. Si tu es proche du prix
                        exact, un bonus de rapidité sera accordé !
                      </p>
                    </div>

                    {onlineSession.players.find((p: any) => p.userId === selfId)
                      ?.hasGuessed ? (
                      <div className="text-center py-6 border-2 border-dashed border-zinc-300">
                        <p className="text-sm font-bold text-muted-foreground">
                          Estimation envoyée ! En attente de l'adversaire...
                        </p>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Estimation en euros (€)..."
                          value={inputVal}
                          onChange={(e) => setInputVal(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleOnlineSubmitGuess()
                          }
                          className="h-12 border border-border bg-background text-foreground font-semibold"
                        />
                        <Button
                          onClick={() => handleOnlineSubmitGuess()}
                          className="font-semibold h-12 px-6"
                        >
                          Estimer
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-border rounded-xl p-6 shadow-md bg-card text-foreground space-y-4"
                  >
                    <h3 className="text-xl font-bold text-center border-b border-border pb-2">
                      Révélation !
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      {onlineReveal.guesses.map((g: any) => {
                        const isMe = g.userId === selfId;
                        return (
                          <div
                            key={g.userId}
                            className={`border rounded-lg p-3 ${isMe ? "border-primary/20 bg-primary/10" : "border-purple-500/20 bg-purple-500/10"}`}
                          >
                            <p className="text-xs font-bold">
                              {isMe ? "Moi" : g.userName}
                            </p>
                            <p className="text-lg font-bold text-foreground">
                              {g.guess?.toFixed(2) || 0} €
                            </p>
                            <Badge className="bg-muted text-foreground border border-border mt-1">
                              +{g.points || 0} pts
                            </Badge>
                          </div>
                        );
                      })}
                    </div>

                    <div className="text-center p-3 border border-border rounded-lg bg-muted font-semibold text-foreground">
                      Le juste prix était :{" "}
                      <span className="underline font-bold text-lg">
                        {correctPriceForReveal.toFixed(2)} €
                      </span>
                    </div>

                    {/* Ready button for next round */}
                    <div>
                      {onlineSession.players.find(
                        (p: any) => p.userId === selfId,
                      )?.ready ? (
                        <Button disabled className="w-full font-semibold">
                          En attente de l'adversaire...
                        </Button>
                      ) : (
                        <Button
                          onClick={handleOnlineReady}
                          className="w-full font-semibold h-11"
                        >
                          {onlineSession.round < onlineSession.maxRounds
                            ? "Prêt pour la manche suivante ➡️"
                            : "Voir les scores finaux 🏁"}
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          )}

          {/* GAME FINISHED SCREEN */}
          {onlineSession.state === "finished" && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="tcg-surface border border-border rounded-xl p-8 text-center shadow-md max-w-xl mx-auto bg-card"
            >
              <Award className="h-16 w-16 mx-auto text-primary mb-4" />
              <h2 className="text-2xl font-bold tracking-tight mb-2">
                Match Terminé !
              </h2>

              <div className="space-y-4 mb-6">
                <p className="text-sm font-semibold">Tableau des scores :</p>
                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                  {onlineSession.players.map((p: any) => {
                    const isMe = p.userId === selfId;
                    return (
                      <div
                        key={p.userId}
                        className={`border rounded-lg p-3 ${isMe ? "border-primary/20 bg-primary/10" : "border-purple-500/20 bg-purple-500/10"}`}
                      >
                        <p className="text-xs font-bold">
                          {isMe ? "Moi" : p.userName}
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                          {p.score} pts
                        </p>
                      </div>
                    );
                  })}
                </div>

                <h3 className="text-lg font-bold mt-4">
                  {(() => {
                    const me = onlineSession.players.find(
                      (p: any) => p.userId === selfId,
                    );
                    const opp = onlineSession.players.find(
                      (p: any) => p.userId !== selfId,
                    );
                    if (me.score === opp.score)
                      return (
                        <span className="text-amber-500">
                          Égalité parfaite ! 🤝
                        </span>
                      );
                    if (me.score > opp.score)
                      return (
                        <span className="text-green-500">
                          🏆 Victoire ! Tu as battu {opp.userName} ! 🎉
                        </span>
                      );
                    return (
                      <span className="text-red-500">
                        Défaite ! {opp.userName} a gagné. 😢
                      </span>
                    );
                  })()}
                </h3>
              </div>

              <div className="flex justify-center gap-4">
                <Button
                  onClick={() => setMode("select")}
                  className="w-full font-semibold"
                >
                  Retour au Salon
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}

"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  RotateCcw,
  Clock,
  User,
  Users,
  Swords,
  Check,
  TrendingDown,
  TrendingUp,
  Award,
  Globe,
  Loader2,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import { H1, H2, H3 } from "@/components/Shared/Titles";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { pokemonCardService } from "@/services/pokemonCard.service";
import { sealedProductService } from "@/services/sealed-product.service";
import { getCardImage } from "@/utils/images";
import { API_BASE_URL } from "@/utils/fetch";

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
  const [mode, setMode] = useState<"select" | "solo" | "local" | "online">("select");

  // --- SOLO & LOCAL PVP STATE ---
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<GuessItem[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [soloGuesses, setSoloGuesses] = useState<LocalGuessHistory[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [roundResult, setRoundResult] = useState<"playing" | "success" | "fail">("playing");
  const [soloScore, setSoloScore] = useState(0);

  // Local PvP specifics
  const [p1Guess, setP1Guess] = useState<number | null>(null);
  const [p2Guess, setP2Guess] = useState<number | null>(null);
  const [localPvpTurn, setLocalPvpTurn] = useState<"p1" | "p2" | "reveal">("p1");
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [localGuessesCount, setLocalGuessesCount] = useState(0);

  // --- ONLINE PVP STATE ---
  const socketRef = useRef<Socket | null>(null);
  const [onlineSessionId, setOnlineSessionId] = useState<string | null>(null);
  const [onlineQueueStatus, setOnlineQueueStatus] = useState<"idle" | "queued" | "matched">("idle");
  const [onlineOpponent, setOnlineOpponent] = useState<{ id: number; name: string } | null>(null);
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

    socket.on("minigame_matched", (data: { sessionId: string; opponentName: string; opponentId: number; items: any[] }) => {
      setOnlineSessionId(data.sessionId);
      setOnlineOpponent({ id: data.opponentId, name: data.opponentName });
      setOnlineQueueStatus("matched");
      socket.emit("minigame_join_room", { sessionId: data.sessionId });
    });

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
    if (mode !== "online" || !onlineSession || onlineSession.state !== "playing" || onlineReveal) return;

    // Reset timer on new round
    setOnlineTimeLeft(15);
  }, [onlineSession?.round, onlineReveal, mode]);

  useEffect(() => {
    if (mode !== "online" || !onlineSession || onlineSession.state !== "playing" || onlineReveal) return;

    if (onlineTimeLeft <= 0) {
      // Auto submit guess if time out and haven't guessed yet
      const me = onlineSession.players.find((p: any) => p.userId !== onlineOpponent?.id);
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
        while (attempts < 10 && (!card || !card.pricing || (!card.pricing.cardmarket?.trend && !card.pricing.tcgplayer))) {
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
          const randProduct = allSealed[Math.floor(Math.random() * allSealed.length)];
          if (randProduct) {
            // mock price as fallback if stats are empty
            let price = 25.0;
            try {
              const stats = await sealedProductService.getStatistics(randProduct.id);
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
          image: "https://images.pokemontcg.io/cel25/4_hires.png",
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
    const tcg = card.pricing?.tcgplayer?.normal?.marketPrice || card.pricing?.tcgplayer?.holofoil?.marketPrice;
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
      // finish
      setRoundResult("fail"); // trigger game over screen
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
      setLocalPvpTurn("reveal"); // game over
    }
  };

  // Online PvP Actions
  const handleOnlineSubmitGuess = (customVal?: number) => {
    if (!socketRef.current || !onlineSessionId) return;

    const val = customVal !== undefined ? customVal : parseFloat(inputVal.replace(",", "."));
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
    // Sealed product image R2
    return data.image
      ? `https://pub-db21b2d42eb64f5fb24b52abf84ff5f1.r2.dev/${data.image}`
      : "/images/placeholders/sealed.png";
  }, [currentItem]);

  const correctPriceForReveal = useMemo(() => {
    if (mode === "online") return onlineReveal?.correctPrice || 0;
    return items[currentRound - 1]?.correctPrice || 0;
  }, [mode, items, currentRound, onlineReveal]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background/95 px-4 py-8 flex flex-col justify-start items-center">
      <div className="w-full max-w-4xl">
        {/* Main Header */}
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
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <H1 className="text-lg! sm:text-xl!">Le Juste Prix</H1>
              <p className="text-[10px] text-muted-foreground">Estime la valeur exacte des objets</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {mode === "solo" && (
              <Badge className="border-2 border-foreground bg-primary px-3 py-1 font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                Score: {soloScore} pts
              </Badge>
            )}
            {mode === "local" && (
              <div className="flex gap-2">
                <Badge className="border-2 border-foreground bg-blue-400 font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black">
                  P1: {p1Score}
                </Badge>
                <Badge className="border-2 border-foreground bg-red-400 font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black">
                  P2: {p2Score}
                </Badge>
              </div>
            )}
            {mode === "online" && onlineSession && (
              <div className="flex gap-2">
                {onlineSession.players.map((p: any) => {
                  const isMe = p.userId !== onlineOpponent?.id;
                  return (
                    <Badge
                      key={p.userId}
                      className={`border-2 border-foreground font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                        isMe ? "bg-primary text-foreground" : "bg-purple-400 text-black"
                      }`}
                    >
                      {isMe ? "Moi" : p.userName}: {p.score} pts
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin h-10 w-10 text-primary" />
            <p className="text-sm font-bold text-muted-foreground">Création de la session et tirage des cartes...</p>
          </div>
        )}

        {/* MODE SELECTION SCREEN */}
        {!loading && mode === "select" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto pt-6">
            <Card className="border-4 border-foreground shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all">
              <CardContent className="p-6 flex flex-col items-center text-center justify-between h-full gap-4">
                <div className="p-4 border-2 border-foreground bg-zinc-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black">
                  <User className="h-10 w-10" />
                </div>
                <div>
                  <h3 className="font-heading text-xl font-black uppercase mb-2">Solo</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Tente de deviner les prix en 5 essais max par manche. Rapproche-toi le plus possible des 10%.
                  </p>
                </div>
                <Button onClick={startSoloGame} className="w-full border-2 border-foreground bg-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black uppercase text-xs h-10">
                  Jouer Solo
                </Button>
              </CardContent>
            </Card>

            <Card className="border-4 border-foreground shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all">
              <CardContent className="p-6 flex flex-col items-center text-center justify-between h-full gap-4">
                <div className="p-4 border-2 border-foreground bg-blue-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-blue-600">
                  <Users className="h-10 w-10" />
                </div>
                <div>
                  <h3 className="font-heading text-xl font-black uppercase mb-2">PVP Local</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Défie un ami sur la même machine. Chacun propose son estimation en secret, la plus proche gagne le point.
                  </p>
                </div>
                <Button onClick={startLocalPvpGame} className="w-full border-2 border-foreground bg-blue-500 hover:bg-blue-600 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black uppercase text-xs h-10">
                  Jouer Local
                </Button>
              </CardContent>
            </Card>

            <Card className="border-4 border-foreground shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all">
              <CardContent className="p-6 flex flex-col items-center text-center justify-between h-full gap-4">
                <div className="p-4 border-2 border-foreground bg-purple-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-purple-600">
                  <Globe className="h-10 w-10" />
                </div>
                <div>
                  <h3 className="font-heading text-xl font-black uppercase mb-2">PVP En Ligne</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Matchmaking en temps réel par socket. Estimations simultanées sous tension avec chrono.
                  </p>
                </div>
                {onlineQueueStatus === "idle" ? (
                  <Button onClick={joinOnlineQueue} className="w-full border-2 border-foreground bg-purple-500 hover:bg-purple-600 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black uppercase text-xs h-10">
                    Trouver un Match
                  </Button>
                ) : onlineQueueStatus === "queued" ? (
                  <Button onClick={leaveOnlineQueue} variant="outline" className="w-full border-2 border-foreground text-red-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black uppercase text-xs h-10 flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin h-3.5 w-3.5" /> Annuler Queue
                  </Button>
                ) : (
                  <Button disabled className="w-full border-2 border-foreground bg-purple-300 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black uppercase text-xs h-10">
                    Match trouvé !
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ACTIVE GAME: SOLO OR LOCAL */}
        {!loading && (mode === "solo" || mode === "local") && currentItem && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
            {/* Visual Item Display */}
            <div className="lg:col-span-5 flex flex-col items-center gap-4">
              <div className="text-sm font-black uppercase">
                Manche {currentRound} / {items.length}
              </div>
              <Card className="border-4 border-foreground bg-zinc-800 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden w-full max-w-64">
                <CardContent className="p-4 flex justify-center items-center relative aspect-[5/7]">
                  <div className="absolute inset-0 bg-[radial-gradient(#ffffff04_1px,transparent_1px)] [background-size:12px_12px]" />
                  <div className="relative w-full h-full">
                    <Image
                      src={itemImage}
                      alt={currentItem.data.name || currentItem.data.nameEn || "Produit"}
                      fill
                      className="object-contain"
                    />
                  </div>
                </CardContent>
              </Card>
              <div className="text-center space-y-1">
                <Badge variant="secondary" className="border border-border font-bold">
                  {currentItem.type === "card" ? "Carte de collection" : "Produit Scellé"}
                </Badge>
                <h3 className="font-heading text-lg font-bold text-foreground truncate max-w-xs">
                  {currentItem.data.name || currentItem.data.nameEn || "Nom inconnu"}
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
                          onKeyDown={(e) => e.key === "Enter" && handleSoloGuess()}
                          className="h-12 border-2 border-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-background text-foreground font-semibold"
                        />
                        <Button onClick={handleSoloGuess} className="border-2 border-foreground bg-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black uppercase h-12 px-6">
                          Deviner
                        </Button>
                      </div>

                      {/* Solo Guess history */}
                      {soloGuesses.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-muted-foreground uppercase">Tes essais :</p>
                          <div className="space-y-1.5">
                            {soloGuesses.map((g, idx) => (
                              <div key={idx} className="flex items-center gap-3 border-2 border-foreground bg-card p-2 text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                <span>{g.guess.toFixed(2)} €</span>
                                {g.direction === "more" ? (
                                  <Badge className="bg-amber-400 text-black border border-foreground flex gap-1 items-center">
                                    <TrendingUp className="h-3 w-3" /> C'est plus !
                                  </Badge>
                                ) : (
                                  <Badge className="bg-blue-400 text-white border border-foreground flex gap-1 items-center">
                                    <TrendingDown className="h-3 w-3" /> C'est moins !
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
                      className="border-4 border-foreground p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4"
                      style={{
                        backgroundColor: roundResult === "success" ? "#4ade80" : "#f87171",
                      }}
                    >
                      <h3 className="text-xl font-black uppercase">
                        {roundResult === "success" ? "Bravo !" : "Manche ratée !"}
                      </h3>
                      <p className="text-sm font-bold">
                        Le prix correct était de <span className="underline font-black">{currentItem.correctPrice.toFixed(2)} €</span>.
                      </p>
                      {roundResult === "success" ? (
                        <p className="text-xs font-semibold">
                          Tu as trouvé en {soloGuesses.length} essai{soloGuesses.length > 1 ? "s" : ""} !
                        </p>
                      ) : (
                        <p className="text-xs font-semibold">Tu as épuisé tes 5 tentatives.</p>
                      )}

                      <Button onClick={handleNextSoloRound} className="w-full border-2 border-foreground bg-background text-foreground shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-black uppercase h-11">
                        {currentRound < items.length ? "Manche suivante ➡️" : "Voir le récapitulatif 🏁"}
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
                      <div className="border-4 border-foreground p-4 bg-zinc-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black">
                        <p className="text-sm font-black uppercase">
                          Tour de : <span className={localPvpTurn === "p1" ? "text-blue-600" : "text-red-500"}>
                            {localPvpTurn === "p1" ? "JOUEUR 1 (Bleu)" : "JOUEUR 2 (Rouge)"}
                          </span>
                        </p>
                        <p className="text-xs font-medium text-zinc-600">
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
                          onKeyDown={(e) => e.key === "Enter" && handleLocalSubmit()}
                          className="h-12 border-2 border-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-background text-foreground font-semibold"
                        />
                        <Button onClick={handleLocalSubmit} className="border-2 border-foreground bg-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black uppercase h-12 px-6">
                          Valider
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border-4 border-foreground p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-white text-black space-y-4"
                    >
                      <h3 className="text-xl font-black uppercase text-center border-b-2 border-foreground pb-2">Révélation !</h3>
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="border-2 border-foreground p-3 bg-blue-50">
                          <p className="text-xs font-bold uppercase text-blue-600">Joueur 1</p>
                          <p className="text-lg font-black">{p1Guess?.toFixed(2)} €</p>
                          <p className="text-[10px] text-zinc-500">
                            Diff: {Math.abs(currentItem.correctPrice - p1Guess!).toFixed(2)} €
                          </p>
                        </div>
                        <div className="border-2 border-foreground p-3 bg-red-50">
                          <p className="text-xs font-bold uppercase text-red-500">Joueur 2</p>
                          <p className="text-lg font-black">{p2Guess?.toFixed(2)} €</p>
                          <p className="text-[10px] text-zinc-500">
                            Diff: {Math.abs(currentItem.correctPrice - p2Guess!).toFixed(2)} €
                          </p>
                        </div>
                      </div>

                      <div className="text-center p-3 border-2 border-foreground bg-zinc-100 font-bold">
                        Le prix correct était de : <span className="underline font-black text-lg">{currentItem.correctPrice.toFixed(2)} €</span>
                      </div>

                      <div className="text-center font-black uppercase text-sm">
                        {Math.abs(currentItem.correctPrice - p1Guess!) === Math.abs(currentItem.correctPrice - p2Guess!) ? (
                          <span className="text-amber-600">Égalité sur cette manche !</span>
                        ) : Math.abs(currentItem.correctPrice - p1Guess!) < Math.abs(currentItem.correctPrice - p2Guess!) ? (
                          <span className="text-blue-600">Le Joueur 1 gagne le point ! 🔵</span>
                        ) : (
                          <span className="text-red-500">Le Joueur 2 gagne le point ! 🔴</span>
                        )}
                      </div>

                      <Button onClick={handleNextLocalRound} className="w-full border-2 border-foreground bg-primary shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-black uppercase h-11">
                        {currentRound < items.length ? "Manche suivante ➡️" : "Voir les résultats 🏁"}
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
            className="tcg-surface border-4 border-foreground p-8 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] max-w-xl mx-auto bg-card"
          >
            <Award className="h-16 w-16 mx-auto text-primary mb-4" />
            <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Partie Terminée !</h2>

            {mode === "solo" ? (
              <p className="text-muted-foreground mb-6">
                Score final : <span className="text-foreground font-black text-xl">{soloScore}</span> points.
              </p>
            ) : (
              <div className="space-y-4 mb-6">
                <p className="text-sm font-semibold">Résultats des duels :</p>
                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                  <div className="border-2 border-foreground bg-blue-50 p-3">
                    <p className="text-xs font-bold text-blue-600 uppercase">Joueur 1</p>
                    <p className="text-2xl font-black">{p1Score} pts</p>
                  </div>
                  <div className="border-2 border-foreground bg-red-50 p-3">
                    <p className="text-xs font-bold text-red-500 uppercase">Joueur 2</p>
                    <p className="text-2xl font-black">{p2Score} pts</p>
                  </div>
                </div>
                <h3 className="text-lg font-black uppercase mt-4">
                  {p1Score === p2Score ? (
                    <span className="text-amber-500">Égalité parfaite ! 🤝</span>
                  ) : p1Score > p2Score ? (
                    <span className="text-blue-600">🏆 Victoire du Joueur 1 ! 🔵</span>
                  ) : (
                    <span className="text-red-500">🏆 Victoire du Joueur 2 ! 🔴</span>
                  )}
                </h3>
              </div>
            )}

            <div className="flex justify-center gap-4">
              <Button onClick={() => setMode("select")} variant="outline" className="border-2 border-foreground font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                Retour
              </Button>
              <Button onClick={mode === "solo" ? startSoloGame : startLocalPvpGame} className="border-2 border-foreground font-bold bg-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <RotateCcw className="h-4 w-4 mr-2" /> Rejouer
              </Button>
            </div>
          </motion.div>
        )}

        {/* ONLINE PVP MODE GAMEPLAY */}
        {mode === "online" && onlineSession && (
          <div className="space-y-6 pt-4">
            {/* MATCH STATS / STATUS */}
            {onlineSession.state === "waiting" && (
              <div className="text-center py-10 border-4 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-card">
                <Loader2 className="animate-spin h-8 w-8 mx-auto text-primary mb-3" />
                <h3 className="font-heading text-lg font-bold">Synchronisation en cours...</h3>
                <p className="text-xs text-muted-foreground mb-4">Cliquez sur Prêt pour démarrer le match !</p>
                <div className="flex justify-center gap-4">
                  {onlineSession.players.map((p: any) => {
                    const isMe = p.userId !== onlineOpponent?.id;
                    return (
                      <div key={p.userId} className="flex flex-col items-center border-2 border-foreground p-3 bg-zinc-50 w-36 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <span className="text-xs font-black">{isMe ? "Moi" : p.userName}</span>
                        {p.ready ? (
                          <Badge className="bg-green-400 text-black border border-foreground mt-2">Prêt</Badge>
                        ) : (
                          <Badge variant="outline" className="border border-foreground mt-2">Pas prêt</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6">
                  {onlineSession.players.find((p: any) => p.userId !== onlineOpponent?.id)?.ready ? (
                    <Button disabled className="border-2 border-foreground bg-zinc-300 text-white font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase">
                      En attente de l'autre joueur...
                    </Button>
                  ) : (
                    <Button onClick={handleOnlineReady} className="border-2 border-foreground bg-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black uppercase">
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
                  <div className="text-sm font-black uppercase">
                    Manche {onlineSession.round} / {onlineSession.maxRounds}
                  </div>
                  <Card className="border-4 border-foreground bg-zinc-800 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden w-full max-w-64">
                    <CardContent className="p-4 flex justify-center items-center relative aspect-[5/7]">
                      {/* Timer bar */}
                      {!onlineReveal && (
                        <div className="absolute -top-3 -right-3 z-30 flex items-center gap-1 border-2 border-foreground bg-amber-400 px-3 py-1 text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
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
                    <Badge variant="secondary" className="border border-border font-bold">
                      {currentItem.type === "card" ? "Carte de collection" : "Produit Scellé"}
                    </Badge>
                    <h3 className="font-heading text-lg font-bold text-foreground truncate max-w-xs">
                      {currentItem.data.name || currentItem.data.nameEn || "Nom inconnu"}
                    </h3>
                  </div>
                </div>

                {/* Input guess or reveal */}
                <div className="lg:col-span-7 space-y-6">
                  {!onlineReveal ? (
                    <div className="space-y-4">
                      <div className="border-4 border-foreground p-4 bg-zinc-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black">
                        <h4 className="text-sm font-black uppercase">Entre ton estimation</h4>
                        <p className="text-xs text-zinc-600">
                          Saisis le prix rapidement. Si tu es proche du prix exact, un bonus de rapidité sera accordé !
                        </p>
                      </div>

                      {onlineSession.players.find((p: any) => p.userId !== onlineOpponent?.id)?.hasGuessed ? (
                        <div className="text-center py-6 border-2 border-dashed border-zinc-300">
                          <p className="text-sm font-bold text-muted-foreground">Estimation envoyée ! En attente de l'adversaire...</p>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            placeholder="Estimation en euros (€)..."
                            value={inputVal}
                            onChange={(e) => setInputVal(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleOnlineSubmitGuess()}
                            className="h-12 border-2 border-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-background text-foreground font-semibold"
                          />
                          <Button onClick={() => handleOnlineSubmitGuess()} className="border-2 border-foreground bg-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black uppercase h-12 px-6">
                            Estimer
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border-4 border-foreground p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-white text-black space-y-4"
                    >
                      <h3 className="text-xl font-black uppercase text-center border-b-2 border-foreground pb-2">Révélation !</h3>
                      <div className="grid grid-cols-2 gap-4 text-center">
                        {onlineReveal.guesses.map((g: any) => {
                          const isMe = g.userId !== onlineOpponent?.id;
                          return (
                            <div key={g.userId} className={`border-2 border-foreground p-3 ${isMe ? "bg-primary/10" : "bg-purple-50"}`}>
                              <p className="text-xs font-bold uppercase">{isMe ? "Moi" : g.userName}</p>
                              <p className="text-lg font-black">{g.guess?.toFixed(2) || 0} €</p>
                              <Badge className="bg-foreground text-background border mt-1">+{g.points || 0} pts</Badge>
                            </div>
                          );
                        })}
                      </div>

                      <div className="text-center p-3 border-2 border-foreground bg-zinc-100 font-bold">
                        Le juste prix était : <span className="underline font-black text-lg">{correctPriceForReveal.toFixed(2)} €</span>
                      </div>

                      {/* Ready button for next round */}
                      <div>
                        {onlineSession.players.find((p: any) => p.userId !== onlineOpponent?.id)?.ready ? (
                          <Button disabled className="w-full border-2 border-foreground bg-zinc-300 text-white font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase">
                            En attente de l'adversaire...
                          </Button>
                        ) : (
                          <Button onClick={handleOnlineReady} className="w-full border-2 border-foreground bg-primary shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-black uppercase h-11">
                            {onlineSession.round < onlineSession.maxRounds ? "Prêt pour la manche suivante ➡️" : "Voir les scores finaux 🏁"}
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
                className="tcg-surface border-4 border-foreground p-8 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] max-w-xl mx-auto bg-card"
              >
                <Award className="h-16 w-16 mx-auto text-primary mb-4" />
                <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Match Terminé !</h2>

                <div className="space-y-4 mb-6">
                  <p className="text-sm font-semibold">Tableau des scores :</p>
                  <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                    {onlineSession.players.map((p: any) => {
                      const isMe = p.userId !== onlineOpponent?.id;
                      return (
                        <div key={p.userId} className={`border-2 border-foreground p-3 ${isMe ? "bg-primary/10" : "bg-purple-50"}`}>
                          <p className="text-xs font-bold uppercase">{isMe ? "Moi" : p.userName}</p>
                          <p className="text-2xl font-black">{p.score} pts</p>
                        </div>
                      );
                    })}
                  </div>

                  <h3 className="text-lg font-black uppercase mt-4">
                    {(() => {
                      const me = onlineSession.players.find((p: any) => p.userId !== onlineOpponent?.id);
                      const opp = onlineSession.players.find((p: any) => p.userId === onlineOpponent?.id);
                      if (me.score === opp.score) return <span className="text-amber-500">Égalité parfaite ! 🤝</span>;
                      if (me.score > opp.score) return <span className="text-green-500">🏆 Victoire ! Tu as battu {opp.userName} ! 🎉</span>;
                      return <span className="text-red-500">Défaite ! {opp.userName} a gagné. 😢</span>;
                    })()}
                  </h3>
                </div>

                <div className="flex justify-center gap-4">
                  <Button onClick={() => setMode("select")} className="w-full border-2 border-foreground bg-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold uppercase">
                    Retour au Salon
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Package,
  RotateCcw,
  Sparkles,
  User,
  Users,
  Globe,
  Loader2,
  Swords,
  Play,
  Award,
  Dice5,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import { H1, H2, H3 } from "@/components/Shared/Titles";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { pokemonCardService } from "@/services/pokemonCard.service";
import { getCardImage } from "@/utils/images";
import { API_BASE_URL } from "@/utils/fetch";
import { PageWrapper } from "@/components/Layout/PageWrapper";
import type { PokemonSetType } from "@/types/cardPokemon";

interface CardItem {
  id: string;
  name: string;
  rarity?: string;
  image: string;
  price: number;
}

export default function CaseOpeningPage() {
  const [mode, setMode] = useState<"select" | "lobby" | "solo" | "local" | "online">("select");
  const [sets, setSets] = useState<PokemonSetType[]>([]);
  const [selectedSet, setSelectedSet] = useState<string>("all");
  const [boosterCount, setBoosterCount] = useState<number>(3);
  
  // --- GAME STATE ---
  const [loading, setLoading] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [isSpinning, setIsSpinning] = useState(false);
  
  // Solo & Local State
  const [p1Cards, setP1Cards] = useState<CardItem[][]>([]);
  const [p2Cards, setP2Cards] = useState<CardItem[][]>([]); // Bot or Player 2
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [localPvpTurn, setLocalPvpTurn] = useState<"p1" | "p2" | "reveal">("p1");

  // Roulette items list (cards that slide)
  const [rouletteCards, setRouletteCards] = useState<CardItem[]>([]);
  const [spinWinnerIndex, setSpinWinnerIndex] = useState<number>(24); // Index of winning card in roulette (usually 20-30)

  // --- ONLINE PVP STATE ---
  const socketRef = useRef<Socket | null>(null);
  const [onlineSessionId, setOnlineSessionId] = useState<string | null>(null);
  const [onlineQueueStatus, setOnlineQueueStatus] = useState<"idle" | "queued" | "matched">("idle");
  const [onlineOpponent, setOnlineOpponent] = useState<{ id: number; name: string } | null>(null);
  const [onlineSession, setOnlineSession] = useState<any>(null);
  const [onlineIsConnected, setOnlineIsConnected] = useState(false);

  const socketBaseUrl = useMemo(() => {
    if (API_BASE_URL.startsWith("http")) return API_BASE_URL;
    if (typeof window === "undefined") return "";
    return new URL(API_BASE_URL, window.location.origin).toString();
  }, []);

  // Fetch Sets
  useEffect(() => {
    const fetchSets = async () => {
      try {
        const list = await pokemonCardService.getAllSets(20);
        setSets(list);
      } catch (e) {
        console.error(e);
      }
    };
    fetchSets();
  }, []);

  // Socket Connection for Online PvP
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

    socket.on("minigame_matched", (data: { sessionId: string; opponentName: string; opponentId: number }) => {
      setOnlineSessionId(data.sessionId);
      setOnlineOpponent({ id: data.opponentId, name: data.opponentName });
      setOnlineQueueStatus("matched");
      socket.emit("minigame_join_room", { sessionId: data.sessionId });
    });

    socket.on("minigame_state_update", (session: any) => {
      setOnlineSession(session);
      
      // If a player just opened their pack, trigger the roulette spin for them
      const me = session.players.find((p: any) => p.userId !== onlineOpponent?.id);
      const opponent = session.players.find((p: any) => p.userId === onlineOpponent?.id);
      
      // Check if my opened booster count increased
      const myOpenedCount = me?.openedPacks?.length || 0;
      if (myOpenedCount === session.round && !isSpinning && myOpenedCount > p1Cards.length) {
        const lastPack = me.openedPacks[myOpenedCount - 1];
        // Spin roulette for me
        triggerRouletteSpin(lastPack, "p1");
      }

      // Check if opponent opened count increased
      const oppOpenedCount = opponent?.openedPacks?.length || 0;
      if (oppOpenedCount === session.round && oppOpenedCount > p2Cards.length) {
        const lastPack = opponent.openedPacks[oppOpenedCount - 1];
        // Save opponent cards
        setP2Cards((prev) => [...prev, lastPack.map(mapCardFromApi)]);
        setP2Score(opponent.score);
      }
    });

    socket.on("player_disconnected", (data: { userName: string }) => {
      alert(`L'adversaire ${data.userName} s'est déconnecté. Retour au salon.`);
      setMode("select");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [mode, socketBaseUrl, isSpinning, p1Cards.length, p2Cards.length, onlineOpponent]);

  // Map API card object to local roulette CardItem format
  const mapCardFromApi = (card: any): CardItem => {
    let price = 1.0;
    const cm = card.pricing?.cardmarket?.trend || card.pricing?.cardmarket?.avg;
    if (cm) price = parseFloat(cm);
    else if (card.pricing?.tcgplayer?.normal?.marketPrice) price = parseFloat(card.pricing.tcgplayer.normal.marketPrice);
    
    return {
      id: card.id,
      name: card.name || "Pokémon",
      rarity: card.rarity || "Common",
      image: getCardImage(card),
      price,
    };
  };

  // --- ROULETTE / SPIN LOGIC ---
  const triggerRouletteSpin = async (packCards: any[], target: "p1" | "p2") => {
    setIsSpinning(true);
    
    // Pick the most valuable card in the pack as the "winner" card that shows up in the middle of roulette
    const localPack = packCards.map(mapCardFromApi);
    const sortedPack = [...localPack].sort((a, b) => b.price - a.price);
    const winningCard = sortedPack[0]!; // best card

    // Generate 35 card items for the spin line
    const spinLine: CardItem[] = [];
    const setsCards = await fetchPoolCards(34);
    
    for (let i = 0; i < 35; i++) {
      if (i === 24) {
        spinLine.push(winningCard);
      } else {
        spinLine.push(setsCards[i % setsCards.length] || winningCard);
      }
    }

    setRouletteCards(spinLine);
    setSpinWinnerIndex(24);

    // Wait 4 seconds for roulette animation
    setTimeout(() => {
      setIsSpinning(false);
      
      if (target === "p1") {
        setP1Cards((prev) => [...prev, localPack]);
        if (mode === "online" && onlineSession) {
          setP1Score(onlineSession.players.find((p: any) => p.userId !== onlineOpponent?.id).score);
        } else {
          const packTotal = localPack.reduce((sum, c) => sum + c.price, 0);
          setP1Score((prev) => parseFloat((prev + packTotal).toFixed(2)));
          
          if (mode === "solo") {
            // trigger bot turn automatically
            setTimeout(() => triggerBotTurn(), 1000);
          } else if (mode === "local") {
            setLocalPvpTurn("p2");
          }
        }
      } else {
        setP2Cards((prev) => [...prev, localPack]);
        const packTotal = localPack.reduce((sum, c) => sum + c.price, 0);
        setP2Score((prev) => parseFloat((prev + packTotal).toFixed(2)));
        setLocalPvpTurn("reveal");
      }
    }, 4500);
  };

  // Fetch cards pool for roulette background
  const fetchPoolCards = async (count: number): Promise<CardItem[]> => {
    try {
      const qb = await pokemonCardService.getPaginated({
        setId: selectedSet !== "all" ? selectedSet : undefined,
        limit: count,
      });
      if (qb.data && qb.data.length > 0) {
        return qb.data.map(mapCardFromApi);
      }
    } catch {}
    
    // mock list
    return Array.from({ length: count }, (_, i) => ({
      id: `mock_${i}`,
      name: "Cartes",
      image: "https://images.pokemontcg.io/cel25/4_hires.png",
      price: 0.5,
    }));
  };

  // --- BOT ACTIONS (SOLO MODE) ---
  const triggerBotTurn = async () => {
    setIsSpinning(true);
    // Draw bot booster pack
    const botPack = await fetchPackCards();
    triggerRouletteSpin(botPack, "p2");
  };

  const fetchPackCards = async (): Promise<any[]> => {
    const list: any[] = [];
    const qbSetId = selectedSet !== "all" ? selectedSet : undefined;
    for (let i = 0; i < 6; i++) {
      const card = await pokemonCardService.getRandom(undefined, undefined, qbSetId);
      list.push(card);
    }
    return list;
  };

  // --- GAME MODES TRIGGERS ---
  const startSoloGame = () => {
    setP1Cards([]);
    setP2Cards([]);
    setP1Score(0);
    setP2Score(0);
    setCurrentRound(1);
    setLocalPvpTurn("p1");
    setMode("solo");
  };

  const startLocalPvpGame = () => {
    setP1Cards([]);
    setP2Cards([]);
    setP1Score(0);
    setP2Score(0);
    setCurrentRound(1);
    setLocalPvpTurn("p1");
    setMode("local");
  };

  const handleOpenBoosterLocal = async () => {
    if (isSpinning) return;
    const pack = await fetchPackCards();
    triggerRouletteSpin(pack, localPvpTurn === "p1" ? "p1" : "p2");
  };

  const handleNextRoundLocal = () => {
    if (currentRound < boosterCount) {
      setCurrentRound((prev) => prev + 1);
      setLocalPvpTurn("p1");
    } else {
      setLocalPvpTurn("reveal"); // finished
    }
  };

  // --- ONLINE PVP TRIGGERS ---
  const joinOnlineQueue = () => {
    if (!socketRef.current) return;
    setOnlineQueueStatus("queued");
    socketRef.current.emit("minigame_join_queue", {
      gameType: "case_opening",
      params: { setId: selectedSet !== "all" ? selectedSet : undefined, roundCount: boosterCount },
    });
  };

  const leaveOnlineQueue = () => {
    if (!socketRef.current) return;
    socketRef.current.emit("minigame_leave_queue");
    setOnlineQueueStatus("idle");
  };

  const handleOpenBoosterOnline = () => {
    if (!socketRef.current || !onlineSessionId || isSpinning) return;
    socketRef.current.emit("minigame_open_pack", { sessionId: onlineSessionId });
  };

  const handleOnlineReady = () => {
    if (!socketRef.current || !onlineSessionId) return;
    socketRef.current.emit("minigame_ready", { sessionId: onlineSessionId });
  };

  const currentWinningCard = useMemo(() => {
    if (rouletteCards.length === 0) return null;
    return rouletteCards[spinWinnerIndex];
  }, [rouletteCards, spinWinnerIndex]);

  return (
    <PageWrapper maxWidth="xl" gradient="secondary" className="space-y-6">
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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Package className="h-4 w-4 text-primary" />
            </div>
            <div>
              <H1 className="text-lg! sm:text-xl!">Duel Case Opening</H1>
              <p className="text-[10px] text-muted-foreground">Ouvre des boosters Pokémon et remporte la cagnotte</p>
            </div>
          </div>

          {/* Scores view during active play */}
          {(mode === "solo" || mode === "local" || (mode === "online" && onlineSession)) && (
            <div className="flex gap-2">
              <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-semibold">
                {mode === "local" ? "P1" : "Moi"}: {p1Score.toFixed(2)} €
              </Badge>
              <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-semibold">
                {mode === "solo" ? "PikaBot" : mode === "local" ? "P2" : onlineOpponent?.name || "Adversaire"}: {p2Score.toFixed(2)} €
              </Badge>
            </div>
          )}
        </div>

        {/* SELECT MODE & OPTIONS */}
        {mode === "select" && (
          <div className="space-y-6 pt-4 max-w-3xl mx-auto">
            {/* Options configuration */}
            <Card className="tcg-surface bg-card shadow-sm">
              <CardContent className="p-6 space-y-4">
                <H3 className="font-heading text-lg font-bold text-foreground">Options du duel</H3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">Booster / Set Pokémon</label>
                    <Select value={selectedSet} onValueChange={setSelectedSet}>
                      <SelectTrigger className="bg-background font-semibold">
                        <SelectValue placeholder="Aléatoire (Toutes les cartes)" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover font-semibold">
                        <SelectItem value="all">Aléatoire (Tout)</SelectItem>
                        {sets.map((set) => (
                          <SelectItem key={set.id} value={set.id}>{set.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">Nombre de boosters</label>
                    <Select value={boosterCount.toString()} onValueChange={(val) => setBoosterCount(parseInt(val))}>
                      <SelectTrigger className="bg-background font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover font-semibold">
                        <SelectItem value="1">1 booster</SelectItem>
                        <SelectItem value="3">3 boosters</SelectItem>
                        <SelectItem value="5">5 boosters</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Game Modes selector */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="tcg-surface tcg-surface--hover transition-all">
                <CardContent className="p-6 flex flex-col items-center text-center justify-between h-full gap-4">
                  <div className="p-3 rounded-lg bg-amber-500/10 text-amber-500">
                    <Dice5 className="h-10 w-10" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold mb-1">Solo</h3>
                    <p className="text-xs text-muted-foreground">
                      Ouvre des boosters en duel contre l'ordinateur PikaBot. La plus grande valeur de cartes cumulée gagne.
                    </p>
                  </div>
                  <Button onClick={startSoloGame} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs h-10">
                    Duel Ordinateur
                  </Button>
                </CardContent>
              </Card>

              <Card className="tcg-surface tcg-surface--hover transition-all">
                <CardContent className="p-6 flex flex-col items-center text-center justify-between h-full gap-4">
                  <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500">
                    <Users className="h-10 w-10" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold mb-1">PVP Local</h3>
                    <p className="text-xs text-muted-foreground">
                      Défie ton ami à tour de rôle sur le même écran. Chacun son booster, le suspense est garanti.
                    </p>
                  </div>
                  <Button onClick={startLocalPvpGame} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold text-xs h-10">
                    Duel Local
                  </Button>
                </CardContent>
              </Card>

              <Card className="tcg-surface tcg-surface--hover transition-all">
                <CardContent className="p-6 flex flex-col items-center text-center justify-between h-full gap-4">
                  <div className="p-3 rounded-lg bg-purple-500/10 text-purple-500">
                    <Globe className="h-10 w-10" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold mb-1">PVP En Ligne</h3>
                    <p className="text-xs text-muted-foreground">
                      Rejoins le matchmaking global et affronte la communauté en direct avec animations d'ouverture synchrones.
                    </p>
                  </div>
                  {onlineQueueStatus === "idle" ? (
                    <Button onClick={joinOnlineQueue} className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold text-xs h-10">
                      Chercher Match
                    </Button>
                  ) : onlineQueueStatus === "queued" ? (
                    <Button onClick={leaveOnlineQueue} variant="outline" className="w-full text-red-500 font-semibold text-xs h-10 flex items-center justify-center gap-2">
                      <Loader2 className="animate-spin h-3.5 w-3.5" /> Annuler Queue
                    </Button>
                  ) : (
                    <Button disabled className="w-full bg-purple-300 text-white font-semibold text-xs h-10">
                      Match trouvé !
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ACTIVE DUEL SCREEN: SOLO OR LOCAL */}
        {(mode === "solo" || mode === "local") && (
          <div className="space-y-8 pt-4">
            {/* ROULETTE CAROUSEL AREA */}
            <Card className="bg-zinc-950/80 dark:bg-zinc-950/60 backdrop-blur-md border border-border rounded-xl shadow-lg overflow-hidden relative p-4 h-52 flex items-center">
              {/* Vertical line indicator in the center */}
              <div className="absolute top-0 bottom-0 left-1/2 -ml-0.5 w-1 bg-gradient-to-b from-primary to-primary/60 z-30" />
              
              <div className="w-full overflow-hidden relative">
                {isSpinning && rouletteCards.length > 0 ? (
                  <motion.div
                    className="flex gap-4 w-max"
                    initial={{ x: 0 }}
                    animate={{ x: `calc(-24 * 126px + 50% - 63px)` }}
                    transition={{
                      duration: 4,
                      ease: [0.1, 1, 0.1, 1], // easeOutQuint (CSGO spin feel)
                    }}
                  >
                    {rouletteCards.map((c, idx) => (
                      <div
                        key={idx}
                        className="w-28 h-40 border border-border/30 bg-zinc-800/80 shadow-sm rounded-lg shrink-0 flex items-center justify-center relative overflow-hidden"
                      >
                        <Image src={c.image} alt={c.name} fill className="object-contain" />
                      </div>
                    ))}
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 text-zinc-400 py-10 w-full">
                    {p1Cards.length === p2Cards.length ? (
                      p1Cards.length < boosterCount ? (
                        <>
                          <Package className="h-10 w-10 text-primary animate-bounce" />
                          <p className="text-sm font-semibold tracking-wider text-white">
                            Prêt pour ouvrir le booster de la manche {currentRound} !
                          </p>
                        </>
                      ) : (
                        <div className="text-center space-y-3 py-6">
                          <Award className="h-12 w-12 text-primary mx-auto" />
                          <h3 className="text-xl font-bold text-white">Duel Terminé !</h3>
                          <p className="text-sm font-bold text-zinc-300">
                            {p1Score === p2Score ? (
                              <span className="text-amber-500">Égalité parfaite ! 🤝</span>
                            ) : p1Score > p2Score ? (
                              <span className="text-green-500">Victoire de Joueur 1 ! 🔵</span>
                            ) : (
                              <span className="text-red-500">Victoire de {mode === "solo" ? "PikaBot" : "Joueur 2"} ! 🔴</span>
                            )}
                          </p>
                          <div className="flex justify-center gap-4">
                            <Button onClick={() => setMode("select")} variant="outline" className="text-foreground">
                              Retour
                            </Button>
                            <Button onClick={mode === "solo" ? startSoloGame : startLocalPvpGame} className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
                              Rejouer
                            </Button>
                          </div>
                        </div>
                      )
                    ) : (
                      <>
                        <Loader2 className="animate-spin h-8 w-8 text-primary" />
                        <p className="text-sm font-semibold text-white">
                          En attente de l'ouverture du booster adverse...
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* BUTTON ACTION CONTAINER */}
            {p1Cards.length === p2Cards.length && p1Cards.length < boosterCount && !isSpinning && (
              <div className="flex justify-center">
                <Button
                  onClick={handleOpenBoosterLocal}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-lg h-14 px-10 shadow-md hover:shadow-lg transition-all"
                >
                  <Play className="h-5 w-5 mr-2 fill-current" />
                  Ouvrir Booster {currentRound}
                </Button>
              </div>
            )}

            {/* TWO SIDES GRID BOARD (CARDS OPENED) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              {/* Player 1 Area */}
              <div className="space-y-4">
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between text-foreground">
                  <h4 className="font-heading font-semibold text-blue-600 dark:text-blue-400">Joueur 1</h4>
                  <span className="font-mono font-semibold text-lg">{p1Score.toFixed(2)} €</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {p1Cards.flatMap((pack) => pack).map((c, idx) => (
                    <Card key={idx} className="border border-border bg-card shadow-sm overflow-hidden relative rounded-lg">
                      <CardContent className="p-2 text-center space-y-1 relative">
                        <div className="relative aspect-[5/7] w-full">
                          <Image src={c.image} alt={c.name} fill className="object-contain" />
                        </div>
                        <p className="text-[10px] font-semibold text-foreground truncate">{c.name}</p>
                        <Badge className="bg-zinc-800 text-white font-mono text-[9px] border px-1.5 py-0.5">{c.price.toFixed(2)} €</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Player 2 Area (Bot / Friend) */}
              <div className="space-y-4">
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between text-foreground">
                  <h4 className="font-heading font-semibold text-red-600 dark:text-red-400">
                    {mode === "solo" ? "PikaBot" : "Joueur 2"}
                  </h4>
                  <span className="font-mono font-semibold text-lg">{p2Score.toFixed(2)} €</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {p2Cards.flatMap((pack) => pack).map((c, idx) => (
                    <Card key={idx} className="border border-border bg-card shadow-sm overflow-hidden relative rounded-lg">
                      <CardContent className="p-2 text-center space-y-1 relative">
                        <div className="relative aspect-[5/7] w-full">
                          <Image src={c.image} alt={c.name} fill className="object-contain" />
                        </div>
                        <p className="text-[10px] font-semibold text-foreground truncate">{c.name}</p>
                        <Badge className="bg-zinc-800 text-white font-mono text-[9px] border px-1.5 py-0.5">{c.price.toFixed(2)} €</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ONLINE PVP MODE GAMEPLAY */}
        {mode === "online" && onlineSession && (
          <div className="space-y-8 pt-4">
            {/* LOBBY / PREPARING TO PLAY */}
            {onlineSession.state === "waiting" && (
              <div className="text-center py-10 tcg-surface bg-card shadow-sm">
                <Loader2 className="animate-spin h-8 w-8 mx-auto text-primary mb-3" />
                <h3 className="font-heading text-lg font-bold">Synchronisation en cours...</h3>
                <p className="text-xs text-muted-foreground mb-4">Préparez-vous à ouvrir les boosters ! Cliquez sur Prêt.</p>
                <div className="flex justify-center gap-4">
                  {onlineSession.players.map((p: any) => {
                    const isMe = p.userId !== onlineOpponent?.id;
                    return (
                      <div key={p.userId} className="flex flex-col items-center border border-border p-3 bg-muted rounded-lg w-36">
                        <span className="text-xs font-semibold text-foreground">{isMe ? "Moi" : p.userName}</span>
                        {p.ready ? (
                          <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 mt-2">Prêt</Badge>
                        ) : (
                          <Badge variant="outline" className="border border-border mt-2">Pas prêt</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6">
                  {onlineSession.players.find((p: any) => p.userId !== onlineOpponent?.id)?.ready ? (
                    <Button disabled className="bg-muted text-muted-foreground font-semibold">
                      En attente de l'adversaire...
                    </Button>
                  ) : (
                    <Button onClick={handleOnlineReady} className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
                      Je suis Prêt !
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* PLAYING ROUND */}
            {onlineSession.state === "playing" && (
              <>
                {/* ROULETTE WINDOW */}
                <Card className="bg-zinc-950/80 dark:bg-zinc-950/60 backdrop-blur-md border border-border rounded-xl shadow-lg overflow-hidden relative p-4 h-52 flex items-center">
                  <div className="absolute top-0 bottom-0 left-1/2 -ml-0.5 w-1 bg-gradient-to-b from-primary to-primary/60 z-30" />
                  
                  <div className="w-full overflow-hidden relative">
                    {isSpinning && rouletteCards.length > 0 ? (
                      <motion.div
                        className="flex gap-4 w-max"
                        initial={{ x: 0 }}
                        animate={{ x: `calc(-24 * 126px + 50% - 63px)` }}
                        transition={{
                          duration: 4,
                          ease: [0.1, 1, 0.1, 1],
                        }}
                      >
                        {rouletteCards.map((c, idx) => (
                          <div
                            key={idx}
                            className="w-28 h-40 border border-border/30 bg-zinc-800/80 shadow-sm rounded-lg shrink-0 flex items-center justify-center relative overflow-hidden"
                          >
                            <Image src={c.image} alt={c.name} fill className="object-contain" />
                          </div>
                        ))}
                      </motion.div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 text-zinc-400 py-10 w-full">
                        {onlineSession.players.find((p: any) => p.userId !== onlineOpponent?.id)?.openedPack ? (
                          <>
                            <Loader2 className="animate-spin h-6 w-6 text-primary" />
                            <p className="text-sm font-semibold text-white">
                              En attente que l'adversaire ouvre son booster...
                            </p>
                          </>
                        ) : (
                          <>
                            <Package className="h-10 w-10 text-primary animate-bounce" />
                            <p className="text-sm font-semibold tracking-wider text-white">
                              Manche {onlineSession.round} : C'est le moment d'ouvrir !
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </Card>

                {/* SPIN BUTTON */}
                {!onlineSession.players.find((p: any) => p.userId !== onlineOpponent?.id)?.openedPack && !isSpinning && (
                  <div className="flex justify-center">
                    <Button
                      onClick={handleOpenBoosterOnline}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-lg h-14 px-10 shadow-md hover:shadow-lg transition-all"
                    >
                      <Play className="h-5 w-5 mr-2 fill-current" />
                      Ouvrir Booster {onlineSession.round}
                    </Button>
                  </div>
                )}

                {/* TWO SIDES GRID BOARD (CARDS OPENED) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                  {/* Player 1 Area (Me) */}
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between text-foreground">
                      <h4 className="font-heading font-semibold text-blue-600 dark:text-blue-400">Moi</h4>
                      <span className="font-mono font-semibold text-lg">{p1Score.toFixed(2)} €</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {p1Cards.flatMap((pack) => pack).map((c, idx) => (
                        <Card key={idx} className="border border-border bg-card shadow-sm overflow-hidden relative rounded-lg">
                          <CardContent className="p-2 text-center space-y-1 relative">
                            <div className="relative aspect-[5/7] w-full">
                              <Image src={c.image} alt={c.name} fill className="object-contain" />
                            </div>
                            <p className="text-[10px] font-semibold text-foreground truncate">{c.name}</p>
                            <Badge className="bg-zinc-800 text-white font-mono text-[9px] border px-1.5 py-0.5">{c.price.toFixed(2)} €</Badge>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Player 2 Area (Opponent) */}
                  <div className="space-y-4">
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between text-foreground">
                      <h4 className="font-heading font-semibold text-red-600 dark:text-red-400">{onlineOpponent?.name || "Adversaire"}</h4>
                      <span className="font-mono font-semibold text-lg">{p2Score.toFixed(2)} €</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {p2Cards.flatMap((pack) => pack).map((c, idx) => (
                        <Card key={idx} className="border border-border bg-card shadow-sm overflow-hidden relative rounded-lg">
                          <CardContent className="p-2 text-center space-y-1 relative">
                            <div className="relative aspect-[5/7] w-full">
                              <Image src={c.image} alt={c.name} fill className="object-contain" />
                            </div>
                            <p className="text-[10px] font-semibold text-foreground truncate">{c.name}</p>
                            <Badge className="bg-zinc-800 text-white font-mono text-[9px] border px-1.5 py-0.5">{c.price.toFixed(2)} €</Badge>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>

                {/* If both players opened their packs, allow moving to next round */}
                {onlineSession.players.every((p: any) => p.openedPack) && !isSpinning && (
                  <div className="text-center pt-6">
                    {onlineSession.players.find((p: any) => p.userId !== onlineOpponent?.id)?.ready ? (
                      <Button disabled className="bg-muted text-muted-foreground font-semibold">
                        En attente de l'adversaire...
                      </Button>
                    ) : (
                      <Button onClick={handleOnlineReady} className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-12 px-8">
                        {onlineSession.round < onlineSession.maxRounds ? "Prêt pour la manche suivante ➡️" : "Voir les résultats 🏁"}
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}

            {/* GAME FINISHED SCREEN */}
            {onlineSession.state === "finished" && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="tcg-surface p-8 text-center shadow-md max-w-xl mx-auto bg-card"
              >
                <Award className="h-16 w-16 mx-auto text-primary mb-4" />
                <h2 className="text-2xl font-bold tracking-tight mb-2">Match Terminé !</h2>

                <div className="space-y-4 mb-6">
                  <p className="text-sm font-semibold">Valeurs finales tirées :</p>
                  <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                    {onlineSession.players.map((p: any) => {
                      const isMe = p.userId !== onlineOpponent?.id;
                      return (
                        <div key={p.userId} className={`border border-border rounded-lg p-3 ${isMe ? "bg-primary/10" : "bg-purple-500/10"}`}>
                          <p className="text-xs font-semibold text-foreground">{isMe ? "Moi" : p.userName}</p>
                          <p className="text-2xl font-bold text-foreground">{p.score.toFixed(2)} €</p>
                        </div>
                      );
                    })}
                  </div>

                  <h3 className="text-lg font-bold mt-4">
                    {(() => {
                      const me = onlineSession.players.find((p: any) => p.userId !== onlineOpponent?.id);
                      const opp = onlineSession.players.find((p: any) => p.userId === onlineOpponent?.id);
                      if (me.score === opp.score) return <span className="text-amber-500">Égalité parfaite ! 🤝</span>;
                      if (me.score > opp.score) return <span className="text-green-500">Victoire ! Tu es plus chanceux que {opp.userName} ! 🎉</span>;
                      return <span className="text-red-500">Défaite ! {opp.userName} a tiré de meilleures cartes. 😢</span>;
                    })()}
                  </h3>
                </div>

                <div className="flex justify-center gap-4">
                  <Button onClick={() => setMode("select")} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
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

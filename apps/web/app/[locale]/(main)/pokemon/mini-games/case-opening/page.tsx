"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  ChevronRight,
  Dice5,
  Globe,
  Loader2,
  Package,
  Play,
  RotateCcw,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import { PageWrapper } from "@/components/Layout/PageWrapper";
import { H1, H3 } from "@/components/Shared/Titles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { pokemonCardService } from "@/services/pokemonCard.service";
import type { PokemonSetType } from "@/types/cardPokemon";
import { API_BASE_URL } from "@/utils/fetch";
import { getCardImage } from "@/utils/images";

// ---------------------------------------------------------------------------
// Constantes de la roulette
// ---------------------------------------------------------------------------
const CARD_W = 112; // largeur d'une carte (w-28)
const CARD_GAP = 16; // gap-4
const STRIDE = CARD_W + CARD_GAP; // pas réel entre deux cartes = 128px
const WINNER_INDEX = 34; // position de la carte gagnante dans le ruban
const TRAIL = 8; // cartes après la gagnante (évite un vide à droite)
const SPIN_DURATION = 2.3; // secondes par carte
const PACK_SIZE = 6; // cartes par booster
const PLACEHOLDER = "/images/carte-pokemon-dos.jpg";

type Side = "p1" | "p2";
type Mode = "select" | "solo" | "local" | "online";
type Stage = "idle" | "spinning" | "handoff" | "finished";

interface CardItem {
  uid: string;
  id: string;
  name: string;
  rarity?: string;
  image: string;
  price: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
let uidCounter = 0;
const nextUid = () => `c${(uidCounter += 1)}`;

/** Valeur marchande d'une carte (même logique que le backend). */
function cardValue(card: any): number {
  const cm = card?.pricing?.cardmarket;
  if (cm) {
    if (cm.trend != null) return Number(cm.trend);
    if (cm.avg != null) return Number(cm.avg);
    if (cm.low != null) return Number(cm.low);
  }
  const tcg = card?.pricing?.tcgplayer;
  if (tcg) {
    for (const v of [tcg.normal, tcg.holofoil, tcg.reverseHolofoil]) {
      if (v?.marketPrice != null) return Number(v.marketPrice);
      if (v?.midPrice != null) return Number(v.midPrice);
    }
  }
  return 0.5;
}

function mapCard(card: any): CardItem {
  return {
    uid: nextUid(),
    id: String(card?.id ?? "unknown"),
    name: card?.name ?? "Carte Pokémon",
    rarity: card?.rarity,
    image: getCardImage(card),
    price: Number(cardValue(card).toFixed(2)),
  };
}

const fallbackPool = (): CardItem[] =>
  Array.from({ length: 12 }, () => ({
    uid: nextUid(),
    id: "fallback",
    name: "Carte Pokémon",
    image: PLACEHOLDER,
    price: 0.5,
  }));

const pickRandom = <T,>(arr: T[]): T =>
  arr[Math.floor(Math.random() * arr.length)]!;

// ---------------------------------------------------------------------------
// <CardImg> : <img> natif, fallback placeholder onError (aucune dépendance à
// remotePatterns de next/image — les URLs mock/legacy ne cassent plus le jeu).
// ---------------------------------------------------------------------------
function CardImg({
  card,
  className,
  eager,
}: {
  card: CardItem;
  className?: string;
  eager?: boolean;
}) {
  const [src, setSrc] = useState(card.image || PLACEHOLDER);
  useEffect(() => {
    setSrc(card.image || PLACEHOLDER);
  }, [card.image]);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={card.name}
      loading={eager ? "eager" : "lazy"}
      draggable={false}
      onError={() => {
        if (src !== PLACEHOLDER) setSrc(PLACEHOLDER);
      }}
      className={className}
    />
  );
}

// ---------------------------------------------------------------------------
// <CardRoulette> : un mini-spin qui s'arrête, centré, sur `target`.
// Le ruban est remonté à chaque `spinId` (key => remount => rejoue l'anim).
// La translation est calculée en pixels réels à partir de la largeur mesurée
// du conteneur — plus de `50%` fantôme ni de largeur de carte erronée.
// ---------------------------------------------------------------------------
function CardRoulette({
  target,
  pool,
  spinId,
  onComplete,
}: {
  target: CardItem | null;
  pool: CardItem[];
  spinId: number;
  onComplete: () => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [anim, setAnim] = useState<{
    id: number;
    strip: CardItem[];
    x: number;
  } | null>(null);

  useEffect(() => {
    if (!target || spinId === 0) return;

    const src = pool.length > 0 ? pool : [target];
    const strip: CardItem[] = [];
    for (let i = 0; i < WINNER_INDEX + TRAIL + 1; i += 1) {
      strip.push({ ...pickRandom(src), uid: nextUid() });
    }
    strip[WINNER_INDEX] = { ...target, uid: nextUid() };

    // Attendre un frame pour que le conteneur soit mesurable.
    const raf = requestAnimationFrame(() => {
      const vw = viewportRef.current?.offsetWidth ?? 640;
      // Jitter aléatoire pour ne pas toujours s'arrêter pile au centre.
      const jitter = (Math.random() - 0.5) * (CARD_W - 34);
      const winnerCenter = WINNER_INDEX * STRIDE + CARD_W / 2;
      const x = vw / 2 - winnerCenter + jitter;
      setAnim({ id: spinId, strip, x });
    });

    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinId]);

  return (
    <div ref={viewportRef} className="relative h-full w-full overflow-hidden">
      {/* Indicateur central */}
      <div className="pointer-events-none absolute inset-y-0 left-1/2 z-30 w-1 -translate-x-1/2 bg-linear-to-b from-primary/0 via-primary to-primary/0" />
      <div className="pointer-events-none absolute left-1/2 top-0 z-30 h-0 w-0 -translate-x-1/2 border-x-[7px] border-t-[9px] border-x-transparent border-t-primary" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 z-30 h-0 w-0 -translate-x-1/2 border-x-[7px] border-b-[9px] border-x-transparent border-b-primary" />

      {anim && anim.id === spinId ? (
        <motion.div
          key={anim.id}
          className="flex h-full w-max items-center gap-4"
          initial={{ x: 0 }}
          animate={{ x: anim.x }}
          transition={{ duration: SPIN_DURATION, ease: [0.16, 0.84, 0.24, 1] }}
          onAnimationComplete={() => onCompleteRef.current()}
        >
          {anim.strip.map((c) => (
            <div
              key={c.uid}
              className="relative flex h-40 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-zinc-800/60"
            >
              <CardImg
                card={c}
                eager
                className="h-full w-full object-contain"
              />
            </div>
          ))}
        </motion.div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// <PlayerBoard> : les boosters ouverts d'un joueur.
// ---------------------------------------------------------------------------
function PlayerBoard({
  name,
  score,
  packs,
  accent,
}: {
  name: string;
  score: number;
  packs: CardItem[][];
  accent: "blue" | "red";
}) {
  const header =
    accent === "blue"
      ? "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
      : "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400";
  const cards = packs.flat();
  return (
    <div className="space-y-4">
      <div
        className={`flex items-center justify-between rounded-xl border p-3 ${header}`}
      >
        <h4 className="font-heading font-semibold">{name}</h4>
        <span className="font-mono text-lg font-semibold text-foreground">
          {score.toFixed(2)} €
        </span>
      </div>
      {cards.length === 0 ? (
        <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
          Aucune carte pour l'instant
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {cards.map((c) => (
            <Card
              key={c.uid}
              className="relative overflow-hidden rounded-lg border border-border bg-card shadow-sm"
            >
              <CardContent className="relative space-y-1 p-2 text-center">
                <div className="relative aspect-5/7 w-full overflow-hidden rounded">
                  <CardImg card={c} className="h-full w-full object-contain" />
                </div>
                <p className="truncate text-[10px] font-semibold text-foreground">
                  {c.name}
                </p>
                <Badge className="border bg-zinc-800 px-1.5 py-0.5 font-mono text-[9px] text-white">
                  {c.price.toFixed(2)} €
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function CaseOpeningPage() {
  const [mode, setMode] = useState<Mode>("select");
  const [sets, setSets] = useState<PokemonSetType[]>([]);
  const [selectedSet, setSelectedSet] = useState("all");
  const [boosterCount, setBoosterCount] = useState(3);

  // Pool de cartes (fond de roulette + tirage solo/local)
  const poolRef = useRef<CardItem[]>([]);
  const [poolReady, setPoolReady] = useState(false);

  // Moteur de reveal (partagé solo / local / online)
  const [spin, setSpin] = useState<{
    id: number;
    card: CardItem;
    queue: CardItem[];
    side: Side;
  } | null>(null);
  const spinRef = useRef(spin);
  spinRef.current = spin;
  const spinIdRef = useRef(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const isSpinningRef = useRef(false);
  const [currentReveal, setCurrentReveal] = useState<CardItem[]>([]);
  const currentRevealRef = useRef<CardItem[]>([]);

  // Plateaux
  const [p1Packs, setP1Packs] = useState<CardItem[][]>([]);
  const [p2Packs, setP2Packs] = useState<CardItem[][]>([]);
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);

  // Flux solo / local
  const [stage, setStage] = useState<Stage>("idle");
  const [activePlayer, setActivePlayer] = useState<Side>("p1");
  const [round, setRound] = useState(1);

  // Online
  const socketRef = useRef<Socket | null>(null);
  const [onlineConnected, setOnlineConnected] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [queueStatus, setQueueStatus] = useState<"idle" | "queued" | "matched">(
    "idle",
  );
  const [opponent, setOpponent] = useState<{ id: number; name: string } | null>(
    null,
  );
  const [selfId, setSelfId] = useState<number | null>(null);
  const [onlineSession, setOnlineSession] = useState<any>(null);
  const sessionIdRef = useRef<string | null>(null);
  const selfIdRef = useRef<number | null>(null);
  const onlineSessionRef = useRef<any>(null);
  const myRevealedRef = useRef(0);
  const oppRevealedRef = useRef(0);

  // Refs miroir (lues dans les callbacks stables)
  const modeRef = useRef(mode);
  const roundRef = useRef(round);
  const boosterCountRef = useRef(boosterCount);
  const activePlayerRef = useRef(activePlayer);
  const selectedSetRef = useRef(selectedSet);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    roundRef.current = round;
  }, [round]);
  useEffect(() => {
    boosterCountRef.current = boosterCount;
  }, [boosterCount]);
  useEffect(() => {
    activePlayerRef.current = activePlayer;
  }, [activePlayer]);
  useEffect(() => {
    selectedSetRef.current = selectedSet;
  }, [selectedSet]);
  useEffect(() => {
    selfIdRef.current = selfId;
  }, [selfId]);
  useEffect(() => {
    onlineSessionRef.current = onlineSession;
  }, [onlineSession]);

  const socketBaseUrl = useMemo(() => {
    if (API_BASE_URL.startsWith("http")) return API_BASE_URL;
    if (typeof window === "undefined") return "";
    return new URL(API_BASE_URL, window.location.origin).toString();
  }, []);

  // Récupération des sets
  useEffect(() => {
    pokemonCardService
      .getAllSets(50)
      .then(setSets)
      .catch(() => setSets([]));
  }, []);

  // -------------------------------------------------------------------------
  // Pool
  // -------------------------------------------------------------------------
  const loadPool = useCallback(async () => {
    setPoolReady(false);
    try {
      const res = await pokemonCardService.getPaginated({
        setId:
          selectedSetRef.current !== "all" ? selectedSetRef.current : undefined,
        limit: 80,
      });
      const items = (res.data ?? []).map(mapCard);
      poolRef.current = items.length > 0 ? items : fallbackPool();
    } catch {
      poolRef.current = fallbackPool();
    }
    setPoolReady(true);
  }, []);

  const drawPack = useCallback((): CardItem[] => {
    const pool = poolRef.current.length > 0 ? poolRef.current : fallbackPool();
    return Array.from({ length: PACK_SIZE }, () => ({
      ...pickRandom(pool),
      uid: nextUid(),
    }));
  }, []);

  const resetBoards = useCallback(() => {
    setP1Packs([]);
    setP2Packs([]);
    setP1Score(0);
    setP2Score(0);
    setCurrentReveal([]);
    currentRevealRef.current = [];
    setSpin(null);
    setIsSpinning(false);
    isSpinningRef.current = false;
  }, []);

  // -------------------------------------------------------------------------
  // Moteur de reveal carte-par-carte
  // -------------------------------------------------------------------------
  const commitPack = useCallback((side: Side, cards: CardItem[]) => {
    const value = Number(cards.reduce((s, c) => s + c.price, 0).toFixed(2));
    if (side === "p1") {
      setP1Packs((prev) => [...prev, cards]);
      if (modeRef.current !== "online") {
        setP1Score((s) => Number((s + value).toFixed(2)));
      }
    } else {
      setP2Packs((prev) => [...prev, cards]);
      if (modeRef.current !== "online") {
        setP2Score((s) => Number((s + value).toFixed(2)));
      }
    }
  }, []);

  // Enchaînement après un booster complet (dépend du mode).
  const onBoosterComplete = useCallback(
    (side: Side, cards: CardItem[]) => {
      commitPack(side, cards);
      setCurrentReveal([]);
      currentRevealRef.current = [];

      const m = modeRef.current;

      if (m === "online") {
        // Score officiel = celui du backend.
        const s = onlineSessionRef.current;
        const me = s?.players?.find((p: any) => p.userId === selfIdRef.current);
        if (me) setP1Score(me.score);
        myRevealedRef.current += 1;
        return;
      }

      if (m === "solo") {
        if (side === "p1") {
          setActivePlayer("p2");
          window.setTimeout(() => {
            if (modeRef.current !== "solo") return;
            startBoosterReveal(drawPack(), "p2");
          }, 900);
        } else if (roundRef.current < boosterCountRef.current) {
          setRound((r) => r + 1);
          setActivePlayer("p1");
          setStage("idle");
        } else {
          setStage("finished");
        }
        return;
      }

      // local
      if (side === "p1") {
        setActivePlayer("p2");
        setStage("handoff");
      } else if (roundRef.current < boosterCountRef.current) {
        setRound((r) => r + 1);
        setActivePlayer("p1");
        setStage("handoff");
      } else {
        setStage("finished");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [commitPack, drawPack],
  );

  const handleSpinComplete = useCallback(() => {
    const s = spinRef.current;
    if (!s) return;

    const revealed = [...currentRevealRef.current, s.card];
    currentRevealRef.current = revealed;
    setCurrentReveal(revealed);

    if (s.queue.length > 0) {
      const [next, ...rest] = s.queue;
      window.setTimeout(() => {
        spinIdRef.current += 1;
        setSpin({
          id: spinIdRef.current,
          card: next!,
          queue: rest,
          side: s.side,
        });
      }, 500);
    } else {
      isSpinningRef.current = false;
      setIsSpinning(false);
      setSpin(null);
      window.setTimeout(() => onBoosterComplete(s.side, revealed), 500);
    }
  }, [onBoosterComplete]);

  const startBoosterReveal = useCallback((pack: CardItem[], side: Side) => {
    if (pack.length === 0) return;
    currentRevealRef.current = [];
    setCurrentReveal([]);
    isSpinningRef.current = true;
    setIsSpinning(true);
    spinIdRef.current += 1;
    setSpin({
      id: spinIdRef.current,
      card: pack[0]!,
      queue: pack.slice(1),
      side,
    });
  }, []);

  // -------------------------------------------------------------------------
  // Démarrage solo / local
  // -------------------------------------------------------------------------
  const startGame = useCallback(
    async (m: "solo" | "local") => {
      resetBoards();
      setStage("idle");
      setActivePlayer("p1");
      setRound(1);
      setMode(m);
      modeRef.current = m;
      await loadPool();
    },
    [loadPool, resetBoards],
  );

  const openBooster = useCallback(() => {
    if (isSpinningRef.current || !poolReady) return;
    setStage("spinning");
    startBoosterReveal(drawPack(), activePlayerRef.current);
  }, [drawPack, poolReady, startBoosterReveal]);

  const confirmHandoff = useCallback(() => {
    setStage("idle");
  }, []);

  const quitToSelect = useCallback(() => {
    socketRef.current?.emit("minigame_leave_queue");
    setMode("select");
    setQueueStatus("idle");
    setOnlineSession(null);
    onlineSessionRef.current = null;
    resetBoards();
  }, [resetBoards]);

  // -------------------------------------------------------------------------
  // Online : réception d'un état de session
  // -------------------------------------------------------------------------
  const handleOnlineState = useCallback(
    (session: any) => {
      setOnlineSession(session);
      onlineSessionRef.current = session;

      const sid = selfIdRef.current;
      const me = session.players.find((p: any) => p.userId === sid);
      const opp = session.players.find((p: any) => p.userId !== sid);
      if (!me || !opp) return;

      // Booster adverse : commit direct (pas de roulette pour l'adversaire).
      if ((opp.openedPacks?.length ?? 0) > oppRevealedRef.current) {
        const fresh = opp.openedPacks
          .slice(oppRevealedRef.current)
          .map((pk: any[]) => pk.map(mapCard));
        setP2Packs((prev) => [...prev, ...fresh]);
        oppRevealedRef.current = opp.openedPacks.length;
      }
      setP2Score(opp.score);

      // Mon booster : roulette carte-par-carte.
      if (
        !isSpinningRef.current &&
        (me.openedPacks?.length ?? 0) > myRevealedRef.current
      ) {
        const pack = me.openedPacks[myRevealedRef.current].map(mapCard);
        setStage("spinning");
        startBoosterReveal(pack, "p1");
      }
    },
    [startBoosterReveal],
  );

  // Connexion socket : UNE seule fois par passage en mode online.
  useEffect(() => {
    if (mode !== "online" || !socketBaseUrl) return;

    setOnlineError(null);
    const socket = io(`${socketBaseUrl}/mini-game`, {
      transports: ["websocket"],
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => setOnlineConnected(true));
    socket.on("disconnect", () => setOnlineConnected(false));
    socket.on("connect_error", () =>
      setOnlineError(
        "Connexion au serveur impossible. Es-tu bien connecté à ton compte ?",
      ),
    );

    socket.on("minigame_matched", (data: any) => {
      selfIdRef.current = data.selfId ?? null;
      setSelfId(data.selfId ?? null);
      setOpponent({ id: data.opponentId, name: data.opponentName });
      setQueueStatus("matched");
      myRevealedRef.current = 0;
      oppRevealedRef.current = 0;
      resetBoards();
      sessionIdRef.current = data.sessionId;
      loadPool();
      socket.emit("minigame_join_room", { sessionId: data.sessionId });
    });

    socket.on("minigame_state_update", (session: any) =>
      handleOnlineState(session),
    );

    socket.on("player_disconnected", (d: { userName: string }) => {
      setOnlineError(`${d.userName} s'est déconnecté. Match interrompu.`);
      setOnlineSession(null);
      onlineSessionRef.current = null;
      setQueueStatus("idle");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setOnlineConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, socketBaseUrl]);

  const onlineFindMatch = useCallback(() => {
    if (!socketRef.current) return;
    setQueueStatus("queued");
    socketRef.current.emit("minigame_join_queue", {
      gameType: "case_opening",
      params: {
        setId:
          selectedSetRef.current !== "all" ? selectedSetRef.current : undefined,
        roundCount: boosterCountRef.current,
      },
    });
  }, []);

  const onlineCancel = useCallback(() => {
    socketRef.current?.emit("minigame_leave_queue");
    setQueueStatus("idle");
  }, []);

  const onlineReady = useCallback(() => {
    if (sessionIdRef.current) {
      socketRef.current?.emit("minigame_ready", {
        sessionId: sessionIdRef.current,
      });
    }
  }, []);

  const onlineOpen = useCallback(() => {
    if (sessionIdRef.current && !isSpinningRef.current) {
      socketRef.current?.emit("minigame_open_pack", {
        sessionId: sessionIdRef.current,
      });
    }
  }, []);

  // -------------------------------------------------------------------------
  // Rendu
  // -------------------------------------------------------------------------
  const p1Name = mode === "local" ? "Joueur 1" : "Moi";
  const p2Name =
    mode === "solo"
      ? "PikaBot"
      : mode === "local"
        ? "Joueur 2"
        : opponent?.name || "Adversaire";

  const showScores =
    mode === "solo" || mode === "local" || (mode === "online" && onlineSession);

  const activeName =
    activePlayer === "p1" ? p1Name : mode === "solo" ? "PikaBot" : p2Name;

  const me = onlineSession?.players?.find((p: any) => p.userId === selfId);
  const opp = onlineSession?.players?.find((p: any) => p.userId !== selfId);

  return (
    <PageWrapper maxWidth="xl" gradient="secondary" className="space-y-6">
      {/* Header */}
      <div className="tcg-surface flex items-center justify-between bg-card/50 p-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link href="/pokemon/mini-games">
            <Button size="sm" variant="outline" className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Package className="h-4 w-4 text-primary" />
          </div>
          <div>
            <H1 className="text-lg! sm:text-xl!">Duel Case Opening</H1>
            <p className="text-[10px] text-muted-foreground">
              Ouvre des boosters Pokémon et remporte la cagnotte
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showScores && (
            <>
              <Badge className="border border-blue-500/20 bg-blue-500/10 font-semibold text-blue-600 dark:text-blue-400">
                {p1Name}: {p1Score.toFixed(2)} €
              </Badge>
              <Badge className="border border-red-500/20 bg-red-500/10 font-semibold text-red-600 dark:text-red-400">
                {p2Name}: {p2Score.toFixed(2)} €
              </Badge>
            </>
          )}
          {mode !== "select" && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={quitToSelect}
            >
              Quitter
            </Button>
          )}
        </div>
      </div>

      {/* ===================== SELECT ===================== */}
      {mode === "select" && (
        <div className="mx-auto max-w-3xl space-y-6 pt-4">
          <Card className="tcg-surface bg-card shadow-sm">
            <CardContent className="space-y-4 p-6">
              <H3 className="font-heading text-lg font-bold text-foreground">
                Options du duel
              </H3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Booster / Set Pokémon
                  </label>
                  <Select value={selectedSet} onValueChange={setSelectedSet}>
                    <SelectTrigger className="bg-background font-semibold">
                      <SelectValue placeholder="Aléatoire (Toutes les cartes)" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover font-semibold">
                      <SelectItem value="all">Aléatoire (Tout)</SelectItem>
                      {sets.map((set) => (
                        <SelectItem key={set.id} value={set.id}>
                          {set.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Nombre de boosters
                  </label>
                  <Select
                    value={boosterCount.toString()}
                    onValueChange={(v) => setBoosterCount(parseInt(v, 10))}
                  >
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

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Card className="tcg-surface tcg-surface--hover transition-all">
              <CardContent className="flex h-full flex-col items-center justify-between gap-4 p-6 text-center">
                <div className="rounded-lg bg-amber-500/10 p-3 text-amber-500">
                  <Dice5 className="h-10 w-10" />
                </div>
                <div>
                  <h3 className="mb-1 font-heading text-lg font-bold">Solo</h3>
                  <p className="text-xs text-muted-foreground">
                    Ouvre des boosters en duel contre l&apos;ordinateur PikaBot.
                    La plus grande valeur cumulée gagne.
                  </p>
                </div>
                <Button
                  onClick={() => startGame("solo")}
                  className="h-10 w-full bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Duel Ordinateur
                </Button>
              </CardContent>
            </Card>

            <Card className="tcg-surface tcg-surface--hover transition-all">
              <CardContent className="flex h-full flex-col items-center justify-between gap-4 p-6 text-center">
                <div className="rounded-lg bg-blue-500/10 p-3 text-blue-500">
                  <Users className="h-10 w-10" />
                </div>
                <div>
                  <h3 className="mb-1 font-heading text-lg font-bold">
                    PVP Local
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Défie ton ami à tour de rôle sur le même écran. Chacun son
                    booster, le suspense est garanti.
                  </p>
                </div>
                <Button
                  onClick={() => startGame("local")}
                  className="h-10 w-full bg-blue-500 text-xs font-semibold text-white hover:bg-blue-600"
                >
                  Duel Local
                </Button>
              </CardContent>
            </Card>

            <Card className="tcg-surface tcg-surface--hover transition-all">
              <CardContent className="flex h-full flex-col items-center justify-between gap-4 p-6 text-center">
                <div className="rounded-lg bg-purple-500/10 p-3 text-purple-500">
                  <Globe className="h-10 w-10" />
                </div>
                <div>
                  <h3 className="mb-1 font-heading text-lg font-bold">
                    PVP En Ligne
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Rejoins le matchmaking et affronte la communauté en direct
                    avec animations d&apos;ouverture synchrones.
                  </p>
                </div>
                <Button
                  onClick={() => setMode("online")}
                  className="h-10 w-full bg-purple-500 text-xs font-semibold text-white hover:bg-purple-600"
                >
                  Jouer en ligne
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ===================== SOLO / LOCAL ===================== */}
      {(mode === "solo" || mode === "local") && (
        <div className="space-y-8 pt-4">
          {/* Roulette */}
          <Card className="relative flex h-52 items-center overflow-hidden rounded-xl border border-border bg-zinc-950/80 p-4 shadow-lg backdrop-blur-md dark:bg-zinc-950/60">
            {isSpinning && spin ? (
              <CardRoulette
                target={spin.card}
                pool={poolRef.current}
                spinId={spin.id}
                onComplete={handleSpinComplete}
              />
            ) : stage === "finished" ? (
              <FinishedPanel
                p1Score={p1Score}
                p2Score={p2Score}
                loserName={mode === "solo" ? "PikaBot" : "Joueur 2"}
                onReplay={() => startGame(mode)}
                onBack={quitToSelect}
              />
            ) : stage === "handoff" ? (
              <div className="flex w-full flex-col items-center justify-center gap-3 py-6 text-center">
                <Users className="h-10 w-10 text-primary" />
                <p className="text-sm font-semibold text-white">
                  Manche {round} — au tour de{" "}
                  <span className="text-primary">{activeName}</span>
                </p>
                <p className="text-xs text-zinc-400">
                  Passe l&apos;appareil, puis clique quand tu es prêt.
                </p>
                <Button
                  onClick={confirmHandoff}
                  className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  {activeName}, je suis prêt{" "}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex w-full flex-col items-center justify-center gap-2 py-8 text-center">
                <Package className="h-10 w-10 animate-bounce text-primary" />
                <p className="text-sm font-semibold tracking-wide text-white">
                  {activeName} — prêt à ouvrir le booster de la manche {round} !
                </p>
                {!poolReady && (
                  <span className="flex items-center gap-1 text-xs text-zinc-400">
                    <Loader2 className="h-3 w-3 animate-spin" /> Chargement des
                    cartes…
                  </span>
                )}
              </div>
            )}
          </Card>

          {/* Cartes révélées du booster en cours */}
          <RevealTray reveal={currentReveal} active={isSpinning} />

          {/* Bouton d'ouverture */}
          {stage === "idle" && !isSpinning && (
            <div className="flex justify-center">
              <Button
                onClick={openBooster}
                disabled={!poolReady}
                className="h-14 px-10 text-lg font-semibold shadow-md transition-all hover:shadow-lg"
              >
                <Play className="mr-2 h-5 w-5 fill-current" />
                {mode === "local" ? `${activeName} : ` : ""}Ouvrir booster{" "}
                {round}
              </Button>
            </div>
          )}

          {/* Plateaux */}
          <div className="grid grid-cols-1 gap-8 pt-2 md:grid-cols-2">
            <PlayerBoard
              name={mode === "local" ? "Joueur 1" : "Moi"}
              score={p1Score}
              packs={p1Packs}
              accent="blue"
            />
            <PlayerBoard
              name={mode === "solo" ? "PikaBot" : "Joueur 2"}
              score={p2Score}
              packs={p2Packs}
              accent="red"
            />
          </div>
        </div>
      )}

      {/* ===================== ONLINE ===================== */}
      {mode === "online" && (
        <div className="space-y-6 pt-4">
          {/* Lobby / matchmaking */}
          {(!onlineSession || queueStatus !== "matched") && (
            <Card className="tcg-surface mx-auto max-w-xl bg-card text-center shadow-sm">
              <CardContent className="space-y-4 p-8">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
                  <Globe className="h-8 w-8" />
                </div>
                <H3 className="font-heading text-lg font-bold">
                  Matchmaking en ligne
                </H3>

                {onlineError ? (
                  <p className="text-sm font-semibold text-red-500">
                    {onlineError}
                  </p>
                ) : !onlineConnected ? (
                  <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Connexion au
                    serveur…
                  </p>
                ) : queueStatus === "queued" ? (
                  <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Recherche
                    d&apos;un adversaire…
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Lance la recherche pour affronter un autre joueur en direct.
                  </p>
                )}

                <div className="flex justify-center gap-3 pt-2">
                  {queueStatus === "queued" ? (
                    <Button
                      variant="outline"
                      onClick={onlineCancel}
                      className="font-semibold text-red-500"
                    >
                      Annuler la recherche
                    </Button>
                  ) : (
                    <Button
                      onClick={onlineFindMatch}
                      disabled={!onlineConnected}
                      className="bg-purple-500 font-semibold text-white hover:bg-purple-600"
                    >
                      Chercher un match
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Salle d'attente (prêt) */}
          {onlineSession?.state === "waiting" && (
            <div className="tcg-surface bg-card py-10 text-center shadow-sm">
              <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
              <h3 className="font-heading text-lg font-bold">
                Adversaire trouvé : {opponent?.name}
              </h3>
              <p className="mb-4 text-xs text-muted-foreground">
                Cliquez sur « Prêt » pour démarrer le duel.
              </p>
              <div className="flex justify-center gap-4">
                {onlineSession.players.map((p: any) => {
                  const isMe = p.userId === selfId;
                  return (
                    <div
                      key={p.userId}
                      className="flex w-36 flex-col items-center rounded-lg border border-border bg-muted p-3"
                    >
                      <span className="text-xs font-semibold text-foreground">
                        {isMe ? "Moi" : p.userName}
                      </span>
                      {p.ready ? (
                        <Badge className="mt-2 border border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400">
                          Prêt
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="mt-2 border border-border"
                        >
                          Pas prêt
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-6">
                {me?.ready ? (
                  <Button
                    disabled
                    className="bg-muted font-semibold text-muted-foreground"
                  >
                    En attente de l&apos;adversaire…
                  </Button>
                ) : (
                  <Button
                    onClick={onlineReady}
                    className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    Je suis prêt !
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Partie en cours */}
          {onlineSession?.state === "playing" && (
            <>
              <Card className="relative flex h-52 items-center overflow-hidden rounded-xl border border-border bg-zinc-950/80 p-4 shadow-lg backdrop-blur-md dark:bg-zinc-950/60">
                {isSpinning && spin ? (
                  <CardRoulette
                    target={spin.card}
                    pool={poolRef.current}
                    spinId={spin.id}
                    onComplete={handleSpinComplete}
                  />
                ) : me && me.openedPacks.length >= onlineSession.round ? (
                  <div className="flex w-full flex-col items-center justify-center gap-2 py-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-sm font-semibold text-white">
                      {opp && opp.openedPacks.length >= onlineSession.round
                        ? "Les deux boosters sont ouverts !"
                        : "En attente que l'adversaire ouvre son booster…"}
                    </p>
                  </div>
                ) : (
                  <div className="flex w-full flex-col items-center justify-center gap-2 py-8 text-center">
                    <Package className="h-10 w-10 animate-bounce text-primary" />
                    <p className="text-sm font-semibold tracking-wide text-white">
                      Manche {onlineSession.round} : c&apos;est le moment
                      d&apos;ouvrir !
                    </p>
                  </div>
                )}
              </Card>

              <RevealTray reveal={currentReveal} active={isSpinning} />

              {me &&
                me.openedPacks.length < onlineSession.round &&
                !isSpinning && (
                  <div className="flex justify-center">
                    <Button
                      onClick={onlineOpen}
                      className="h-14 px-10 text-lg font-semibold shadow-md transition-all hover:shadow-lg"
                    >
                      <Play className="mr-2 h-5 w-5 fill-current" />
                      Ouvrir booster {onlineSession.round}
                    </Button>
                  </div>
                )}

              <div className="grid grid-cols-1 gap-8 pt-2 md:grid-cols-2">
                <PlayerBoard
                  name="Moi"
                  score={p1Score}
                  packs={p1Packs}
                  accent="blue"
                />
                <PlayerBoard
                  name={opponent?.name || "Adversaire"}
                  score={p2Score}
                  packs={p2Packs}
                  accent="red"
                />
              </div>

              {me &&
                opp &&
                me.openedPacks.length >= onlineSession.round &&
                opp.openedPacks.length >= onlineSession.round &&
                !isSpinning && (
                  <div className="pt-2 text-center">
                    {me.ready ? (
                      <Button
                        disabled
                        className="bg-muted font-semibold text-muted-foreground"
                      >
                        En attente de l&apos;adversaire…
                      </Button>
                    ) : (
                      <Button
                        onClick={onlineReady}
                        className="h-12 bg-primary px-8 font-semibold text-primary-foreground hover:bg-primary/90"
                      >
                        {onlineSession.round < onlineSession.maxRounds
                          ? "Prêt pour la manche suivante"
                          : "Voir les résultats"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
            </>
          )}

          {/* Fin de partie online */}
          {onlineSession?.state === "finished" && me && opp && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="tcg-surface mx-auto max-w-xl bg-card p-8 text-center shadow-md"
            >
              <Award className="mx-auto mb-4 h-16 w-16 text-primary" />
              <h2 className="mb-2 text-2xl font-bold tracking-tight">
                Match terminé !
              </h2>
              <div className="mx-auto mb-6 grid max-w-sm grid-cols-2 gap-4">
                {onlineSession.players.map((p: any) => {
                  const isMe = p.userId === selfId;
                  return (
                    <div
                      key={p.userId}
                      className={`rounded-lg border border-border p-3 ${isMe ? "bg-primary/10" : "bg-purple-500/10"}`}
                    >
                      <p className="text-xs font-semibold text-foreground">
                        {isMe ? "Moi" : p.userName}
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {p.score.toFixed(2)} €
                      </p>
                    </div>
                  );
                })}
              </div>
              <h3 className="mb-6 text-lg font-bold">
                {me.score === opp.score ? (
                  <span className="text-amber-500">Égalité parfaite ! 🤝</span>
                ) : me.score > opp.score ? (
                  <span className="text-green-500">
                    Victoire ! Tu es plus chanceux que {opp.userName} ! 🎉
                  </span>
                ) : (
                  <span className="text-red-500">
                    Défaite ! {opp.userName} a tiré de meilleures cartes. 😢
                  </span>
                )}
              </h3>
              <Button
                onClick={quitToSelect}
                className="w-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Retour au salon
              </Button>
            </motion.div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}

// ---------------------------------------------------------------------------
// Sous-composants de présentation
// ---------------------------------------------------------------------------
function RevealTray({
  reveal,
  active,
}: {
  reveal: CardItem[];
  active: boolean;
}) {
  if (reveal.length === 0) return null;
  const total = reveal.reduce((s, c) => s + c.price, 0);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <AnimatePresence>
          {reveal.map((c) => (
            <motion.div
              key={c.uid}
              initial={{ scale: 0.4, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 18 }}
              className="relative h-24 w-17 overflow-hidden rounded-md border border-border bg-card shadow-sm"
            >
              <CardImg card={c} className="h-full w-full object-contain" />
              <span className="absolute inset-x-0 bottom-0 bg-black/70 py-0.5 text-center font-mono text-[8px] text-white">
                {c.price.toFixed(2)}€
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <p className="text-xs font-semibold text-muted-foreground">
        {active ? "Ouverture en cours…" : "Booster ouvert"} · {reveal.length}/
        {PACK_SIZE} · {total.toFixed(2)} €
      </p>
    </div>
  );
}

function FinishedPanel({
  p1Score,
  p2Score,
  loserName,
  onReplay,
  onBack,
}: {
  p1Score: number;
  p2Score: number;
  loserName: string;
  onReplay: () => void;
  onBack: () => void;
}) {
  return (
    <div className="w-full space-y-3 py-6 text-center">
      <Trophy className="mx-auto h-12 w-12 text-primary" />
      <h3 className="text-xl font-bold text-white">Duel terminé !</h3>
      <p className="text-sm font-bold text-zinc-300">
        {p1Score === p2Score ? (
          <span className="text-amber-500">Égalité parfaite ! 🤝</span>
        ) : p1Score > p2Score ? (
          <span className="text-green-500">Victoire de Joueur 1 ! 🔵</span>
        ) : (
          <span className="text-red-500">Victoire de {loserName} ! 🔴</span>
        )}
      </p>
      <div className="flex justify-center gap-4 pt-1">
        <Button onClick={onBack} variant="outline" className="text-foreground">
          Retour
        </Button>
        <Button
          onClick={onReplay}
          className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <RotateCcw className="mr-2 h-4 w-4" /> Rejouer
        </Button>
      </div>
    </div>
  );
}

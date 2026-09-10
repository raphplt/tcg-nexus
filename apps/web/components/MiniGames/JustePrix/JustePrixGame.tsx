"use client";

import { Globe, Loader2, Sparkles, User, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { PageWrapper } from "@/components/Layout/PageWrapper";
import { GameHeader } from "@/components/MiniGames/GameHeader";
import { LoadError } from "@/components/MiniGames/LoadError";
import { ModeCard } from "@/components/MiniGames/ModeCard";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useMiniGameSocket } from "@/hooks/useMiniGameSocket";
import { miniGameService } from "@/services/miniGame.service";
import type { JustePrixItem } from "@/types/mini-game";
import {
  JUSTE_PRIX_ROUND_SECONDS,
  JUSTE_PRIX_SOLO_ATTEMPTS,
} from "@/utils/miniGames/pricing";
import { LocalMode } from "./LocalMode";
import { OnlineMode } from "./OnlineMode";
import { SoloMode } from "./SoloMode";

type Mode = "select" | "solo" | "local" | "online";
type Loading = "idle" | "loading" | "error";

const ROUND_OPTIONS = [3, 5, 10] as const;

/** The Juste Prix mini-game: mode selection, then solo, local or online play. */
export function JustePrixGame() {
  const t = useTranslations("JustePrix");
  const tm = useTranslations("MiniGames");
  const { isAuthenticated } = useAuth();

  const [mode, setMode] = useState<Mode>("select");
  const [roundCount, setRoundCount] = useState<number>(5);
  const [loading, setLoading] = useState<Loading>("idle");
  const [items, setItems] = useState<JustePrixItem[]>([]);
  const [gameKey, setGameKey] = useState(0);
  const [soloScore, setSoloScore] = useState(0);
  const [localScores, setLocalScores] = useState({ p1: 0, p2: 0 });

  const socket = useMiniGameSocket("juste_prix", mode === "online");

  const startOffline = useCallback(
    async (target: "solo" | "local") => {
      setMode(target);
      setLoading("loading");
      setSoloScore(0);
      setLocalScores({ p1: 0, p2: 0 });
      try {
        const response = await miniGameService.getJustePrixItems(roundCount);
        setItems(response.items);
        setGameKey((key) => key + 1);
        setLoading("idle");
      } catch {
        setItems([]);
        setLoading("error");
      }
    },
    [roundCount],
  );

  const backToSelect = useCallback(() => {
    if (mode === "online") socket.reset();
    setMode("select");
    setItems([]);
    setLoading("idle");
  }, [mode, socket]);

  const headerStatus = (() => {
    if (mode === "solo" && loading === "idle") {
      return (
        <Badge className="border border-primary/20 bg-primary/10 px-3 py-1 font-semibold text-primary">
          {tm("common.points", { points: soloScore })}
        </Badge>
      );
    }
    if (mode === "local" && loading === "idle") {
      return (
        <>
          <Badge className="border border-blue-500/20 bg-blue-500/10 font-semibold text-blue-600 dark:text-blue-400">
            {t("player1")}: {localScores.p1}
          </Badge>
          <Badge className="border border-red-500/20 bg-red-500/10 font-semibold text-red-600 dark:text-red-400">
            {t("player2")}: {localScores.p2}
          </Badge>
        </>
      );
    }
    if (mode === "online" && socket.session) {
      return socket.session.players.map((p) => (
        <Badge
          key={p.userId}
          className={`font-semibold ${
            p.userId === socket.selfId
              ? "border border-primary/20 bg-primary/10 text-primary"
              : "border border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400"
          }`}
        >
          {p.userId === socket.selfId ? tm("common.me") : p.userName}:{" "}
          {tm("common.points", { points: p.score })}
        </Badge>
      ));
    }
    return null;
  })();

  return (
    <PageWrapper maxWidth="xl" gradient="secondary" className="space-y-6">
      <GameHeader
        icon={<Sparkles className="h-4 w-4" />}
        title={t("title")}
        subtitle={t("subtitle")}
        onQuit={mode !== "select" ? backToSelect : undefined}
      >
        {headerStatus}
      </GameHeader>

      {mode === "select" ? (
        <div className="mx-auto max-w-3xl space-y-6 pt-4">
          <div className="flex items-center justify-center gap-3">
            <label
              htmlFor="juste-prix-rounds"
              className="text-xs font-semibold text-muted-foreground"
            >
              {t("roundCount")}
            </label>
            <Select
              value={String(roundCount)}
              onValueChange={(value) => setRoundCount(Number(value))}
            >
              <SelectTrigger
                id="juste-prix-rounds"
                className="w-40 bg-background font-semibold"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover font-semibold">
                {ROUND_OPTIONS.map((count) => (
                  <SelectItem key={count} value={String(count)}>
                    {t("roundsOption", { count })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <ModeCard
              icon={<User className="h-10 w-10" />}
              title={t("solo")}
              help={t("soloHelp", { attempts: JUSTE_PRIX_SOLO_ATTEMPTS })}
              cta={t("playSolo")}
              onSelect={() => startOffline("solo")}
            />
            <ModeCard
              icon={<Users className="h-10 w-10" />}
              title={t("local")}
              help={t("localHelp")}
              cta={t("playLocal")}
              accent="blue"
              onSelect={() => startOffline("local")}
            />
            <ModeCard
              icon={<Globe className="h-10 w-10" />}
              title={t("online")}
              help={t("onlineHelp", { seconds: JUSTE_PRIX_ROUND_SECONDS })}
              cta={t("playOnline")}
              accent="purple"
              hint={isAuthenticated ? undefined : tm("loginRequiredBadge")}
              onSelect={() => setMode("online")}
            />
          </div>
        </div>
      ) : null}

      {(mode === "solo" || mode === "local") && loading === "loading" ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-bold text-muted-foreground">
            {tm("common.preparing")}
          </p>
        </div>
      ) : null}

      {(mode === "solo" || mode === "local") && loading === "error" ? (
        <LoadError onRetry={() => startOffline(mode)} onBack={backToSelect} />
      ) : null}

      {mode === "solo" && loading === "idle" && items.length > 0 ? (
        <SoloMode
          key={gameKey}
          items={items}
          onReplay={() => startOffline("solo")}
          onBack={backToSelect}
          onScoreChange={setSoloScore}
        />
      ) : null}

      {mode === "local" && loading === "idle" && items.length > 0 ? (
        <LocalMode
          key={gameKey}
          items={items}
          onReplay={() => startOffline("local")}
          onBack={backToSelect}
          onScoresChange={setLocalScores}
        />
      ) : null}

      {mode === "online" ? (
        <OnlineMode
          socket={socket}
          isAuthenticated={isAuthenticated}
          roundCount={roundCount}
          onBack={backToSelect}
        />
      ) : null}
    </PageWrapper>
  );
}

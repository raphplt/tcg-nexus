"use client";

import { Loader2, Package } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { PageWrapper } from "@/components/Layout/PageWrapper";
import { GameHeader } from "@/components/MiniGames/GameHeader";
import { LoadError } from "@/components/MiniGames/LoadError";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useMiniGameSocket } from "@/hooks/useMiniGameSocket";
import { miniGameService } from "@/services/miniGame.service";
import type { BoosterCard, MiniGameQueueParams } from "@/types/mini-game";
import { preloadCardImages } from "@/utils/miniGames/cardPreloader";
import { formatEuro } from "@/utils/miniGames/pricing";
import { DEFAULT_DUEL_OPTIONS, DuelSetup, type DuelOptions } from "./DuelSetup";
import type { Side } from "./duelReducer";
import { OfflineDuel } from "./OfflineDuel";
import { OnlineDuel } from "./OnlineDuel";

type Mode = "select" | "solo" | "local" | "online";
type Loading = "idle" | "loading" | "error";

const PACK_SIZES = { standard: 6, premium: 6, chase: 3 } as const;

/** Builds the matchmaking parameters from the setup screen. */
export function queueParamsFrom(options: DuelOptions): MiniGameQueueParams {
  const setId =
    options.scope === "set" && options.setId ? options.setId : undefined;
  const serieId =
    !setId && options.scope !== "all" && options.serieId
      ? options.serieId
      : undefined;
  return {
    roundCount: options.roundCount,
    packStyle: options.style,
    setId,
    serieId,
  };
}

/** The Case Opening mini-game: setup, then a solo, local or online duel. */
export function CaseOpeningGame() {
  const t = useTranslations("CaseOpening");
  const tm = useTranslations("MiniGames");
  const locale = useLocale();
  const { isAuthenticated } = useAuth();

  const [mode, setMode] = useState<Mode>("select");
  const [options, setOptions] = useState<DuelOptions>(DEFAULT_DUEL_OPTIONS);
  const [loading, setLoading] = useState<Loading>("idle");
  const [packs, setPacks] = useState<BoosterCard[][][]>([]);
  const [gameKey, setGameKey] = useState(0);
  const [scores, setScores] = useState<Record<Side, number>>({ p1: 0, p2: 0 });

  const socket = useMiniGameSocket("case_opening", mode === "online");
  const queueParams = queueParamsFrom(options);

  const startOffline = useCallback(
    async (target: "solo" | "local") => {
      setMode(target);
      setLoading("loading");
      setScores({ p1: 0, p2: 0 });
      try {
        const response = await miniGameService.getCaseOpeningPacks({
          count: options.roundCount,
          players: 2,
          setId: queueParams.setId,
          serieId: queueParams.serieId,
          style: options.style,
        });
        setPacks(response.packs);
        void preloadCardImages(response.packs.flat(2), "low");
        setGameKey((key) => key + 1);
        setLoading("idle");
      } catch {
        setPacks([]);
        setLoading("error");
      }
    },
    [options.roundCount, options.style, queueParams.serieId, queueParams.setId],
  );

  const start = (target: "solo" | "local" | "online") => {
    if (target === "online") {
      setMode("online");
      return;
    }
    void startOffline(target);
  };

  const backToSelect = useCallback(() => {
    if (mode === "online") socket.reset();
    setMode("select");
    setPacks([]);
    setLoading("idle");
  }, [mode, socket]);

  const playerName = (side: Side) =>
    side === "p1"
      ? mode === "local"
        ? t("player1")
        : tm("common.me")
      : mode === "local"
        ? t("player2")
        : t("computer");

  const headerStatus =
    (mode === "solo" || mode === "local") && loading === "idle" ? (
      <>
        <Badge className="border border-blue-500/20 bg-blue-500/10 font-semibold text-blue-600 dark:text-blue-400">
          {playerName("p1")}: {formatEuro(scores.p1, locale)}
        </Badge>
        <Badge className="border border-red-500/20 bg-red-500/10 font-semibold text-red-600 dark:text-red-400">
          {playerName("p2")}: {formatEuro(scores.p2, locale)}
        </Badge>
      </>
    ) : mode === "online" && socket.session ? (
      socket.session.players.map((p) => (
        <Badge
          key={p.userId}
          className={`font-semibold ${
            p.userId === socket.selfId
              ? "border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400"
              : "border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400"
          }`}
        >
          {p.userId === socket.selfId ? tm("common.me") : p.userName}:{" "}
          {formatEuro(p.score, locale)}
        </Badge>
      ))
    ) : null;

  return (
    <PageWrapper maxWidth="xl" gradient="secondary" className="space-y-6">
      <GameHeader
        icon={<Package className="h-4 w-4" />}
        title={t("title")}
        subtitle={t("subtitle")}
        onQuit={mode !== "select" ? backToSelect : undefined}
      >
        {headerStatus}
      </GameHeader>

      {mode === "select" ? (
        <DuelSetup
          options={options}
          onChange={setOptions}
          onStart={start}
          isAuthenticated={isAuthenticated}
        />
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

      {(mode === "solo" || mode === "local") &&
      loading === "idle" &&
      packs.length > 0 ? (
        <OfflineDuel
          key={gameKey}
          mode={mode}
          packs={packs}
          onReplay={() => startOffline(mode)}
          onBack={backToSelect}
          onScoresChange={setScores}
        />
      ) : null}

      {mode === "online" ? (
        <OnlineDuel
          socket={socket}
          isAuthenticated={isAuthenticated}
          queueParams={queueParams}
          packSize={PACK_SIZES[options.style]}
          onBack={backToSelect}
        />
      ) : null}
    </PageWrapper>
  );
}

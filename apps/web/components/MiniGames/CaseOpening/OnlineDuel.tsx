"use client";

import { ArrowRight, Loader2, Package, Play } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef } from "react";
import { OnlineLobby } from "@/components/MiniGames/OnlineLobby";
import { OnlineResult } from "@/components/MiniGames/OnlineResult";
import { OpponentConnectionNotice } from "@/components/MiniGames/OpponentConnectionNotice";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { UseMiniGameSocket } from "@/hooks/useMiniGameSocket";
import type { MiniGameQueueParams } from "@/types/mini-game";
import { useCardImagePreloader } from "@/utils/miniGames/cardPreloader";
import { formatEuro } from "@/utils/miniGames/pricing";
import { CardRoulette } from "./CardRoulette";
import { PlayerBoard } from "./PlayerBoard";
import { RevealTray } from "./RevealTray";
import { usePackReveal } from "./usePackReveal";

interface OnlineDuelProps {
  socket: UseMiniGameSocket;
  isAuthenticated: boolean;
  queueParams: MiniGameQueueParams;
  packSize: number;
  onBack: () => void;
}

/**
 * Online duel. The server holds the boosters: when the session shows a new
 * pack opened by this player, it is replayed through the roulette; the
 * opponent's packs land directly on their board.
 */
export function OnlineDuel({
  socket,
  isAuthenticated,
  queueParams,
  packSize,
  onBack,
}: OnlineDuelProps) {
  const t = useTranslations("CaseOpening");
  const to = useTranslations("MiniGames.online");
  const tc = useTranslations("MiniGames.common");
  const locale = useLocale();
  const { session, selfId } = socket;
  const reveal = usePackReveal();
  const revealedCountRef = useRef(0);

  const me = session?.players.find((p) => p.userId === selfId);
  const opp = session?.players.find((p) => p.userId !== selfId);

  // Replay through the roulette every pack of mine the server has not shown yet.
  useEffect(() => {
    if (!me || reveal.spinning || session?.state !== "playing") return;
    const pack = me.openedPacks[revealedCountRef.current];
    if (!pack) return;
    revealedCountRef.current += 1;
    reveal.start(pack, () => undefined);
  }, [me, reveal, session?.state]);

  useEffect(() => {
    if (!session) revealedCountRef.current = 0;
  }, [session]);

  // Reset the revealed card tray when transitioning between rounds or when game ends
  const roundRef = useRef(session?.round);
  useEffect(() => {
    if (
      session &&
      (roundRef.current !== session.round || session.state === "finished")
    ) {
      roundRef.current = session.round;
      reveal.clear();
    }
  }, [session, session?.round, session?.state, reveal]);

  const pool = useMemo(
    () => session?.players.flatMap((p) => p.openedPacks.flat()) ?? [],
    [session],
  );
  useCardImagePreloader(pool, "low");

  /** Packs already replayed locally; the board lags the server by one reveal. */
  const myShownPacks =
    me?.openedPacks.slice(
      0,
      revealedCountRef.current - (reveal.spinning ? 1 : 0),
    ) ?? [];

  if (!session || session.state === "waiting") {
    return (
      <OnlineLobby
        socket={socket}
        isAuthenticated={isAuthenticated}
        onSearch={() => socket.joinQueue(queueParams)}
        onBack={onBack}
      />
    );
  }

  if (session.state === "finished") {
    return (
      <OnlineResult
        session={session}
        selfId={selfId}
        formatScore={(score) => formatEuro(score, locale)}
        onBack={onBack}
      />
    );
  }

  const iOpened = (me?.openedPacks.length ?? 0) >= session.round;
  const oppOpened = (opp?.openedPacks.length ?? 0) >= session.round;
  const spinning = reveal.spinning !== null;

  return (
    <div className="space-y-6 pt-4">
      <OpponentConnectionNotice notice={socket.opponentConnection} />

      <Card className="relative flex h-52 items-center overflow-hidden rounded-xl border border-border bg-zinc-950/80 p-4 shadow-lg backdrop-blur-md dark:bg-zinc-950/60">
        {reveal.spinning ? (
          <CardRoulette
            target={reveal.spinning.card}
            pool={pool}
            spinId={reveal.spinning.spinId}
            onComplete={reveal.onSpinComplete}
          />
        ) : iOpened ? (
          <div className="flex w-full flex-col items-center justify-center gap-2 py-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm font-semibold text-white">
              {oppOpened ? t("bothOpened") : t("waitingOpponentBooster")}
            </p>
          </div>
        ) : (
          <div className="flex w-full flex-col items-center justify-center gap-2 py-8 text-center">
            <Package className="h-10 w-10 animate-bounce text-primary" />
            <p className="text-sm font-semibold tracking-wide text-white">
              {t("onlineTurn", { round: session.round })}
            </p>
          </div>
        )}
      </Card>

      <RevealTray
        revealed={reveal.revealed}
        packSize={packSize}
        active={spinning}
      />

      {!iOpened && !spinning ? (
        <div className="flex justify-center">
          <Button
            onClick={socket.openPack}
            className="h-14 px-10 text-lg font-semibold shadow-md"
          >
            <Play className="mr-2 h-5 w-5 fill-current" />
            {t("openBooster", { round: session.round })}
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-8 pt-2 md:grid-cols-2">
        <PlayerBoard
          name={tc("me")}
          score={me?.score ?? 0}
          packs={myShownPacks}
          accent="blue"
        />
        <PlayerBoard
          name={opp?.userName ?? t("opponent")}
          score={opp?.score ?? 0}
          packs={opp?.openedPacks ?? []}
          accent="red"
        />
      </div>

      {iOpened && oppOpened && !spinning ? (
        <div className="pt-2 text-center">
          {me?.ready ? (
            <Button disabled className="font-semibold">
              {to("waitingOpponent")}
            </Button>
          ) : (
            <Button onClick={socket.ready} className="h-12 px-8 font-semibold">
              {session.round < session.maxRounds
                ? to("readyNextRound")
                : to("viewResults")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}

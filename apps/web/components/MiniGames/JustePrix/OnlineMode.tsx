"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { UseMiniGameSocket } from "@/hooks/useMiniGameSocket";
import { useCountdown } from "@/hooks/useCountdown";
import { OnlineLobby } from "@/components/MiniGames/OnlineLobby";
import { OnlineResult } from "@/components/MiniGames/OnlineResult";
import { OpponentConnectionNotice } from "@/components/MiniGames/OpponentConnectionNotice";
import {
  formatEuro,
  JUSTE_PRIX_ROUND_SECONDS,
} from "@/utils/miniGames/pricing";
import { ItemShowcase } from "./ItemShowcase";
import { GuessInput } from "./GuessInput";

interface OnlineModeProps {
  socket: UseMiniGameSocket;
  isAuthenticated: boolean;
  roundCount: number;
  onBack: () => void;
}

/**
 * Online Juste Prix duel. The server drives the rounds: this component only
 * renders the session it receives and sends the player's actions.
 */
export function OnlineMode({
  socket,
  isAuthenticated,
  roundCount,
  onBack,
}: OnlineModeProps) {
  const t = useTranslations("JustePrix");
  const to = useTranslations("MiniGames.online");
  const tc = useTranslations("MiniGames.common");
  const locale = useLocale();
  const { session, reveal, selfId } = socket;

  const roundRevealed = reveal !== null && reveal.round === session?.round;
  const secondsLeft = useCountdown({
    startedAt: session?.roundStartedAt,
    durationMs: session?.roundDurationMs,
    serverTime: session?.serverTime,
    running: session?.state === "playing" && !roundRevealed,
  });

  if (!session || session.state === "waiting") {
    return (
      <OnlineLobby
        socket={socket}
        isAuthenticated={isAuthenticated}
        onSearch={() => socket.joinQueue({ roundCount })}
        onBack={onBack}
      />
    );
  }

  if (session.state === "finished") {
    return (
      <OnlineResult
        session={session}
        selfId={selfId}
        formatScore={(score) => tc("points", { points: score })}
        onBack={onBack}
      />
    );
  }

  const me = session.players.find((p) => p.userId === selfId);
  const item = session.currentItem;

  return (
    <div className="space-y-6 pt-4">
      <OpponentConnectionNotice notice={socket.opponentConnection} />

      {item ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <ItemShowcase
              item={item}
              round={session.round}
              totalRounds={session.maxRounds}
              secondsLeft={roundRevealed ? null : secondsLeft}
            />
          </div>

          <div className="space-y-4 lg:col-span-7">
            {!roundRevealed ? (
              <>
                <div className="rounded-xl border border-border bg-muted p-4 text-foreground">
                  <h4 className="text-sm font-semibold">{t("enterGuess")}</h4>
                  <p className="text-xs text-muted-foreground">
                    {t("enterGuessHelp", {
                      seconds: Math.round(
                        (session.roundDurationMs ??
                          JUSTE_PRIX_ROUND_SECONDS * 1000) / 1000,
                      ),
                    })}
                  </p>
                </div>
                {me?.hasGuessed ? (
                  <div className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-6 text-sm font-bold text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("guessSent")}
                  </div>
                ) : (
                  <GuessInput
                    key={session.round}
                    placeholder={t("guessPlaceholder")}
                    submitLabel={t("estimate")}
                    onSubmit={socket.submitGuess}
                    autoFocus
                  />
                )}
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 rounded-xl border border-border bg-card p-6 text-foreground shadow-md"
              >
                <h3 className="border-b border-border pb-2 text-center text-xl font-bold">
                  {t("reveal")}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-center">
                  {reveal.guesses.map((g) => {
                    const isMe = g.userId === selfId;
                    return (
                      <div
                        key={g.userId}
                        className={`rounded-lg border p-3 ${
                          isMe
                            ? "border-primary/20 bg-primary/10"
                            : "border-purple-500/20 bg-purple-500/10"
                        }`}
                      >
                        <p className="text-xs font-bold">
                          {isMe ? tc("me") : g.userName}
                        </p>
                        <p className="text-lg font-bold text-foreground">
                          {g.guess === null
                            ? t("noGuess")
                            : formatEuro(g.guess, locale)}
                        </p>
                        <Badge className="mt-1 border border-border bg-muted text-foreground">
                          {t("pointsEarned", { points: g.points })}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
                <div className="rounded-lg border border-border bg-muted p-3 text-center font-semibold text-foreground">
                  {t("correctPriceWas", {
                    price: formatEuro(reveal.correctPrice, locale),
                  })}
                </div>
                {me?.ready ? (
                  <Button disabled className="w-full font-semibold">
                    {to("waitingOpponent")}
                  </Button>
                ) : (
                  <Button
                    onClick={socket.ready}
                    className="h-11 w-full font-semibold"
                  >
                    {session.round < session.maxRounds
                      ? to("readyNextRound")
                      : to("viewResults")}
                  </Button>
                )}
              </motion.div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          {t("waitingForRound")}
        </p>
      )}
    </div>
  );
}

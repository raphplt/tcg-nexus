"use client";

import { Award } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { MiniGameSessionState } from "@/types/mini-game";

interface OnlineResultProps {
  session: MiniGameSessionState;
  selfId: number | null;
  formatScore: (score: number) => string;
  onBack: () => void;
}

/** Final panel of an online duel: both scores and the verdict. */
export function OnlineResult({
  session,
  selfId,
  formatScore,
  onBack,
}: OnlineResultProps) {
  const t = useTranslations("MiniGames.online");
  const tc = useTranslations("MiniGames.common");
  const me = session.players.find((p) => p.userId === selfId);
  const opp = session.players.find((p) => p.userId !== selfId);

  let verdict: { text: string; tone: string } | null = null;
  if (me && opp) {
    if (session.forfeitedBy === opp.userId) {
      verdict = {
        text: t("forfeitWin", { name: opp.userName }),
        tone: "text-green-500",
      };
    } else if (session.forfeitedBy === me.userId) {
      verdict = { text: t("forfeitLoss"), tone: "text-red-500" };
    } else if (me.score === opp.score) {
      verdict = { text: t("tie"), tone: "text-amber-500" };
    } else if (me.score > opp.score) {
      verdict = {
        text: t("victory", { name: opp.userName }),
        tone: "text-green-500",
      };
    } else {
      verdict = {
        text: t("defeat", { name: opp.userName }),
        tone: "text-red-500",
      };
    }
  }

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="tcg-surface mx-auto max-w-xl bg-card p-8 text-center shadow-md"
    >
      <Award className="mx-auto mb-4 h-16 w-16 text-primary" />
      <h2 className="mb-2 text-2xl font-bold tracking-tight">
        {t("matchOver")}
      </h2>
      <div className="mx-auto mb-6 grid max-w-sm grid-cols-2 gap-4">
        {session.players.map((p) => {
          const isMe = p.userId === selfId;
          return (
            <div
              key={p.userId}
              className={`rounded-lg border border-border p-3 ${isMe ? "bg-primary/10" : "bg-purple-500/10"}`}
            >
              <p className="text-xs font-semibold text-foreground">
                {isMe ? tc("me") : p.userName}
              </p>
              <p className="text-2xl font-bold text-foreground">
                {formatScore(p.score)}
              </p>
            </div>
          );
        })}
      </div>
      {verdict ? (
        <h3 className={`mb-6 text-lg font-bold ${verdict.tone}`}>
          {verdict.text}
        </h3>
      ) : null}
      <Button onClick={onBack} className="w-full font-semibold">
        {t("backToLobby")}
      </Button>
    </motion.div>
  );
}

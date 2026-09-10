"use client";

import { WifiOff, Wifi } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MiniGamePlayerConnectionPayload } from "@/types/mini-game";

interface OpponentConnectionNoticeProps {
  notice: MiniGamePlayerConnectionPayload | null;
}

/** Banner shown while the opponent is disconnected and may still come back. */
export function OpponentConnectionNotice({
  notice,
}: OpponentConnectionNoticeProps) {
  const t = useTranslations("MiniGames.online");
  if (!notice) return null;

  if (notice.connected) {
    return (
      <div className="mx-auto flex max-w-xl items-center justify-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-600 dark:text-green-400">
        <Wifi className="h-4 w-4" />
        {t("opponentReconnected", { name: notice.userName })}
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl items-center justify-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
      <WifiOff className="h-4 w-4" />
      {t("opponentDisconnected", {
        name: notice.userName,
        seconds: Math.round((notice.graceMs ?? 20_000) / 1000),
      })}
    </div>
  );
}

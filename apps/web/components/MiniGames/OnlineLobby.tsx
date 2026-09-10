"use client";

import { Globe, Loader2, LogIn } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { H3 } from "@/components/Shared/Titles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { UseMiniGameSocket } from "@/hooks/useMiniGameSocket";

interface OnlineLobbyProps {
  socket: UseMiniGameSocket;
  /** Whether the visitor is signed in; online play needs an account. */
  isAuthenticated: boolean;
  onSearch: () => void;
  onBack: () => void;
  /** Optional duel options (set, rounds) shown above the search button. */
  options?: ReactNode;
}

/**
 * Matchmaking panel then waiting room of an online duel. Covers every state
 * before the first round: signed out, connecting, connection lost, queued,
 * matched and waiting for both players to be ready.
 */
export function OnlineLobby({
  socket,
  isAuthenticated,
  onSearch,
  onBack,
  options,
}: OnlineLobbyProps) {
  const t = useTranslations("MiniGames.online");
  const tc = useTranslations("MiniGames.common");
  const { connection, queue, error, session, selfId, opponent } = socket;

  if (session?.state === "waiting") {
    const me = session.players.find((p) => p.userId === selfId);
    return (
      <Card className="tcg-surface mx-auto max-w-xl bg-card text-center shadow-sm">
        <CardContent className="space-y-4 p-8">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <H3 className="font-heading text-lg font-bold">
            {t("opponentFound", { name: opponent?.name ?? "" })}
          </H3>
          <p className="text-xs text-muted-foreground">{t("clickReady")}</p>
          <div className="flex justify-center gap-4">
            {session.players.map((p) => (
              <div
                key={p.userId}
                className="flex w-36 flex-col items-center rounded-lg border border-border bg-muted p-3"
              >
                <span className="text-xs font-semibold text-foreground">
                  {p.userId === selfId ? tc("me") : p.userName}
                </span>
                {p.ready ? (
                  <Badge className="mt-2 border border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400">
                    {t("ready")}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="mt-2 border border-border">
                    {t("notReady")}
                  </Badge>
                )}
              </div>
            ))}
          </div>
          {me?.ready ? (
            <Button disabled className="font-semibold">
              {t("waitingOpponent")}
            </Button>
          ) : (
            <Button onClick={socket.ready} className="font-semibold">
              {t("imReady")}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  let status: ReactNode;
  let canSearch = false;

  if (!isAuthenticated || connection === "unauthorized") {
    status = (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{t("loginRequired")}</p>
        <Button asChild variant="outline" className="font-semibold">
          <Link href="/auth/login">
            <LogIn className="mr-2 h-4 w-4" />
            {t("loginCta")}
          </Link>
        </Button>
      </div>
    );
  } else if (error === "not_enough_items") {
    status = (
      <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
        {t("notEnoughItems")}
      </p>
    );
    canSearch = true;
  } else if (connection === "error") {
    status = (
      <p className="text-sm font-semibold text-red-500">
        {t("connectionFailed")}
      </p>
    );
  } else if (connection === "disconnected") {
    status = (
      <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("disconnected")}
      </p>
    );
  } else if (connection !== "connected") {
    status = (
      <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("connecting")}
      </p>
    );
  } else if (queue === "queued") {
    status = (
      <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("searching")}
      </p>
    );
  } else {
    status = (
      <p className="text-sm text-muted-foreground">{t("startSearchHelp")}</p>
    );
    canSearch = true;
  }

  return (
    <Card className="tcg-surface mx-auto max-w-xl bg-card text-center shadow-sm">
      <CardContent className="space-y-4 p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
          <Globe className="h-8 w-8" />
        </div>
        <H3 className="font-heading text-lg font-bold">{t("title")}</H3>
        {canSearch && queue !== "queued" ? options : null}
        {status}
        <div className="flex justify-center gap-3 pt-2">
          <Button variant="outline" onClick={onBack} className="font-semibold">
            {tc("back")}
          </Button>
          {queue === "queued" ? (
            <Button
              variant="outline"
              onClick={socket.leaveQueue}
              className="font-semibold text-red-500"
            >
              {t("cancelSearch")}
            </Button>
          ) : (
            <Button
              onClick={onSearch}
              disabled={!canSearch}
              className="bg-purple-500 font-semibold text-white hover:bg-purple-600"
            >
              {t("searchMatch")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

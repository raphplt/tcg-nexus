"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface LoadErrorProps {
  onRetry: () => void;
  onBack: () => void;
}

/**
 * Shown when a game cannot start because the catalog returned no usable
 * items. Replaces the silent mock data the games used to fall back on.
 */
export function LoadError({ onRetry, onBack }: LoadErrorProps) {
  const t = useTranslations("MiniGames.common");
  return (
    <Card className="tcg-surface mx-auto max-w-xl bg-card text-center shadow-sm">
      <CardContent className="space-y-4 p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h3 className="font-heading text-lg font-bold">
          {t("loadErrorTitle")}
        </h3>
        <p className="text-sm text-muted-foreground">{t("loadErrorHelp")}</p>
        <div className="flex justify-center gap-3 pt-2">
          <Button variant="outline" onClick={onBack}>
            {t("back")}
          </Button>
          <Button onClick={onRetry}>
            <RotateCcw className="mr-2 h-4 w-4" />
            {t("retry")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

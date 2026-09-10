"use client";

import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { H1 } from "@/components/Shared/Titles";
import { Button } from "@/components/ui/button";

interface GameHeaderProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  /** Score badges or other status shown on the right. */
  children?: ReactNode;
  /** Shown as a "Quit" button when provided. */
  onQuit?: () => void;
}

/** Top bar shared by every mini-game page: back link, identity, status. */
export function GameHeader({
  icon,
  title,
  subtitle,
  children,
  onQuit,
}: GameHeaderProps) {
  const t = useTranslations("MiniGames.common");
  return (
    <div className="tcg-surface flex flex-wrap items-center justify-between gap-3 bg-card/50 p-4 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <Button asChild size="sm" variant="outline" className="h-8 w-8 p-0">
          <Link href="/pokemon/mini-games" aria-label={t("back")}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <H1 className="text-lg! sm:text-xl!">{title}</H1>
          <p className="text-[10px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        {onQuit ? (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={onQuit}
          >
            {t("quit")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

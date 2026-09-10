"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import type { BoosterCard } from "@/types/mini-game";
import { packValue } from "@/utils/miniGames/booster";
import { formatEuro } from "@/utils/miniGames/pricing";
import { CardTile } from "./CardTile";

interface RevealTrayProps {
  revealed: BoosterCard[];
  packSize: number;
  active: boolean;
}

/** Cards of the booster being opened, appearing one by one. */
export function RevealTray({ revealed, packSize, active }: RevealTrayProps) {
  const t = useTranslations("CaseOpening");
  const locale = useLocale();
  if (revealed.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <AnimatePresence>
          {revealed.map((card, index) => (
            <motion.div
              key={`${card.id}-${index}`}
              initial={{ scale: 0.4, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 18 }}
            >
              <CardTile
                card={card}
                size="sm"
                className="w-16 sm:w-[72px]"
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <p className="text-xs font-semibold text-muted-foreground">
        {active ? t("opening") : t("boosterOpened")} · {revealed.length}/
        {packSize} · {formatEuro(packValue(revealed), locale)}
      </p>
    </div>
  );
}

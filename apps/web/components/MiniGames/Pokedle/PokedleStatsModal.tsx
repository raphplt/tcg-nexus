"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Check,
  Clock,
  Copy,
  Flame,
  Share2,
  Trophy,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { PokedleStats } from "./pokedleLogic";

interface PokedleStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: PokedleStats;
  shareText?: string;
  isDaily?: boolean;
  countdown?: { hours: number; minutes: number; seconds: number };
}

/**
 * Wordle-style statistics and streak modal with guess distribution and clipboard sharing.
 */
export function PokedleStatsModal({
  isOpen,
  onClose,
  stats,
  shareText,
  isDaily = false,
  countdown,
}: PokedleStatsModalProps) {
  const t = useTranslations("Pokedle");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const winRate = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;
  const maxDistribution = Math.max(1, ...Object.values(stats.guessesDistribution));

  const handleShare = async () => {
    if (!shareText) return;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (err) {
      console.error("Failed to copy share text to clipboard:", err);
    }
  };

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="relative w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-6 text-foreground"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-black tracking-tight uppercase">
              {t("statistics")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 4-Stat Metric Tiles */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-3 rounded-xl bg-muted/20 border border-border/50 flex flex-col items-center">
            <span className="text-2xl font-black text-foreground">
              {stats.played}
            </span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">
              {t("played")}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-muted/20 border border-border/50 flex flex-col items-center">
            <span className="text-2xl font-black text-emerald-500">
              {winRate}%
            </span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">
              {t("winRate")}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-muted/20 border border-border/50 flex flex-col items-center">
            <div className="flex items-center gap-1">
              <span className="text-2xl font-black text-orange-500">
                {stats.currentStreak}
              </span>
              <Flame className="h-4 w-4 text-orange-500 fill-orange-500" />
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">
              {t("currentStreak")}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-muted/20 border border-border/50 flex flex-col items-center">
            <span className="text-2xl font-black text-amber-500">
              {stats.maxStreak}
            </span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">
              {t("maxStreak")}
            </span>
          </div>
        </div>

        {/* Guess Distribution Chart */}
        <div className="space-y-2">
          <h3 className="text-xs font-black uppercase text-muted-foreground tracking-wider">
            {t("guessDistribution")}
          </h3>
          <div className="space-y-1.5">
            {[1, 2, 3, 4, 5, 6].map((guessNum) => {
              const count = stats.guessesDistribution[guessNum] || 0;
              const barPercent = Math.max(8, Math.round((count / maxDistribution) * 100));

              return (
                <div key={guessNum} className="flex items-center gap-2 text-xs font-bold">
                  <span className="w-3 text-muted-foreground">{guessNum}</span>
                  <div className="flex-1 bg-muted/30 rounded-md overflow-hidden h-6 flex items-center">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barPercent}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className={`h-full px-2 flex items-center justify-end text-[11px] font-black text-white ${
                        count > 0 ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                    >
                      {count}
                    </motion.div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Daily Countdown & Share Bar */}
        <div className="pt-2 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          {isDaily && countdown && (
            <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
              <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-primary" />
                {t("nextDailyIn")}
              </span>
              <span className="text-lg font-black font-mono tracking-wider text-foreground">
                {pad(countdown.hours)}:{pad(countdown.minutes)}:{pad(countdown.seconds)}
              </span>
            </div>
          )}

          {shareText && (
            <Button
              onClick={handleShare}
              className={`w-full ${isDaily ? "sm:w-auto" : ""} font-black px-6 py-2.5 rounded-xl shadow-lg transition-all ${
                copied
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-gradient-to-r from-primary to-secondary text-white hover:opacity-95"
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {t("shareSuccess")}
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4 mr-2" />
                  {t("share")}
                </>
              )}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

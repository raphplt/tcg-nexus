"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUp,
  ArrowDown,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
} from "lucide-react";
import { SmartImage } from "@/components/ui/SmartImage";
import { Button } from "@/components/ui/button";
import type {
  PokedleGuessRow,
  DirectionalStatus,
  TypeMatchStatus,
  MatchStatus,
} from "./pokedleLogic";
import { getOfficialArtworkUrl } from "./pokedleLogic";

interface PokedleTableProps {
  guesses: PokedleGuessRow[];
  maxGuesses?: number;
}

/**
 * Renders an indicator pill with directional arrow or check icon.
 */
function DirectionalCell({
  value,
  status,
  prefix = "",
  suffix = "",
}: {
  value: React.ReactNode;
  status: DirectionalStatus;
  prefix?: string;
  suffix?: string;
}) {
  const isCorrect = status === "correct";
  const isHigher = status === "higher";
  const isLower = status === "lower";

  const colorClasses = isCorrect
    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 shadow-sm"
    : "bg-muted/40 text-foreground border-border/80";

  return (
    <div
      className={`h-11 px-2 flex items-center justify-center gap-1.5 rounded-lg border font-bold text-xs transition-colors ${colorClasses}`}
    >
      <span>
        {prefix}
        {value}
        {suffix}
      </span>
      {isCorrect && <Check className="h-3.5 w-3.5 text-emerald-500" />}
      {isHigher && (
        <span className="flex items-center text-primary font-black text-xs" title="Plus grand">
          <ArrowUp className="h-3.5 w-3.5 stroke-[2.5]" />
        </span>
      )}
      {isLower && (
        <span className="flex items-center text-amber-500 font-black text-xs" title="Plus petit">
          <ArrowDown className="h-3.5 w-3.5 stroke-[2.5]" />
        </span>
      )}
    </div>
  );
}

/**
 * Renders a type comparison pill (correct, partial, or incorrect).
 */
function TypeCell({
  value,
  status,
  fallbackLabel,
}: {
  value: string;
  status: TypeMatchStatus;
  fallbackLabel: string;
}) {
  const label = value === "None" ? fallbackLabel : value;

  let colorClasses = "bg-muted/30 text-muted-foreground border-border/60";
  if (status === "correct") {
    colorClasses =
      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 shadow-sm";
  } else if (status === "partial") {
    colorClasses =
      "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40 shadow-sm";
  }

  return (
    <div
      className={`h-11 px-2 flex items-center justify-center rounded-lg border font-bold text-xs transition-colors ${colorClasses}`}
    >
      <span className="truncate max-w-[85px]">{label}</span>
    </div>
  );
}

/**
 * Complete guess history table for Pokedle with flip animations and visual legend.
 */
export function PokedleTable({
  guesses,
  maxGuesses = 6,
}: PokedleTableProps) {
  const t = useTranslations("Pokedle");
  const [showLegend, setShowLegend] = useState(false);

  const emptyRowsCount = Math.max(0, maxGuesses - guesses.length);

  return (
    <div className="space-y-4 w-full">
      {/* Table Container */}
      <div className="tcg-surface overflow-x-auto rounded-xl border border-border shadow-md bg-card/60 backdrop-blur-sm">
        <table className="w-full text-center border-collapse min-w-[620px]">
          <thead>
            <tr className="bg-muted/50 border-b border-border text-[11px] font-black uppercase tracking-wider text-muted-foreground">
              <th className="p-3 text-left pl-4">{t("pokemon")}</th>
              <th className="p-3">{t("generation")}</th>
              <th className="p-3">{t("pokedexNumber")}</th>
              <th className="p-3">{t("type1")}</th>
              <th className="p-3">{t("type2")}</th>
              <th className="p-3">{t("hp")}</th>
              <th className="p-3 pr-4">{t("retreat")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 p-2">
            {/* Submitted Guesses */}
            {guesses.map((g, idx) => {
              const isCorrectSpecies = g.checks.name === "correct";
              const artwork = getOfficialArtworkUrl(g.dexId);

              return (
                <motion.tr
                  key={idx}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.05 }}
                  className="hover:bg-muted/10 transition-colors"
                >
                  {/* Pokémon Name & Sprite */}
                  <td className="p-2.5 pl-4 text-left">
                    <div
                      className={`h-11 px-2.5 flex items-center gap-2 rounded-lg border font-black text-xs transition-colors ${
                        isCorrectSpecies
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40"
                          : "bg-muted/40 text-foreground border-border/80"
                      }`}
                    >
                      <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-zinc-950/10 dark:bg-zinc-950/40 flex items-center justify-center">
                        <SmartImage
                          src={artwork}
                          alt={g.speciesName}
                          fallbackSrc="/images/carte-pokemon-dos.jpg"
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <span className="truncate max-w-[120px]">
                        {g.speciesName}
                      </span>
                    </div>
                  </td>

                  {/* Generation */}
                  <td className="p-2.5">
                    <DirectionalCell
                      value={g.generation}
                      prefix="Gen "
                      status={g.checks.generation}
                    />
                  </td>

                  {/* Dex ID */}
                  <td className="p-2.5">
                    <DirectionalCell
                      value={g.dexId > 0 ? g.dexId : "??"}
                      prefix="#"
                      status={g.checks.dexId}
                    />
                  </td>

                  {/* Type 1 */}
                  <td className="p-2.5">
                    <TypeCell
                      value={g.type1}
                      status={g.checks.type1}
                      fallbackLabel={t("none")}
                    />
                  </td>

                  {/* Type 2 */}
                  <td className="p-2.5">
                    <TypeCell
                      value={g.type2}
                      status={g.checks.type2}
                      fallbackLabel={t("none")}
                    />
                  </td>

                  {/* HP */}
                  <td className="p-2.5">
                    <DirectionalCell
                      value={g.hp}
                      suffix=" PV"
                      status={g.checks.hp}
                    />
                  </td>

                  {/* Retreat */}
                  <td className="p-2.5 pr-4">
                    <DirectionalCell
                      value={g.retreat}
                      status={g.checks.retreat}
                    />
                  </td>
                </motion.tr>
              );
            })}

            {/* Empty Row Placeholders */}
            {Array.from({ length: emptyRowsCount }).map((_, placeholderIdx) => (
              <tr key={`empty-${placeholderIdx}`} className="opacity-35 select-none">
                <td className="p-2.5 pl-4 text-left">
                  <div className="h-11 px-3 flex items-center gap-2 rounded-lg border border-dashed border-border/60 bg-muted/10 text-muted-foreground text-xs font-semibold">
                    <div className="h-6 w-6 rounded-full bg-muted/20 flex items-center justify-center text-[10px]">
                      {guesses.length + placeholderIdx + 1}
                    </div>
                    <span>...</span>
                  </div>
                </td>
                <td className="p-2.5">
                  <div className="h-11 rounded-lg border border-dashed border-border/40 bg-muted/5" />
                </td>
                <td className="p-2.5">
                  <div className="h-11 rounded-lg border border-dashed border-border/40 bg-muted/5" />
                </td>
                <td className="p-2.5">
                  <div className="h-11 rounded-lg border border-dashed border-border/40 bg-muted/5" />
                </td>
                <td className="p-2.5">
                  <div className="h-11 rounded-lg border border-dashed border-border/40 bg-muted/5" />
                </td>
                <td className="p-2.5">
                  <div className="h-11 rounded-lg border border-dashed border-border/40 bg-muted/5" />
                </td>
                <td className="p-2.5 pr-4">
                  <div className="h-11 rounded-lg border border-dashed border-border/40 bg-muted/5" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Clue Legend & Help Toggle */}
      <div className="flex flex-col rounded-xl border border-border/80 bg-card/40 backdrop-blur-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowLegend((prev) => !prev)}
          className="flex items-center justify-between px-4 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            <span>{t("legendTitle")}</span>
          </div>
          {showLegend ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        <AnimatePresence>
          {showLegend && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 pb-3 pt-1 border-t border-border/50 text-xs text-muted-foreground grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5"
            >
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500 shrink-0" />
                <span>{t("legendExact")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-amber-500 shrink-0" />
                <span>{t("legendPartial")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-zinc-500 shrink-0" />
                <span>{t("legendWrong")}</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowUp className="h-3.5 w-3.5 text-primary shrink-0 stroke-[2.5]" />
                <span>{t("legendHigher")}</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowDown className="h-3.5 w-3.5 text-amber-500 shrink-0 stroke-[2.5]" />
                <span>{t("legendLower")}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

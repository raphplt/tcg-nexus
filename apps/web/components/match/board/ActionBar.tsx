"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { InteractionMode } from "./useGameBoardInteraction";

interface ActionBarProps {
  mode: InteractionMode;
  hintText: string | null;
  canAct: boolean;
  isBusy?: boolean;
  onEndTurn: () => void;
  onCancel: () => void;
}

export function ActionBar({
  mode,
  hintText,
  canAct,
  isBusy = false,
  onEndTurn,
  onCancel,
}: ActionBarProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-white/5 bg-black/40 px-3 py-3 backdrop-blur-md md:flex-row md:items-center md:justify-between md:px-4">
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2.5">
          {hintText ? (
            <motion.p
              key={hintText}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-sm font-medium text-amber-300"
            >
              <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              {hintText}
            </motion.p>
          ) : canAct ? (
            <p className="text-sm text-white/60">
              Votre tour. Jouez une carte ou ouvrez les attaques de votre
              Pokémon actif.
            </p>
          ) : (
            <p className="flex items-center gap-2 text-sm text-white/35">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400/60 animate-pulse" />
              Tour de l&apos;adversaire...
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 md:flex-shrink-0">
        {mode !== "idle" ? (
          <div className="rounded-full border border-cyan-400/16 bg-cyan-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-100/75">
            Action en cours
          </div>
        ) : null}
        {mode !== "idle" && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={onCancel}
            className={cn(
              "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
              "bg-white/10 text-white/70 hover:bg-white/18",
            )}
          >
            Annuler
          </motion.button>
        )}
        <button
          onClick={onEndTurn}
          disabled={!canAct || isBusy}
          className={cn(
            "rounded-full px-5 py-2.5 text-sm font-bold transition-all",
            canAct
              ? "bg-linear-to-r from-red-600 to-rose-500 text-white shadow-lg shadow-red-600/30 hover:shadow-red-500/40"
              : "bg-white/5 text-white/30 cursor-not-allowed",
          )}
        >
          Fin du tour
        </button>
      </div>
    </div>
  );
}

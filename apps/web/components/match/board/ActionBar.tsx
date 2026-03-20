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
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-black/50 backdrop-blur-sm border-t border-white/5">
      {/* Left: hint text */}
      <div className="flex-1 min-w-0">
        {hintText ? (
          <motion.p
            key={hintText}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-sm text-amber-300 font-medium"
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 mr-2 animate-pulse" />
            {hintText}
          </motion.p>
        ) : canAct ? (
          <p className="text-sm text-white/50">
            C&apos;est votre tour. Jouez des cartes ou cliquez
            sur votre Pokémon actif pour attaquer.
          </p>
        ) : (
          <p className="text-sm text-white/30 flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400/60 animate-pulse" />
            Tour de l&apos;adversaire...
          </p>
        )}
      </div>

      {/* Right: action buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {mode !== "idle" && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={onCancel}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium",
              "bg-white/10 text-white/70 hover:bg-white/20 transition-colors",
            )}
          >
            Annuler
          </motion.button>
        )}
        <button
          onClick={onEndTurn}
          disabled={!canAct || isBusy}
          className={cn(
            "px-5 py-2 rounded-lg text-sm font-bold transition-all",
            canAct
              ? "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 hover:shadow-red-500/40"
              : "bg-white/5 text-white/30 cursor-not-allowed",
          )}
        >
          Fin du tour
        </button>
      </div>
    </div>
  );
}

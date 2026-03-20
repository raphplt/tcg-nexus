"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SanitizedPokemonCardView } from "@/types/match-online";

const typeToImage: Record<string, string> = {
  Plante: "/images/types/Type-Plante-JCC.png",
  Feu: "/images/types/Type-Feu-JCC.png",
  Eau: "/images/types/Type-Eau-JCC.png",
  Électrique: "/images/types/Type-Électrique-JCC.png",
  Psy: "/images/types/Type-Psy-JCC.png",
  Incolore: "/images/types/Type-Incolore-JCC.png",
  Obscurité: "/images/types/Type-Obscurité-JCC.png",
  Métal: "/images/types/Type-Métal-JCC.png",
  Dragon: "/images/types/Type-Dragon-JCC.png",
  Fée: "/images/types/Type-Fée-JCC.png",
  Combat: "/images/types/Type-Combat-JCC.png",
};

interface AttackPanelProps {
  pokemon: SanitizedPokemonCardView;
  onAttack: (attackIndex: number) => void;
  onRetreat?: (
    benchPokemonInstanceId: string,
    discardedEnergyIds: string[],
  ) => void;
  onClose: () => void;
  benchPokemon?: SanitizedPokemonCardView[];
  disabled?: boolean;
}

export function AttackPanel({
  pokemon,
  onAttack,
  onRetreat,
  onClose,
  benchPokemon = [],
  disabled = false,
}: AttackPanelProps) {
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 z-50 w-80 max-w-[90vw]">
      <div className="bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-800/80 to-slate-800/60 border-b border-white/10">
          <span className="text-sm font-bold text-white tracking-wide">
            {pokemon.name}
          </span>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Attacks */}
        <div className="p-3 space-y-2">
          {pokemon.attacks.map((attack, index) => (
            <motion.button
              key={`${attack.name}-${index}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
              onClick={() => onAttack(index)}
              disabled={disabled}
              className={cn(
                "w-full text-left rounded-xl p-3 transition-all group",
                "bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20",
                "disabled:opacity-40 disabled:cursor-not-allowed",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {/* Energy cost */}
                  <div className="flex gap-0.5">
                    {attack.cost.map((type, i) => {
                      const img = typeToImage[type];
                      return img ? (
                        <div key={i} className="w-4 h-4 relative">
                          <Image
                            src={img}
                            alt={type}
                            fill
                            className="object-contain"
                            sizes="16px"
                          />
                        </div>
                      ) : (
                        <div
                          key={i}
                          className="w-4 h-4 rounded-full bg-gray-500 text-[7px] flex items-center justify-center text-white font-bold"
                        >
                          {type[0]}
                        </div>
                      );
                    })}
                  </div>
                  <span className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">
                    {attack.name}
                  </span>
                </div>
                {attack.damage != null && (
                  <span className="text-lg font-bold text-yellow-400 group-hover:text-yellow-300 transition-colors">
                    {attack.damage}
                  </span>
                )}
              </div>
              {attack.effect && (
                <p className="mt-1.5 text-[11px] text-white/50 leading-tight">
                  {attack.effect}
                </p>
              )}
            </motion.button>
          ))}
        </div>

        {/* Retreat */}
        {onRetreat && benchPokemon.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="border-t border-white/10 p-3"
          >
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2 font-bold">
              Retraite (coût : {pokemon.retreat ?? 0})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {benchPokemon.map((bench) => (
                <button
                  key={bench.instanceId}
                  onClick={() => {
                    const energiesToDiscard = (
                      pokemon.attachedEnergies || []
                    )
                      .slice(0, pokemon.retreat ?? 0)
                      .map((e) => e.instanceId);
                    onRetreat(bench.instanceId, energiesToDiscard);
                  }}
                  disabled={
                    disabled ||
                    (pokemon.retreat ?? 0) >
                      pokemon.attachedEnergies.length
                  }
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    "bg-blue-600/20 text-blue-300 hover:bg-blue-600/40 border border-blue-500/20",
                    "disabled:opacity-40 disabled:cursor-not-allowed",
                  )}
                >
                  → {bench.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

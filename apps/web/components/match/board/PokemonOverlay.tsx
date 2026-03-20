"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { SanitizedPokemonCardView } from "@/types/match-online";

const typeToSmallImage: Record<string, string> = {
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

const conditionColors: Record<string, string> = {
  Poisoned: "bg-purple-600",
  Burned: "bg-orange-600",
  Asleep: "bg-indigo-600",
  Paralyzed: "bg-yellow-600",
  Confused: "bg-pink-600",
};

const conditionLabels: Record<string, string> = {
  Poisoned: "PSN",
  Burned: "BRN",
  Asleep: "SLP",
  Paralyzed: "PAR",
  Confused: "CNF",
};

interface PokemonOverlayProps {
  pokemon: SanitizedPokemonCardView;
  compact?: boolean;
}

export function PokemonOverlay({
  pokemon,
  compact = false,
}: PokemonOverlayProps) {
  const currentHp = Math.max(0, pokemon.hp - pokemon.damageCounters);
  const hpPercent = (currentHp / pokemon.hp) * 100;

  // Damage pop animation
  const prevDamageRef = useRef(pokemon.damageCounters);
  const [damagePop, setDamagePop] = useState<number | null>(null);
  const [hpFlash, setHpFlash] = useState(false);

  useEffect(() => {
    const diff = pokemon.damageCounters - prevDamageRef.current;
    if (diff > 0) {
      setDamagePop(diff);
      setHpFlash(true);
      const timer1 = setTimeout(() => setDamagePop(null), 1200);
      const timer2 = setTimeout(() => setHpFlash(false), 600);
      prevDamageRef.current = pokemon.damageCounters;
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
    prevDamageRef.current = pokemon.damageCounters;
  }, [pokemon.damageCounters]);

  return (
    <>
      {/* HP bar at bottom */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-2 bg-black/60 overflow-hidden",
          hpFlash && "animate-pulse",
        )}
      >
        <motion.div
          className={cn(
            "h-full",
            hpPercent > 50
              ? "bg-emerald-500"
              : hpPercent > 25
                ? "bg-yellow-500"
                : "bg-red-500",
          )}
          animate={{ width: `${hpPercent}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        {/* Flash overlay on damage */}
        <AnimatePresence>
          {hpFlash && (
            <motion.div
              initial={{ opacity: 0.8 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 bg-red-500"
            />
          )}
        </AnimatePresence>
      </div>

      {/* HP text */}
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 bg-black/70 rounded px-1 py-0.5">
        <span
          className={cn(
            "text-[9px] font-bold",
            hpPercent > 50
              ? "text-emerald-400"
              : hpPercent > 25
                ? "text-yellow-400"
                : "text-red-400",
          )}
        >
          {currentHp}/{pokemon.hp}
        </span>
      </div>

      {/* Damage pop */}
      <AnimatePresence>
        {damagePop !== null && (
          <motion.div
            initial={{ opacity: 1, y: 0, scale: 0.5 }}
            animate={{ opacity: 0, y: -30, scale: 1.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
          >
            <span className="text-lg font-black text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]">
              -{damagePop}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Damage counters */}
      {pokemon.damageCounters > 0 && !compact && (
        <motion.div
          key={pokemon.damageCounters}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 15 }}
          className="absolute top-1 right-1 bg-red-600 rounded-full w-6 h-6 flex items-center justify-center shadow-lg shadow-red-600/40"
        >
          <span className="text-white text-[9px] font-bold">
            {pokemon.damageCounters}
          </span>
        </motion.div>
      )}

      {/* Special conditions */}
      {pokemon.specialConditions.length > 0 && (
        <div className="absolute top-1 left-1 flex flex-col gap-0.5">
          {pokemon.specialConditions.map((condition) => (
            <motion.div
              key={condition}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                "rounded px-1 py-0.5 text-[7px] font-bold text-white",
                conditionColors[condition] ?? "bg-gray-600",
              )}
            >
              {conditionLabels[condition] ??
                condition.slice(0, 3).toUpperCase()}
            </motion.div>
          ))}
        </div>
      )}

      {/* Attached energies below card */}
      {pokemon.attachedEnergies.length > 0 && !compact && (
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-0.5">
          {pokemon.attachedEnergies.map((energy) => {
            const typeImg = energy.provides?.[0]
              ? typeToSmallImage[energy.provides[0]]
              : null;
            return typeImg ? (
              <motion.div
                key={energy.instanceId}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  damping: 15,
                }}
                className="w-3.5 h-3.5 relative"
              >
                <Image
                  src={typeImg}
                  alt={energy.name}
                  fill
                  className="object-contain"
                  sizes="14px"
                />
              </motion.div>
            ) : (
              <motion.div
                key={energy.instanceId}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-3.5 h-3.5 rounded-full bg-gray-500 border border-white/30"
                title={energy.name}
              />
            );
          })}
        </div>
      )}
    </>
  );
}

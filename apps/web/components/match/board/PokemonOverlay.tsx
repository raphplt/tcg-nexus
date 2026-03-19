"use client";

import Image from "next/image";
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

export function PokemonOverlay({ pokemon, compact = false }: PokemonOverlayProps) {
  const currentHp = Math.max(0, pokemon.hp - pokemon.damageCounters);
  const hpPercent = (currentHp / pokemon.hp) * 100;

  return (
    <>
      {/* HP bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-black/60">
        <div
          className={cn(
            "h-full transition-all duration-500",
            hpPercent > 50
              ? "bg-emerald-500"
              : hpPercent > 25
                ? "bg-yellow-500"
                : "bg-red-500",
          )}
          style={{ width: `${hpPercent}%` }}
        />
      </div>

      {/* HP text */}
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 bg-black/70 rounded px-1 py-0.5">
        <span className={cn(
          "text-[9px] font-bold",
          hpPercent > 50 ? "text-emerald-400" : hpPercent > 25 ? "text-yellow-400" : "text-red-400",
        )}>
          {currentHp}/{pokemon.hp}
        </span>
      </div>

      {/* Damage counters */}
      {pokemon.damageCounters > 0 && !compact && (
        <div className="absolute top-1 right-1 bg-red-600 rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
          <span className="text-white text-[9px] font-bold">
            {pokemon.damageCounters}
          </span>
        </div>
      )}

      {/* Special conditions */}
      {pokemon.specialConditions.length > 0 && (
        <div className="absolute top-1 left-1 flex flex-col gap-0.5">
          {pokemon.specialConditions.map((condition) => (
            <div
              key={condition}
              className={cn(
                "rounded px-1 py-0.5 text-[7px] font-bold text-white",
                conditionColors[condition] ?? "bg-gray-600",
              )}
            >
              {conditionLabels[condition] ?? condition.slice(0, 3).toUpperCase()}
            </div>
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
              <div key={energy.instanceId} className="w-3.5 h-3.5 relative">
                <Image
                  src={typeImg}
                  alt={energy.name}
                  fill
                  className="object-contain"
                  sizes="14px"
                />
              </div>
            ) : (
              <div
                key={energy.instanceId}
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

"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

const CARD_BACK = "/images/carte-pokemon-dos.jpg";

const sizeClasses = {
  sm: "w-16 h-[88px]",
  md: "w-24 h-[132px]",
  lg: "w-32 h-[176px]",
  xl: "w-40 h-[220px]",
} as const;

interface GameCardProps {
  image?: string;
  name: string;
  faceDown?: boolean;
  size?: keyof typeof sizeClasses;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
  highlighted?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export function GameCard({
  image,
  name,
  faceDown = false,
  size = "md",
  className,
  onClick,
  selected = false,
  highlighted = false,
  disabled = false,
  style,
}: GameCardProps) {
  const src = faceDown
    ? CARD_BACK
    : image
      ? `${image}/high.png`
      : null;

  return (
    <div
      className={cn(
        "relative flex-shrink-0 rounded-lg overflow-hidden",
        "transition-all duration-200 ease-out",
        sizeClasses[size],
        onClick && !disabled && "cursor-pointer hover:scale-105 hover:z-10",
        selected && "ring-3 ring-blue-400 shadow-[0_0_16px_rgba(96,165,250,0.5)] -translate-y-2 z-20",
        highlighted && "ring-3 ring-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.5)] animate-pulse",
        disabled && "opacity-60 cursor-default",
        className,
      )}
      style={style}
      onClick={!disabled ? onClick : undefined}
      title={name}
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          fill
          className="object-cover"
          sizes={size === "xl" ? "160px" : size === "lg" ? "128px" : size === "md" ? "96px" : "64px"}
          unoptimized={src.includes("tcgdex.net")}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-slate-700 to-slate-900 flex items-center justify-center p-1">
          <span className="text-white text-[10px] text-center font-medium leading-tight">
            {name}
          </span>
        </div>
      )}
    </div>
  );
}

export function EmptySlot({
  size = "md",
  className,
  onClick,
  highlighted = false,
  label,
}: {
  size?: keyof typeof sizeClasses;
  className?: string;
  onClick?: () => void;
  highlighted?: boolean;
  label?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex-shrink-0 rounded-lg border-2 border-dashed",
        "flex items-center justify-center",
        sizeClasses[size],
        "border-white/20 bg-white/5",
        onClick && "cursor-pointer hover:border-white/40 hover:bg-white/10",
        highlighted && "border-emerald-400/60 bg-emerald-400/10 shadow-[0_0_12px_rgba(52,211,153,0.3)]",
        className,
      )}
      onClick={onClick}
    >
      {label && (
        <span className="text-[9px] text-white/40 uppercase tracking-wider">
          {label}
        </span>
      )}
    </div>
  );
}

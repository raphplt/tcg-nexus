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
  const src = faceDown ? CARD_BACK : image ? `${image}/high.png` : null;

  return (
    <div
      className={cn(
        "game-card group relative flex-shrink-0 overflow-hidden rounded-[0.9rem] border border-white/10 bg-black/20 shadow-[0_18px_40px_-24px_rgba(2,6,23,0.9)]",
        "transition-all duration-200 ease-out",
        sizeClasses[size],
        onClick &&
          !disabled &&
          "cursor-pointer hover:scale-105 hover:z-10 hover:-translate-y-1",
        selected &&
          "ring-3 ring-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.5)] -translate-y-2 z-20",
        highlighted &&
          "ring-3 ring-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.5)] animate-pulse",
        disabled && "opacity-60 cursor-default",
        className,
      )}
      style={{
        ...style,
        transformStyle: "preserve-3d",
      }}
      onClick={!disabled ? onClick : undefined}
      title={name}
      onMouseMove={
        onClick && !disabled
          ? (e) => {
              const card = e.currentTarget;
              const rect = card.getBoundingClientRect();
              const x = (e.clientX - rect.left) / rect.width;
              const y = (e.clientY - rect.top) / rect.height;
              const rotateX = (y - 0.5) * -8;
              const rotateY = (x - 0.5) * 8;
              card.style.transform = `perspective(400px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) ${
                selected ? "translateY(-8px)" : ""
              }`;
            }
          : undefined
      }
      onMouseLeave={
        onClick && !disabled
          ? (e) => {
              e.currentTarget.style.transform = "";
            }
          : undefined
      }
    >
      {/* Hover glow effect */}
      {onClick && !disabled && (
        <div className="absolute -inset-1 rounded-xl bg-white/0 group-hover:bg-white/5 transition-colors pointer-events-none" />
      )}

      {src ? (
        <Image
          src={src}
          alt={name}
          fill
          className="object-cover"
          sizes={
            size === "xl"
              ? "160px"
              : size === "lg"
                ? "128px"
                : size === "md"
                  ? "96px"
                  : "64px"
          }
          unoptimized={src.includes("tcgdex.net")}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-slate-700 to-slate-900 p-1">
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
        "relative flex-shrink-0 rounded-[0.9rem] border-2 border-dashed",
        "flex items-center justify-center transition-all duration-300",
        sizeClasses[size],
        "border-white/20 bg-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
        onClick && "cursor-pointer hover:border-white/40 hover:bg-white/10",
        highlighted &&
          "border-emerald-400/60 bg-emerald-400/10 shadow-[0_0_16px_rgba(52,211,153,0.3)] animate-pulse",
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

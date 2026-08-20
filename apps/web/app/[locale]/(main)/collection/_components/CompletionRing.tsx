"use client";

import { cn } from "@/lib/utils";

interface CompletionRingProps {
  percent: number;
  size?: number;
  className?: string;
}

/**
 * Circular completion gauge used on Master Set cards. Drawn as an SVG rather
 * than a bar: a Master Set is an all-or-nothing goal, and the ring reads as a
 * trophy progress at a glance.
 */
export function CompletionRing({
  percent,
  size = 56,
  className,
}: CompletionRingProps) {
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.min(100, Math.max(0, percent)) / 100) * circumference;

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          className="stroke-amber-500 transition-[stroke-dasharray] duration-700 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums">
        {Math.round(percent)}%
      </span>
    </div>
  );
}

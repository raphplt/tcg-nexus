"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { MatchPromptResponseInput } from "@/components/match/MatchBoardView";
import { cn } from "@/lib/utils";
import type { PendingPromptView } from "@/types/match-online";

interface PromptOverlayProps {
  prompt: PendingPromptView;
  isBusy?: boolean;
  onRespond: (response: MatchPromptResponseInput) => void;
}

export function PromptOverlay({
  prompt,
  isBusy = false,
  onRespond,
}: PromptOverlayProps) {
  const [selections, setSelections] = useState<string[]>([]);
  const [numericChoice, setNumericChoice] = useState<number | null>(null);

  useEffect(() => {
    setSelections([]);
    setNumericChoice(null);
  }, [prompt.id]);

  const isReady = useMemo(() => {
    if (prompt.type === "CHOOSE_MULLIGAN_DRAW") {
      return numericChoice !== null || selections.length > 0;
    }
    if (prompt.allowPass && selections.length === 0) {
      return true;
    }
    return selections.length >= prompt.minSelections;
  }, [prompt, numericChoice, selections]);

  const submit = (pass = false) => {
    if (pass) {
      onRespond({ promptId: prompt.id, selections: [] });
      return;
    }
    if (prompt.type === "CHOOSE_MULLIGAN_DRAW") {
      onRespond({
        promptId: prompt.id,
        numericChoice: numericChoice ?? Number(selections[0] || 0),
      });
      return;
    }
    onRespond({ promptId: prompt.id, selections });
  };

  const toggleOption = (value: string) => {
    if (prompt.maxSelections === 1) {
      setSelections([value]);
      if (prompt.type === "CHOOSE_MULLIGAN_DRAW") {
        setNumericChoice(Number(value));
      }
      return;
    }
    setSelections((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : prev.length >= prompt.maxSelections
          ? prev
          : [...prev, value],
    );
  };

  const hasImages = prompt.options.some((o) => o.image);

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className={cn(
          "mx-4 bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden",
          hasImages ? "w-full max-w-2xl" : "w-full max-w-lg",
        )}
      >
        {/* Title */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600/30 to-purple-600/30 border-b border-white/10">
          <h3 className="text-lg font-bold text-white">
            {prompt.title}
          </h3>
        </div>

        {/* Options */}
        <div className="p-6">
          {hasImages ? (
            <div className="flex flex-wrap justify-center gap-4 mb-6">
              {prompt.options.map((option) => {
                const selected = selections.includes(option.value);
                return (
                  <button
                    key={option.value}
                    onClick={() => toggleOption(option.value)}
                    disabled={isBusy}
                    className={cn(
                      "group relative flex flex-col items-center gap-2 rounded-xl p-2 transition-all",
                      "border-2",
                      selected
                        ? "border-blue-400 bg-blue-600/20 shadow-[0_0_20px_rgba(96,165,250,0.35)] scale-105"
                        : "border-transparent hover:border-white/20 hover:bg-white/5",
                      isBusy && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    <div className="relative w-28 h-38.5 rounded-lg overflow-hidden shadow-lg">
                      {option.image ? (
                        <Image
                          src={`${option.image}/high.png`}
                          alt={option.label}
                          fill
                          className="object-cover"
                          sizes="112px"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white/40 text-xs">
                          {option.label}
                        </div>
                      )}
                      {selected && (
                        <div className="absolute inset-0 bg-blue-500/20 ring-2 ring-blue-400 rounded-lg" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium max-w-30 truncate",
                        selected
                          ? "text-blue-300"
                          : "text-white/70",
                      )}
                    >
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 mb-6">
              {prompt.options.map((option) => {
                const selected = selections.includes(option.value);
                return (
                  <button
                    key={option.value}
                    onClick={() => toggleOption(option.value)}
                    disabled={isBusy}
                    className={cn(
                      "px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                      "border-2",
                      selected
                        ? "border-blue-400 bg-blue-600/30 text-white shadow-[0_0_12px_rgba(96,165,250,0.3)]"
                        : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:border-white/20",
                      isBusy && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    <span>{option.label}</span>
                    {option.description && (
                      <span className="block text-[10px] text-white/50 mt-0.5">
                        {option.description}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => submit()}
              disabled={!isReady || isBusy}
              className={cn(
                "flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all",
                isReady
                  ? "bg-blue-600 hover:bg-blue-500 text-white"
                  : "bg-white/5 text-white/30 cursor-not-allowed",
              )}
            >
              Valider
            </button>
            {prompt.allowPass && (
              <button
                onClick={() => submit(true)}
                disabled={isBusy}
                className={cn(
                  "px-4 py-2.5 rounded-lg text-sm font-medium",
                  "bg-white/10 text-white/70 hover:bg-white/20 transition-colors",
                  isBusy && "opacity-50 cursor-not-allowed",
                )}
              >
                Passer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

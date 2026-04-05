"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { MatchPromptResponseInput } from "@/components/match/MatchBoardView";
import { cn } from "@/lib/utils";
import type { PendingPromptView } from "@/types/match-online";

interface CoinFlipOverlayProps {
  prompt: PendingPromptView;
  isBusy?: boolean;
  onRespond: (response: MatchPromptResponseInput) => void;
}

type Phase = "intro" | "flipping" | "result" | "choose";

const FLIP_DURATION = 2200;
const RESULT_PAUSE = 1400;

export function CoinFlipOverlay({
  prompt,
  isBusy = false,
  onRespond,
}: CoinFlipOverlayProps) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [selected, setSelected] = useState<string | null>(null);

  const winnerName = (prompt.metadata?.coinFlipWinnerName as string) ?? "???";

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("flipping"), 600);
    const t2 = setTimeout(() => setPhase("result"), 600 + FLIP_DURATION);
    const t3 = setTimeout(
      () => setPhase("choose"),
      600 + FLIP_DURATION + RESULT_PAUSE,
    );
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const submit = () => {
    if (!selected) return;
    onRespond({ promptId: prompt.id, selections: [selected] });
  };

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6">
        <AnimatePresence mode="wait">
          {/* Coin flip animation */}
          {(phase === "intro" ||
            phase === "flipping" ||
            phase === "result") && (
            <motion.div
              key="coin-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30, scale: 0.9 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center gap-5"
            >
              {/* Title */}
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xl font-bold text-white/90"
              >
                Pile ou Face !
              </motion.h2>

              {/* Coin */}
              <div className="relative h-32 w-32" style={{ perspective: 800 }}>
                <motion.div
                  className="absolute inset-0"
                  animate={
                    phase === "flipping"
                      ? {
                          rotateX: [0, 1800],
                          y: [0, -80, -60, -40, -20, 0],
                        }
                      : phase === "result"
                        ? { rotateX: 0, y: 0 }
                        : { rotateX: 0, y: 0 }
                  }
                  transition={
                    phase === "flipping"
                      ? {
                          rotateX: {
                            duration: FLIP_DURATION / 1000,
                            ease: [0.22, 0.61, 0.36, 1],
                          },
                          y: {
                            duration: FLIP_DURATION / 1000,
                            ease: "easeOut",
                            times: [0, 0.2, 0.4, 0.6, 0.8, 1],
                          },
                        }
                      : { duration: 0.3 }
                  }
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {/* Heads */}
                  <div
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 shadow-[0_0_30px_rgba(251,191,36,0.4)] border-4 border-amber-600/40"
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-3xl">&#9733;</span>
                      <span className="text-[10px] font-bold text-amber-900/70 uppercase tracking-wider">
                        Pile
                      </span>
                    </div>
                  </div>
                  {/* Tails */}
                  <div
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-gradient-to-br from-slate-300 via-gray-400 to-slate-500 shadow-[0_0_30px_rgba(148,163,184,0.4)] border-4 border-slate-600/40"
                    style={{
                      backfaceVisibility: "hidden",
                      transform: "rotateX(180deg)",
                    }}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-3xl">&#9826;</span>
                      <span className="text-[10px] font-bold text-slate-900/70 uppercase tracking-wider">
                        Face
                      </span>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Result text */}
              {phase === "result" && (
                <motion.p
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                  className="text-lg font-bold text-amber-300"
                >
                  {winnerName} remporte le tirage !
                </motion.p>
              )}
            </motion.div>
          )}

          {/* Choice phase */}
          {phase === "choose" && (
            <motion.div
              key="choose-section"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-lg mx-4 bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 bg-gradient-to-r from-amber-600/20 to-purple-600/20 border-b border-white/10">
                <h3 className="text-lg font-bold text-white">
                  {winnerName}, qui commence ?
                </h3>
                <p className="text-xs text-white/50 mt-1">
                  Vous avez remporte le pile ou face
                </p>
              </div>

              <div className="p-6">
                <div className="flex flex-wrap gap-3 mb-6">
                  {prompt.options.map((option) => {
                    const isSelected = selected === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => setSelected(option.value)}
                        disabled={isBusy}
                        className={cn(
                          "flex-1 min-w-[140px] px-5 py-3 rounded-xl text-sm font-semibold transition-all",
                          "border-2",
                          isSelected
                            ? "border-amber-400 bg-amber-500/20 text-white shadow-[0_0_16px_rgba(251,191,36,0.3)]"
                            : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:border-white/20",
                          isBusy && "opacity-50 cursor-not-allowed",
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={submit}
                  disabled={!selected || isBusy}
                  className={cn(
                    "w-full px-4 py-2.5 rounded-lg text-sm font-bold transition-all",
                    selected
                      ? "bg-amber-500 hover:bg-amber-400 text-black"
                      : "bg-white/5 text-white/30 cursor-not-allowed",
                  )}
                >
                  Valider
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

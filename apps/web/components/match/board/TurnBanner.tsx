"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface TurnBannerProps {
  activePlayerId: string | null;
  enginePlayerId: string | null;
  turnNumber: number;
}

export function TurnBanner({
  activePlayerId,
  enginePlayerId,
  turnNumber,
}: TurnBannerProps) {
  const [visible, setVisible] = useState(false);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const prevActiveRef = useRef(activePlayerId);

  useEffect(() => {
    if (
      activePlayerId &&
      prevActiveRef.current !== null &&
      prevActiveRef.current !== activePlayerId
    ) {
      setIsMyTurn(activePlayerId === enginePlayerId);
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 2000);
      return () => clearTimeout(timer);
    }
    prevActiveRef.current = activePlayerId;
  }, [activePlayerId, enginePlayerId]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 z-[80] flex items-center justify-center pointer-events-none"
        >
          {/* Backdrop flash */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ duration: 1.5 }}
            className={cn(
              "absolute inset-0",
              isMyTurn
                ? "bg-emerald-500"
                : "bg-red-500",
            )}
          />

          {/* Banner */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 1.2, opacity: 0, y: -10 }}
            transition={{
              type: "spring",
              damping: 12,
              stiffness: 200,
            }}
            className="relative text-center"
          >
            {/* Glow behind text */}
            <div
              className={cn(
                "absolute inset-0 blur-3xl opacity-60 -z-10 scale-150",
                isMyTurn
                  ? "bg-emerald-500"
                  : "bg-red-500",
              )}
            />

            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className={cn(
                "h-0.5 mx-auto mb-3 rounded-full",
                isMyTurn
                  ? "bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
                  : "bg-gradient-to-r from-transparent via-red-400 to-transparent",
              )}
              style={{ maxWidth: 300 }}
            />

            <h2
              className={cn(
                "text-4xl md:text-5xl font-black uppercase tracking-wider",
                isMyTurn
                  ? "text-emerald-300 drop-shadow-[0_0_40px_rgba(52,211,153,0.6)]"
                  : "text-red-300 drop-shadow-[0_0_40px_rgba(248,113,113,0.6)]",
              )}
            >
              {isMyTurn ? "Votre tour" : "Tour adverse"}
            </h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-2 text-sm text-white/50 font-medium tracking-widest uppercase"
            >
              Tour {turnNumber}
            </motion.p>

            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className={cn(
                "h-0.5 mx-auto mt-3 rounded-full",
                isMyTurn
                  ? "bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
                  : "bg-gradient-to-r from-transparent via-red-400 to-transparent",
              )}
              style={{ maxWidth: 300 }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

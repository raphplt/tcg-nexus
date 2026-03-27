"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  LogOut,
  Play,
  Settings,
  Flag,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface PauseMenuProps {
  onForfeit?: () => void;
  sessionStatus: string;
}

export function PauseMenu({ onForfeit, sessionStatus }: PauseMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmForfeit, setConfirmForfeit] = useState(false);
  const router = useRouter();

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
    setConfirmForfeit(false);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [toggle]);

  const isFinished = sessionStatus === "FINISHED";

  return (
    <>
      {/* Gear button */}
      <button
        onClick={toggle}
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-lg transition-all",
          "text-white/50 hover:text-white hover:bg-white/10",
        )}
        title="Menu (Échap)"
      >
        <Settings className="w-4 h-4" />
      </button>

      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md"
            onClick={(e) => {
              if (e.target === e.currentTarget) toggle();
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-sm mx-4"
            >
              <div className="bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                  <h2 className="text-lg font-bold text-white tracking-wide">
                    Pause
                  </h2>
                  <button
                    onClick={toggle}
                    className="text-white/40 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Menu items */}
                <div className="p-4 space-y-2">
                  <MenuButton
                    icon={<Play className="w-5 h-5" />}
                    label="Reprendre"
                    sublabel="Échap"
                    onClick={toggle}
                    variant="primary"
                  />

                  <MenuButton
                    icon={<LogOut className="w-5 h-5" />}
                    label="Quitter la partie"
                    sublabel="Retour au lobby"
                    onClick={() => router.push("/play")}
                  />

                  {!isFinished && onForfeit && (
                    <>
                      {!confirmForfeit ? (
                        <MenuButton
                          icon={<Flag className="w-5 h-5" />}
                          label="Abandonner"
                          sublabel="Déclarer forfait"
                          onClick={() => setConfirmForfeit(true)}
                          variant="danger"
                        />
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="bg-red-950/50 border border-red-500/30 rounded-xl p-4 space-y-3"
                        >
                          <p className="text-sm text-red-200">
                            Êtes-vous sûr ? Vous perdrez cette
                            partie.
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                onForfeit();
                                toggle();
                              }}
                              className="flex-1 px-4 py-2 rounded-lg text-sm font-bold bg-red-600 hover:bg-red-500 text-white transition-colors"
                            >
                              Confirmer
                            </button>
                            <button
                              onClick={() => setConfirmForfeit(false)}
                              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-white/10 text-white/70 hover:bg-white/20 transition-colors"
                            >
                              Annuler
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function MenuButton({
  icon,
  label,
  sublabel,
  onClick,
  variant = "default",
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onClick: () => void;
  variant?: "default" | "primary" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all text-left",
        variant === "primary" &&
          "bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/20",
        variant === "default" &&
          "bg-white/5 text-white/80 hover:bg-white/10 border border-white/5",
        variant === "danger" &&
          "bg-red-600/10 text-red-300 hover:bg-red-600/20 border border-red-500/20",
      )}
    >
      {icon}
      <div>
        <div className="text-sm font-semibold">{label}</div>
        {sublabel && (
          <div className="text-[11px] opacity-60">{sublabel}</div>
        )}
      </div>
    </button>
  );
}

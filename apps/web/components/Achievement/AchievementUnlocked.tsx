'use client';

import { useEffect, useState } from 'react';
import { Trophy, X, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UserAchievement } from '@/types/achievement';
import { markAchievementAsNotified } from '@/services/achievement.service';
import { cn } from '@/lib/utils';

interface AchievementUnlockedProps {
  achievement: UserAchievement;
  onClose?: () => void;
  autoCloseDuration?: number; // en millisecondes
}

/**
 * Composant de notification pour afficher un achievement débloqué
 */
export function AchievementUnlocked({
  achievement,
  onClose,
  autoCloseDuration = 5000
}: AchievementUnlockedProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Marquer l'achievement comme notifié
    if (achievement.id) {
      markAchievementAsNotified(achievement.id).catch((err) => {
        console.error('Error marking achievement as notified:', err);
      });
    }

    // Auto-close après le délai spécifié
    if (autoCloseDuration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, autoCloseDuration);

      return () => clearTimeout(timer);
    }
  }, [achievement.id, autoCloseDuration]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose?.();
    }, 300); // Attendre la fin de l'animation
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 30
        }}
        className="fixed top-4 right-4 z-50 w-full max-w-md"
      >
        <div
          className={cn(
            'relative overflow-hidden rounded-lg border border-primary bg-gradient-to-br from-primary/20 via-background to-background',
            'shadow-2xl backdrop-blur-sm'
          )}
        >
          {/* Effet de brillance animé */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />

          <div className="relative p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <motion.div
                    initial={{ rotate: -180, scale: 0 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{
                      type: 'spring',
                      stiffness: 200,
                      damping: 20,
                      delay: 0.2
                    }}
                  >
                    <Trophy className="h-8 w-8 text-primary" />
                  </motion.div>
                  {/* Particules autour du trophée */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.5, 0] }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      repeatDelay: 0.5
                    }}
                    className="absolute -inset-2 rounded-full bg-primary/20 blur-md"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Achievement débloqué !</h3>
                  <p className="text-sm text-muted-foreground">Félicitations</p>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Contenu de l'achievement */}
            <div className="flex items-start gap-4 mb-4">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 260,
                  damping: 20,
                  delay: 0.3
                }}
                className="text-5xl"
              >
                {achievement.achievement.icon}
              </motion.div>

              <div className="flex-1">
                <h4 className="font-bold text-xl mb-1">
                  {achievement.achievement.name}
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  {achievement.achievement.description}
                </p>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                    <Star className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">
                      +{achievement.achievement.points} points
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Barre de progression pour l'auto-close */}
            {autoCloseDuration > 0 && (
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{
                  duration: autoCloseDuration / 1000,
                  ease: 'linear'
                }}
                className="h-1 bg-primary rounded-full"
              />
            )}
          </div>

          {/* Confetti effect */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(10)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  x: Math.random() * 400,
                  y: -20,
                  rotate: 0,
                  opacity: 1
                }}
                animate={{
                  y: 400,
                  rotate: Math.random() * 360,
                  opacity: 0
                }}
                transition={{
                  duration: 2,
                  delay: Math.random() * 0.5,
                  ease: 'easeOut'
                }}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  backgroundColor: [
                    '#FFD700',
                    '#FFA500',
                    '#FF6347',
                    '#4169E1',
                    '#32CD32'
                  ][i % 5]
                }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}


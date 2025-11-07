'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUnnotifiedAchievements } from '@/services/achievement.service';
import type { UserAchievement } from '@/types/achievement';
import { AchievementUnlocked } from './AchievementUnlocked';

/**
 * Provider pour afficher les notifications d'achievements
 * À placer dans le layout principal de l'application
 */
export function AchievementNotificationProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<UserAchievement[]>([]);
  const [currentNotification, setCurrentNotification] = useState<UserAchievement | null>(
    null
  );

  // Vérifier les achievements non notifiés au chargement et périodiquement
  useEffect(() => {
    if (!user?.id) return;

    const checkUnnotifiedAchievements = async () => {
      try {
        const unnotified = await getUnnotifiedAchievements();
        if (unnotified.length > 0) {
          setNotifications(unnotified);
        }
      } catch (error) {
        console.error('Error checking unnotified achievements:', error);
      }
    };

    // Vérifier immédiatement
    checkUnnotifiedAchievements();

    // Vérifier toutes les 30 secondes
    const interval = setInterval(checkUnnotifiedAchievements, 30000);

    return () => clearInterval(interval);
  }, [user?.id]);

  // Afficher les notifications une par une
  useEffect(() => {
    if (notifications.length > 0 && !currentNotification) {
      setCurrentNotification(notifications[0]);
    }
  }, [notifications, currentNotification]);

  const handleNotificationClose = () => {
    setCurrentNotification(null);
    // Retirer la notification de la liste après un court délai
    setTimeout(() => {
      setNotifications((prev) => prev.slice(1));
    }, 300);
  };

  return (
    <>
      {children}
      {currentNotification && (
        <AchievementUnlocked
          achievement={currentNotification}
          onClose={handleNotificationClose}
          autoCloseDuration={5000}
        />
      )}
    </>
  );
}


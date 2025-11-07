import apiClient from '@/utils/fetch';
import type { Achievement, UserAchievement, AchievementStats } from '@/types/achievement';

/**
 * Service pour gérer les achievements côté frontend
 */

/**
 * Récupérer tous les achievements disponibles
 */
export async function getAllAchievements(): Promise<Achievement[]> {
  const response = await apiClient.get('/achievements');
  return response.data;
}

/**
 * Récupérer un achievement par son ID
 */
export async function getAchievementById(id: number): Promise<Achievement> {
  const response = await apiClient.get(`/achievements/${id}`);
  return response.data;
}

/**
 * Récupérer tous les achievements d'un utilisateur avec leur progression
 */
export async function getUserAchievements(userId: number): Promise<UserAchievement[]> {
  const response = await apiClient.get(`/achievements/user/${userId}`);
  return response.data;
}

/**
 * Récupérer uniquement les achievements débloqués d'un utilisateur
 */
export async function getUserUnlockedAchievements(userId: number): Promise<UserAchievement[]> {
  const response = await apiClient.get(`/achievements/user/${userId}/unlocked`);
  return response.data;
}

/**
 * Récupérer les statistiques des achievements d'un utilisateur
 */
export async function getUserAchievementStats(userId: number): Promise<AchievementStats> {
  const response = await apiClient.get(`/achievements/user/${userId}/stats`);
  return response.data;
}

/**
 * Récupérer les achievements non notifiés de l'utilisateur connecté
 */
export async function getUnnotifiedAchievements(): Promise<UserAchievement[]> {
  const response = await apiClient.get('/achievements/me/unnotified');
  return response.data;
}

/**
 * Marquer un achievement comme notifié
 */
export async function markAchievementAsNotified(userAchievementId: number): Promise<void> {
  await apiClient.post(`/achievements/user-achievement/${userAchievementId}/notify`);
}


'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getUserAchievements,
  getUserAchievementStats
} from '@/services/achievement.service';
import type {
  UserAchievement,
  AchievementStats,
  AchievementCategory
} from '@/types/achievement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Lock, Star, TrendingUp } from 'lucide-react';

const categoryLabels: Record<AchievementCategory, string> = {
  account: 'Compte',
  marketplace: 'Marketplace',
  deck: 'Decks',
  tournament: 'Tournois',
  match: 'Matchs',
  collection: 'Collection'
};

const categoryIcons: Record<AchievementCategory, string> = {
  account: '👤',
  marketplace: '🏪',
  deck: '🎴',
  tournament: '🏆',
  match: '⚔️',
  collection: '📚'
};

export default function AchievementsPage() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [stats, setStats] = useState<AchievementStats | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadAchievements();
    }
  }, [user?.id]);

  const loadAchievements = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const [achievementsData, statsData] = await Promise.all([
        getUserAchievements(user.id),
        getUserAchievementStats(user.id)
      ]);
      setAchievements(achievementsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAchievements =
    selectedCategory === 'all'
      ? achievements
      : achievements.filter((ua) => ua.achievement.category === selectedCategory);

  const categories = Array.from(
    new Set(achievements.map((ua) => ua.achievement.category))
  );

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement des achievements...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <Trophy className="h-10 w-10 text-primary" />
          Mes Achievements
        </h1>
        <p className="text-muted-foreground">
          Suivez votre progression et débloquez des récompenses
        </p>
      </div>

      {/* Statistiques globales */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total achievements</CardDescription>
              <CardTitle className="text-3xl">{stats.totalAchievements}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Débloqués</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                {stats.unlockedAchievements}
                <span className="text-base text-muted-foreground">
                  / {stats.totalAchievements}
                </span>
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Progression</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                {stats.unlockedPercentage}%
                <TrendingUp className="h-6 w-6 text-green-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={stats.unlockedPercentage} className="h-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Points totaux</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <Star className="h-7 w-7 text-yellow-500" />
                {stats.totalPoints}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Filtres par catégorie */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-6">
        <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto">
          <TabsTrigger value="all">
            Tous ({achievements.length})
          </TabsTrigger>
          {categories.map((category) => (
            <TabsTrigger key={category} value={category} className="gap-2">
              <span>{categoryIcons[category]}</span>
              {categoryLabels[category]} (
              {achievements.filter((ua) => ua.achievement.category === category).length})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Liste des achievements */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAchievements.map((userAchievement) => {
          const achievement = userAchievement.achievement;
          const isUnlocked = userAchievement.isUnlocked;
          const progressPercentage =
            userAchievement.progressPercentage !== undefined
              ? userAchievement.progressPercentage
              : 0;

          return (
            <Card
              key={achievement.id}
              className={`transition-all hover:shadow-lg ${
                isUnlocked
                  ? 'border-primary bg-gradient-to-br from-primary/5 to-transparent'
                  : 'opacity-75 grayscale-[50%]'
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`text-4xl ${
                        isUnlocked ? 'animate-pulse' : 'opacity-50'
                      }`}
                    >
                      {isUnlocked ? achievement.icon : <Lock className="h-10 w-10" />}
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {isUnlocked ? achievement.name : '???'}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {isUnlocked || !achievement.isSecret
                          ? achievement.description
                          : 'Achievement secret'}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {isUnlocked && (
                      <Badge variant="default" className="gap-1">
                        <Star className="h-3 w-3" />
                        {achievement.points}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {categoryIcons[achievement.category]}{' '}
                      {categoryLabels[achievement.category]}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {!isUnlocked && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progression</span>
                      <span className="font-medium">
                        {userAchievement.progress} / {achievement.target}
                      </span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                  </div>
                )}

                {isUnlocked && userAchievement.unlockedAt && (
                  <div className="text-sm text-muted-foreground">
                    Débloqué le{' '}
                    {new Date(userAchievement.unlockedAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredAchievements.length === 0 && (
        <div className="text-center py-12">
          <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Aucun achievement dans cette catégorie</h3>
          <p className="text-muted-foreground">
            Continuez à jouer pour débloquer de nouveaux achievements !
          </p>
        </div>
      )}
    </div>
  );
}


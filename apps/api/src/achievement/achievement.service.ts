import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Achievement, AchievementType } from './entities/achievement.entity';
import { UserAchievement } from './entities/user-achievement.entity';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { UpdateAchievementDto } from './dto/update-achievement.dto';
import { UserAchievementResponseDto } from './dto/user-achievement-response.dto';

@Injectable()
export class AchievementService {
  constructor(
    @InjectRepository(Achievement)
    private achievementRepository: Repository<Achievement>,
    @InjectRepository(UserAchievement)
    private userAchievementRepository: Repository<UserAchievement>
  ) {}

  // ==================== CRUD ACHIEVEMENTS ====================

  async createAchievement(
    createAchievementDto: CreateAchievementDto
  ): Promise<Achievement> {
    const existing = await this.achievementRepository.findOne({
      where: { code: createAchievementDto.code }
    });

    if (existing) {
      throw new ConflictException(
        `Achievement with code ${createAchievementDto.code} already exists`
      );
    }

    const achievement = this.achievementRepository.create(createAchievementDto);
    return this.achievementRepository.save(achievement);
  }

  async findAllAchievements(): Promise<Achievement[]> {
    return this.achievementRepository.find({
      where: { isActive: true },
      order: { category: 'ASC', target: 'ASC' }
    });
  }

  async findAchievementById(id: number): Promise<Achievement> {
    const achievement = await this.achievementRepository.findOne({
      where: { id }
    });

    if (!achievement) {
      throw new NotFoundException(`Achievement with ID ${id} not found`);
    }

    return achievement;
  }

  async findAchievementByType(type: AchievementType): Promise<Achievement> {
    const achievement = await this.achievementRepository.findOne({
      where: { type, isActive: true }
    });

    if (!achievement) {
      throw new NotFoundException(`Achievement with type ${type} not found`);
    }

    return achievement;
  }

  async updateAchievement(
    id: number,
    updateAchievementDto: UpdateAchievementDto
  ): Promise<Achievement> {
    const achievement = await this.findAchievementById(id);

    Object.assign(achievement, updateAchievementDto);
    return this.achievementRepository.save(achievement);
  }

  async deleteAchievement(id: number): Promise<void> {
    const achievement = await this.findAchievementById(id);
    await this.achievementRepository.remove(achievement);
  }

  // ==================== USER ACHIEVEMENTS ====================

  /**
   * Récupère tous les achievements d'un utilisateur avec leur progression
   */
  async getUserAchievements(userId: number): Promise<UserAchievementResponseDto[]> {
    const allAchievements = await this.findAllAchievements();

    const userAchievements = await this.userAchievementRepository.find({
      where: { userId },
      relations: ['achievement']
    });

    // Créer une map pour un accès rapide
    const userAchievementMap = new Map(
      userAchievements.map((ua) => [ua.achievementId, ua])
    );

    // Construire la réponse avec tous les achievements
    return allAchievements.map((achievement) => {
      const userAchievement = userAchievementMap.get(achievement.id);

      if (userAchievement) {
        return new UserAchievementResponseDto({
          id: userAchievement.id,
          userId,
          achievement,
          progress: userAchievement.progress,
          isUnlocked: userAchievement.isUnlocked,
          unlockedAt: userAchievement.unlockedAt,
          createdAt: userAchievement.createdAt,
          updatedAt: userAchievement.updatedAt
        });
      } else {
        // Achievement pas encore commencé
        return new UserAchievementResponseDto({
          id: 0,
          userId,
          achievement,
          progress: 0,
          isUnlocked: false,
          unlockedAt: null,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    });
  }

  /**
   * Récupère uniquement les achievements débloqués d'un utilisateur
   */
  async getUserUnlockedAchievements(userId: number): Promise<UserAchievement[]> {
    return this.userAchievementRepository.find({
      where: { userId, isUnlocked: true },
      relations: ['achievement'],
      order: { unlockedAt: 'DESC' }
    });
  }

  /**
   * Incrémente la progression d'un achievement pour un utilisateur
   * Retourne l'achievement s'il vient d'être débloqué, null sinon
   */
  async incrementAchievementProgress(
    userId: number,
    achievementType: AchievementType,
    incrementBy: number = 1
  ): Promise<UserAchievement | null> {
    try {
      const achievement = await this.findAchievementByType(achievementType);

      let userAchievement = await this.userAchievementRepository.findOne({
        where: { userId, achievementId: achievement.id },
        relations: ['achievement']
      });

      // Créer l'entrée si elle n'existe pas
      if (!userAchievement) {
        userAchievement = this.userAchievementRepository.create({
          userId,
          achievementId: achievement.id,
          progress: 0,
          isUnlocked: false
        });
      }

      // Si déjà débloqué, ne rien faire
      if (userAchievement.isUnlocked) {
        return null;
      }

      // Incrémenter la progression
      userAchievement.progress += incrementBy;

      // Vérifier si l'achievement est débloqué
      if (userAchievement.progress >= achievement.target) {
        userAchievement.isUnlocked = true;
        userAchievement.unlockedAt = new Date();
        userAchievement.progress = achievement.target; // Cap à la target
      }

      await this.userAchievementRepository.save(userAchievement);

      // Retourner l'achievement avec la relation si débloqué
      if (userAchievement.isUnlocked && !userAchievement.achievement) {
        userAchievement.achievement = achievement;
      }

      return userAchievement.isUnlocked ? userAchievement : null;
    } catch (error) {
      // Si l'achievement n'existe pas, on ignore silencieusement
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Définit directement la progression d'un achievement (utile pour certains cas spécifiques)
   */
  async setAchievementProgress(
    userId: number,
    achievementType: AchievementType,
    progress: number
  ): Promise<UserAchievement | null> {
    try {
      const achievement = await this.findAchievementByType(achievementType);

      let userAchievement = await this.userAchievementRepository.findOne({
        where: { userId, achievementId: achievement.id },
        relations: ['achievement']
      });

      if (!userAchievement) {
        userAchievement = this.userAchievementRepository.create({
          userId,
          achievementId: achievement.id,
          progress: 0,
          isUnlocked: false
        });
      }

      // Si déjà débloqué, ne rien faire
      if (userAchievement.isUnlocked) {
        return null;
      }

      userAchievement.progress = progress;

      // Vérifier si l'achievement est débloqué
      if (userAchievement.progress >= achievement.target) {
        userAchievement.isUnlocked = true;
        userAchievement.unlockedAt = new Date();
        userAchievement.progress = achievement.target;
      }

      await this.userAchievementRepository.save(userAchievement);

      if (userAchievement.isUnlocked && !userAchievement.achievement) {
        userAchievement.achievement = achievement;
      }

      return userAchievement.isUnlocked ? userAchievement : null;
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Débloquer directement un achievement (pour les achievements instantanés)
   */
  async unlockAchievement(
    userId: number,
    achievementType: AchievementType
  ): Promise<UserAchievement | null> {
    try {
      const achievement = await this.findAchievementByType(achievementType);

      let userAchievement = await this.userAchievementRepository.findOne({
        where: { userId, achievementId: achievement.id },
        relations: ['achievement']
      });

      // Si déjà débloqué, ne rien faire
      if (userAchievement?.isUnlocked) {
        return null;
      }

      if (!userAchievement) {
        userAchievement = this.userAchievementRepository.create({
          userId,
          achievementId: achievement.id,
          progress: achievement.target,
          isUnlocked: true,
          unlockedAt: new Date()
        });
      } else {
        userAchievement.progress = achievement.target;
        userAchievement.isUnlocked = true;
        userAchievement.unlockedAt = new Date();
      }

      await this.userAchievementRepository.save(userAchievement);

      if (!userAchievement.achievement) {
        userAchievement.achievement = achievement;
      }

      return userAchievement;
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Marque un achievement comme notifié
   */
  async markAsNotified(userAchievementId: number): Promise<void> {
    await this.userAchievementRepository.update(userAchievementId, {
      isNotified: true
    });
  }

  /**
   * Récupère les achievements non notifiés d'un utilisateur
   */
  async getUnnotifiedAchievements(userId: number): Promise<UserAchievement[]> {
    return this.userAchievementRepository.find({
      where: { userId, isUnlocked: true, isNotified: false },
      relations: ['achievement']
    });
  }

  /**
   * Statistiques des achievements pour un utilisateur
   */
  async getUserAchievementStats(userId: number) {
    const allAchievements = await this.findAllAchievements();
    const userUnlockedCount = await this.userAchievementRepository.count({
      where: { userId, isUnlocked: true }
    });

    const totalPoints = await this.userAchievementRepository
      .createQueryBuilder('ua')
      .leftJoin('ua.achievement', 'achievement')
      .select('SUM(achievement.points)', 'total')
      .where('ua.userId = :userId', { userId })
      .andWhere('ua.isUnlocked = true')
      .getRawOne();

    return {
      totalAchievements: allAchievements.length,
      unlockedAchievements: userUnlockedCount,
      unlockedPercentage: Math.round(
        (userUnlockedCount / allAchievements.length) * 100
      ),
      totalPoints: parseInt(totalPoints?.total || '0')
    };
  }
}


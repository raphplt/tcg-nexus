import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

import { Challenge } from './entities/challenge.entity';
import { ActiveChallenge } from './entities/active-challenge.entity';
import { UserChallenge } from './entities/user-challenge.entity';
import { ChallengeType, ChallengeActionType } from './enums/challenge.enum';
import { Player } from '../player/entities/player.entity';

@Injectable()
export class ChallengeService {
  private readonly logger = new Logger(ChallengeService.name);

  constructor(
    @InjectRepository(Challenge)
    private readonly challengeRepo: Repository<Challenge>,
    @InjectRepository(ActiveChallenge)
    private readonly activeChallengeRepo: Repository<ActiveChallenge>,
    @InjectRepository(UserChallenge)
    private readonly userChallengeRepo: Repository<UserChallenge>,
    @InjectRepository(Player)
    private readonly playerRepo: Repository<Player>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Fetch active challenges with current user progress
   */
  async getActiveChallenges(userId: number) {
    const activeDailies = await this.activeChallengeRepo.find({
      where: { challenge: { type: ChallengeType.DAILY } },
      relations: ['challenge'],
    });

    const activeWeeklies = await this.activeChallengeRepo.find({
      where: { challenge: { type: ChallengeType.WEEKLY } },
      relations: ['challenge'],
    });

    // Get user progress
    const userChallenges = await this.userChallengeRepo.find({
      where: { user: { id: userId } },
    });

    const mapWithProgress = (activeList: ActiveChallenge[]) => {
      return activeList.map(active => {
        const userProgress = userChallenges.find(uc => uc.activeChallenge.id === active.id);
        return {
          id: active.id,
          expiresAt: active.expiresAt,
          challenge: active.challenge,
          progress: userProgress?.progress || 0,
          isCompleted: userProgress?.isCompleted || false,
          isClaimed: userProgress?.isClaimed || false,
        };
      });
    };

    return {
      daily: mapWithProgress(activeDailies),
      weekly: mapWithProgress(activeWeeklies),
    };
  }

  /**
   * Admin / Cron: Rotate daily challenges
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async rotateDailyChallenges() {
    this.logger.log('Rotating DAILY challenges...');
    await this.activeChallengeRepo.delete({ challenge: { type: ChallengeType.DAILY } });
    
    // Pick 3 random daily challenges
    const dailies = await this.challengeRepo
      .createQueryBuilder('c')
      .where('c.type = :type', { type: ChallengeType.DAILY })
      .orderBy('RANDOM()')
      .take(3)
      .getMany();

    if (!dailies.length) return;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);
    expiresAt.setHours(0, 0, 0, 0);

    const activeDailies = dailies.map(challenge => {
      const active = new ActiveChallenge();
      active.challenge = challenge;
      active.expiresAt = expiresAt;
      return active;
    });

    await this.activeChallengeRepo.save(activeDailies);
  }

  /**
   * Admin / Cron: Rotate weekly challenges
   */
  @Cron('0 0 * * 1') // Every Monday at 00:00
  async rotateWeeklyChallenges() {
    this.logger.log('Rotating WEEKLY challenges...');
    await this.activeChallengeRepo.delete({ challenge: { type: ChallengeType.WEEKLY } });
    
    // Pick 2 random weekly challenges
    const weeklies = await this.challengeRepo
      .createQueryBuilder('c')
      .where('c.type = :type', { type: ChallengeType.WEEKLY })
      .orderBy('RANDOM()')
      .take(2)
      .getMany();

    if (!weeklies.length) return;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    expiresAt.setHours(0, 0, 0, 0);

    const activeWeeklies = weeklies.map(challenge => {
      const active = new ActiveChallenge();
      active.challenge = challenge;
      active.expiresAt = expiresAt;
      return active;
    });

    await this.activeChallengeRepo.save(activeWeeklies);
  }

  /**
   * General event listener for actions.
   * Dispatched like: this.eventEmitter.emit('action.ADD_CARD', { userId: 1 })
   */
  @OnEvent('action.*')
  async handleAction(payload: { userId: number }, eventName: string) {
    const actionTypeString = eventName.split('.')[1];
    
    // Check if it's a valid action
    if (!Object.values(ChallengeActionType).includes(actionTypeString as ChallengeActionType)) {
      return;
    }

    const actionType = actionTypeString as ChallengeActionType;
    await this.incrementProgress(payload.userId, actionType, 1);
  }

  /**
   * Internal logic to increment progress
   */
  private async incrementProgress(userId: number, actionType: ChallengeActionType, amount: number = 1) {
    // Find active challenges of this action type
    const activeChallenges = await this.activeChallengeRepo.find({
      where: { challenge: { actionType } },
      relations: ['challenge'],
    });

    for (const active of activeChallenges) {
      let userChallenge = await this.userChallengeRepo.findOne({
        where: { user: { id: userId }, activeChallenge: { id: active.id } },
      });

      if (!userChallenge) {
        userChallenge = this.userChallengeRepo.create({
          user: { id: userId } as any,
          activeChallenge: { id: active.id } as any,
          progress: 0,
          isCompleted: false,
          isClaimed: false,
        });
      }

      if (userChallenge.isCompleted) continue; // Already done

      userChallenge.progress += amount;
      
      if (userChallenge.progress >= active.challenge.targetValue) {
        userChallenge.progress = active.challenge.targetValue;
        userChallenge.isCompleted = true;
      }

      await this.userChallengeRepo.save(userChallenge);
    }
  }

  /**
   * Claim XP transaction
   */
  async claimChallenge(activeChallengeId: number, userId: number) {
    return this.dataSource.transaction(async manager => {
      const userChallenge = await manager.findOne(UserChallenge, {
        where: { user: { id: userId }, activeChallenge: { id: activeChallengeId } },
        relations: ['activeChallenge', 'activeChallenge.challenge'],
      });

      if (!userChallenge) {
        throw new NotFoundException('Progress not found for this challenge.');
      }

      if (!userChallenge.isCompleted) {
        throw new BadRequestException('Challenge is not completed yet.');
      }

      if (userChallenge.isClaimed) {
        throw new BadRequestException('Reward already claimed.');
      }

      // Mark as claimed
      userChallenge.isClaimed = true;
      await manager.save(userChallenge);

      // Give XP to player
      const player = await manager.findOne(Player, {
        where: { user: { id: userId } }
      });

      if (player) {
        player.xp += userChallenge.activeChallenge.challenge.rewardXp;
        
        // Simple level logic: 100 XP per level
        const newLevel = Math.floor(player.xp / 100) + 1;
        if (newLevel > player.level) {
          player.level = newLevel;
        }

        await manager.save(player);
      }

      return { success: true, reward: userChallenge.activeChallenge.challenge.rewardXp, newTotalXp: player?.xp };
    });
  }
}

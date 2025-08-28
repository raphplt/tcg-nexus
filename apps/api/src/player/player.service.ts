import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player } from './entities/player.entity';
import { User } from 'src/user/entities/user.entity';
import { Tournament } from 'src/tournament/entities/tournament.entity';

@Injectable()
export class PlayerService {
  constructor(
    @InjectRepository(Player)
    private readonly playerRepository: Repository<Player>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  create() {
    return 'This action adds a new player';
  }

  findAll() {
    return `This action returns all player`;
  }

  findOne(id: number) {
    return `This action returns a #${id} player`;
  }

  update(id: number) {
    return `This action updates a #${id} player`;
  }

  remove(id: number) {
    return `This action removes a #${id} player`;
  }

  /**
   * Get tournaments by player id
   */
  async getTournamentsByPlayerId(playerId: number): Promise<Tournament[]> {
    const player = await this.playerRepository.findOne({
      where: { id: playerId },
      relations: ['tournaments']
    });
    if (!player) {
      throw new NotFoundException('Player not found');
    }
    return player.tournaments || [];
  }

  /**
   * Get tournaments for a user (user -> player -> tournaments)
   */
  async getTournamentsByUserId(userId: number): Promise<Tournament[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['player', 'player.tournaments']
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.player) {
      // If business logic prefers empty array instead of error, return []
      throw new NotFoundException('Player profile not found for this user');
    }
    return user.player.tournaments || [];
  }
}

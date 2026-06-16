import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../user/entities/user.entity";
import { UserFollow } from "./entities/user-follow.entity";

@Injectable()
export class UserFollowService {
  constructor(
    @InjectRepository(UserFollow)
    private readonly followRepo: Repository<UserFollow>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async follow(followerId: number, followedId: number): Promise<UserFollow> {
    if (followerId === followedId) {
      throw new BadRequestException("Cannot follow yourself");
    }
    const followed = await this.userRepo.findOne({
      where: { id: followedId, isActive: true },
    });
    if (!followed) {
      throw new NotFoundException("User to follow not found");
    }
    const existing = await this.followRepo.findOne({
      where: { follower: { id: followerId }, followed: { id: followedId } },
    });
    if (existing) {
      return existing;
    }
    const entity = this.followRepo.create({
      follower: { id: followerId } as User,
      followed: { id: followedId } as User,
    });
    return this.followRepo.save(entity);
  }

  async unfollow(followerId: number, followedId: number): Promise<void> {
    await this.followRepo.delete({
      follower: { id: followerId },
      followed: { id: followedId },
    });
  }

  async isFollowing(
    followerId: number,
    followedId: number,
  ): Promise<boolean> {
    const count = await this.followRepo.count({
      where: { follower: { id: followerId }, followed: { id: followedId } },
    });
    return count > 0;
  }

  async countFollowers(userId: number): Promise<number> {
    return this.followRepo.count({
      where: { followed: { id: userId } },
    });
  }

  async countFollowing(userId: number): Promise<number> {
    return this.followRepo.count({
      where: { follower: { id: userId } },
    });
  }

  async listFollowers(userId: number) {
    const rows = await this.followRepo.find({
      where: { followed: { id: userId } },
      relations: ["follower", "follower.player"],
      order: { createdAt: "DESC" },
    });
    return rows.map((row) => this.toPublicUser(row.follower));
  }

  async listFollowing(userId: number) {
    const rows = await this.followRepo.find({
      where: { follower: { id: userId } },
      relations: ["followed", "followed.player"],
      order: { createdAt: "DESC" },
    });
    return rows.map((row) => this.toPublicUser(row.followed));
  }

  async getFollowedIds(followerId: number): Promise<number[]> {
    const rows = await this.followRepo.find({
      where: { follower: { id: followerId } },
      relations: ["followed"],
    });
    return rows.map((row) => row.followed.id);
  }

  private toPublicUser(user: User) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl ?? null,
      createdAt: user.createdAt,
      player: user.player
        ? {
            id: user.player.id,
            elo: user.player.elo,
            level: user.player.level,
            xp: user.player.xp,
          }
        : undefined,
    };
  }
}

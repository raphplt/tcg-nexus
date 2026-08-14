import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { Player } from "src/player/entities/player.entity";
import { Repository } from "typeorm";
import { UserFollowService } from "../user-follow/user-follow.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { PublicUserDto } from "./dto/public-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { User } from "./entities/user.entity";

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Player)
    private playerRepository: Repository<Player>,
    private readonly followService: UserFollowService,
  ) {}

  /**
   * Creates a new user entity and hashes their password.
   *
   * @param createUserDto User creation DTO.
   * @returns Newly created User entity.
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException("User with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);
    await this.ensurePlayerProfile(savedUser);
    return this.findOne(savedUser.id);
  }

  /**
   * Retrieves all registered users.
   *
   * @returns Array of User entities.
   */
  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      select: [
        "id",
        "email",
        "firstName",
        "lastName",
        "role",
        "isActive",
        "isPro",
        "preferredCurrency",
        "preferredLocale",
        "emailVerified",
        "createdAt",
        "updatedAt",
      ],
    });
  }

  /**
   * Finds a user by ID and ensures their player profile is populated.
   *
   * @param id User ID.
   * @returns Populated User entity.
   */
  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: [
        "id",
        "email",
        "firstName",
        "lastName",
        "avatarUrl",
        "role",
        "isActive",
        "isPro",
        "preferredCurrency",
        "preferredLocale",
        "emailVerified",
        "createdAt",
        "updatedAt",
      ],
      relations: ["player"],
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const hydratedUser = await this.ensurePlayerProfile(user);
    if (!hydratedUser) {
      throw new NotFoundException("User not found");
    }
    return hydratedUser;
  }

  /**
   * Finds a user entity by ID without throwing an exception.
   *
   * @param id User ID.
   * @returns User entity or null.
   */
  async findById(id: number): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ["player"],
    });
    return this.ensurePlayerProfile(user);
  }

  /**
   * Loads only the fields required to authenticate an access token.
   *
   * @param id User ID stored in the token subject.
   * @returns Minimal user entity or null.
   */
  async findForAccessToken(id: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      // colonnes scalaires uniquement (pas de relation) : plusieurs services
      // lisent le nom et la locale sur l'utilisateur courant
      select: [
        "id",
        "email",
        "firstName",
        "lastName",
        "role",
        "isActive",
        "isPro",
        "preferredLocale",
      ],
    });
  }

  /**
   * Finds a user entity by email.
   *
   * @param email User email.
   * @returns User entity or null.
   */
  async findByEmail(email: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ["player"],
    });
    return this.ensurePlayerProfile(user);
  }

  /**
   * Retrieves public profile information for a user.
   *
   * @param id User ID.
   * @param requesterId Optional requesting user ID.
   * @returns DTO containing public profile data.
   */
  async findPublicProfile(
    id: number,
    requesterId?: number,
  ): Promise<PublicUserDto> {
    const user = await this.userRepository.findOne({
      where: { id, isActive: true },
      relations: ["player"],
    });
    if (!user || !user.isActive) {
      throw new NotFoundException("User not found");
    }
    const [followersCount, followingCount] = await Promise.all([
      this.followService.countFollowers(id),
      this.followService.countFollowing(id),
    ]);
    let isFollowing: boolean | undefined;
    if (requesterId && requesterId !== id) {
      isFollowing = await this.followService.isFollowing(requesterId, id);
    }
    return PublicUserDto.fromEntities(user, user.player ?? null, {
      followersCount,
      followingCount,
      isFollowing,
    });
  }

  /**
   * Updates an existing user's profile.
   *
   * @param id User ID.
   * @param updateUserDto Update payload.
   * @returns Updated User entity.
   */
  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (existingUser) {
        throw new ConflictException("User with this email already exists");
      }
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    await this.userRepository.update(id, updateUserDto);
    return this.findOne(id);
  }

  /**
   * Updates a user's refresh token, retaining the previous token in a grace period for concurrent requests.
   *
   * @param userId User identifier.
   * @param refreshToken Plaintext refresh token or null to clear.
   */
  async updateRefreshToken(
    userId: number,
    refreshToken: string | null,
  ): Promise<void> {
    if (!refreshToken) {
      await this.userRepository.update(userId, {
        refreshToken: null,
        previousRefreshToken: null,
        previousRefreshTokenExpiresAt: null,
      });
      return;
    }

    const existing = await this.userRepository.findOne({
      where: { id: userId },
      select: ["id", "refreshToken"],
    });

    const hashed = await bcrypt.hash(refreshToken, 10);
    const previousHash = existing?.refreshToken ?? null;
    const previousExpiresAt = previousHash
      ? new Date(Date.now() + UserService.REFRESH_TOKEN_GRACE_WINDOW_MS)
      : null;

    await this.userRepository.update(userId, {
      refreshToken: hashed,
      previousRefreshToken: previousHash,
      previousRefreshTokenExpiresAt: previousExpiresAt,
    });
  }

  static readonly REFRESH_TOKEN_GRACE_WINDOW_MS = 30 * 1000;

  /**
   * Deletes a user by ID.
   *
   * @param id User ID.
   */
  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }

  private async ensurePlayerProfile(user: User | null): Promise<User | null> {
    if (!user) {
      return null;
    }

    if (user.player?.id) {
      return user;
    }

    const existingPlayer = await this.playerRepository.findOne({
      where: { user: { id: user.id } },
      relations: ["user"],
    });

    if (existingPlayer) {
      user.player = existingPlayer;
      return user;
    }

    try {
      const player = this.playerRepository.create({ user });
      user.player = await this.playerRepository.save(player);
      return user;
    } catch (error) {
      const concurrentPlayer = await this.playerRepository.findOne({
        where: { user: { id: user.id } },
        relations: ["user"],
      });

      if (concurrentPlayer) {
        user.player = concurrentPlayer;
        return user;
      }

      throw error;
    }
  }
}

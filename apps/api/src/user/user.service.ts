import {
  Injectable,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { Player } from "src/player/entities/player.entity";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { User } from "./entities/user.entity";

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Player)
    private playerRepository: Repository<Player>,
  ) {}

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
        "emailVerified",
        "createdAt",
        "updatedAt",
      ],
    });
  }

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

  async findById(id: number): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { id },
    });
    return this.ensurePlayerProfile(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ["player"],
    });
    return this.ensurePlayerProfile(user);
  }

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

  async updateRefreshToken(
    userId: number,
    refreshToken: string | null,
  ): Promise<void> {
    const updateData: { refreshToken?: string | null } = {};

    if (refreshToken) {
      updateData.refreshToken = await bcrypt.hash(refreshToken, 10);
    } else {
      updateData.refreshToken = null;
    }

    await this.userRepository.update(userId, updateData);
  }

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

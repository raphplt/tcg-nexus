import {
  Injectable,
  ConflictException,
  NotFoundException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email }
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword
    });

    return this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'role',
        'isActive',
        'isPro',
        'preferredCurrency',
        'emailVerified',
        'createdAt',
        'updatedAt'
      ]
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'role',
        'isActive',
        'isPro',
        'preferredCurrency',
        'emailVerified',
        'createdAt',
        'updatedAt'
      ]
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id }
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email }
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email }
      });
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
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
    refreshToken: string | null
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
}

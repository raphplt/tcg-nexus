import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { User } from '../user/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponse, JwtPayload } from './interfaces/auth.interface';
import { CollectionService } from 'src/collection/collection.service';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private collectionService: CollectionService
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userService.findByEmail(email);

    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }

    return null;
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const tokens = await this.generateTokens(user);
    await this.userService.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      tokens
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    if (registerDto.password !== registerDto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    try {
      const user = await this.userService.create({
        email: registerDto.email,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        password: registerDto.password
      });

      // await this.collectionService.create({
      //   name: 'wishlist',
      //   userId: user.id
      // });

      const tokens = await this.generateTokens(user);
      await this.userService.updateRefreshToken(user.id, tokens.refreshToken);

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        tokens
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Registration failed');
    }
  }

  async refreshTokens(
    userId: number,
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.userService.findById(userId);

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Access denied');
    }

    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.refreshToken
    );

    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Access denied');
    }

    const tokens = await this.generateTokens(user);
    await this.userService.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: number): Promise<void> {
    await this.userService.updateRefreshToken(userId, null);
  }

  private async generateTokens(
    user: User
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role
    };

    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    const jwtRefreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET');
    const accessTokenExpiry =
      this.configService.get<string>('JWT_EXPIRES_IN') || '15m';
    const refreshTokenExpiry =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';

    if (!jwtSecret) {
      throw new Error('JWT_SECRET must be defined in environment variables');
    }

    if (!jwtRefreshSecret) {
      throw new Error(
        'JWT_REFRESH_SECRET must be defined in environment variables'
      );
    }

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: jwtSecret,
      expiresIn: accessTokenExpiry
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: jwtRefreshSecret,
      expiresIn: refreshTokenExpiry
    });

    return {
      accessToken,
      refreshToken
    };
  }
}

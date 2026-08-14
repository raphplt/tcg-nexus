import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { CollectionService } from "src/collection/collection.service";
import { Player } from "src/player/entities/player.entity";
import { Repository } from "typeorm";
import { User } from "../user/entities/user.entity";
import { UserService } from "../user/user.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import {
  AuthResponse,
  AuthTokens,
  JwtPayload,
} from "./interfaces/auth.interface";
import { parseDurationToMs } from "./utils/parse-duration";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private collectionService: CollectionService,
  ) {}

  /**
   * Retrieves the access token TTL in milliseconds, used by controllers to align cookie maxAge.
   *
   * @returns Access token lifetime in milliseconds.
   */
  getAccessTokenTtlMs(): number {
    return parseDurationToMs(
      this.configService.get<string>("JWT_EXPIRES_IN") || "15m",
    );
  }

  /**
   * Retrieves the refresh token TTL in milliseconds.
   *
   * @returns Refresh token lifetime in milliseconds.
   */
  getRefreshTokenTtlMs(): number {
    return parseDurationToMs(
      this.configService.get<string>("JWT_REFRESH_EXPIRES_IN") || "30d",
    );
  }

  /**
   * Validates user credentials against the stored password hash.
   *
   * @param email User email address.
   * @param password Plaintext password.
   * @returns User entity if credentials match, or null.
   */
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userService.findByEmail(email);

    if (user && user.password) {
      try {
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (isPasswordValid) {
          return user;
        }
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * Authenticates a user and issues access and refresh tokens.
   *
   * @param loginDto User login payload.
   * @param validatedUser User already authenticated by the local strategy.
   * @returns Authentication payload containing user info and tokens.
   */
  async login(loginDto: LoginDto, validatedUser?: User): Promise<AuthResponse> {
    const user =
      validatedUser ??
      (await this.validateUser(loginDto.email, loginDto.password));

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!user.isActive) {
      throw new UnauthorizedException("Account is deactivated");
    }

    const tokens = await this.generateTokens(user);
    await this.userService.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      tokens,
    };
  }

  /**
   * Registers a new user and creates default collections.
   *
   * @param registerDto Registration payload.
   * @returns Authentication response for the new user.
   */
  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    if (registerDto.password !== registerDto.confirmPassword) {
      throw new BadRequestException("Passwords do not match");
    }

    try {
      const user = await this.userService.create({
        email: registerDto.email,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        password: registerDto.password,
      });

      await Promise.all([
        this.collectionService.create({
          name: "Wishlist",
          description: "Default Wishlist",
          isPublic: false,
          userId: user.id,
        }),
        this.collectionService.create({
          name: "Favorites",
          description: "Default Favorites",
          isPublic: false,
          userId: user.id,
        }),
      ]);

      const tokens = await this.generateTokens(user);
      await this.userService.updateRefreshToken(user.id, tokens.refreshToken);

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        tokens,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException("Registration failed");
    }
  }

  /**
   * Refreshes JWT access and refresh tokens for a user.
   *
   * @param userId User identifier.
   * @param refreshToken Current refresh token.
   * @returns Newly generated tokens.
   */
  async refreshTokens(
    userId: number,
    refreshToken: string,
  ): Promise<AuthTokens> {
    const user = await this.userService.findById(userId);

    if (!user) {
      throw new UnauthorizedException("Access denied");
    }

    const matchesCurrent = user.refreshToken
      ? await this.safeBcryptCompare(
          refreshToken,
          user.refreshToken,
          user.id,
          "current",
        )
      : false;

    let matchesPrevious = false;
    if (
      !matchesCurrent &&
      user.previousRefreshToken &&
      user.previousRefreshTokenExpiresAt &&
      user.previousRefreshTokenExpiresAt.getTime() > Date.now()
    ) {
      matchesPrevious = await this.safeBcryptCompare(
        refreshToken,
        user.previousRefreshToken,
        user.id,
        "previous",
      );
    }

    if (!matchesCurrent && !matchesPrevious) {
      // Either user has no stored token or provided token matches neither active nor grace token.
      // Potential replay/theft suspected: invalidate all sessions to force re-authentication.
      if (user.refreshToken) {
        this.logger.warn(
          `Refresh token mismatch for user ${user.id} — invalidating all sessions (possible replay).`,
        );
        await this.userService.updateRefreshToken(user.id, null);
      }
      throw new UnauthorizedException("Access denied");
    }

    const tokens = await this.generateTokens(user);
    await this.userService.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  /**
   * Logs out a user by clearing their stored refresh token.
   *
   * @param userId User identifier.
   */
  async logout(userId: number): Promise<void> {
    await this.userService.updateRefreshToken(userId, null);
  }

  private async safeBcryptCompare(
    plain: string,
    hash: string,
    userId: number,
    label: "current" | "previous",
  ): Promise<boolean> {
    try {
      return await bcrypt.compare(plain, hash);
    } catch (error) {
      this.logger.error(
        `Error verifying ${label} refresh token for user ${userId}: ${
          (error as Error).message
        }`,
      );
      return false;
    }
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const jwtSecret = this.configService.get<string>("JWT_SECRET");
    const jwtRefreshSecret =
      this.configService.get<string>("JWT_REFRESH_SECRET");
    const accessTokenExpiry =
      this.configService.get<string>("JWT_EXPIRES_IN") || "15m";
    const refreshTokenExpiry =
      this.configService.get<string>("JWT_REFRESH_EXPIRES_IN") || "30d";

    if (!jwtSecret) {
      throw new Error("JWT_SECRET must be defined in environment variables");
    }

    if (!jwtRefreshSecret) {
      throw new Error(
        "JWT_REFRESH_SECRET must be defined in environment variables",
      );
    }

    const accessToken = await this.jwtService.signAsync(
      { ...payload },
      {
        secret: jwtSecret,
        expiresIn: accessTokenExpiry as any,
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      { ...payload },
      {
        secret: jwtRefreshSecret,
        expiresIn: refreshTokenExpiry as any,
      },
    );

    const accessTokenExpiresAt =
      Date.now() + parseDurationToMs(accessTokenExpiry);

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt,
    };
  }
}

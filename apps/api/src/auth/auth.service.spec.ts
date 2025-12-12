import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CollectionService } from '../collection/collection.service';
import {
  UnauthorizedException,
  BadRequestException,
  ConflictException
} from '@nestjs/common';
import { User } from '../user/entities/user.entity';
import { UserRole } from 'src/common/enums/user';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let userService: any;
  let jwtService: any;
  let collectionService: any;

  const mockUser: any = {
    id: 1,
    email: 'test@example.com',
    password: 'hashedpassword',
    firstName: 'John',
    lastName: 'Doe',
    isActive: true,
    role: UserRole.USER,
    refreshToken: 'hashedrefreshtoken',
    createdAt: new Date(),
    updatedAt: new Date(),
    collections: [],
    decks: [],
    carts: [],
    orders: [],
    organizedTournaments: [],
    registrations: [],
    ownedTournaments: [],
    donations: [],
    payments: [],
    stripeCustomerId: null
  };

  const mockUserService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateRefreshToken: jest.fn()
  };

  const mockJwtService = {
    signAsync: jest.fn()
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_EXPIRES_IN: '15m',
        JWT_REFRESH_EXPIRES_IN: '7d'
      };
      return config[key];
    })
  };

  const mockCollectionService = {
    create: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: mockUserService
        },
        {
          provide: JwtService,
          useValue: mockJwtService
        },
        {
          provide: ConfigService,
          useValue: mockConfigService
        },
        {
          provide: CollectionService,
          useValue: mockCollectionService
        }
      ]
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    jwtService = module.get<JwtService>(JwtService);
    collectionService = module.get<CollectionService>(CollectionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return the user if password matches', async () => {
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password');
      expect(result).toEqual(mockUser);
    });

    it('should return null if password does not match', async () => {
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser(
        'test@example.com',
        'wrongpassword'
      );
      expect(result).toBeNull();
    });

    it('should return null if user is not found', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser('test@example.com', 'password');
      expect(result).toBeNull();
    });

    it('should return null if bcrypt throws an error', async () => {
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockRejectedValue(
        new Error('bcrypt error')
      );

      const result = await service.validateUser('test@example.com', 'password');
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return auth response with tokens', async () => {
      const loginDto = { email: 'test@example.com', password: 'password' };
      jest.spyOn(service, 'validateUser').mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValue('token');

      const result = await service.login(loginDto);

      expect(result.user.email).toBe(mockUser.email);
      expect(result.tokens.accessToken).toBe('token');
      expect(userService.updateRefreshToken).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if invalid credentials', async () => {
      const loginDto = { email: 'test@example.com', password: 'wrongpassword' };
      jest.spyOn(service, 'validateUser').mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException if account is inactive', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      const loginDto = { email: 'test@example.com', password: 'password' };
      jest.spyOn(service, 'validateUser').mockResolvedValue(inactiveUser);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('register', () => {
    it('should register a new user and return auth response', async () => {
      const registerDto = {
        email: 'new@example.com',
        password: 'password',
        confirmPassword: 'password',
        firstName: 'New',
        lastName: 'User'
      };
      const newUser = { ...mockUser, id: 2, email: registerDto.email };

      mockUserService.create.mockResolvedValue(newUser);
      mockJwtService.signAsync.mockResolvedValue('token');

      const result = await service.register(registerDto);

      expect(mockUserService.create).toHaveBeenCalled();
      expect(mockCollectionService.create).toHaveBeenCalledTimes(2); // Wishlist & Favorites
      expect(result.user.email).toBe(newUser.email);
    });

    it('should throw BadRequestException if passwords do not match', async () => {
      const registerDto = {
        email: 'new@example.com',
        password: 'password',
        confirmPassword: 'otherpassword',
        firstName: 'New',
        lastName: 'User'
      };

      await expect(service.register(registerDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should check if user already exists (ConflictException propagation)', async () => {
      const registerDto = {
        email: 'exists@example.com',
        password: 'password',
        confirmPassword: 'password',
        firstName: 'New',
        lastName: 'User'
      };

      mockUserService.create.mockRejectedValue(new ConflictException());

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException
      );
    });

    it('should throw BadRequestException on other errors', async () => {
      const registerDto = {
        email: 'new@example.com',
        password: 'password',
        confirmPassword: 'password',
        firstName: 'New',
        lastName: 'User'
      };

      mockUserService.create.mockRejectedValue(new Error('Some error'));

      await expect(service.register(registerDto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('refreshTokens', () => {
    it('should return new tokens if refresh token is valid', async () => {
      mockUserService.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync.mockResolvedValue('newtoken');

      const result = await service.refreshTokens(1, 'validrefreshtoken');

      expect(result.accessToken).toBe('newtoken');
      expect(userService.updateRefreshToken).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUserService.findById.mockResolvedValue(null);

      await expect(service.refreshTokens(1, 'token')).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException if refresh token invalid', async () => {
      mockUserService.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.refreshTokens(1, 'invalidtoken')).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException if user has no stored refresh token', async () => {
      mockUserService.findById.mockResolvedValue({
        ...mockUser,
        refreshToken: null
      });

      await expect(service.refreshTokens(1, 'token')).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('logout', () => {
    it('should clear refresh token', async () => {
      await service.logout(1);
      expect(userService.updateRefreshToken).toHaveBeenCalledWith(1, null);
    });
  });

  describe('generateTokens guards', () => {
    it('should throw when JWT_SECRET missing', async () => {
      const config = { ...mockConfigService, get: jest.fn().mockReturnValue(null) };
      const module = await Test.createTestingModule({
        providers: [
          AuthService,
          { provide: UserService, useValue: mockUserService },
          { provide: JwtService, useValue: mockJwtService },
          { provide: ConfigService, useValue: config },
          { provide: CollectionService, useValue: mockCollectionService }
        ]
      }).compile();
      const svc = module.get<AuthService>(AuthService);
      await expect((svc as any).generateTokens(mockUser as User)).rejects.toThrow(
        'JWT_SECRET must be defined in environment variables'
      );
    });

    it('should throw when refresh secret missing', async () => {
      const config = {
        ...mockConfigService,
        get: jest.fn((key: string) =>
          key === 'JWT_REFRESH_SECRET' ? undefined : mockConfigService.get(key)
        )
      };
      const module = await Test.createTestingModule({
        providers: [
          AuthService,
          { provide: UserService, useValue: mockUserService },
          { provide: JwtService, useValue: mockJwtService },
          { provide: ConfigService, useValue: config },
          { provide: CollectionService, useValue: mockCollectionService }
        ]
      }).compile();
      const svc = module.get<AuthService>(AuthService);
      await expect((svc as any).generateTokens(mockUser as User)).rejects.toThrow(
        'JWT_REFRESH_SECRET must be defined in environment variables'
      );
    });
  });
});

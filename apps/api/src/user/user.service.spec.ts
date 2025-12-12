import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { UserService } from './user.service';
import { User } from './entities/user.entity';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed')
}));

describe('UserService', () => {
  let service: UserService;
  const repo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    remove: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: repo
        }
      ]
    }).compile();

    service = module.get<UserService>(UserService);
    jest.clearAllMocks();
  });

  it('should create user when email available', async () => {
    repo.findOne.mockResolvedValueOnce(null);
    repo.create.mockReturnValue({ email: 'a', password: 'hashed' });
    repo.save.mockResolvedValue({ id: 1, email: 'a' });

    const result = await service.create({
      email: 'a',
      password: 'pwd',
      firstName: 'f',
      lastName: 'l',
      confirmPassword: 'pwd'
    } as any);

    expect(result.id).toBe(1);
    expect(bcrypt.hash).toHaveBeenCalledWith('pwd', 10);
  });

  it('should throw on duplicate email', async () => {
    repo.findOne.mockResolvedValueOnce({ id: 1 });
    await expect(
      service.create({
        email: 'a',
        password: 'pwd',
        firstName: 'f',
        lastName: 'l',
        confirmPassword: 'pwd'
      } as any)
    ).rejects.toThrow(ConflictException);
  });

  it('should find all users', async () => {
    repo.find.mockResolvedValue([{ id: 1 }]);
    const users = await service.findAll();
    expect(users).toHaveLength(1);
    expect(repo.find).toHaveBeenCalled();
  });

  it('should find one by id or throw', async () => {
    repo.findOne.mockResolvedValueOnce({ id: 2 });
    await expect(service.findOne(2)).resolves.toEqual({ id: 2 });

    repo.findOne.mockResolvedValueOnce(null);
    await expect(service.findOne(3)).rejects.toThrow(NotFoundException);
  });

  it('should findById and findByEmail', async () => {
    repo.findOne.mockResolvedValueOnce({ id: 7 });
    const byId = await service.findById(7);
    expect(byId?.id).toBe(7);

    repo.findOne.mockResolvedValueOnce({ id: 8, email: 'x@example.com' });
    const byEmail = await service.findByEmail('x@example.com');
    expect(byEmail?.email).toBe('x@example.com');
  });

  it('should update user and hash password', async () => {
    repo.findOne.mockResolvedValueOnce({ id: 1, email: 'old@example.com' });
    repo.findOne.mockResolvedValueOnce(null); // for email uniqueness check
    repo.update.mockResolvedValue({ affected: 1 });
    repo.findOne.mockResolvedValueOnce({ id: 1, email: 'new@example.com' });

    const updated = await service.update(1, {
      email: 'new@example.com',
      password: 'newpwd'
    } as any);

    expect(updated.email).toBe('new@example.com');
    expect(bcrypt.hash).toHaveBeenCalledWith('newpwd', 10);
  });

  it('should throw on email conflict during update', async () => {
    repo.findOne.mockResolvedValueOnce({ id: 1, email: 'old@example.com' });
    repo.findOne.mockResolvedValueOnce({ id: 2, email: 'new@example.com' });

    await expect(
      service.update(1, { email: 'new@example.com' } as any)
    ).rejects.toThrow(ConflictException);
  });

  it('should update refresh token hashing when provided', async () => {
    repo.update.mockResolvedValue({ affected: 1 });
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await service.updateRefreshToken(1, 'token');
    expect(repo.update).toHaveBeenCalledWith(1, { refreshToken: 'hashed' });
    logSpy.mockRestore();
  });

  it('should clear refresh token when null', async () => {
    repo.update.mockResolvedValue({ affected: 1 });
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await service.updateRefreshToken(1, null);
    expect(repo.update).toHaveBeenCalledWith(1, { refreshToken: null });
    logSpy.mockRestore();
  });

  it('should remove user', async () => {
    repo.findOne.mockResolvedValue({ id: 5 });
    repo.remove.mockResolvedValue(undefined);
    await service.remove(5);
    expect(repo.remove).toHaveBeenCalled();
  });
});

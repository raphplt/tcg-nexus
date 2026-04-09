import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { UserService } from "./user.service";
import { User } from "./entities/user.entity";
import { Player } from "src/player/entities/player.entity";

jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashed"),
}));

describe("UserService", () => {
  let service: UserService;
  const repo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const playerRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: repo,
        },
        {
          provide: getRepositoryToken(Player),
          useValue: playerRepo,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    jest.clearAllMocks();
  });

  it("should create user when email available", async () => {
    repo.findOne.mockResolvedValueOnce(null);
    repo.create.mockReturnValue({ email: "a", password: "hashed" });
    repo.save.mockResolvedValue({ id: 1, email: "a" });
    playerRepo.findOne.mockResolvedValueOnce(null);
    playerRepo.create.mockReturnValue({ id: 11, user: { id: 1 } });
    playerRepo.save.mockResolvedValue({ id: 11, user: { id: 1 } });
    repo.findOne.mockResolvedValueOnce({
      id: 1,
      email: "a",
      player: { id: 11 },
    });

    const result = await service.create({
      email: "a",
      password: "pwd",
      firstName: "f",
      lastName: "l",
      confirmPassword: "pwd",
    } as any);

    expect(result.id).toBe(1);
    expect(bcrypt.hash).toHaveBeenCalledWith("pwd", 10);
    expect(playerRepo.create).toHaveBeenCalled();
    expect(playerRepo.save).toHaveBeenCalled();
  });

  it("should throw on duplicate email", async () => {
    repo.findOne.mockResolvedValueOnce({ id: 1 });
    await expect(
      service.create({
        email: "a",
        password: "pwd",
        firstName: "f",
        lastName: "l",
        confirmPassword: "pwd",
      } as any),
    ).rejects.toThrow(ConflictException);
  });

  it("should find all users", async () => {
    repo.find.mockResolvedValue([{ id: 1 }]);
    const users = await service.findAll();
    expect(users).toHaveLength(1);
    expect(repo.find).toHaveBeenCalled();
  });

  it("should find one by id or throw", async () => {
    repo.findOne.mockResolvedValueOnce({ id: 2, player: { id: 22 } });
    await expect(service.findOne(2)).resolves.toEqual({
      id: 2,
      player: { id: 22 },
    });

    repo.findOne.mockResolvedValueOnce(null);
    await expect(service.findOne(3)).rejects.toThrow(NotFoundException);
  });

  it("should findById and findByEmail", async () => {
    repo.findOne.mockResolvedValueOnce({ id: 7, player: { id: 70 } });
    const byId = await service.findById(7);
    expect(byId?.id).toBe(7);

    repo.findOne.mockResolvedValueOnce({
      id: 8,
      email: "x@example.com",
      player: { id: 80 },
    });
    const byEmail = await service.findByEmail("x@example.com");
    expect(byEmail?.email).toBe("x@example.com");
  });

  it("should auto-create a player for a legacy user without one", async () => {
    repo.findOne.mockResolvedValueOnce({ id: 9, email: "legacy@example.com" });
    playerRepo.findOne.mockResolvedValueOnce(null);
    playerRepo.create.mockReturnValue({ user: { id: 9 } });
    playerRepo.save.mockResolvedValue({ id: 90, user: { id: 9 } });

    const user = await service.findById(9);

    expect(playerRepo.create).toHaveBeenCalledWith({
      user: expect.objectContaining({
        id: 9,
        email: "legacy@example.com",
      }),
    });
    expect(user?.player).toEqual({ id: 90, user: { id: 9 } });
  });

  it("should update user and hash password", async () => {
    repo.findOne.mockResolvedValueOnce({ id: 1, email: "old@example.com" });
    repo.findOne.mockResolvedValueOnce(null); // for email uniqueness check
    repo.update.mockResolvedValue({ affected: 1 });
    repo.findOne.mockResolvedValueOnce({ id: 1, email: "new@example.com" });

    const updated = await service.update(1, {
      email: "new@example.com",
      password: "newpwd",
    } as any);

    expect(updated.email).toBe("new@example.com");
    expect(bcrypt.hash).toHaveBeenCalledWith("newpwd", 10);
  });

  it("should throw on email conflict during update", async () => {
    repo.findOne.mockResolvedValueOnce({ id: 1, email: "old@example.com" });
    repo.findOne.mockResolvedValueOnce({ id: 2, email: "new@example.com" });

    await expect(
      service.update(1, { email: "new@example.com" } as any),
    ).rejects.toThrow(ConflictException);
  });

  it("should update refresh token and move previous to grace window", async () => {
    repo.findOne.mockResolvedValueOnce({
      id: 1,
      refreshToken: "previousHashed",
    });
    repo.update.mockResolvedValue({ affected: 1 });

    const before = Date.now();
    await service.updateRefreshToken(1, "token");
    const after = Date.now();

    expect(repo.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        refreshToken: "hashed",
        previousRefreshToken: "previousHashed",
      }),
    );
    const updateCall = repo.update.mock.calls[0][1];
    expect(updateCall.previousRefreshTokenExpiresAt).toBeInstanceOf(Date);
    expect(updateCall.previousRefreshTokenExpiresAt.getTime()).toBeGreaterThanOrEqual(
      before + UserService.REFRESH_TOKEN_GRACE_WINDOW_MS,
    );
    expect(updateCall.previousRefreshTokenExpiresAt.getTime()).toBeLessThanOrEqual(
      after + UserService.REFRESH_TOKEN_GRACE_WINDOW_MS,
    );
  });

  it("should not set a previous token on first refresh attribution", async () => {
    repo.findOne.mockResolvedValueOnce({ id: 1, refreshToken: null });
    repo.update.mockResolvedValue({ affected: 1 });

    await service.updateRefreshToken(1, "token");

    expect(repo.update).toHaveBeenCalledWith(1, {
      refreshToken: "hashed",
      previousRefreshToken: null,
      previousRefreshTokenExpiresAt: null,
    });
  });

  it("should fully clear refresh tokens (current and previous) when null", async () => {
    repo.update.mockResolvedValue({ affected: 1 });
    await service.updateRefreshToken(1, null);
    expect(repo.update).toHaveBeenCalledWith(1, {
      refreshToken: null,
      previousRefreshToken: null,
      previousRefreshTokenExpiresAt: null,
    });
  });

  it("should remove user", async () => {
    repo.findOne.mockResolvedValue({ id: 5 });
    repo.remove.mockResolvedValue(undefined);
    await service.remove(5);
    expect(repo.remove).toHaveBeenCalled();
  });
});

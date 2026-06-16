import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { User } from "../user/entities/user.entity";
import { UserFollow } from "./entities/user-follow.entity";
import { UserFollowService } from "./user-follow.service";

describe("UserFollowService", () => {
  let service: UserFollowService;

  const followRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const userRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserFollowService,
        { provide: getRepositoryToken(UserFollow), useValue: followRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();
    service = module.get<UserFollowService>(UserFollowService);
  });

  describe("follow", () => {
    it("throws BadRequest when following self", async () => {
      await expect(service.follow(1, 1)).rejects.toThrow(BadRequestException);
    });

    it("throws NotFound when followed user does not exist", async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.follow(1, 2)).rejects.toThrow(NotFoundException);
    });

    it("returns existing follow if already followed", async () => {
      userRepo.findOne.mockResolvedValue({ id: 2, isActive: true });
      const existing = { id: 99 };
      followRepo.findOne.mockResolvedValue(existing);
      await expect(service.follow(1, 2)).resolves.toBe(existing);
      expect(followRepo.save).not.toHaveBeenCalled();
    });

    it("creates a new follow when not following yet", async () => {
      userRepo.findOne.mockResolvedValue({ id: 2, isActive: true });
      followRepo.findOne.mockResolvedValue(null);
      const created = { id: 1, follower: { id: 1 }, followed: { id: 2 } };
      followRepo.create.mockReturnValue(created);
      followRepo.save.mockResolvedValue(created);
      await expect(service.follow(1, 2)).resolves.toBe(created);
      expect(followRepo.save).toHaveBeenCalledWith(created);
    });
  });

  it("unfollow delegates to repository delete", async () => {
    followRepo.delete.mockResolvedValue({ affected: 1 });
    await service.unfollow(1, 2);
    expect(followRepo.delete).toHaveBeenCalledWith({
      follower: { id: 1 },
      followed: { id: 2 },
    });
  });

  it("isFollowing returns true when count > 0", async () => {
    followRepo.count.mockResolvedValue(1);
    await expect(service.isFollowing(1, 2)).resolves.toBe(true);
  });

  it("isFollowing returns false when count = 0", async () => {
    followRepo.count.mockResolvedValue(0);
    await expect(service.isFollowing(1, 2)).resolves.toBe(false);
  });

  it("countFollowers queries with followed id", async () => {
    followRepo.count.mockResolvedValue(3);
    await expect(service.countFollowers(7)).resolves.toBe(3);
    expect(followRepo.count).toHaveBeenCalledWith({
      where: { followed: { id: 7 } },
    });
  });

  it("countFollowing queries with follower id", async () => {
    followRepo.count.mockResolvedValue(5);
    await expect(service.countFollowing(7)).resolves.toBe(5);
    expect(followRepo.count).toHaveBeenCalledWith({
      where: { follower: { id: 7 } },
    });
  });

  it("listFollowers returns mapped public users", async () => {
    followRepo.find.mockResolvedValue([
      {
        follower: {
          id: 5,
          firstName: "A",
          lastName: "B",
          avatarUrl: null,
          createdAt: new Date("2024-01-01"),
          player: null,
        },
      },
    ]);
    const result = await service.listFollowers(7);
    expect(result).toEqual([
      expect.objectContaining({ id: 5, firstName: "A", lastName: "B" }),
    ]);
    expect((result[0] as any).email).toBeUndefined();
    expect((result[0] as any).password).toBeUndefined();
  });

  it("getFollowedIds returns ids only", async () => {
    followRepo.find.mockResolvedValue([
      { followed: { id: 10 } },
      { followed: { id: 11 } },
    ]);
    await expect(service.getFollowedIds(1)).resolves.toEqual([10, 11]);
  });
});

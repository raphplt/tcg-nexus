import { Test, TestingModule } from "@nestjs/testing";
import { User } from "../user/entities/user.entity";
import { UserFollowController } from "./user-follow.controller";
import { UserFollowService } from "./user-follow.service";

describe("UserFollowController", () => {
  let controller: UserFollowController;

  const mockFollowService = {
    follow: jest.fn(),
    unfollow: jest.fn(),
    listFollowers: jest.fn(),
    listFollowing: jest.fn(),
  };

  const currentUser = { id: 1 } as User;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserFollowController],
      providers: [{ provide: UserFollowService, useValue: mockFollowService }],
    }).compile();
    controller = module.get<UserFollowController>(UserFollowController);
  });

  it("follow delegates to followService.follow with current user id", async () => {
    mockFollowService.follow.mockResolvedValue({ id: 10 });
    await expect(controller.follow(currentUser, 5)).resolves.toEqual({
      id: 10,
    });
    expect(mockFollowService.follow).toHaveBeenCalledWith(1, 5);
  });

  it("unfollow delegates to followService.unfollow with current user id", async () => {
    mockFollowService.unfollow.mockResolvedValue(undefined);
    await expect(controller.unfollow(currentUser, 5)).resolves.toBeUndefined();
    expect(mockFollowService.unfollow).toHaveBeenCalledWith(1, 5);
  });

  it("getFollowers delegates to followService.listFollowers", async () => {
    mockFollowService.listFollowers.mockResolvedValue([]);
    await expect(controller.getFollowers(7)).resolves.toEqual([]);
    expect(mockFollowService.listFollowers).toHaveBeenCalledWith(7);
  });

  it("getFollowing delegates to followService.listFollowing", async () => {
    mockFollowService.listFollowing.mockResolvedValue([]);
    await expect(controller.getFollowing(7)).resolves.toEqual([]);
    expect(mockFollowService.listFollowing).toHaveBeenCalledWith(7);
  });
});

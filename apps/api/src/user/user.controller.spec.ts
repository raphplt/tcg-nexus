import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { User } from "./entities/user.entity";
import { UserController } from "./user.controller";
import { UserJourneyService } from "./user-journey.service";
import { UserService } from "./user.service";

describe("UserController", () => {
  let controller: UserController;

  const mockUserService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateOwnProfile: jest.fn(),
    remove: jest.fn(),
  };

  const mockUserJourneyService = {
    getNextActions: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: UserJourneyService,
          useValue: mockUserJourneyService,
        },
        {
          provide: getRepositoryToken(User),
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("create delegates to userService.create", async () => {
    const dto = { email: "a@b.c" } as any;
    mockUserService.create.mockResolvedValue({ id: 1 });
    await expect(controller.create(dto)).resolves.toEqual({ id: 1 });
    expect(mockUserService.create).toHaveBeenCalledWith(dto);
  });

  it("findAll delegates to userService.findAll", async () => {
    mockUserService.findAll.mockResolvedValue([{ id: 1 }]);
    await expect(controller.findAll()).resolves.toEqual([{ id: 1 }]);
    expect(mockUserService.findAll).toHaveBeenCalled();
  });

  it("getProfile delegates to userService.findOne with current user id", async () => {
    mockUserService.findOne.mockResolvedValue({ id: 42 });
    await expect(controller.getProfile({ id: 42 } as User)).resolves.toEqual({
      id: 42,
    });
    expect(mockUserService.findOne).toHaveBeenCalledWith(42);
  });

  it("findOne delegates to userService.findOne", async () => {
    mockUserService.findOne.mockResolvedValue({ id: 7 });
    await expect(controller.findOne(7)).resolves.toEqual({ id: 7 });
    expect(mockUserService.findOne).toHaveBeenCalledWith(7);
  });

  it("update delegates to userService.update", async () => {
    const dto = { firstName: "A" } as any;
    mockUserService.update.mockResolvedValue({ id: 7, firstName: "A" });
    await expect(controller.update(7, dto)).resolves.toEqual({
      id: 7,
      firstName: "A",
    });
    expect(mockUserService.update).toHaveBeenCalledWith(7, dto);
  });

  it("updateProfile delegates to userService.updateOwnProfile with current user id", async () => {
    const dto = { lastName: "B" } as any;
    mockUserService.updateOwnProfile.mockResolvedValue({
      id: 8,
      lastName: "B",
    });
    await expect(
      controller.updateProfile({ id: 8 } as User, dto),
    ).resolves.toEqual({ id: 8, lastName: "B" });
    expect(mockUserService.updateOwnProfile).toHaveBeenCalledWith(8, dto);
  });

  it("remove delegates to userService.remove", async () => {
    mockUserService.remove.mockResolvedValue({ affected: 1 });
    await expect(controller.remove(9)).resolves.toEqual({ affected: 1 });
    expect(mockUserService.remove).toHaveBeenCalledWith(9);
  });

  it("getPublicProfile delegates to userService.findPublicProfile without requester when anonymous", async () => {
    const dto = { id: 1, firstName: "A", lastName: "B" };
    (mockUserService as any).findPublicProfile = jest
      .fn()
      .mockResolvedValue(dto);
    await expect(controller.getPublicProfile(1)).resolves.toEqual(dto);
    expect((mockUserService as any).findPublicProfile).toHaveBeenCalledWith(
      1,
      undefined,
    );
  });

  it("getPublicProfile passes the current user id when authenticated", async () => {
    const dto = { id: 1, firstName: "A", lastName: "B" };
    (mockUserService as any).findPublicProfile = jest
      .fn()
      .mockResolvedValue(dto);
    await expect(
      controller.getPublicProfile(1, { id: 7 } as any),
    ).resolves.toEqual(dto);
    expect((mockUserService as any).findPublicProfile).toHaveBeenCalledWith(
      1,
      7,
    );
  });

  it("getMyJourneyNextActions delegates to userJourneyService.getNextActions with current user", async () => {
    const mockActions = {
      userId: 5,
      actions: [],
      totalActionableCount: 0,
      generatedAt: new Date(),
    };
    mockUserJourneyService.getNextActions.mockResolvedValue(mockActions);
    await expect(
      controller.getMyJourneyNextActions({ id: 5 } as User),
    ).resolves.toEqual(mockActions);
    expect(mockUserJourneyService.getNextActions).toHaveBeenCalledWith({ id: 5 });
  });
});

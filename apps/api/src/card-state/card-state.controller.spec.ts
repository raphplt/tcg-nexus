import { Test, TestingModule } from "@nestjs/testing";
import { CardStateController } from "./card-state.controller";
import { CardStateService } from "./card-state.service";
import { CreateCardStateDto } from "./dto/create-card-state.dto";
import { CardStateCode } from "./entities/card-state.entity";

describe("CardStateController", () => {
  let controller: CardStateController;

  const mockCardStateService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CardStateController],
      providers: [
        {
          provide: CardStateService,
          useValue: mockCardStateService,
        },
      ],
    }).compile();

    controller = module.get<CardStateController>(CardStateController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should create card state", async () => {
    const dto: CreateCardStateDto = {
      code: CardStateCode.NM,
      label: "Near Mint",
    };
    mockCardStateService.create.mockResolvedValue({ id: 1, ...dto });

    await expect(controller.create(dto)).resolves.toEqual({
      id: 1,
      ...dto,
    });
    expect(mockCardStateService.create).toHaveBeenCalledWith(dto);
  });

  it("should list all card states", async () => {
    mockCardStateService.findAll.mockResolvedValue([{ id: 1 }]);
    await expect(controller.findAll()).resolves.toEqual([{ id: 1 }]);
  });

  it("should get one card state", async () => {
    mockCardStateService.findOne.mockResolvedValue({ id: 2 });
    await expect(controller.findOne(2)).resolves.toEqual({ id: 2 });
  });

  it("should update card state", async () => {
    mockCardStateService.update.mockResolvedValue({ id: 3, label: "Updated" });
    await expect(controller.update(3, { label: "Updated" })).resolves.toEqual({
      id: 3,
      label: "Updated",
    });
  });

  it("should remove card state", async () => {
    mockCardStateService.remove.mockResolvedValue(undefined);
    await expect(controller.remove(4)).resolves.toBeUndefined();
  });
});

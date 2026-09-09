import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { CardStateService } from "./card-state.service";
import { CreateCardStateDto } from "./dto/create-card-state.dto";
import { CardState, CardStateCode } from "./entities/card-state.entity";

describe("CardStateService", () => {
  let service: CardStateService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardStateService,
        {
          provide: getRepositoryToken(CardState),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CardStateService>(CardStateService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should create and return card state", async () => {
    const dto: CreateCardStateDto = {
      code: CardStateCode.NM,
      label: "Near Mint",
    };
    mockRepository.create.mockReturnValue(dto);
    mockRepository.save.mockResolvedValue({ id: 1, ...dto });

    await expect(service.create(dto)).resolves.toEqual({ id: 1, ...dto });
    expect(mockRepository.create).toHaveBeenCalledWith(dto);
    expect(mockRepository.save).toHaveBeenCalledWith(dto);
  });

  it("should list all card states", async () => {
    mockRepository.find.mockResolvedValue([{ id: 1 }]);
    await expect(service.findAll()).resolves.toEqual([{ id: 1 }]);
  });

  it("should return one card state by id", async () => {
    mockRepository.findOne.mockResolvedValue({
      id: 2,
      code: CardStateCode.EX,
      label: "Excellent",
    });
    await expect(service.findOne(2)).resolves.toEqual({
      id: 2,
      code: CardStateCode.EX,
      label: "Excellent",
    });
  });

  it("should throw NotFoundException when card state not found", async () => {
    mockRepository.findOne.mockResolvedValue(null);
    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
  });

  it("should find by code", async () => {
    mockRepository.findOne.mockResolvedValue({
      id: 3,
      code: CardStateCode.NM,
      label: "Near Mint",
    });
    await expect(service.findByCode(CardStateCode.NM)).resolves.toEqual({
      id: 3,
      code: CardStateCode.NM,
      label: "Near Mint",
    });
  });

  it("should update then return updated card state", async () => {
    const existing = { id: 4, code: CardStateCode.GD, label: "Good" };
    mockRepository.findOne.mockResolvedValue(existing);
    mockRepository.save.mockResolvedValue({
      id: 4,
      code: CardStateCode.GD,
      label: "Updated",
    });

    await expect(service.update(4, { label: "Updated" })).resolves.toEqual({
      id: 4,
      code: CardStateCode.GD,
      label: "Updated",
    });
    expect(mockRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 4, label: "Updated" }),
    );
  });

  it("should throw NotFoundException when updating non-existent card state", async () => {
    mockRepository.findOne.mockResolvedValue(null);
    await expect(service.update(999, { label: "Updated" })).rejects.toThrow(
      NotFoundException,
    );
  });

  it("should remove card state", async () => {
    mockRepository.findOne.mockResolvedValue({
      id: 5,
      code: CardStateCode.LP,
      label: "Lightly Played",
    });
    mockRepository.delete.mockResolvedValue({ affected: 1 });

    await expect(service.remove(5)).resolves.toBeUndefined();
    expect(mockRepository.delete).toHaveBeenCalledWith(5);
  });

  it("should throw NotFoundException when removing non-existent card state", async () => {
    mockRepository.findOne.mockResolvedValue(null);
    await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    expect(mockRepository.delete).not.toHaveBeenCalled();
  });
});

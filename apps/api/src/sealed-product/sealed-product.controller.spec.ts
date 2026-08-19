import { Test, TestingModule } from "@nestjs/testing";
import { SealedProductController } from "./sealed-product.controller";
import { SealedProductService } from "./sealed-product.service";

describe("SealedProductController", () => {
  let controller: SealedProductController;

  const mockSealedProductService = {
    findAll: jest.fn(),
    findAllPaginated: jest.fn(),
    findRecent: jest.fn(),
    findPopular: jest.fn(),
    findOne: jest.fn(),
    getStatistics: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    seedFromJson: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SealedProductController],
      providers: [
        {
          provide: SealedProductService,
          useValue: mockSealedProductService,
        },
      ],
    }).compile();

    controller = module.get<SealedProductController>(SealedProductController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should find all sealed products", async () => {
    mockSealedProductService.findAll.mockResolvedValue([{ id: "sp-1" }]);
    const result = await controller.findAll({});
    expect(result).toEqual([{ id: "sp-1" }]);
  });

  it("should find paginated sealed products", async () => {
    mockSealedProductService.findAllPaginated.mockResolvedValue({ data: [], total: 0 });
    const result = await controller.findAllPaginated({});
    expect(result).toEqual({ data: [], total: 0 });
  });

  it("should find recent sealed products", async () => {
    mockSealedProductService.findRecent.mockResolvedValue([{ id: "sp-1" }]);
    const result = await controller.findRecent(8);
    expect(result).toEqual([{ id: "sp-1" }]);
  });

  it("should find popular sealed products", async () => {
    mockSealedProductService.findPopular.mockResolvedValue([{ id: "sp-1" }]);
    const result = await controller.findPopular(8);
    expect(result).toEqual([{ id: "sp-1" }]);
  });

  it("should find one sealed product", async () => {
    mockSealedProductService.findOne.mockResolvedValue({ id: "sp-1" });
    const result = await controller.findOne("sp-1");
    expect(result).toEqual({ id: "sp-1" });
  });

  it("should get sealed product statistics", async () => {
    mockSealedProductService.getStatistics.mockResolvedValue({ totalListings: 5 });
    const result = await controller.getStatistics("sp-1");
    expect(result).toEqual({ totalListings: 5 });
  });

  it("should create sealed product", async () => {
    const dto = { id: "sp-1" } as any;
    mockSealedProductService.create.mockResolvedValue({ id: "sp-1" });
    const result = await controller.create(dto);
    expect(result).toEqual({ id: "sp-1" });
  });

  it("should update sealed product", async () => {
    const dto = { sku: "SKU123" } as any;
    mockSealedProductService.update.mockResolvedValue({ id: "sp-1" });
    const result = await controller.update("sp-1", dto);
    expect(result).toEqual({ id: "sp-1" });
  });

  it("should remove sealed product", async () => {
    mockSealedProductService.remove.mockResolvedValue(undefined);
    await controller.remove("sp-1");
    expect(mockSealedProductService.remove).toHaveBeenCalledWith("sp-1");
  });

  it("should seed sealed products", async () => {
    mockSealedProductService.seedFromJson.mockResolvedValue({ totalRecords: 10 });
    const result = await controller.seed();
    expect(result).toEqual({ totalRecords: 10 });
  });
});

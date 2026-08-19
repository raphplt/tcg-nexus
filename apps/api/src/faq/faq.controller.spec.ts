import { Test, TestingModule } from "@nestjs/testing";
import { FaqController } from "./faq.controller";
import { FaqService } from "./faq.service";

describe("FaqController", () => {
  let controller: FaqController;

  const mockFaqService = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FaqController],
      providers: [
        {
          provide: FaqService,
          useValue: mockFaqService,
        },
      ],
    }).compile();

    controller = module.get<FaqController>(FaqController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should return FAQs from service", async () => {
    mockFaqService.findAll.mockResolvedValue([{ id: 1 }]);
    const result = await controller.findAll({ search: "test" });
    expect(result).toEqual([{ id: 1 }]);
    expect(mockFaqService.findAll).toHaveBeenCalledWith({ search: "test" });
  });
});

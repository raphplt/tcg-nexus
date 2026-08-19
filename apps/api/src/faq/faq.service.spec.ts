import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Faq, FaqCategory } from "./entities/faq.entity";
import { FaqService } from "./faq.service";

describe("FaqService", () => {
  let service: FaqService;

  const mockQueryBuilder = {
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const mockFaqRepo = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FaqService,
        {
          provide: getRepositoryToken(Faq),
          useValue: mockFaqRepo,
        },
      ],
    }).compile();

    service = module.get<FaqService>(FaqService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("should query all FAQs with default sorting", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([{ id: 1, question: "Q1" }]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(mockFaqRepo.createQueryBuilder).toHaveBeenCalled();
    });

    it("should filter by category and search term", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([{ id: 1, question: "Q1" }]);
      const result = await service.findAll({
        category: FaqCategory.TOURNAMENTS,
        search: "rules",
      });
      expect(result).toHaveLength(1);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(2);
    });
  });
});

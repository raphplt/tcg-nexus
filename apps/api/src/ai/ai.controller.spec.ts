import { Test, TestingModule } from "@nestjs/testing";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";

describe("AiController", () => {
  let controller: AiController;
  let aiService: any;

  beforeEach(async () => {
    aiService = {
      analyzePool: jest.fn(),
      findSimilarDecks: jest.fn(),
      suggestCards: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [{ provide: AiService, useValue: aiService }],
    }).compile();

    controller = module.get<AiController>(AiController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("analyzePool", () => {
    it("delegates to aiService.analyzePool with locale", async () => {
      const dto = { cards: [{ cardId: "c1", qty: 2 }] };
      aiService.analyzePool.mockResolvedValue({ totalCards: 2 });

      const result = await controller.analyzePool(dto, "fr");

      expect(aiService.analyzePool).toHaveBeenCalledWith(dto, "fr");
      expect(result).toEqual({ totalCards: 2 });
    });
  });

  describe("findSimilarDecks", () => {
    it("delegates to aiService.findSimilarDecks clamping limit to 25", async () => {
      const user = { id: 1 } as any;
      aiService.findSimilarDecks.mockResolvedValue({
        available: true,
        items: [],
      });

      const result = await controller.findSimilarDecks(5, 50, user);

      expect(aiService.findSimilarDecks).toHaveBeenCalledWith(5, user, 25);
      expect(result).toEqual({ available: true, items: [] });
    });
  });

  describe("suggestCards", () => {
    it("delegates to aiService.suggestCards clamping limit to 30", async () => {
      const user = { id: 2 } as any;
      aiService.suggestCards.mockResolvedValue({ available: true, items: [] });

      const result = await controller.suggestCards(10, 50, "en", user);

      expect(aiService.suggestCards).toHaveBeenCalledWith(10, user, 30, "en");
      expect(result).toEqual({ available: true, items: [] });
    });
  });
});

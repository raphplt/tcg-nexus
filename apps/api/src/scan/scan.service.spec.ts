import { Test, TestingModule } from "@nestjs/testing";
import { CardService } from "../card/card.service";
import { CatalogLocalizationService } from "../card/catalog-localization.service";
import { ScanLogger } from "./logging/scan-logger";
import { OcrService } from "./ocr/ocr.service";
import { ScanService } from "./scan.service";
import { VisionService } from "./vision/vision.service";

describe("ScanService", () => {
  let service: ScanService;

  const mockVisionService = {
    preprocessBatch: jest.fn(),
    match: jest.fn(),
  };

  const mockOcrService = {
    recognize: jest.fn(),
  };

  const mockCardService = {
    findByLocalId: jest.fn(),
    findByNameFuzzy: jest.fn(),
    embeddingSimilarities: jest.fn(),
    findByEmbedding: jest.fn(),
  };

  const mockScanLogger = {
    log: jest.fn(),
  };

  const mockLocalization = {
    resolveLabels: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScanService,
        {
          provide: VisionService,
          useValue: mockVisionService,
        },
        {
          provide: OcrService,
          useValue: mockOcrService,
        },
        {
          provide: CardService,
          useValue: mockCardService,
        },
        {
          provide: ScanLogger,
          useValue: mockScanLogger,
        },
        {
          provide: CatalogLocalizationService,
          useValue: mockLocalization,
        },
      ],
    }).compile();

    service = module.get<ScanService>(ScanService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("recognize", () => {
    it("should process image and match candidates", async () => {
      mockVisionService.preprocessBatch.mockResolvedValue({
        detected: true,
        engine: "opencv",
        bestIndex: 0,
        normalizedImage: Buffer.from("norm"),
        rois: [{ key: "name", text: "Pikachu" }],
      });

      mockOcrService.recognize.mockResolvedValue({
        text: "Pikachu 025/102",
        engine: "tesseract",
      });

      const card = {
        id: "c-1",
        name: "Pikachu",
        localId: "025",
        set: { name: "Base Set", cardCount: { official: 102 } },
      };

      mockCardService.findByLocalId.mockResolvedValue([card]);
      mockCardService.findByNameFuzzy.mockResolvedValue([card]);

      const result = await service.recognize([Buffer.from("img")]);

      expect(result).toBeDefined();
      expect(result.bestCard).toBeDefined();
      expect(result.bestCard?.id).toBe("c-1");
      expect(result.confidenceLevel).toBe("high");
      expect(mockScanLogger.log).toHaveBeenCalled();
    });

    it("should handle visual rescue when no text candidates are found", async () => {
      mockVisionService.preprocessBatch.mockResolvedValue({
        detected: true,
        engine: "clip",
        bestIndex: 0,
        normalizedImage: Buffer.from("norm"),
        embedding: [0.1, 0.2, 0.3],
        rois: [],
      });

      mockOcrService.recognize.mockResolvedValue({
        text: "",
        engine: "tesseract",
      });

      mockCardService.findByLocalId.mockResolvedValue([]);
      mockCardService.findByNameFuzzy.mockResolvedValue([]);
      mockCardService.findByEmbedding.mockResolvedValue([
        {
          card: { id: "c-rescue", name: "Full Art Charizard" },
          similarity: 0.85,
        },
        {
          card: { id: "c-2", name: "Pikachu" },
          similarity: 0.5,
        },
      ]);

      const result = await service.recognize([Buffer.from("full-art-img")]);

      expect(result.candidates).toHaveLength(2);
      expect(result.bestCard?.id).toBe("c-rescue");
      expect(result.confidenceLevel).toBe("medium");
    });

    it("should promote top visual candidate during visual disambiguation", async () => {
      mockVisionService.preprocessBatch.mockResolvedValue({
        detected: true,
        engine: "opencv",
        bestIndex: 0,
        normalizedImage: Buffer.from("norm"),
        rois: [{ key: "name", text: "Pikachu" }],
      });

      mockOcrService.recognize.mockResolvedValue({
        text: "Pikachu",
        engine: "tesseract",
      });

      const card1 = {
        id: "c-1",
        name: "Pikachu",
        image: "https://example.com/c1.png",
      };
      const card2 = {
        id: "c-2",
        name: "Pikachu",
        image: "https://example.com/c2.png",
      };

      mockCardService.findByLocalId.mockResolvedValue([]);
      mockCardService.findByNameFuzzy.mockResolvedValue([card1, card2]);
      mockVisionService.match.mockResolvedValue(
        new Map([
          ["c-2", 30],
          ["c-1", 10],
        ]),
      );

      const result = await service.recognize([Buffer.from("img")]);

      expect(result.bestCard?.id).toBe("c-2");
      expect(result.confidenceLevel).toBe("high");
      expect(result.confidence).toBe(0.95);
    });

    it("should re-rank candidates using embedding similarities in fuseWithVisual", async () => {
      mockVisionService.preprocessBatch.mockResolvedValue({
        detected: true,
        engine: "clip",
        bestIndex: 0,
        normalizedImage: Buffer.from("norm"),
        embedding: [0.5, 0.5, 0.5],
        rois: [{ key: "name", text: "Charizard" }],
      });

      mockOcrService.recognize.mockResolvedValue({
        text: "Charizard",
        engine: "tesseract",
      });

      const card1 = { id: "c-1", name: "Charizard Base" };
      const card2 = { id: "c-2", name: "Charizard VMAX" };

      mockCardService.findByLocalId.mockResolvedValue([]);
      mockCardService.findByNameFuzzy.mockResolvedValue([card1, card2]);
      mockCardService.embeddingSimilarities.mockResolvedValue(
        new Map([
          ["c-1", 0.45],
          ["c-2", 0.92],
        ]),
      );

      const result = await service.recognize([Buffer.from("img")]);

      expect(result.bestCard?.id).toBe("c-2");
      expect(mockCardService.embeddingSimilarities).toHaveBeenCalled();
    });

    it("should return low confidence when visual rescue has no clear winner", async () => {
      mockVisionService.preprocessBatch.mockResolvedValue({
        detected: true,
        engine: "clip",
        bestIndex: 0,
        normalizedImage: Buffer.from("norm"),
        embedding: [0.1, 0.2],
        rois: [],
      });

      mockOcrService.recognize.mockResolvedValue({ text: "" });
      mockCardService.findByLocalId.mockResolvedValue([]);
      mockCardService.findByNameFuzzy.mockResolvedValue([]);
      mockCardService.findByEmbedding.mockResolvedValue([
        { card: { id: "c-low1", name: "Card 1" }, similarity: 0.55 },
        { card: { id: "c-low2", name: "Card 2" }, similarity: 0.53 },
      ]);

      const result = await service.recognize([Buffer.from("img")]);

      expect(result.candidates).toHaveLength(2);
      expect(result.confidenceLevel).toBe("low");
      expect(result.confidence).toBe(0);
    });

    it("should use fallback ROIs when vision service is unavailable", async () => {
      mockVisionService.preprocessBatch.mockResolvedValue(null);

      mockOcrService.recognize.mockResolvedValue({
        text: "Mewtwo\n150/165",
        engine: "tesseract",
      });

      const card = {
        id: "mewtwo-150",
        name: "Mewtwo",
        localId: "150",
        set: { cardCount: { official: 165 } },
      };

      mockCardService.findByLocalId.mockResolvedValue([card]);
      mockCardService.findByNameFuzzy.mockResolvedValue([card]);

      const result = await service.recognize([Buffer.from("img")]);

      expect(result.bestCard?.id).toBe("mewtwo-150");
      expect(result.rois.some((r) => r.key === "name")).toBe(true);
    });
  });
});

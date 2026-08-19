import { Test, TestingModule } from "@nestjs/testing";
import { CatalogLocalizationService } from "src/card/catalog-localization.service";
import { CardService } from "../card/card.service";
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
  });
});

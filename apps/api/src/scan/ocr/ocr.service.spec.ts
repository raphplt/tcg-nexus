import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { OcrService } from "./ocr.service";

jest.mock("tesseract.js", () => ({
  createWorker: jest.fn().mockResolvedValue({
    setParameters: jest.fn().mockResolvedValue(undefined),
    recognize: jest.fn().mockResolvedValue({
      data: { text: "Pikachu 025/102" },
    }),
  }),
  PSM: {
    SINGLE_BLOCK: 6,
    SINGLE_LINE: 7,
    SPARSE_TEXT: 11,
  },
}));

describe("OcrService", () => {
  let service: OcrService;
  let configService: ConfigService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OcrService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === "OCR_ENGINE") return "tesseract";
              if (key === "GOOGLE_VISION_API_KEY") return "mock-key";
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<OcrService>(OcrService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("recognize", () => {
    it("should recognize text via Tesseract by default", async () => {
      const result = await service.recognize(Buffer.from("img"), "full");
      expect(result.engine).toBe("tesseract");
      expect(result.text).toContain("Pikachu");
    });

    it("should recognize text via Google Vision when configured", async () => {
      jest.spyOn(configService, "get").mockImplementation((key: string) => {
        if (key === "OCR_ENGINE") return "vision";
        if (key === "GOOGLE_VISION_API_KEY") return "valid-key";
        return null;
      });

      jest.spyOn(global, "fetch" as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          responses: [{ fullTextAnnotation: { text: "Charizard 004/102" } }],
        }),
      } as any);

      const result = await service.recognize(Buffer.from("img"));
      expect(result.engine).toBe("vision");
      expect(result.text).toBe("Charizard 004/102");
    });

    it("should fallback to mock on recognize failure", async () => {
      jest.spyOn(configService, "get").mockImplementation((key: string) => {
        if (key === "OCR_ENGINE") return "vision";
        if (key === "GOOGLE_VISION_API_KEY") return ""; // triggers missing key error
        return null;
      });

      const result = await service.recognize(Buffer.from("img"));
      expect(result.engine).toBe("mock");
      expect(result.text).toBe("");
    });
  });
});

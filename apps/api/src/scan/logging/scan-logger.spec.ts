import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import * as fsPromises from "node:fs/promises";
import { ScanLogger } from "./scan-logger";

jest.mock("node:fs/promises", () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  appendFile: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("node:fs", () => ({
  existsSync: jest.fn().mockReturnValue(false),
}));

describe("ScanLogger", () => {
  let logger: ScanLogger;
  let configService: ConfigService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScanLogger,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    logger = module.get<ScanLogger>(ScanLogger);
    configService = module.get<ConfigService>(ConfigService);
  });

  it("should be defined", () => {
    expect(logger).toBeDefined();
  });

  it("should return null if SCAN_LOG is disabled", async () => {
    jest.spyOn(configService, "get").mockReturnValue("false");
    const result = await logger.log({
      inputImage: Buffer.from("image"),
      vision: null,
      response: {
        rawText: "",
        lines: [],
        parsed: {},
        rois: [],
        candidates: [],
        bestCard: null,
        confidence: 0,
        confidenceLevel: "low",
        engine: "tesseract",
      },
      timingsMs: {},
    });
    expect(result).toBeNull();
    expect(fsPromises.writeFile).not.toHaveBeenCalled();
  });

  it("should persist scan files and index when SCAN_LOG is true", async () => {
    jest.spyOn(configService, "get").mockReturnValue("true");
    const result = await logger.log({
      inputImage: Buffer.from("image"),
      vision: {
        detected: true,
        engine: "vision",
        bestIndex: 0,
        normalizedImage: Buffer.from("normalized"),
        rois: [
          {
            key: "name",
            image: Buffer.from("roi"),
            box: { x: 0, y: 0, width: 10, height: 10 },
          },
        ],
      },
      response: {
        rawText: "Pikachu",
        lines: ["Pikachu"],
        parsed: { cardName: "Pikachu" },
        rois: [],
        candidates: [{ id: "c-1", name: "Pikachu", score: 0.95 } as any],
        bestCard: { id: "c-1", name: "Pikachu", score: 0.95 } as any,
        confidence: 0.95,
        confidenceLevel: "high",
        engine: "vision+clip",
      },
      timingsMs: { total: 120 },
    });

    expect(result).toBeDefined();
    expect(fsPromises.mkdir).toHaveBeenCalled();
    expect(fsPromises.writeFile).toHaveBeenCalled();
    expect(fsPromises.appendFile).toHaveBeenCalled();
  });
});

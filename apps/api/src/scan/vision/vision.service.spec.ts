import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { VisionService } from "./vision.service";

describe("VisionService", () => {
  let service: VisionService;
  let configService: ConfigService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === "VISION_SERVICE_URL")
                return "http://vision-service:8000";
              if (key === "VISION_API_KEY") return "test-api-key";
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<VisionService>(VisionService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("match", () => {
    it("should return empty map when candidates array is empty", async () => {
      const result = await service.match(Buffer.from("test"), []);
      expect(result.size).toBe(0);
    });

    it("should send match request to vision microservice and return score map", async () => {
      const mockFetch = jest
        .spyOn(global, "fetch" as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            results: [{ id: "c-1", score: 15 }],
          }),
        } as any);

      const result = await service.match(Buffer.from("img"), [
        { id: "c-1", url: "http://img.png" },
      ]);

      expect(mockFetch).toHaveBeenCalled();
      expect(result.get("c-1")).toBe(15);
    });

    it("should return empty map on fetch failure", async () => {
      jest
        .spyOn(global, "fetch" as any)
        .mockRejectedValueOnce(new Error("Network fail"));
      const result = await service.match(Buffer.from("img"), [
        { id: "c-1", url: "http://img.png" },
      ]);
      expect(result.size).toBe(0);
    });
  });

  describe("preprocess", () => {
    it("should preprocess single image buffer", async () => {
      jest.spyOn(global, "fetch" as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          detected: true,
          engine: "opencv",
          normalized_image: Buffer.from("norm").toString("base64"),
          best_index: 0,
          rois: [],
        }),
      } as any);

      const result = await service.preprocess(Buffer.from("raw"));
      expect(result).toBeDefined();
      expect(result?.detected).toBe(true);
      expect(result?.engine).toBe("opencv");
    });

    it("should return null when service returns error status", async () => {
      jest.spyOn(global, "fetch" as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as any);

      const result = await service.preprocess(Buffer.from("raw"));
      expect(result).toBeNull();
    });
  });

  describe("preprocessBatch", () => {
    it("should return null if images array is empty", async () => {
      const result = await service.preprocessBatch([]);
      expect(result).toBeNull();
    });

    it("should delegate to preprocess if single image provided", async () => {
      const spy = jest.spyOn(service, "preprocess").mockResolvedValueOnce(null);
      await service.preprocessBatch([Buffer.from("img")]);
      expect(spy).toHaveBeenCalled();
    });

    it("should call preprocess-batch for multiple frames", async () => {
      jest.spyOn(global, "fetch" as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          detected: true,
          engine: "opencv",
          normalized_image: Buffer.from("norm").toString("base64"),
          best_index: 1,
          rois: [],
        }),
      } as any);

      const result = await service.preprocessBatch([
        Buffer.from("f1"),
        Buffer.from("f2"),
      ]);
      expect(result?.bestIndex).toBe(1);
    });
  });
});

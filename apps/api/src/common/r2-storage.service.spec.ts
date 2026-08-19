import { Test, TestingModule } from "@nestjs/testing";
import { R2StorageService } from "./r2-storage.service";

describe("R2StorageService", () => {
  let service: R2StorageService;
  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = {
      ...originalEnv,
      R2_ACCOUNT_ID: "mock-account-id",
      R2_ACCESS_KEY_ID: "mock-access-key",
      R2_SECRET_ACCESS_KEY: "mock-secret-key",
      R2_BUCKET_NAME: "tcg-bucket",
      R2_PUBLIC_URL: "https://cdn.tcg-nexus.org",
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [R2StorageService],
    }).compile();

    service = module.get<R2StorageService>(R2StorageService);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should be defined and initialized with valid credentials", () => {
    expect(service).toBeDefined();
  });

  it("should upload file and return public URL", async () => {
    (service as any).s3Client = {
      send: jest.fn().mockResolvedValue({}),
    };

    const result = await service.uploadFile(
      Buffer.from("file data"),
      "cards/card1.png",
      "image/png",
    );

    expect(result).toBe("https://cdn.tcg-nexus.org/cards/card1.png");
    expect((service as any).s3Client.send).toHaveBeenCalled();
  });

  it("should return null if s3Client is not configured on upload", async () => {
    (service as any).s3Client = null;
    const result = await service.uploadFile(Buffer.from("a"), "k", "text/plain");
    expect(result).toBeNull();
  });

  it("should delete file from R2 using full URL or key", async () => {
    (service as any).s3Client = {
      send: jest.fn().mockResolvedValue({}),
    };

    await service.deleteFile("https://cdn.tcg-nexus.org/cards/card1.png");
    expect((service as any).s3Client.send).toHaveBeenCalled();
  });
});

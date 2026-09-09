import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ScanController } from "./scan.controller";
import { ScanService } from "./scan.service";

describe("ScanController", () => {
  let controller: ScanController;
  let service: { recognize: jest.Mock };

  const validJpegBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]);

  beforeEach(async () => {
    service = {
      recognize: jest
        .fn()
        .mockResolvedValue({ status: "success", matches: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScanController],
      providers: [{ provide: ScanService, useValue: service }],
    }).compile();

    controller = module.get<ScanController>(ScanController);
  });

  it("throws BadRequestException if no files are uploaded", async () => {
    await expect(
      controller.recognize(
        { images: [], image: [] },
        { game: "pokemon" as any },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("throws BadRequestException if total payload exceeds max total upload size", async () => {
    const hugeBuffer = Buffer.alloc(25 * 1024 * 1024); // 25 MB
    const file = { buffer: hugeBuffer } as Express.Multer.File;

    await expect(
      controller.recognize({ images: [file] }, { game: "pokemon" as any }),
    ).rejects.toThrow(/Rafale trop volumineuse/);
  });

  it("throws BadRequestException if image format is not supported", async () => {
    const invalidBuffer = Buffer.from("not-an-image-header-data");
    const file = { buffer: invalidBuffer } as Express.Multer.File;

    await expect(
      controller.recognize({ images: [file] }, { game: "pokemon" as any }),
    ).rejects.toThrow(/Format d'image non supporté/);
  });

  it("successfully passes valid image buffers to scanService.recognize", async () => {
    const file = { buffer: validJpegBuffer } as Express.Multer.File;

    const result = await controller.recognize(
      { images: [file] },
      { game: "pokemon" as any },
    );

    expect(service.recognize).toHaveBeenCalledWith(
      [validJpegBuffer],
      "pokemon",
    );
    expect(result).toEqual({ status: "success", matches: [] });
  });
});

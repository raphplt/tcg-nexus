import { isSupportedImage } from "./image-validation";

const pad = (header: number[]): Buffer =>
  Buffer.concat([Buffer.from(header), Buffer.alloc(16)]);

describe("isSupportedImage", () => {
  it("accepts a JPEG signature", () => {
    expect(isSupportedImage(pad([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
  });

  it("accepts a PNG signature", () => {
    expect(
      isSupportedImage(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    ).toBe(true);
  });

  it("accepts a WebP signature", () => {
    const buffer = Buffer.concat([
      Buffer.from("RIFF", "ascii"),
      Buffer.alloc(4),
      Buffer.from("WEBP", "ascii"),
      Buffer.alloc(16),
    ]);
    expect(isSupportedImage(buffer)).toBe(true);
  });

  it("accepts a HEIC signature", () => {
    const buffer = Buffer.concat([
      Buffer.alloc(4),
      Buffer.from("ftyp", "ascii"),
      Buffer.from("heic", "ascii"),
      Buffer.alloc(16),
    ]);
    expect(isSupportedImage(buffer)).toBe(true);
  });

  it("rejects a ZIP archive renamed as an image", () => {
    expect(isSupportedImage(pad([0x50, 0x4b, 0x03, 0x04]))).toBe(false);
  });

  it("rejects an SVG payload", () => {
    expect(isSupportedImage(Buffer.from("<svg xmlns='...'></svg>"))).toBe(
      false,
    );
  });

  it("rejects a truncated buffer", () => {
    expect(isSupportedImage(Buffer.from([0xff, 0xd8]))).toBe(false);
  });
});

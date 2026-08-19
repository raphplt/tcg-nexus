import { describe, expect, it } from "vitest";
import { getSealedImageUrl, SEALED_PLACEHOLDER } from "@/utils/sealedImage";
import { NEXT_PUBLIC_SEALED_CDN_URL } from "@/utils/variables";

describe("sealedImage utility", () => {
  it("returns null when product or image is missing", () => {
    expect(getSealedImageUrl(null)).toBeNull();
    expect(getSealedImageUrl(undefined)).toBeNull();
    expect(getSealedImageUrl({ image: null as any })).toBeNull();
  });

  it("returns absolute URLs unchanged", () => {
    const url = "https://images.pokemontcg.io/sealed/box.png";
    expect(getSealedImageUrl({ image: url })).toBe(url);
  });

  it("prefixes relative image paths with NEXT_PUBLIC_SEALED_CDN_URL", () => {
    const relative = "products/booster.png";
    expect(getSealedImageUrl({ image: relative })).toBe(
      `${NEXT_PUBLIC_SEALED_CDN_URL}/${relative}`,
    );

    const relativeWithLeadingSlash = "/products/booster.png";
    expect(getSealedImageUrl({ image: relativeWithLeadingSlash })).toBe(
      `${NEXT_PUBLIC_SEALED_CDN_URL}/products/booster.png`,
    );
  });

  it("has a valid fallback placeholder", () => {
    expect(SEALED_PLACEHOLDER).toBe("/images/carte-pokemon-dos.jpg");
  });
});

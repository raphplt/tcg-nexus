import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPreloadCache,
  isCardImagePreloaded,
  preloadCardImage,
  preloadCardImages,
  preloadImageUrl,
} from "@/utils/miniGames/cardPreloader";

describe("cardPreloader", () => {
  let originalImage: typeof Image;

  beforeEach(() => {
    clearPreloadCache();
    originalImage = global.Image;
  });

  afterEach(() => {
    global.Image = originalImage;
    clearPreloadCache();
  });

  it("handles empty or falsy URLs gracefully", async () => {
    await expect(preloadImageUrl("")).resolves.toBeUndefined();
    expect(isCardImagePreloaded("")).toBe(false);
  });

  it("preloads and decodes an image URL using the DOM Image constructor", async () => {
    let instanceCount = 0;
    const mockDecode = vi.fn().mockResolvedValue(undefined);

    class MockImage {
      src = "";
      decode = mockDecode;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      constructor() {
        instanceCount++;
        setTimeout(() => {
          this.onload?.();
        }, 5);
      }
    }

    // @ts-expect-error Mocking DOM Image
    global.Image = MockImage;

    const url = "https://cdn.tcg-nexus.org/cards/sv1/1/low.png";
    expect(isCardImagePreloaded(url)).toBe(false);

    await preloadImageUrl(url);

    expect(instanceCount).toBe(1);
    expect(mockDecode).toHaveBeenCalledTimes(1);
    expect(isCardImagePreloaded(url)).toBe(true);

    // Second call uses cache and does not instantiate a new Image
    await preloadImageUrl(url);
    expect(instanceCount).toBe(1);
  });

  it("deduplicates concurrent in-flight requests for the same URL", async () => {
    let instanceCount = 0;

    class SlowMockImage {
      src = "";
      onload: (() => void) | null = null;
      constructor() {
        instanceCount++;
        setTimeout(() => {
          this.onload?.();
        }, 15);
      }
    }

    // @ts-expect-error Mocking DOM Image
    global.Image = SlowMockImage;

    const url = "https://cdn.tcg-nexus.org/cards/sv1/2/low.png";
    const [p1, p2] = [preloadImageUrl(url), preloadImageUrl(url)];

    await Promise.all([p1, p2]);
    expect(instanceCount).toBe(1);
    expect(isCardImagePreloaded(url)).toBe(true);
  });

  it("resolves safely on image loading error without throwing", async () => {
    class FailingMockImage {
      src = "";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor() {
        setTimeout(() => {
          this.onerror?.();
        }, 5);
      }
    }

    // @ts-expect-error Mocking DOM Image
    global.Image = FailingMockImage;

    const url = "https://cdn.tcg-nexus.org/cards/broken/low.png";
    await expect(preloadImageUrl(url)).resolves.toBeUndefined();
    // Failed URLs are not marked as preloaded so future attempts can retry
    expect(isCardImagePreloaded(url)).toBe(false);
  });

  it("preloads single and multiple card objects", async () => {
    class FastMockImage {
      src = "";
      onload: (() => void) | null = null;
      constructor() {
        setTimeout(() => {
          this.onload?.();
        }, 1);
      }
    }

    // @ts-expect-error Mocking DOM Image
    global.Image = FastMockImage;

    const cardA = { id: "a", name: "Pikachu", image: "https://cdn.tcg-nexus.org/cards/sv1/25" };
    const cardB = { id: "b", name: "Charizard", image: "https://cdn.tcg-nexus.org/cards/sv1/6" };

    await preloadCardImage(cardA, "low");
    expect(isCardImagePreloaded("https://cdn.tcg-nexus.org/cards/sv1/25/low.png")).toBe(true);

    await preloadCardImages([cardA, cardB], "low");
    expect(isCardImagePreloaded("https://cdn.tcg-nexus.org/cards/sv1/6/low.png")).toBe(true);
    // Card back should also be primed
    expect(isCardImagePreloaded("/images/carte-pokemon-dos.jpg")).toBe(true);
  });
});

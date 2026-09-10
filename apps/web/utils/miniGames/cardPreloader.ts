import { useEffect } from "react";
import type { PokemonCardType } from "@/types/cardPokemon";
import type { BoosterCard } from "@/types/mini-game";
import { getCardImage } from "@/utils/images";

const CARD_BACK = "/images/carte-pokemon-dos.jpg";

/** URLs that have finished preloading and decoding into memory. */
const preloadedUrls = new Set<string>();

/** In-flight preloading promises to prevent duplicate network requests. */
const inFlightPromises = new Map<string, Promise<void>>();

/**
 * Checks if an image URL has already been preloaded into the browser cache.
 */
export function isCardImagePreloaded(url: string): boolean {
  return preloadedUrls.has(url);
}

/**
 * Clears the preloading cache. Primarily intended for unit tests.
 */
export function clearPreloadCache(): void {
  preloadedUrls.clear();
  inFlightPromises.clear();
}

/**
 * Preloads and decodes an image URL using the browser Image API.
 * Always resolves (even on error) so batch operations never abort.
 */
export function preloadImageUrl(url: string): Promise<void> {
  if (!url) return Promise.resolve();

  if (preloadedUrls.has(url)) {
    return Promise.resolve();
  }

  const existing = inFlightPromises.get(url);
  if (existing) {
    return existing;
  }

  // Handle environments without the DOM Image constructor (SSR, test environments)
  if (typeof window === "undefined" || typeof Image === "undefined") {
    preloadedUrls.add(url);
    return Promise.resolve();
  }

  const promise = new Promise<void>((resolve) => {
    const img = new Image();

    const cleanup = () => {
      inFlightPromises.delete(url);
      resolve();
    };

    img.onload = () => {
      preloadedUrls.add(url);
      if (typeof img.decode === "function") {
        img.decode().catch(() => {
          // Decode errors are non-fatal; the image is still loaded in cache.
        }).finally(cleanup);
      } else {
        cleanup();
      }
    };

    img.onerror = () => {
      // Mark as resolved to unblock callers; fallback will be used at render time.
      cleanup();
    };

    img.src = url;
  });

  inFlightPromises.set(url, promise);
  return promise;
}

export type PreloadableCard = Pick<PokemonCardType, "image">;

/**
 * Preloads a single booster or Pokémon card image.
 */
export function preloadCardImage(
  card: PreloadableCard | null | undefined,
  quality: "low" | "high" = "low",
): Promise<void> {
  if (!card) return Promise.resolve();
  const src = getCardImage(card, quality);
  return preloadImageUrl(src);
}

/**
 * Preloads a list of card images in parallel, including the default card back.
 */
export function preloadCardImages(
  cards: (PreloadableCard | null | undefined)[],
  quality: "low" | "high" = "low",
): Promise<void[]> {
  if (!cards || cards.length === 0) return Promise.resolve([]);

  // Ensure card back is also primed
  const backPromise = preloadImageUrl(CARD_BACK);

  const cardPromises = cards
    .filter(Boolean)
    .map((card) => preloadCardImage(card, quality));

  return Promise.all([backPromise, ...cardPromises]);
}

/**
 * React hook that triggers background preloading for an array of cards.
 */
export function useCardImagePreloader(
  cards: (PreloadableCard | null | undefined)[] | null | undefined,
  quality: "low" | "high" = "low",
): void {
  useEffect(() => {
    if (!cards || cards.length === 0) return;
    void preloadCardImages(cards, quality);
  }, [cards, quality]);
}

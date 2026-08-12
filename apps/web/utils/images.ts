import { RemotePattern } from "next/dist/shared/lib/image-config";
import { Rarity } from "../types/listing";

export const typeToImage: Record<string, string> = {
  plante: "/images/types/Type-Plante-JCC.png",
  feu: "/images/types/Type-Feu-JCC.png",
  eau: "/images/types/Type-Eau-JCC.png",
  électrique: "/images/types/Type-Électrique-JCC.png",
  psy: "/images/types/Type-Psy-JCC.png",
  incolore: "/images/types/Type-Incolore-JCC.png",
  obscurité: "/images/types/Type-Obscurité-JCC.png",
  métal: "/images/types/Type-Métal-JCC.png",
  dragon: "/images/types/Type-Dragon-JCC.png",
  fée: "/images/types/Type-Fée-JCC.png",
  combat: "/images/types/Type-Combat-JCC.png",
};

export const rarityToImage: Record<Rarity, string> = {
  [Rarity.COMMUNE]: "/images/rareties/JCC-commune.png",
  [Rarity.PEU_COMMUNE]: "/images/rareties/JCC-Peu-Commune.png",
  [Rarity.BRILLANT]: "/images/rareties/JCC-Brillant.png",
  [Rarity.HOLOGRAPHIQUE]: "/images/rareties/JCC-Holographique.png",
  [Rarity.RARETÉ_LÉGENDE]: "/images/rareties/JCC-Rareté-Légende.png",
  [Rarity.MAGNIFIQUE_RARE]: "/images/rareties/JCC-Magnifique-Rare.png",
  [Rarity.DOUBLE_RARE]: "/images/rareties/JCC-Double-Rare.png",
  [Rarity.RARE]: "/images/rareties/JCC-rare.png",
  [Rarity.RARE_HOLO]: "/images/rareties/JCC-rare.png",
  [Rarity.ULTRA_RARE]: "/images/rareties/JCC-ultra-rare.png",
  [Rarity.ILLUSTRATION_RARE]: "/images/rareties/JCC-illustration-rare.png",
  [Rarity.ILLUSTRATION_SPÉCIALE_RARE]:
    "/images/rareties/JCC-Illustration-Spéciale-Rare.png",
  [Rarity.HYPER_RARE]: "/images/rareties/JCC-hyper-rare.png",
  [Rarity.CHROMATIQUE_RARE]: "/images/rareties/JCC-Chromatique-Rare.png",
  [Rarity.CHROMATIQUE_ULTRA_RARE]:
    "/images/rareties/JCC-Chromatique-Ultra-Rare.png",
  [Rarity.HIGH_TECH_RARE]: "/images/rareties/JCC-High-Tech-Rare.png",
};
export function getTypeImage(type: string): string | undefined {
  return typeToImage[type] || undefined;
}

export function getRarityImage(rarity: Rarity): string | undefined {
  return rarityToImage[rarity] || undefined;
}

import {
  PokemonCardType,
  PokemonSerieType,
  PokemonSetType,
} from "../types/cardPokemon";

export const R2_BASE_URL = "https://cdn.tcg-nexus.org";

/**
 * Legacy public R2 hosts (`*.r2.dev`) are rewritten to the custom
 * `cdn.tcg-nexus.org` domain. Objects remain in the same bucket, but direct
 * R2 public access is disabled in production.
 */
const LEGACY_R2_HOSTS = ["pub-27752f7846b4433d8e74edcc8bdc1dc8.r2.dev"];

const PLACEHOLDER_CARD = "/images/carte-pokemon-dos.jpg";

/**
 * Rewrites only legacy public R2 hosts to `cdn.tcg-nexus.org`; it never adds
 * an extension. Use it for base card-image URLs before adding a quality suffix.
 */
export function rewriteLegacyHost(
  url: string | null | undefined,
): string | undefined {
  if (!url) return undefined;
  const next = url.trim();
  if (!next) return undefined;
  for (const host of LEGACY_R2_HOSTS) {
    if (next.includes(host)) {
      return next.replace(host, "cdn.tcg-nexus.org");
    }
  }
  return next;
}

/**
 * Normalizes a complete asset URL such as a logo or symbol. It rewrites legacy
 * R2 hosts and adds the missing extension to bare TCGdex URLs.
 *
 * Do not use this for card images, whose base URLs receive a `/high.png` or
 * `/low.png` suffix in `getCardImage`.
 *
 * @param url - Source URL, which may be null or undefined.
 * @param ext - Extension to add to bare TCGdex assets.
 */
export function normalizeAssetUrl(
  url: string | null | undefined,
  ext: "webp" | "png" = "webp",
): string | undefined {
  let next = rewriteLegacyHost(url);
  if (!next) return undefined;

  if (
    next.includes("assets.tcgdex.net") &&
    !/\.(png|webp|jpg|jpeg)$/i.test(next)
  ) {
    next = `${next}.${ext}`;
  }

  if (next.includes("cdn.tcg-nexus.org/series/")) {
    next = `${next}?v=2`;
  }

  return next;
}

export function getCardImage(
  card: PokemonCardType | null | undefined,
  quality: "high" | "low" = "high",
): string {
  if (!card || !card.image) {
    return PLACEHOLDER_CARD;
  }

  const base = rewriteLegacyHost(card.image);
  if (!base) return PLACEHOLDER_CARD;

  const suffix = quality === "low" ? "/low" : "/high";
  return `${base}${suffix}.png`;
}

/** Returns a normalized set logo URL, if available. */
export function getSetLogo(
  set: PokemonSetType | null | undefined,
): string | undefined {
  return normalizeAssetUrl(set?.logo, "webp");
}

/** Returns a normalized set symbol URL, if available. */
export function getSetSymbol(
  set: PokemonSetType | null | undefined,
): string | undefined {
  return normalizeAssetUrl(set?.symbol, "png");
}

/**
 * Returns the best available image for a set, preferring its logo to its symbol.
 */
export function getSetImage(
  set: PokemonSetType | null | undefined,
): string | undefined {
  return getSetLogo(set) ?? getSetSymbol(set);
}

/** Returns a normalized series logo URL, if available. */
export function getSeriesLogo(
  serie: PokemonSerieType | null | undefined,
): string | undefined {
  return normalizeAssetUrl(serie?.logo, "webp");
}

export const remotePatterns: RemotePattern[] = [
  {
    protocol: "https",
    hostname: "cdn.tcg-nexus.org",
    port: "",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "pub-27752f7846b4433d8e74edcc8bdc1dc8.r2.dev",
    port: "",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "www.pokecardex.com",
    port: "",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "pokecardex.b-cdn.net",
    port: "",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "assets.tcgdex.net",
    port: "",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "den-cards.pokellector.com",
    port: "",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "toxigon.com",
    port: "",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "upload.wikimedia.org",
    port: "",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "images.pexels.com",
    port: "",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "www.pexels.com",
    port: "",
    pathname: "/**",
  },
];

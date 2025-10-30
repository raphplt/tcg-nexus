import { Rarity } from "@/types/listing";

export const typeToImage: Record<string, string> = {
  plante: "/images/types/Type-Plante-JCC.png",
  feu: "/images/types/Type-Feu-JCC-Miniature.png",
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

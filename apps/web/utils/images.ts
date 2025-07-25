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

export const rarityToImage: Record<string, string> = {
  commune: "/images/rareties/JCC-commune.png",
  "peu commune": "/images/rareties/JCC-Peu-Commune.png",
  brillant: "/images/rareties/JCC-Brillant.png",
  holographique: "/images/rareties/JCC-Holographique.png",
  rareté_légende: "/images/rareties/JCC-Rareté-Légende.png",
  magnifique_rare: "/images/rareties/JCC-Magnifique-Rare.png",
  double_rare: "/images/rareties/JCC-Double-Rare.png",
  rare: "/images/rareties/JCC-rare.png",
  rare_holo: "/images/rareties/JCC-rare.png",
  ultra_rare: "/images/rareties/JCC-ultra-rare.png",
  illustration_rare: "/images/rareties/JCC-illustration-rare.png",
  illustration_spéciale_rare:
    "/images/rareties/JCC-Illustration-Spéciale-Rare.png",
  hyper_rare: "/images/rareties/JCC-hyper-rare.png",
  chromatique_rare: "/images/rareties/JCC-Chromatique-Rare.png",
  chromatique_ultra_rare: "/images/rareties/JCC-Chromatique-Ultra-Rare.png",
  high_tech_rare: "/images/rareties/JCC-High-Tech-Rare.png",
};

export function getTypeImage(type: string): string | undefined {
  return typeToImage[type] || undefined;
}

export function getRarityImage(rarity: string): string | undefined {
  return rarityToImage[rarity] || undefined;
}

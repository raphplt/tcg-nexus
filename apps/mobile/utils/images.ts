import { API_URL } from "../services/api";

const LEGACY_R2_HOSTS = ["pub-27752f7846b4433d8e74edcc8bdc1dc8.r2.dev"];
export const PLACEHOLDER_CARD = "https://tcg-nexus.org/images/carte-pokemon-dos.jpg";

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

export function getCardImage(
  image: string | null | undefined,
  quality: "high" | "low" = "high",
): string {
  if (!image) {
    return PLACEHOLDER_CARD;
  }

  const base = rewriteLegacyHost(image);
  if (!base) return PLACEHOLDER_CARD;

  // Si l'image possède déjà une extension, on ne rajoute pas le /high.png
  if (base.match(/\.(png|jpg|jpeg|webp)$/i)) {
    return base.startsWith("http") ? base : `https://tcg-nexus.org${base}`;
  }

  const suffix = quality === "low" ? "/low" : "/high";
  const finalUrl = `${base}${suffix}.png`;

  return finalUrl.startsWith("http") ? finalUrl : `https://tcg-nexus.org${finalUrl}`;
}

// Prefix for local mobile assets served by Metro
export const getBaseAssetUrl = (): string => {
  const ipMatch = API_URL.match(/https?:\/\/([^:/]+)/);
  const host = ipMatch ? ipMatch[1] : "localhost";
  return `http://${host}:8081/assets/assets`;
};

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

export const rarityToImage: Record<string, string> = {
  Commune: "/images/rareties/JCC-commune.png",
  commune: "/images/rareties/JCC-commune.png",
  "Peu Commune": "/images/rareties/JCC-Peu-Commune.png",
  "peu commune": "/images/rareties/JCC-Peu-Commune.png",
  Brillant: "/images/rareties/JCC-Brillant.png",
  brillant: "/images/rareties/JCC-Brillant.png",
  Holographique: "/images/rareties/JCC-Holographique.png",
  holographique: "/images/rareties/JCC-Holographique.png",
  "Rareté Légende": "/images/rareties/JCC-Rareté-Légende.png",
  "Magnifique Rare": "/images/rareties/JCC-Magnifique-Rare.png",
  "Double Rare": "/images/rareties/JCC-Double-Rare.png",
  Rare: "/images/rareties/JCC-rare.png",
  rare: "/images/rareties/JCC-rare.png",
  "Rare Holo": "/images/rareties/JCC-rare.png",
  "Ultra Rare": "/images/rareties/JCC-ultra-rare.png",
  "Illustration Rare": "/images/rareties/JCC-illustration-rare.png",
  "Illustration Spéciale Rare": "/images/rareties/JCC-Illustration-Spéciale-Rare.png",
  "Hyper Rare": "/images/rareties/JCC-hyper-rare.png",
  "Chromatique Rare": "/images/rareties/JCC-Chromatique-Rare.png",
  "Chromatique Ultra Rare": "/images/rareties/JCC-Chromatique-Ultra-Rare.png",
  "High Tech Rare": "/images/rareties/JCC-High-Tech-Rare.png",
};

export function getTypeImage(type: string): string | undefined {
  if (!type) return undefined;
  const path = typeToImage[type.toLowerCase()];
  if (!path) return undefined;
  return `${getBaseAssetUrl()}${path}`;
}

export function getRarityImage(rarity: string): string | undefined {
  if (!rarity) return undefined;
  const path = rarityToImage[rarity] || rarityToImage[rarity.toLowerCase()];
  if (!path) return undefined;
  return `${getBaseAssetUrl()}${path}`;
}

const ACCENTED_NAMES = new Set([
  "célébrations",
  "destinées-radieuses",
  "l-appel-des-légendes",
  "la-voie-du-maïtre",
  "règne-de-glace",
  "stars-étincelantes",
  "tempête-argentée",
  "ténèbres-embrasées",
  "zénith-suprême",
  "épée-et-bouclier",
  "évolution-céleste",
  "pokémon-go"
]);

const LOCAL_LOGOS = new Set([
  "151",
  "base",
  "neo",
  "e-cards",
  "ex",
  "alliance-infaillible",
  "aquapolis",
  "astres-radieux",
  "aube-majestueuse",
  "aventures-ensemble",
  "ciel-rugissant",
  "clash-des-rebelles",
  "coffre-des-dragons",
  "combat-express-2023",
  "couronne-stellaire",
  "createurs-de-legendes",
  "célébrations",
  "dechainement",
  "destinees-de-paldea",
  "destinees-futures",
  "destinees-occultes",
  "destinées-radieuses",
  "diamant-et-perle",
  "double-danger",
  "dragon-discovery",
  "dragons-exaltes",
  "duels-au-sommet",
  "duo-de-choc",
  "ecarlate-et-violet",
  "eclipse-comsique",
  "emeraude",
  "especes-delta",
  "etincelles-deferlantes",
  "eveil-des-legendes",
  "evolutions-a-paldea",
  "evolutions-prismatiques",
  "ex-deoxys",
  "ex-dragon",
  "expedition",
  "explorateurs-obscurs",
  "explosion-plasma",
  "fable-nebuleuse",
  "faille-paradoxe",
  "fantomes-holon",
  "flamme-blanche",
  "flammes-fantasmagoriques",
  "flammes-obsidiennes",
  "forces-cachees",
  "forces-temporelles",
  "fossile",
  "foudre-noire",
  "frontieres-franchies",
  "gardiens-ascendants",
  "gardiens-de-cristal",
  "gardiens-du-pouvoir",
  "generations",
  "glaciation-plasma",
  "gym-challenge",
  "gym-heroes",
  "harmonie-des-esprits",
  "heartgold-soulsilver",
  "iles-des-dragons",
  "impact-des-destins",
  "impulsion-turbo",
  "indomptable",
  "invasion-carmin",
  "jungle",
  "l-appel-des-légendes",
  "la-voie-du-maïtre",
  "legendary-collection",
  "legendary-treasures",
  "legendes-brillantes",
  "legendes-oubliees",
  "logo-pokemon-flamme-blanche",
  "lor",
  "lumiere-interdite",
  "majeste-des-dragons",
  "mascarade-crepusculaire",
  "mcdonalds-2021",
  "mega-evolution",
  "merveilles-secretes",
  "neo-destiny",
  "neo-discovery",
  "neo-genesis",
  "neo-revelation",
  "nobles-victoires",
  "noir-blanc-mcdonalds",
  "noir-blanc",
  "offensive-vapeur",
  "ombres-ardentes",
  "origines-antiques",
  "platine-arceus",
  "platine",
  "poing-de-fusion",
  "poings-furieux",
  "pokémon-go",
  "pouvoirs-emergents",
  "primo-choc",
  "promo-mcdonalds-xy",
  "rivalites-destinees",
  "rivaux-emergents",
  "rouge-feu-et-vert-feuille",
  "rubis-saphir",
  "rupture-turbo",
  "règne-de-glace",
  "set-de-base-2",
  "set-de-base",
  "skyridge",
  "soleil-et-lune-2019",
  "soleil-et-lune",
  "stars-étincelantes",
  "styles-de-combat",
  "team-magma-vs-team-aqua",
  "team-rocket-returns",
  "team-rocket",
  "tempete-celeste",
  "tempete-de-sable",
  "tempete-plasma",
  "tempete",
  "tempête-argentée",
  "tonnerre-perdu",
  "tresors-mysterieux",
  "triomphe",
  "ténèbres-embrasées",
  "ultra-prisme",
  "vainqueurs-supremes",
  "vigueur-spectrale",
  "xy-bienvenue-a-kalos",
  "xy-etincelles",
  "xy-evolutions",
  "xy",
  "zénith-suprême",
  "épée-et-bouclier",
  "évolution-céleste"
]);

const LOCAL_SET_ICONS: Record<string, string> = {
  "151": "151-icon.webp",
  "alliance-infaillible": "alliance-infaillible-icon.webp",
  "aquapolis": "aquapolis-icon.webp",
  "asr": "asr-icon.webp",
  "aube-majestueuse": "aube-majestueuse-icon.webp",
  "aventures-ensemble": "aventures-ensemble-icon.webp",
  "brs": "brs-icon.webp",
  "cel": "cel-icon.webp",
  "ciel-rugissant": "ciel-rugissant-icon.webp",
  "cl": "cl-icon.webp",
  "coffre-des-dragons": "coffre-des-dragons-icon.webp",
  "combat-express-2023": "combat-express-2023-icon.webp",
  "couronne-stellaire": "couronne-stellaire-icon.webp",
  "cre": "cre-icon.webp",
  "createurs-de-legendes": "createurs-de-legendes-icon.webp",
  "crz-1": "crz-1-icon.webp",
  "dechainement": "dechainement-icon.webp",
  "destinees-de-paldea": "destinees-de-paldea-icon.webp",
  "destinees-futures": "destinees-futures-icon.webp",
  "destinees-occultes": "destinees-occultes-icon.webp",
  "destinées-radieuses": "destinées-radieuses-icon.webp",
  "diamant-et-perle": "diamant-et-perle-icon.webp",
  "double-danger": "double-danger-icon.webp",
  "dragon-discovery": "dragon-discovery-icon.webp",
  "dragons-exaltes": "dragons-exaltes-icon.webp",
  "duels-au-sommet": "duels-au-sommet-icon.webp",
  "duo-de-choc": "duo-de-choc-icon.webp",
  "ecarlate-et-violet": "ecarlate-et-violet-icon.webp",
  "eclipse-comsique": "eclipse-comsique-icon.webp",
  "emeraude": "emeraude-icon.webp",
  "especes-delta": "especes-delta-icon.webp",
  "etincelles-deferlantes": "etincelles-deferlantes-icon.webp",
  "eveil-des-legendes": "eveil-des-legendes-icon.webp",
  "evolutions-a-paldea": "evolutions-a-paldea-icon.webp",
  "evolutions-prismatiques": "evolutions-prismatiques-icon.webp",
  "evs": "evs-icon.webp",
  "ex-deoxys": "ex-deoxys-icon.webp",
  "ex-dragon": "ex-dragon-icon.webp",
  "expedition": "expedition-icon.webp",
  "explorateurs-obscurs": "explorateurs-obscurs-icon.png",
  "explosion-plasma": "explosion-plasma-icon.webp",
  "fable-nebuleuse": "fable-nebuleuse-icon.webp",
  "faille-paradoxe": "faille-paradoxe-icon.webp",
  "fantomes-holon": "fantomes-holon-icon.webp",
  "flamme-blanche": "flamme-blanche-icon.webp",
  "flammes-fantasmagoriques": "flammes-fantasmagoriques-icon.webp",
  "flammes-obsidiennes": "flammes-obsidiennes-icon.webp",
  "forces-cachees": "forces-cachees-icon.webp",
  "forces-temporelles": "forces-temporelles-icon.webp",
  "fossile": "fossile-icon.png",
  "foudre-noire": "foudre-noire-icon.webp",
  "frontieres-franchies": "frontieres-franchies-icon.webp",
  "fst": "fst-icon.webp",
  "gardiens-ascendants": "gardiens-ascendants-icon.webp",
  "gardiens-de-cristal": "gardiens-de-cristal-icon.webp",
  "gardiens-du-pouvoir": "gardiens-du-pouvoir-icon.webp",
  "generations": "generations-icon.webp",
  "glaciation-plasma": "glaciation-plasma-icon.webp",
  "gym-challenge": "gym-challenge-icon.png",
  "gym-heroes": "gym-heroes-icon.png",
  "harmonie-des-esprits": "harmonie-des-esprits-icon.webp",
  "heartgold-soulsilver": "heartgold-soulsilver-icon.webp",
  "iles-des-dragons": "iles-des-dragons-icon.webp",
  "impact-des-destins": "impact-des-destins-icon.webp",
  "impulsion-turbo": "impulsion-turbo-icon.webp",
  "indomptable": "indomptable-icon.webp",
  "invasion-carmin": "invasion-carmin-icon.webp",
  "legendary-collection": "legendary-collection-icon.webp",
  "legendary-treasures": "legendary-treasures-icon.webp",
  "legendes-brillantes": "legendes-brillantes-icon.webp",
  "legendes-oubliees": "legendes-oubliees-icon.webp",
  "logo-pokemon-flamme-blanche": "logo-pokemon-flamme-blanche-icon.webp",
  "lor": "lor-icon.webp",
  "lumiere-interdite": "lumiere-interdite-icon.webp",
  "majeste-des-dragons": "majeste-des-dragons-icon.webp",
  "mascarade-crepusculaire": "mascarade-crepusculaire-icon.webp",
  "mcdonalds-2021": "mcdonalds-2021-icon.png",
  "mega-evolution": "mega-evolution-icon.webp",
  "merveilles-secretes": "merveilles-secretes-icon.webp",
  "neo-destiny": "neo-destiny-icon.webp",
  "neo-discovery": "neo-discovery-icon.png",
  "neo-genesis": "neo-genesis-icon.png",
  "neo-revelation": "neo-revelation-icon.png",
  "nobles-victoires": "nobles-victoires-icon.webp",
  "noir-blanc": "noir-blanc-icon.png",
  "noir-blanc-mcdonalds": "noir-blanc-mcdonalds-icon.webp",
  "offensive-vapeur": "offensive-vapeur-icon.webp",
  "ombres-ardentes": "ombres-ardentes-icon.webp",
  "origines-antiques": "origines-antiques-icon.webp",
  "pgo": "pgo-icon.webp",
  "platine-arceus": "platine-arceus-icon.webp",
  "platine": "platine-icon.webp",
  "poings-furieux": "poings-furieux-icon.webp",
  "pouvoirs-emergents": "pouvoirs-emergents-icon.png",
  "primo-choc": "primo-choc-icon.webp",
  "promo-mcdonalds-xy": "promo-mcdonalds-xy-icon.webp",
  "rivalites-destinees": "rivalites-destinees-icon.webp",
  "rivaux-emergents": "rivaux-emergents-icon.webp",
  "rouge-feu-et-vert-feuille": "rouge-feu-et-vert-feuille-icon.webp",
  "rubis-saphir": "rubis-saphir-icon.webp",
  "rupture-turbo": "rupture-turbo-icon.webp",
  "set-de-base-2": "set-de-base-2-icon.png",
  "sit": "sit-icon.webp",
  "skyridge": "skyridge-icon.png",
  "soleil-et-lune-2019": "soleil-et-lune-2019-icon.webp",
  "soleil-et-lune": "soleil-et-lune-icon.webp",
  "swsh1": "swsh1-icon.webp",
  "swsh2": "swsh2-icon.webp",
  "swsh3": "swsh3-icon.webp",
  "swsh35": "swsh35-icon.webp",
  "swsh45": "swsh45-icon.webp",
  "swsh5": "swsh5-icon.webp",
  "team-magma-vs-team-aqua": "team-magma-vs-team-aqua-icon.webp",
  "team-rocket-returns": "team-rocket-returns-icon.webp",
  "team-rocket": "team-rocket-icon.png",
  "tempete-celeste": "tempete-celeste-icon.webp",
  "tempete-de-sable": "tempete-de-sable-icon.webp",
  "tempete-plasma": "tempete-plasma-icon.webp",
  "tonnerre-perdu": "tonnerre-perdu-icon.webp",
  "tresors-mysterieux": "tresors-mysterieux-icon.webp",
  "triomphe": "triomphe-icon.webp",
  "ultra-prisme": "ultra-prisme-icon.webp",
  "vainqueurs-supremes": "vainqueurs-supremes-icon.webp",
  "vigueur-spectrale": "vigueur-spectrale-icon.webp",
  "xy-bienvenue-a-kalos": "xy-bienvenue-a-kalos-icon.webp",
  "xy-etincelles": "xy-etincelles-icon.webp",
  "xy-evolutions": "xy-evolutions-icon.webp",
  "xy": "xy-icon.webp"
};

function normalizeName(name: string): string {
  if (!name) return "";
  let normalized = name.toLowerCase();
  normalized = normalized.replace(/&/g, "et");
  normalized = normalized.replace(/[\s',’.:/\\()]+/g, "-");
  normalized = normalized.replace(/^-+|-+$/g, "");

  if (!ACCENTED_NAMES.has(normalized)) {
    normalized = normalized
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }
  return normalized;
}

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

  return next;
}

export function getSeriesIconUrl(
  serie: { name: string; logo?: string } | null | undefined,
): string {
  if (!serie) return "";
  const normalized = normalizeName(serie.name);
  if (LOCAL_LOGOS.has(normalized)) {
    const ext = normalized === "ex" ? "png" : "webp";
    return `${getBaseAssetUrl()}/images/icons/${normalized}.${ext}`;
  }
  return normalizeAssetUrl(serie.logo, "webp") || "";
}

export function getSetIconUrl(
  set: { id: string; name: string; logo?: string; symbol?: string } | null | undefined,
): string {
  if (!set) return "";

  // 1. Try set name normalized
  const normalizedName = normalizeName(set.name);
  if (LOCAL_SET_ICONS[normalizedName]) {
    return `${getBaseAssetUrl()}/images/icons/${LOCAL_SET_ICONS[normalizedName]}`;
  }

  // 2. Try set ID normalized (lowercase)
  const normalizedId = set.id.toLowerCase();
  if (LOCAL_SET_ICONS[normalizedId]) {
    return `${getBaseAssetUrl()}/images/icons/${LOCAL_SET_ICONS[normalizedId]}`;
  }

  return normalizeAssetUrl(set.symbol || set.logo, "png") || "";
}

export function getSetLogo(
  set: { logo?: string } | null | undefined,
): string | undefined {
  return normalizeAssetUrl(set?.logo, "webp");
}

export function getSetSymbol(
  set: { symbol?: string } | null | undefined,
): string | undefined {
  return normalizeAssetUrl(set?.symbol, "png");
}

export function getSetImage(
  set: { id: string; name: string; logo?: string; symbol?: string } | null | undefined,
): string | undefined {
  return getSetIconUrl(set) || getSetLogo(set) || getSetSymbol(set);
}

export function getSeriesLogo(
  serie: { name: string; logo?: string } | null | undefined,
): string | undefined {
  return getSeriesIconUrl(serie) || normalizeAssetUrl(serie?.logo, "webp");
}



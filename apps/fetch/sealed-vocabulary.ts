/**
 * Bilingual vocabulary for sealed products.
 *
 * No catalog API publishes sealed products in more than one language:
 * Pokécardex is French-only and TCGdex does not cover them at all. Their names
 * are therefore not translated but **composed**, from three parts that the
 * repository already knows how to say in both languages:
 *
 *   1. the set name, from `data/<locale>/sets.json`;
 *   2. the product term, from `SEALED_TERMS` below;
 *   3. the Pokémon names, from the card dataset (see `sealed-names.ts`).
 *
 * A product whose three parts do not all resolve gets no English name at all,
 * and the API falls back to French rather than showing an approximation.
 */

/**
 * Maps a Pokécardex series identifier to a TCGdex set identifier.
 *
 * Pokécardex has its own set naming ("Diamant & Perle : Tempête" where TCGdex
 * says "Stormfront"), so matching on the label alone left 86 of the 172 series
 * unresolved. This table is the join key instead.
 *
 * Series absent from this table are products with no TCGdex set: World
 * Championships decks, advent calendars, Lamincards, Topps, Pikachu World
 * Collection. Their `pokemonSet` stays null, which is what the entity already
 * allowed.
 */
export const POKECARDEX_SET_IDS: Record<string, string> = {
  AOR: "xy7",
  AQ: "ecard2",
  AR: "pl4",
  ASR: "swsh10",
  BCR: "bw7",
  BKP: "xy9",
  BKT: "xy8",
  BLW: "bw1",
  BRS: "swsh9",
  BS: "base1",
  BS2: "base4",
  CEL: "cel25",
  CG: "ex14",
  CL: "col1",
  CRE: "swsh6",
  CRZ: "swsh12.5",
  DCR: "dc1",
  DEX: "bw5",
  DF: "ex15",
  DP: "dp1",
  DPK: "det1",
  DR: "ex3",
  DRV: "dv1",
  DRX: "bw6",
  DS: "ex11",
  DX: "ex8",
  EM: "ex9",
  EPO: "bw2",
  EVO: "xy12",
  EVS: "swsh7",
  EX: "ecard1",
  FAC: "xy10",
  FFI: "xy3",
  FLF: "xy2",
  FO: "base3",
  FST: "swsh8",
  FUTSAL: "fut2020",
  GC: "gym2",
  GE: "dp4",
  GH: "gym1",
  GNR: "g1",
  HGSS: "hgss1",
  HL: "ex5",
  HP: "ex13",
  JTG: "sv09",
  JU: "base2",
  KSS: "xy0",
  LA: "dp6",
  LC: "lc",
  LM: "ex12",
  LOR: "swsh11",
  LTR: "bw11",
  M23: "2023sv",
  M24: "2024sv",
  MC10US: "2021swsh",
  MC11US: "2022swsh",
  MC8: "2018sm-fr",
  MC9: "2019sm-fr",
  MD: "dp5",
  MEW: "sv03.5",
  MFB23: "mfb",
  MT: "dp2",
  N4: "neo4",
  ND: "neo2",
  NG: "neo1",
  NR: "neo3",
  NVI: "bw3",
  NXD: "bw4",
  OBF: "sv03",
  PAF: "sv04.5",
  PAL: "sv02",
  PAR: "sv04",
  PCP: "ex5.5",
  PGO: "swsh10.5",
  PHF: "xy4",
  PK: "ex16",
  PLB: "bw10",
  PLF: "bw9",
  PLS: "bw8",
  POP1: "pop1",
  POP2: "pop2",
  POP3: "pop3",
  POP4: "pop4",
  POP5: "pop5",
  POP6: "pop6",
  POP7: "pop7",
  POP8: "pop8",
  POP9: "pop9",
  PRC: "xy5",
  PRE: "sv08.5",
  PT: "pl1",
  RFVF: "ex6",
  ROS: "xy6",
  RR: "pl2",
  RS: "ex1",
  RUM: "ru1",
  SCR: "sv07",
  // NOTE: "SF" is Stormfront, not Shrouded Fable — Pokécardex reuses codes
  // across generations, which is why this table is explicit rather than derived.
  SF: "dp7",
  SFA: "sv06.5",
  SI: "si1",
  SIT: "swsh12",
  SK: "ecard3",
  SLE: "sm3.5",
  SM01: "sm1",
  SM02: "sm2",
  SM03: "sm3",
  SM04: "sm4",
  SM05: "sm5",
  SM06: "sm6",
  SM07: "sm7",
  SM08: "sm8",
  SM09: "sm9",
  SM10: "sm10",
  SM11: "sm11",
  SM115: "sm115",
  SM12: "sm12",
  SM75: "sm7.5",
  SS: "ex2",
  SSP: "sv08",
  STS: "xy11",
  SV: "pl3",
  SVI: "sv01",
  SW: "dp3",
  SWSH1: "swsh1",
  SWSH2: "swsh2",
  SWSH3: "swsh3",
  SWSH35: "swsh3.5",
  SWSH4: "swsh4",
  SWSH45: "swsh4.5",
  SWSH5: "swsh5",
  TEF: "sv05",
  TM: "hgss4",
  TMTA: "ex4",
  // TR is the 2000 Team Rocket set; TRR is EX Team Rocket Returns.
  TR: "base5",
  TRR: "ex7",
  TWM: "sv06",
  UD: "hgss3",
  UF: "ex10",
  UL: "hgss2",
  XY: "xy1",
};

/**
 * A product term, in both languages.
 *
 * `nameFirst` reflects a word-order difference rather than a translation one:
 * French writes "Booster Dracaufeu", English "Charizard Booster Pack". It is
 * true for every term that can be followed by a Pokémon name.
 */
export interface SealedTerm {
  fr: string;
  en: string;
  /** Places the trailing Pokémon names before the term in English. */
  nameFirst?: boolean;
}

/**
 * Closed vocabulary of the product terms Pokécardex names are built from.
 *
 * These are the very terms `update-sealed.ts` writes when it turns an image
 * filename into a display name, plus the free forms observed in the current
 * dataset. Matching is longest-first, so "Coffret Dresseur" wins over
 * "Coffret".
 */
export const SEALED_TERMS: SealedTerm[] = [
  {
    fr: "Elite Trainer Box Pokémon Center",
    en: "Pokémon Center Elite Trainer Box",
  },
  { fr: "Ultra Premium Collection", en: "Ultra Premium Collection" },
  { fr: "Pack Premium Spécial", en: "Special Premium Pack" },
  { fr: "Collection Premium", en: "Premium Collection" },
  { fr: "Contenu du Coffret", en: "Box Contents" },
  { fr: "Elite Trainer Box", en: "Elite Trainer Box" },
  { fr: "Pack Avant-Première", en: "Prerelease Pack" },
  { fr: "Portfolio A4 & A5", en: "A4 & A5 Portfolio" },
  { fr: "Portfolio Japonais", en: "Japanese Portfolio" },
  { fr: "McDonald's Happy Meal", en: "McDonald's Happy Meal" },
  { fr: "Coffret Collection", en: "Collection Box", nameFirst: true },
  { fr: "Coffret Portfolio", en: "Portfolio Box" },
  { fr: "Coffret Folio", en: "Portfolio Box" },
  { fr: "Coffret Dresseur", en: "Booster Bundle" },
  { fr: "Coffret Premium", en: "Premium Collection", nameFirst: true },
  { fr: "Coffret Poster", en: "Poster Box" },
  { fr: "Album Japonais", en: "Japanese Album" },
  { fr: "Mini Portfolio", en: "Mini Portfolio" },
  { fr: "Boîte Surprise", en: "Mystery Box" },
  { fr: "Portfolio A4", en: "A4 Portfolio" },
  { fr: "Portfolio A5", en: "A5 Portfolio" },
  { fr: "Échantillon", en: "Sample", nameFirst: true },
  { fr: "Starter Set", en: "Starter Set", nameFirst: true },
  { fr: "Set Anglais", en: "English Set" },
  { fr: "Mini Tins", en: "Mini Tins", nameFirst: true },
  { fr: "Calendrier", en: "Calendar" },
  { fr: "Portfolio", en: "Portfolio", nameFirst: true },
  { fr: "Valisette", en: "Carry Case", nameFirst: true },
  { fr: "Mini Tin", en: "Mini Tin", nameFirst: true },
  { fr: "Deck Box", en: "Deck Box", nameFirst: true },
  { fr: "Duo Pack", en: "2 Pack Blister", nameFirst: true },
  { fr: "Pochette", en: "Sleeve" },
  { fr: "Tripack", en: "3 Pack Blister", nameFirst: true },
  { fr: "Bannière", en: "Banner" },
  { fr: "Booster", en: "Booster Pack", nameFirst: true },
  { fr: "Classeur", en: "Binder", nameFirst: true },
  { fr: "Coffret", en: "Box", nameFirst: true },
  { fr: "Display", en: "Display", nameFirst: true },
  { fr: "Poster", en: "Poster", nameFirst: true },
  { fr: "Album", en: "Album", nameFirst: true },
  { fr: "Deck", en: "Deck", nameFirst: true },
  { fr: "Pack", en: "Pack", nameFirst: true },
  { fr: "Mini", en: "Mini" },
  { fr: "Tin", en: "Tin", nameFirst: true },
  // Pokécardex already writes "Box" in English on some products.
  { fr: "Box", en: "Box", nameFirst: true },
  // FIXME: "2x 2" and "3x 3" come from a spacing bug in `cleanProductName`,
  // which splits the "2x2" filename. French names are kept verbatim for
  // stability; English says what the product actually is.
  { fr: "2x 2", en: "2x2 Portfolio" },
  { fr: "3x 3", en: "3x3 Portfolio" },
  { fr: "4x", en: "4x4 Portfolio" },
  { fr: "boosters", en: "Booster Packs" },
  { fr: "Produit", en: "Product" },
];

/**
 * Free-form product names that are neither a set name, a term, nor a Pokémon
 * name, and would otherwise stay French. They mostly are theme deck names,
 * whose official English wording cannot be derived from the French one.
 */
export const SEALED_FREE_NAMES: Record<string, string> = {
  "Duo Deck": "Duo Deck",
  Pokéball: "Poké Ball",
  "Equipe Bravoure": "Team Valor",
  "Equipe Intuition": "Team Instinct",
  "Equipe Sagesse": "Team Mystic",
  "Collection Illustration": "Illustration Collection",
  "Collection Illustration Spécial": "Special Illustration Collection",
  "ETBPokemon Center": "Pokémon Center Elite Trainer Box",
  // Card-level marks that appear inside product names.
  "Niv X": "LV.X",
  VUnion: "V-UNION",
  Prime: "Prime",
};

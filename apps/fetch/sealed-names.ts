/**
 * Composes the English name of a sealed product from parts the repository
 * already holds in both languages. See `sealed-vocabulary.ts` for why no
 * translation source exists.
 *
 * French names are never recomputed: they are the ones already published, and
 * product pages, listings and collections point at them.
 */
import {
  type DatasetLocale,
  listSetIds,
  readSetCards,
  readSets,
} from "@repo/pokemon-dataset";
import {
  POKECARDEX_SET_IDS,
  SEALED_FREE_NAMES,
  SEALED_TERMS,
  type SealedTerm,
} from "./sealed-vocabulary.js";

/** A sealed product as scraped, before localization. */
export interface RawSealedProduct {
  id: string;
  pokecardexSeriesId: string;
  setName: string;
  name: string;
  productType: string;
  image: string;
  imageFilename: string;
}

/** Bilingual outcome for one product. */
export interface ComposedSealedName {
  fr: string;
  /** Null when at least one part could not be resolved. */
  en: string | null;
  /** Why the English name is missing, for the coverage report. */
  skipped?: "set" | "label";
}

/** Translation tables built from the dataset, reused across every product. */
export interface SealedNameSources {
  /** TCGdex set id to its name in each locale. */
  setNames: Map<string, Partial<Record<DatasetLocale, string>>>;
  /** Normalized French label to its English counterpart. */
  words: Map<string, string>;
}

/**
 * Words that carry over untouched: rarity marks, generation prefixes,
 * punctuation and numbering. Anything else must be in the dictionary,
 * otherwise the product keeps its French name.
 */
const PASSTHROUGH = new Set([
  "&",
  "ex",
  "gx",
  "v",
  "vmax",
  "vstar",
  "break",
  "mega",
  "m",
  "eu",
  "us",
  "jp",
  "pokemon",
  "de",
  "du",
  "des",
  "la",
  "le",
  "les",
]);

/**
 * Diacritic- and case-insensitive form used as dictionary key.
 *
 * Hyphens become spaces, so "Darkrai-GX" splits into a species and a rarity
 * mark. Keys and lookups go through the same function, so "Ho-Oh" still
 * matches — only the key is folded, the English value is stored verbatim.
 */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9&]+/g, " ")
    .trim();
}

/**
 * Reduces a card name to its species: "Dracaufeu-ex" and "Méga-Dracaufeu Y"
 * both feed the dictionary under "Dracaufeu".
 *
 * The mega prefix requires a separator: without it, "Mew" and "Morpeko" lose
 * their leading M.
 */
function speciesOf(name: string): string {
  return name
    .replace(/\s*[-–]?\s*(ex|EX|GX|V|VMAX|VSTAR|BREAK|LV\.X)\s*$/u, "")
    .replace(/^(M|Méga|Mega)[-–\s]\s*/u, "")
    .trim();
}

/**
 * Builds the French-to-English dictionary from the card and set datasets.
 *
 * Cards carry the same identifier in every locale, so reading a set twice
 * yields exact name pairs — around 3 200 Pokémon, at no extra data cost.
 *
 * @param dataDir Dataset root, defaults to the repository's `data/`.
 * @returns Set names per locale and the French-to-English word dictionary.
 */
export function loadSealedNameSources(dataDir?: string): SealedNameSources {
  const setNames = new Map<string, Partial<Record<DatasetLocale, string>>>();
  const words = new Map<string, string>();

  for (const locale of ["fr", "en"] as const) {
    for (const set of readSets(locale, dataDir)) {
      if (!set.name) continue;
      const entry = setNames.get(set.id) ?? {};
      entry[locale] = set.name;
      setNames.set(set.id, entry);
    }
  }

  for (const [, names] of setNames) {
    if (names.fr && names.en) words.set(normalize(names.fr), names.en);
  }

  const englishCards = new Map<string, string>();
  for (const setId of listSetIds("en", dataDir)) {
    for (const card of readSetCards("en", setId, dataDir)) {
      if (card.name) englishCards.set(card.id, card.name);
    }
  }

  for (const setId of listSetIds("fr", dataDir)) {
    for (const card of readSetCards("fr", setId, dataDir)) {
      const english = englishCards.get(card.id);
      if (!card.name || !english) continue;

      const key = normalize(speciesOf(card.name));
      if (key && !words.has(key)) words.set(key, speciesOf(english));
    }
  }

  // Pokécardex sometimes writes the English name already ("Box Charizard").
  // Added last so a French name that happens to look English — and there are
  // a few — keeps its own translation.
  for (const name of englishCards.values()) {
    const species = speciesOf(name);
    const key = normalize(species);
    if (key && !words.has(key)) words.set(key, species);
  }

  for (const [french, english] of Object.entries(SEALED_FREE_NAMES)) {
    words.set(normalize(french), english);
  }

  return { setNames, words };
}

/**
 * English name of a set, falling back to the language-neutral identifier when
 * TCGdex splits a set per locale (`2018sm-fr` and `2018sm` are the same
 * McDonald's set).
 */
function englishSetName(
  setId: string,
  sources: SealedNameSources,
): string | null {
  const direct = sources.setNames.get(setId)?.en;
  if (direct) return direct;

  const shared = setId.endsWith("-fr") ? setId.slice(0, -3) : null;
  return shared ? (sources.setNames.get(shared)?.en ?? null) : null;
}

/** Longest French term matching the start of the text. */
function matchTerm(text: string): { term: SealedTerm; rest: string } | null {
  const normalized = normalize(text);
  let best: { term: SealedTerm; rest: string } | null = null;

  for (const term of SEALED_TERMS) {
    const key = normalize(term.fr);
    if (normalized !== key && !normalized.startsWith(`${key} `)) continue;
    if (best && normalize(best.term.fr).length >= key.length) continue;
    best = { term, rest: normalized.slice(key.length).trim() };
  }

  return best;
}

/**
 * Translates a group of words — Pokémon names, a set name, or both — by
 * greedily matching the longest dictionary entry.
 *
 * @returns The English wording, or null if a single word is unknown.
 */
function translateWords(
  text: string,
  sources: SealedNameSources,
): string | null {
  const tokens = normalize(text).split(" ").filter(Boolean);
  if (tokens.length === 0) return "";

  const output: string[] = [];
  let index = 0;

  while (index < tokens.length) {
    let matched = false;

    for (let end = tokens.length; end > index; end--) {
      const candidate = tokens.slice(index, end).join(" ");
      const english = sources.words.get(candidate);
      if (!english) continue;

      output.push(english);
      index = end;
      matched = true;
      break;
    }

    if (matched) continue;

    const token = tokens[index];
    if (!PASSTHROUGH.has(token) && !/^\d+$/.test(token)) return null;

    output.push(token === "&" ? "&" : token.toUpperCase());
    index++;
  }

  return output.join(" ");
}

/** Assembles a term and its trailing words in English word order. */
function joinTerm(term: SealedTerm, words: string, index: string): string {
  const core = !words
    ? term.en
    : term.nameFirst
      ? `${words} ${term.en}`
      : `${term.en} ${words}`;

  return `${core}${index}`;
}

/**
 * Translates a product label — "Booster Dracaufeu", "Mini Tin 3", "Morpeko" —
 * whether or not it is preceded by a set name.
 *
 * A trailing number is a variant index, not a word: "Booster 3" is the third
 * booster, so it reads "Booster Pack 3" and not "3 Booster Pack". The whole
 * label is still tried first, because a few terms end in a digit ("2x 2").
 *
 * @returns The English label, or null when a part stays untranslated.
 */
function translateLabel(
  text: string,
  sources: SealedNameSources,
): string | null {
  const attempt = (body: string, index: string): string | null => {
    const matched = matchTerm(body);
    if (matched) {
      const words = translateWords(matched.rest, sources);
      return words === null ? null : joinTerm(matched.term, words, index);
    }

    const words = translateWords(body, sources);
    return words ? `${words}${index}` : null;
  };

  const exact = matchTerm(text);
  if (exact && !exact.rest) return exact.term.en;

  const numbered = text.match(/^(.*?)\s+(\d+)$/);
  const withIndex = numbered ? attempt(numbered[1], ` ${numbered[2]}`) : null;

  return withIndex ?? attempt(text, "");
}

/**
 * Composes the English name of one sealed product.
 *
 * A product whose set, term or trailing words cannot all be resolved gets no
 * English name: the API then falls back to French, which is preferable to a
 * half-translated label.
 *
 * @param product Raw scraped product.
 * @param sources Dictionaries from `loadSealedNameSources`.
 * @returns The French name as-is, and the English one when composable.
 */
export function composeSealedName(
  product: RawSealedProduct,
  sources: SealedNameSources,
): ComposedSealedName {
  const french = product.name;
  const setId = POKECARDEX_SET_IDS[product.pokecardexSeriesId];
  const setEnglish = setId ? englishSetName(setId, sources) : null;

  const prefix = product.setName ?? "";
  const hasSetPrefix =
    prefix.length > 0 &&
    normalize(french).startsWith(normalize(prefix)) &&
    normalize(french) !== normalize(prefix);

  if (!hasSetPrefix) {
    const label = translateLabel(french, sources);
    return label
      ? { fr: french, en: label }
      : { fr: french, en: null, skipped: "label" };
  }

  if (!setEnglish) return { fr: french, en: null, skipped: "set" };

  const suffix = french
    .slice(prefix.length)
    .replace(/^\s*[-–—:]\s*/, "")
    .trim();

  if (!suffix) return { fr: french, en: setEnglish };

  const label = translateLabel(suffix, sources);
  return label
    ? { fr: french, en: `${setEnglish} - ${label}` }
    : { fr: french, en: null, skipped: "label" };
}

/**
 * Resolves the TCGdex set of a scraped product.
 *
 * @param product Raw scraped product.
 * @returns The set identifier, or null for products with no TCGdex set.
 */
export function resolveSealedSetId(product: RawSealedProduct): string | null {
  return POKECARDEX_SET_IDS[product.pokecardexSeriesId] ?? null;
}

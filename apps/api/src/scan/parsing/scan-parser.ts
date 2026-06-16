import type { ScanParsedFields } from "@repo/scan-contract";

const STOPWORDS = new Set([
  "hp",
  "pv",
  "pokemon",
  "trainer",
  "energy",
  "basic",
  "base",
  "stage",
  "niv",
  "niveau",
  "ability",
  "attack",
  "temps",
  "passe",
]);

export const normalize = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

type NumberFields = Pick<
  ScanParsedFields,
  "setCode" | "setNumber" | "setTotal"
>;

// numéro/dénominateur "NN/MMM" depuis le texte d'une ROI ou le texte plein
export const parseNumber = (text: string): NumberFields => {
  const match = text.match(/(\d{1,3})\s*\/\s*(\d{1,3})/);
  if (!match) return {};
  return {
    setCode: `${match[1]}/${match[2]}`,
    setNumber: match[1],
    setTotal: match[2],
  };
};

// nettoie le texte de la ROI nom (bruit OCR autour, espaces) sans toucher aux accents
export const cleanName = (raw: string): string =>
  raw
    .replace(/[\r\n]+/g, " ")
    .replace(/[^\p{L}\p{N}' .-]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

const parseSetMetadata = (text: string): ScanParsedFields => {
  let setName: string | undefined;
  const setNameMatch = text.match(
    /(\d{1,3}\s*\/\s*\d{1,3})\s*[—\-]\s*([A-Za-z0-9À-ÿ'\- ]{3,})/,
  );
  if (setNameMatch?.[2]) {
    setName = setNameMatch[2].trim();
  }

  return { ...parseNumber(text), setName };
};

const pickCardName = (lines: string[]): string | undefined => {
  const candidate = lines.find((line) => {
    const normalized = normalize(line).toLowerCase();

    if (normalized.length < 3) return false;
    if (/\d{1,3}\s*\/\s*\d{1,3}/.test(normalized)) return false;
    if (STOPWORDS.has(normalized)) return false;

    return /[a-zA-ZÀ-ÿ]/.test(normalized);
  });

  return candidate?.trim();
};

// candidats de nom : le nom propre figure souvent en clair dans le texte plein
// même quand la ROI nom échoue. On en garde plusieurs, le scoring prend le meilleur.
export const extractNameCandidates = (
  roiName: string,
  lines: string[],
): string[] => {
  const out = new Set<string>();

  const add = (raw: string) => {
    const c = cleanName(raw);
    if (c.length < 3 || !/\p{L}/u.test(c)) return;
    if (STOPWORDS.has(normalize(c).toLowerCase())) return;
    out.add(c);
  };

  if (roiName) {
    add(roiName);
    for (const word of roiName.split(/\s+/)) add(word);
  }

  for (const line of lines.slice(0, 8)) {
    const lettersOnly = line.replace(/[0-9©®@]/g, " ");
    for (const word of lettersOnly.split(/\s+/)) add(word);
  }

  return Array.from(out);
};

export interface ParsedOcr {
  lines: string[];
  fields: ScanParsedFields;
}

export const parseOcrText = (rawText: string): ParsedOcr => {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 24);

  const cardName = pickCardName(lines);
  const metadata = parseSetMetadata(rawText);

  return { lines, fields: { cardName, ...metadata } };
};

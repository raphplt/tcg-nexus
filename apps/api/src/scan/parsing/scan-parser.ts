import type { ScanParsedFields } from "@repo/scan-contract";

//TODO : à étendre ?
const STOPWORDS = new Set([
  "hp",
  "pokemon",
  "trainer",
  "energy",
  "basic",
  "stage",
  "ability",
  "attack",
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

export const buildSearchHints = (fields: ScanParsedFields): string[] => {
  const hints = new Set<string>();

  if (fields.cardName && fields.setCode) {
    hints.add(`${fields.cardName} ${fields.setCode}`);
  }
  if (fields.cardName && fields.setNumber) {
    hints.add(`${fields.cardName} ${fields.setNumber}`);
  }
  if (fields.cardName) hints.add(fields.cardName);
  if (fields.setCode) hints.add(fields.setCode);
  if (fields.setNumber) hints.add(fields.setNumber);
  if (fields.setName) hints.add(fields.setName);

  return Array.from(hints).filter(Boolean);
};

export interface ParsedOcr {
  lines: string[];
  fields: ScanParsedFields;
  searchHints: string[];
}

export const parseOcrText = (rawText: string): ParsedOcr => {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 24);

  const cardName = pickCardName(lines);
  const metadata = parseSetMetadata(rawText);
  const fields: ScanParsedFields = { cardName, ...metadata };

  return {
    lines,
    fields,
    searchHints: buildSearchHints(fields),
  };
};

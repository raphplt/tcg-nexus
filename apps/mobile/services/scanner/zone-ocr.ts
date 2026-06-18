import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { SCANNER_CONFIG } from "./config";
import type { RectifiedCard } from "@/types/scanner";

const GOOGLE_VISION_URL = "https://vision.googleapis.com/v1/images:annotate";
const OCR_SPACE_URL = "https://api.ocr.space/parse/image";

// ─── Stopwords — lignes entières à rejeter (égalité exacte après normalize) ──
const NAME_STOPWORDS_EXACT = new Set([
  "hp",
  "pv",
  "pokemon",
  "pokemon",
  "trainer",
  "dresseur",
  "energy",
  "energie",
  "basic",
  "stage",
  "carte",
  "rare",
  "common",
  "uncommon",
]);

// ─── Préfixes/mots-clés à rejeter si la ligne les CONTIENT ───────────────────
// Ces termes apparaissent souvent collés à d'autres mots sur les cartes FR/EN.
const NAME_STOPWORDS_CONTAINS = [
  // Stades (FR)
  "niveau de base",
  "stade 1",
  "stade 2",
  "pokemon de base",
  "pokemon stade",
  // Stades (EN)
  "basic pokemon",
  "stage 1",
  "stage 2",
  "level up",
  // Infos techniques
  "game freak",
  "nintendo",
  "creatures",
  "copyright",
  "illustr",
  "©",
  "™",
  "®",
  // Énergie
  "energie",
  "energy",
  // Niveaux numériques ex: "Niv.52"
  "niv.",
];

const normalize = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

// ─── Parsing du numéro de set ─────────────────────────────────────────────────

interface ParsedNumber {
  localId?: string;
  setTotal?: string;
  setCode?: string;
}

const parseSetNumber = (text: string): ParsedNumber => {
  // Format classique : "063/198" ou "63/198"
  const classic = text.match(/\b(\d{1,3})\s*\/\s*(\d{1,3})\b/);
  if (classic?.[1] && classic?.[2]) {
    return {
      localId: classic[1].padStart(3, "0"),
      setTotal: classic[2],
      setCode: `${classic[1]}/${classic[2]}`,
    };
  }

  // Format spécial : TG01/TG30, GG01/GG70, etc.
  const special = text.match(
    /\b([A-Z]{1,3}\d{1,3})\s*\/\s*([A-Z]{0,3}\d{1,3})\b/,
  );
  if (special?.[1] && special?.[2]) {
    return {
      localId: special[1],
      setCode: `${special[1]}/${special[2]}`,
    };
  }

  return {};
};

// ─── Parsing du nom de carte ──────────────────────────────────────────────────

const isStopLine = (line: string): boolean => {
  const n = normalize(line);
  // Trop court ou purement numérique
  if (n.length < 2) return true;
  if (/^\d+$/.test(n)) return true;
  // Format numéro de set
  if (/\d{1,3}\s*\/\s*\d{1,3}/.test(n)) return true;
  // Égalité exacte
  if (NAME_STOPWORDS_EXACT.has(n)) return true;
  // Contient un mot-clé stop (ex: "Niveau de base" contient "niveau de base")
  if (NAME_STOPWORDS_CONTAINS.some((kw) => n.includes(kw))) return true;
  // Ligne trop courte (1 seule lettre/chiffre) ou que des symboles
  if (!/[a-zA-ZÀ-ÿ]{2,}/.test(n)) return true;
  return false;
};

const extractCardName = (lines: string[]): string | undefined => {
  // On cherche parmi les 10 premières lignes la première valide
  const top10 = lines.slice(0, 10);
  return top10.find((line) => !isStopLine(line))?.trim();
};

// ─── Détection de langue ──────────────────────────────────────────────────────

const detectLanguage = (text: string): "fr" | "en" | "ja" | "unknown" => {
  if (/[\u3040-\u30ff\u4e00-\u9fff]/.test(text)) return "ja";
  const frWords = [
    "attaque",
    "faiblesse",
    "retraite",
    "talent",
    "dresseur",
    "énergie",
  ];
  const enWords = [
    "attack",
    "weakness",
    "retreat",
    "ability",
    "trainer",
    "energy",
  ];
  const frScore = frWords.filter((w) => text.toLowerCase().includes(w)).length;
  const enScore = enWords.filter((w) => text.toLowerCase().includes(w)).length;
  if (frScore > enScore) return "fr";
  if (enScore > frScore) return "en";
  return "unknown";
};

// ─── Appels aux providers OCR ─────────────────────────────────────────────────

const callGoogleVision = async (base64: string): Promise<string> => {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY?.trim();
  if (!apiKey) throw new Error("NO_GOOGLE_KEY");

  const res = await fetch(`${GOOGLE_VISION_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          image: { content: base64 },
          features: [{ type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 }],
          imageContext: { languageHints: ["fr", "en"] },
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Google Vision (${res.status})`);

  const data = await res.json();
  return (
    data?.responses?.[0]?.fullTextAnnotation?.text ||
    data?.responses?.[0]?.textAnnotations?.[0]?.description ||
    ""
  );
};

const callOcrSpace = async (base64: string): Promise<string> => {
  const apiKey = process.env.EXPO_PUBLIC_OCR_SPACE_API_KEY?.trim();
  if (!apiKey) throw new Error("NO_OCR_SPACE_KEY");

  const form = new FormData();
  form.append("apikey", apiKey);
  form.append("base64Image", `data:image/jpeg;base64,${base64}`);
  form.append("language", "fre");
  form.append("isOverlayRequired", "false");
  form.append("OCREngine", "2");

  const res = await fetch(OCR_SPACE_URL, { method: "POST", body: form });
  if (!res.ok) throw new Error(`OCR.space (${res.status})`);

  const data = await res.json();
  if (data?.IsErroredOnProcessing) throw new Error("OCR.space error");
  return data?.ParsedResults?.[0]?.ParsedText || "";
};

const ocrText = async (base64: string): Promise<string> => {
  const googleKey = process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY?.trim();
  const ocrSpaceKey = process.env.EXPO_PUBLIC_OCR_SPACE_API_KEY?.trim();

  if (googleKey) return callGoogleVision(base64);
  if (ocrSpaceKey) return callOcrSpace(base64);
  throw new Error(
    "Aucun provider OCR configuré (EXPO_PUBLIC_GOOGLE_VISION_API_KEY manquant)",
  );
};

// ─── Crop d'une zone de la carte normalisée ───────────────────────────────────

const cropZone = async (
  cardUri: string,
  cardW: number,
  cardH: number,
  topPct: number,
  bottomPct: number,
): Promise<string> => {
  const originY = Math.floor(cardH * topPct);
  const height = Math.floor(cardH * (bottomPct - topPct));

  const result = await manipulateAsync(
    cardUri,
    [
      { crop: { originX: 0, originY, width: cardW, height } },
      { resize: { width: SCANNER_CONFIG.OCR_RESIZE_WIDTH } },
    ],
    {
      base64: true,
      compress: SCANNER_CONFIG.OCR_CROP_QUALITY,
      format: SaveFormat.JPEG,
    },
  );

  if (!result.base64) throw new Error("[ZoneOCR] Crop impossible");
  return result.base64;
};

// ─── Module 3 : ZoneOCR ──────────────────────────────────────────────────────

import type { ZoneOcrResult } from "@/types/scanner";

export const zoneOcr = {
  /**
   * Extrait le nom (zone haute) et le numéro (zone basse) de la carte normalisée.
   * Les deux appels OCR sont exécutés en parallèle.
   * Jamais d'OCR sur l'image entière — uniquement sur les 2 zones ciblées.
   */
  async extract(card: RectifiedCard): Promise<ZoneOcrResult> {
    const t0 = Date.now();

    const [nameBase64, numberBase64] = await Promise.all([
      cropZone(
        card.uri,
        card.width,
        card.height,
        SCANNER_CONFIG.NAME_ZONE.top,
        SCANNER_CONFIG.NAME_ZONE.bottom,
      ),
      cropZone(
        card.uri,
        card.width,
        card.height,
        SCANNER_CONFIG.NUMBER_ZONE.top,
        SCANNER_CONFIG.NUMBER_ZONE.bottom,
      ),
    ]);

    const [nameText, numberText] = await Promise.all([
      ocrText(nameBase64).catch((e) => {
        console.warn("[ZoneOCR] name zone failed:", e);
        return "";
      }),
      ocrText(numberBase64).catch((e) => {
        console.warn("[ZoneOCR] number zone failed:", e);
        return "";
      }),
    ]);

    const nameLines = nameText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const candidateName = extractCardName(nameLines);
    const parsed = parseSetNumber(numberText);
    const language = detectLanguage(nameText + " " + numberText);

    console.log(
      "[ZoneOCR]",
      `name="${candidateName ?? "?"}"`,
      `localId="${parsed.localId ?? "?"}"`,
      `setTotal="${parsed.setTotal ?? "?"}"`,
      `lang="${language}"`,
      `${Date.now() - t0}ms`,
    );

    return {
      nameZone: {
        rawText: nameText,
        candidateName,
        // Confiance basée sur la longueur du texte extrait (heuristique simple)
        confidence: nameText.length > 5 ? 0.8 : 0.3,
      },
      numberZone: {
        rawText: numberText,
        localId: parsed.localId,
        setTotal: parsed.setTotal,
        setCode: parsed.setCode,
        confidence: parsed.localId ? 0.9 : 0.2,
      },
      language,
      durationMs: Date.now() - t0,
    };
  },
};

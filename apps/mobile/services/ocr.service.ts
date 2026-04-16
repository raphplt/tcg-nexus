import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { Image } from "react-native";
import type {
  OcrParsedResult,
  ProcessedImagePayload,
} from "@/types";

const GOOGLE_VISION_URL = "https://vision.googleapis.com/v1/images:annotate";

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

const normalize = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const getImageSize = (uri: string): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      reject,
    );
  });

const parseSetMetadata = (text: string): {
  setCode?: string;
  setNumber?: string;
  setTotal?: string;
  setName?: string;
} => {
  const setCodeMatch = text.match(/(\d{1,3})\s*\/\s*(\d{1,3})/);

  let setName: string | undefined;
  const setNameMatch = text.match(
    /(\d{1,3}\s*\/\s*\d{1,3})\s*[—\-]\s*([A-Za-z0-9À-ÿ'\- ]{3,})/,
  );

  if (setNameMatch?.[2]) {
    setName = setNameMatch[2].trim();
  }

  if (!setCodeMatch) {
    return { setName };
  }

  return {
    setCode: `${setCodeMatch[1]}/${setCodeMatch[2]}`,
    setNumber: setCodeMatch[1],
    setTotal: setCodeMatch[2],
    setName,
  };
};

const pickCardName = (lines: string[]): string | undefined => {
  const candidate = lines.find((line) => {
    const normalized = normalize(line).toLowerCase();

    if (normalized.length < 3) {
      return false;
    }

    if (/\d{1,3}\s*\/\s*\d{1,3}/.test(normalized)) {
      return false;
    }

    if (STOPWORDS.has(normalized)) {
      return false;
    }

    return /[a-zA-ZÀ-ÿ]/.test(normalized);
  });

  return candidate?.trim();
};

const buildSearchHints = (
  cardName: string | undefined,
  metadata: ReturnType<typeof parseSetMetadata>,
): string[] => {
  const hints = new Set<string>();

  if (cardName && metadata.setCode) {
    hints.add(`${cardName} ${metadata.setCode}`);
  }

  if (cardName) {
    hints.add(cardName);
  }

  if (metadata.setCode) {
    hints.add(metadata.setCode);
  }

  if (metadata.setNumber) {
    hints.add(metadata.setNumber);
  }

  if (metadata.setName) {
    hints.add(metadata.setName);
  }

  return Array.from(hints).filter(Boolean);
};

const extractTextFromGoogleVision = async (base64Image: string): Promise<string> => {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "EXPO_PUBLIC_GOOGLE_VISION_API_KEY manquant. Configure une cle OCR pour activer le scan.",
    );
  }

  const response = await fetch(`${GOOGLE_VISION_URL}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        {
          image: {
            content: base64Image,
          },
          features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OCR Google Vision indisponible (${response.status}): ${body}`);
  }

  const payload = await response.json();
  const text =
    payload?.responses?.[0]?.fullTextAnnotation?.text ||
    payload?.responses?.[0]?.textAnnotations?.[0]?.description ||
    "";

  if (!text.trim()) {
    throw new Error("Aucun texte detecte sur l'image scannee.");
  }

  return text;
};

const extractTextFromCustomOcrApi = async (base64Image: string): Promise<string> => {
  const apiUrl = process.env.EXPO_PUBLIC_OCR_API_URL?.trim();
  if (!apiUrl) {
    return extractTextFromGoogleVision(base64Image);
  }

  const apiToken = process.env.EXPO_PUBLIC_OCR_API_TOKEN?.trim();

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
    },
    body: JSON.stringify({
      imageBase64: base64Image,
      mimeType: "image/jpeg",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Service OCR indisponible (${response.status}): ${body}`);
  }

  const payload = await response.json();
  const text = payload?.text || payload?.fullText || payload?.rawText || "";

  if (!String(text).trim()) {
    throw new Error("Le service OCR n'a retourne aucun texte exploitable.");
  }

  return String(text);
};

export const ocrService = {
  async optimizeImage(uri: string): Promise<ProcessedImagePayload> {
    const { width, height } = await getImageSize(uri);

    const cropWidth = Math.floor(width * 0.9);
    const cropHeight = Math.floor(height * 0.72);
    const originX = Math.max(0, Math.floor((width - cropWidth) / 2));
    const originY = Math.max(0, Math.floor((height - cropHeight) / 2));

    const optimized = await manipulateAsync(
      uri,
      [
        {
          crop: {
            originX,
            originY,
            width: cropWidth,
            height: cropHeight,
          },
        },
        {
          resize: {
            width: 1200,
          },
        },
      ],
      {
        base64: true,
        compress: 0.68,
        format: SaveFormat.JPEG,
      },
    );

    if (!optimized.base64) {
      throw new Error("Impossible d'encoder l'image scannee pour l'OCR.");
    }

    return {
      optimizedUri: optimized.uri,
      base64: optimized.base64,
    };
  },

  async readCardText(base64Image: string): Promise<OcrParsedResult> {
    const rawText = await extractTextFromCustomOcrApi(base64Image);
    const lines = rawText
      .split(/\r?\n/)
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0)
      .slice(0, 24);

    const cardName = pickCardName(lines);
    const metadata = parseSetMetadata(rawText);

    return {
      rawText,
      lines,
      cardName,
      setCode: metadata.setCode,
      setNumber: metadata.setNumber,
      setTotal: metadata.setTotal,
      setName: metadata.setName,
      searchHints: buildSearchHints(cardName, metadata),
    };
  },
};

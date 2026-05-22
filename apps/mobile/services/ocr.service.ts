import axios from "axios";

export interface OcrResult {
  rawText: string;
  name?: string;
  localId?: string;
  denominator?: string;
}

const VISION_API_URL = "https://vision.googleapis.com/v1/images:annotate";

// Mock data for fallback testing
const MOCK_OCR_RESPONSES = [
  {
    rawText: "Terracool\nSTAGE 1\n60 HP\n025/198\nIllus. Tika Matsuno\n© 2023 Pokémon",
    name: "Terracool",
    localId: "025",
    denominator: "198",
  },
  {
    rawText: "Gardevoir-ex\n280 HP\n086/198\nIllus. N-DESIGN Inc.\n© 2023 Pokémon",
    name: "Gardevoir-ex",
    localId: "086",
    denominator: "198",
  },
  {
    rawText: "Tarsal\n60 HP\n058/078\nIllus. Saya Tsuruta\n© 2023 Pokémon",
    name: "Tarsal",
    localId: "058",
    denominator: "078",
  },
];

let mockIndex = 0;

// Parse name and ID from raw OCR text
export function parseOcrText(text: string): Omit<OcrResult, "rawText"> {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let localId: string | undefined;
  let denominator: string | undefined;
  let name: string | undefined;

  // Extract card number (e.g. 025/198)
  const setNumberRegex = /\b(\d{1,3})\s*[\/\u2044]\s*(\d{1,3})\b/;
  for (const line of lines) {
    const match = line.match(setNumberRegex);
    if (match) {
      localId = match[1];
      denominator = match[2];
      break;
    }
  }

  // Extract card name, filtering out metadata keywords
  const excludedKeywords = [
    "stage",
    "hp",
    "evolve",
    "no.",
    "illus",
    "pokemon",
    "pokémon",
    "nintendo",
    "creatures",
    "game freak",
    "weakness",
    "resistance",
    "retreat",
    "trainer",
    "dresseur",
    "energy",
    "énergie",
    "item",
    "objet",
    "supporter",
    "stadium",
    "stade",
    "basic",
    "de base",
  ];

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    if (excludedKeywords.some((keyword) => lowerLine.includes(keyword))) {
      continue;
    }

    if (/^[^a-zA-Z]+$/.test(line)) {
      continue;
    }

    if (/^[a-zA-Z\s\-\'\’]+$/.test(line) && line.length > 2 && line.length < 30) {
      name = line;
      break;
    }
  }

  return { name, localId, denominator };
}

// Send image to Google Cloud Vision or run fallback mock
export async function performOcr(base64Image: string): Promise<OcrResult> {
  const apiKey = process.env.EXPO_PUBLIC_VISION_API_KEY;

  if (!apiKey) {
    console.warn(
      "[OCR Service] EXPO_PUBLIC_VISION_API_KEY not configured. Using mock data."
    );
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const mock = (MOCK_OCR_RESPONSES[mockIndex] || MOCK_OCR_RESPONSES[0]) as OcrResult;
    mockIndex = (mockIndex + 1) % MOCK_OCR_RESPONSES.length;
    return mock;
  }

  try {
    const response = await axios.post(
      `${VISION_API_URL}?key=${apiKey}`,
      {
        requests: [
          {
            image: {
              content: base64Image,
            },
            features: [
              {
                type: "TEXT_DETECTION",
              },
            ],
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const annotations = response.data.responses?.[0]?.textAnnotations;
    const rawText = annotations?.[0]?.description ?? "";

    if (!rawText) {
      return { rawText: "" };
    }

    const parsed = parseOcrText(rawText);
    return {
      rawText,
      ...parsed,
    };
  } catch (error) {
    console.error("[OCR Service] Erreur lors de l'appel à Google Vision API:", error);
    throw new Error("Impossible d'analyser l'image (erreur réseau ou API)");
  }
}

import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { Image } from "react-native";
import { SCANNER_CONFIG } from "./config";
import type { DetectedCard, FrameCrop, RectifiedCard } from "@/types/scanner";

const getImageSize = (
  uri: string,
): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });

// ─── Module 1 : CardDetector ──────────────────────────────────────────────────

/**
 * Vérifie que le cadre UI capturé correspond au ratio d'une carte Pokémon.
 * Phase 1 MVP : validation du ratio uniquement (pas de ML, pas de contour detection).
 * Phase 2 : détection temps réel dans le flux caméra avec OpenCV WASM.
 */
export const cardDetector = {
  detect(frameCrop: FrameCrop): DetectedCard {
    const aspectRatio = frameCrop.frameW / frameCrop.frameH;
    const expected = SCANNER_CONFIG.CARD_ASPECT_RATIO;
    const diff = Math.abs(aspectRatio - expected);
    const confidence = Math.max(
      0,
      1 - diff / SCANNER_CONFIG.CARD_RATIO_TOLERANCE,
    );

    return {
      found: diff <= SCANNER_CONFIG.CARD_RATIO_TOLERANCE,
      confidence: parseFloat(confidence.toFixed(3)),
      aspectRatio: parseFloat(aspectRatio.toFixed(3)),
    };
  },
};

// ─── Module 2 : PerspectiveCorrector ─────────────────────────────────────────

/**
 * Normalise la carte à NORMALIZED_WIDTH × NORMALIZED_HEIGHT via crop + resize.
 * Phase 1 MVP : transform affine depuis les coordonnées du cadre UI.
 * Phase 2 : homographie réelle si 4 coins détectés par le CardDetector.
 */
export const perspectiveCorrector = {
  async rectify(
    photoUri: string,
    frameCrop: FrameCrop,
  ): Promise<RectifiedCard> {
    const { width: imgW, height: imgH } = await getImageSize(photoUri);

    const scaleX = imgW / frameCrop.screenW;
    const scaleY = imgH / frameCrop.screenH;

    const margin = 0.02;
    const originX = Math.max(
      0,
      Math.floor((frameCrop.frameX - frameCrop.frameW * margin) * scaleX),
    );
    const originY = Math.max(
      0,
      Math.floor((frameCrop.frameY - frameCrop.frameH * margin) * scaleY),
    );
    const cropW = Math.min(
      imgW - originX,
      Math.floor(frameCrop.frameW * (1 + margin * 2) * scaleX),
    );
    const cropH = Math.min(
      imgH - originY,
      Math.floor(frameCrop.frameH * (1 + margin * 2) * scaleY),
    );

    const result = await manipulateAsync(
      photoUri,
      [
        { crop: { originX, originY, width: cropW, height: cropH } },
        {
          resize: {
            width: SCANNER_CONFIG.NORMALIZED_WIDTH,
            height: SCANNER_CONFIG.NORMALIZED_HEIGHT,
          },
        },
      ],
      {
        base64: true,
        compress: SCANNER_CONFIG.OCR_CROP_QUALITY,
        format: SaveFormat.JPEG,
      },
    );

    if (!result.base64) {
      throw new Error(
        "[Scanner] Impossible de normaliser l'image de la carte.",
      );
    }

    return {
      uri: result.uri,
      base64: result.base64,
      width: SCANNER_CONFIG.NORMALIZED_WIDTH,
      height: SCANNER_CONFIG.NORMALIZED_HEIGHT,
    };
  },
};

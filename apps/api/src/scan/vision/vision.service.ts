import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface VisionRoi {
  key: string;
  box?: { x: number; y: number; width: number; height: number };
  image: Buffer;
  // texte + confiance (0..100) OCRisés côté service vision ; absents si
  // l'ancien service (sans OCR) répond -> repli OCR côté API.
  text?: string;
  conf?: number;
}

export interface VisionResult {
  detected: boolean;
  engine: string;
  normalizedImage: Buffer;
  rois: VisionRoi[];
  // index de la frame retenue (best-of-N) ; 0 en mono-frame.
  bestIndex: number;
}

export interface VisionMatchCandidate {
  id: string;
  url: string;
}

// timeout borné : mieux vaut échouer vite (repli OCR brut) que faire patienter
const REQUEST_TIMEOUT_MS = 15000;
const MATCH_TIMEOUT_MS = 15000;

const isTimeout = (error: unknown): boolean =>
  error instanceof Error && error.name === "AbortError";

interface VisionResponseJson {
  detected?: boolean;
  engine?: string;
  normalized_image: string;
  best_index?: number;
  rois?: Array<{
    key: string;
    box?: VisionRoi["box"];
    image: string;
    text?: string;
    conf?: number;
  }>;
}

@Injectable()
export class VisionService {
  private readonly logger = new Logger(VisionService.name);

  constructor(private readonly config: ConfigService) {}

  private get baseUrl(): string {
    return (
      this.config.get<string>("VISION_SERVICE_URL") ?? "http://localhost:8000"
    );
  }

  async match(
    image: Buffer,
    candidates: VisionMatchCandidate[],
  ): Promise<Map<string, number>> {
    if (candidates.length === 0) return new Map();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), MATCH_TIMEOUT_MS);

    try {
      const response = await fetch(`${this.baseUrl}/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: image.toString("base64"), candidates }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = (await response.json()) as {
        results?: Array<{ id: string; score: number }>;
      };
      return new Map((data.results ?? []).map((r) => [r.id, r.score]));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Match visuel KO, classement texte conservé: ${reason}`);
      return new Map();
    } finally {
      clearTimeout(timeout);
    }
  }

  async preprocess(image: Buffer): Promise<VisionResult | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${this.baseUrl}/preprocess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: image.toString("base64") }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return this.parseResult(await response.json());
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Service vision KO, image brute utilisée: ${reason}`);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  // best-of-N : envoie toutes les frames d'une rafale, le service les OCRise en
  // parallèle et renvoie le meilleur nom + le meilleur numéro fusionnés.
  async preprocessBatch(images: Buffer[]): Promise<VisionResult | null> {
    if (images.length === 0) return null;
    if (images.length === 1) return this.preprocess(images[0]);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${this.baseUrl}/preprocess-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: images.map((img) => img.toString("base64")),
        }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      return this.parseResult(await response.json());
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      // sur timeout, retenter la mono serait aussi lent -> on rend la main
      if (isTimeout(error)) {
        this.logger.warn(`Batch vision timeout (${reason}), repli OCR brut`);
        return null;
      }
      this.logger.warn(`Batch vision KO, repli mono-frame: ${reason}`);
      return this.preprocess(images[0]);
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseResult(payload: unknown): VisionResult {
    const data = payload as VisionResponseJson;
    return {
      detected: Boolean(data.detected),
      engine: data.engine ?? "opencv",
      normalizedImage: Buffer.from(data.normalized_image, "base64"),
      bestIndex: data.best_index ?? 0,
      rois: (data.rois ?? []).map((roi) => ({
        key: roi.key,
        box: roi.box,
        image: Buffer.from(roi.image, "base64"),
        text: roi.text,
        conf: roi.conf,
      })),
    };
  }
}

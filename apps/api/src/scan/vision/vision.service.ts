import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface VisionRoi {
  key: string;
  box?: { x: number; y: number; width: number; height: number };
  image: Buffer;
  text?: string;
  conf?: number;
}

export interface VisionResult {
  detected: boolean;
  engine: string;
  normalizedImage: Buffer;
  rois: VisionRoi[];
  bestIndex: number;
  embedding?: number[];
}

export interface VisionMatchCandidate {
  id: string;
  url: string;
}

// Fast fail timeout preferred over hanging request (fallbacks to raw OCR); overridable via VISION_TIMEOUT_MS env var
const REQUEST_TIMEOUT_MS = Number(process.env.VISION_TIMEOUT_MS) || 15000;
const MATCH_TIMEOUT_MS = 15000;

const isTimeout = (error: unknown): boolean =>
  error instanceof Error && error.name === "AbortError";

interface VisionResponseJson {
  detected?: boolean;
  engine?: string;
  normalized_image: string;
  best_index?: number;
  embedding?: number[];
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

  // secret partagé optionnel : le microservice ne l'exige que s'il est configuré
  private get headers(): Record<string, string> {
    const apiKey = this.config.get<string>("VISION_API_KEY")?.trim();
    return {
      "Content-Type": "application/json",
      ...(apiKey ? { "x-vision-key": apiKey } : {}),
    };
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
        headers: this.headers,
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
      this.logger.warn(`Visual match failed, text ranking kept: ${reason}`);
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
        headers: this.headers,
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

  // Sends full image burst; vision service OCRs in parallel and returns merged best name and card number
  async preprocessBatch(images: Buffer[]): Promise<VisionResult | null> {
    if (images.length === 0) return null;
    if (images.length === 1) return this.preprocess(images[0]);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${this.baseUrl}/preprocess-batch`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          images: images.map((img) => img.toString("base64")),
        }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      return this.parseResult(await response.json());
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      // sur timeout, retenter en mono serait aussi lent : on rend la main
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
      embedding: data.embedding,
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

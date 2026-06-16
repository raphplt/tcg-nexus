import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface VisionRoi {
  key: string;
  box?: { x: number; y: number; width: number; height: number };
  image: Buffer;
}

export interface VisionResult {
  detected: boolean;
  engine: string;
  normalizedImage: Buffer;
  rois: VisionRoi[];
}

export interface VisionMatchCandidate {
  id: string;
  url: string;
}

const REQUEST_TIMEOUT_MS = 8000;
const MATCH_TIMEOUT_MS = 25000;

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

      const data = (await response.json()) as {
        detected?: boolean;
        engine?: string;
        normalized_image: string;
        rois?: Array<{ key: string; box?: VisionRoi["box"]; image: string }>;
      };

      return {
        detected: Boolean(data.detected),
        engine: data.engine ?? "opencv",
        normalizedImage: Buffer.from(data.normalized_image, "base64"),
        rois: (data.rois ?? []).map((roi) => ({
          key: roi.key,
          box: roi.box,
          image: Buffer.from(roi.image, "base64"),
        })),
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Service vision KO, image brute utilisée: ${reason}`);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}

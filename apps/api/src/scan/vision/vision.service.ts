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

const REQUEST_TIMEOUT_MS = 8000;

// Client du service vision Python. Renvoie null si indisponible -> l'appelant
// retombe sur l'image brute, la chaîne ne casse pas.
@Injectable()
export class VisionService {
  private readonly logger = new Logger(VisionService.name);

  constructor(private readonly config: ConfigService) {}

  async preprocess(image: Buffer): Promise<VisionResult | null> {
    const baseUrl =
      this.config.get<string>("VISION_SERVICE_URL") ?? "http://localhost:8000";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${baseUrl}/preprocess`, {
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

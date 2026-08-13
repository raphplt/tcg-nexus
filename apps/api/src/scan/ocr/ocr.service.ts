import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createWorker, PSM, type Worker } from "tesseract.js";

export type OcrProfile = "full" | "name" | "number";

export interface OcrResult {
  text: string;
  engine: string;
}

// Tesseract profile settings per card region (SINGLE_BLOCK for card body, SPARSE_TEXT for set numbers)
const PROFILES: Record<OcrProfile, { psm: PSM; whitelist: string }> = {
  full: { psm: PSM.SINGLE_BLOCK, whitelist: "" },
  name: { psm: PSM.SINGLE_LINE, whitelist: "" },
  number: { psm: PSM.SPARSE_TEXT, whitelist: "0123456789/ " },
};

const VISION_URL = "https://vision.googleapis.com/v1/images:annotate";

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private workerPromise: Promise<Worker> | null = null;

  constructor(private readonly config: ConfigService) {}

  /**
   * Performs optical character recognition on an image buffer using configured OCR engine.
   *
   * @param image Raw image buffer.
   * @param profile OCR profile type ("full", "name", or "number").
   * @returns OCR result containing extracted text and engine name.
   */
  async recognize(
    image: Buffer,
    profile: OcrProfile = "full",
  ): Promise<OcrResult> {
    const engine = this.config.get<string>("OCR_ENGINE") ?? "tesseract";
    try {
      if (engine === "vision") {
        return { text: await this.recognizeVision(image), engine: "vision" };
      }
      return {
        text: await this.recognizeTesseract(image, profile),
        engine: "tesseract",
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`OCR ${engine} error, fallback to mock: ${reason}`);
      return { text: "", engine: "mock" };
    }
  }

  private async recognizeTesseract(
    image: Buffer,
    profile: OcrProfile,
  ): Promise<string> {
    const worker = await this.getWorker();
    const { psm, whitelist } = PROFILES[profile];
    await worker.setParameters({
      tessedit_pageseg_mode: psm,
      tessedit_char_whitelist: whitelist,
    });
    const { data } = await worker.recognize(image);
    return data.text ?? "";
  }

  private getWorker(): Promise<Worker> {
    if (!this.workerPromise) {
      const langs = this.config.get<string>("OCR_LANGS") ?? "eng+fra";
      // Local langPath uses bundled traineddata (offline docker container); otherwise CDN
      const langPath = this.config.get<string>("OCR_LANG_PATH");
      const options = langPath ? { langPath, cachePath: langPath } : undefined;

      this.workerPromise = createWorker(langs, undefined, options).catch(
        (error) => {
          this.workerPromise = null;
          throw error;
        },
      );
    }
    return this.workerPromise;
  }

  private async recognizeVision(image: Buffer): Promise<string> {
    const apiKey = this.config.get<string>("GOOGLE_VISION_API_KEY")?.trim();
    if (!apiKey) {
      throw new Error("GOOGLE_VISION_API_KEY manquant");
    }

    const response = await fetch(`${VISION_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: image.toString("base64") },
            features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Vision HTTP ${response.status}`);
    }

    const payload = (await response.json()) as {
      responses?: Array<{
        fullTextAnnotation?: { text?: string };
        textAnnotations?: Array<{ description?: string }>;
      }>;
    };
    const result = payload.responses?.[0];
    return (
      result?.fullTextAnnotation?.text ??
      result?.textAnnotations?.[0]?.description ??
      ""
    );
  }
}

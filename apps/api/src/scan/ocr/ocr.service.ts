import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createWorker, type Worker } from "tesseract.js";

export interface OcrResult {
  text: string;
  engine: string;
}

/**
 * Extraction de texte via Tesseract OCR.
 * TODO : vérifier si ce que fait le fallback est cohérent et utile.
 */
@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private workerPromise: Promise<Worker> | null = null;

  constructor(private readonly config: ConfigService) {}

  private getWorker(): Promise<Worker> {
    if (!this.workerPromise) {
      const langs = this.config.get<string>("OCR_LANGS") ?? "eng+fra";
      this.workerPromise = createWorker(langs).catch((error) => {
        this.workerPromise = null;
        throw error;
      });
    }
    return this.workerPromise;
  }

  async recognize(image: Buffer): Promise<OcrResult> {
    try {
      const worker = await this.getWorker();
      const { data } = await worker.recognize(image);
      return { text: data.text ?? "", engine: "tesseract" };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `OCR Tesseract indisponible, bascule en mock: ${reason}`,
      );
      return { text: "", engine: "mock" };
    }
  }
}

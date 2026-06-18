import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ScanRecognizeResponse } from "@repo/scan-contract";
import type { VisionResult } from "../vision/vision.service";

export interface ScanLogInput {
  inputImage: Buffer;
  vision: VisionResult | null;
  response: ScanRecognizeResponse;
  timingsMs: Record<string, number>;
}

const LOG_ROOT = "scan-logs";

const INDEX_HEADER =
  "scanId,timestamp,carteLue,bestCard,bestCardId,confiance,niveau,engine,totalMs,nbCandidats,carteDetectee\n";

const csvCell = (value: unknown): string => {
  const s = value === undefined || value === null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// journalise chaque scan dans un dossier dédié pour le debug (SCAN_LOG=false pour couper)
@Injectable()
export class ScanLogger {
  private readonly logger = new Logger(ScanLogger.name);

  constructor(private readonly config: ConfigService) {}

  private get enabled(): boolean {
    return this.config.get<string>("SCAN_LOG") !== "false";
  }

  async log(input: ScanLogInput): Promise<string | null> {
    if (!this.enabled) return null;

    try {
      const scanId = this.buildId();
      const dir = join(process.cwd(), LOG_ROOT, scanId);
      await mkdir(dir, { recursive: true });

      // image d'entrée + (si dispo) image normalisée et crops des ROI
      const files: Record<string, unknown> = { input: "input.jpg" };
      await writeFile(join(dir, "input.jpg"), input.inputImage);

      if (input.vision) {
        await writeFile(
          join(dir, "normalized.png"),
          input.vision.normalizedImage,
        );
        files.normalized = "normalized.png";

        const roiFiles: Record<string, string> = {};
        for (const roi of input.vision.rois) {
          const name = `roi_${roi.key}.png`;
          await writeFile(join(dir, name), roi.image);
          roiFiles[roi.key] = name;
        }
        files.rois = roiFiles;
      }

      const meta = {
        scanId,
        timestamp: new Date().toISOString(),
        timingsMs: input.timingsMs,
        engine: input.response.engine,
        confidence: input.response.confidence,
        confidenceLevel: input.response.confidenceLevel,
        parsed: input.response.parsed,
        rawText: input.response.rawText,
        lines: input.response.lines,
        rois: input.response.rois,
        bestCard: input.response.bestCard,
        candidates: input.response.candidates,
        vision: input.vision
          ? {
              available: true,
              detected: input.vision.detected,
              engine: input.vision.engine,
            }
          : { available: false },
        files,
      };
      await writeFile(
        join(dir, "scan.json"),
        JSON.stringify(meta, null, 2),
        "utf8",
      );

      await this.appendIndex(scanId, meta.timestamp, input);

      this.logger.log(`Scan loggé: ${LOG_ROOT}/${scanId}`);
      return scanId;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Log de scan échoué: ${reason}`);
      return null;
    }
  }

  // ligne récap par scan dans un index.csv commun
  private async appendIndex(
    scanId: string,
    timestamp: string,
    input: ScanLogInput,
  ): Promise<void> {
    const path = join(process.cwd(), LOG_ROOT, "index.csv");
    const { response, timingsMs, vision } = input;

    const row =
      [
        scanId,
        timestamp,
        response.parsed.cardName,
        response.bestCard?.name,
        response.bestCard?.id,
        response.confidence,
        response.confidenceLevel,
        response.engine,
        timingsMs.total,
        response.candidates.length,
        vision?.detected ?? false,
      ]
        .map(csvCell)
        .join(",") + "\n";

    if (!existsSync(path)) {
      await writeFile(path, INDEX_HEADER, "utf8");
    }
    await appendFile(path, row, "utf8");
  }

  private buildId(): string {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    return `${stamp}_${randomUUID().slice(0, 6)}`;
  }
}

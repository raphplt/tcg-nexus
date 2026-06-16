import { Injectable } from "@nestjs/common";
import type {
  ScanCardCandidate,
  ScanParsedFields,
  ScanRecognizeResponse,
  ScanRoi,
} from "@repo/scan-contract";
import { CardService } from "../card/card.service";
import { CardGame } from "../common/enums/cardGame";
import {
  computeConfidence,
  STRONG_MATCH_SCORE,
  scoreCard,
  toCandidate,
} from "./matching/scan-matcher";
import { type OcrProfile, OcrService } from "./ocr/ocr.service";
import { buildSearchHints, parseOcrText } from "./parsing/scan-parser";
import { type VisionRoi, VisionService } from "./vision/vision.service";

const MAX_CANDIDATES = 10;

const TEXT_ROI_KEYS = new Set(["name", "number"]);

@Injectable()
export class ScanService {
  constructor(
    private readonly visionService: VisionService,
    private readonly ocrService: OcrService,
    private readonly cardService: CardService,
  ) {}

  async recognize(
    image: Buffer,
    game?: CardGame,
  ): Promise<ScanRecognizeResponse> {
    const vision = await this.visionService.preprocess(image);
    const ocrTarget = vision?.normalizedImage ?? image;

    const { text, engine } = await this.ocrService.recognize(ocrTarget, "full");
    const rois = vision ? await this.readRois(vision.rois) : [];

    const augmentedText = [
      this.roiText(rois, "name"),
      text,
      this.roiText(rois, "number"),
    ]
      .filter(Boolean)
      .join("\n");

    const parsed = parseOcrText(augmentedText);
    const searchHints = buildSearchHints(parsed.fields);

    const candidates = await this.matchCandidates(
      parsed.fields,
      searchHints,
      game,
    );
    const bestCard = candidates[0] ?? null;
    const { confidence, confidenceLevel } = computeConfidence(candidates);

    return {
      rawText: text,
      lines: parsed.lines,
      parsed: parsed.fields,
      rois: rois.length > 0 ? rois : this.fallbackRois(parsed.fields),
      candidates,
      bestCard,
      confidence,
      confidenceLevel,
      engine: vision ? `${vision.engine}+${engine}` : engine,
    };
  }

  private async readRois(visionRois: VisionRoi[]): Promise<ScanRoi[]> {
    const rois: ScanRoi[] = [];

    for (const roi of visionRois) {
      let text = "";
      if (TEXT_ROI_KEYS.has(roi.key)) {
        const profile: OcrProfile = roi.key === "number" ? "number" : "name";
        const result = await this.ocrService.recognize(roi.image, profile);
        text = result.text.trim();
      }
      rois.push({ key: roi.key, text, box: roi.box });
    }

    return rois;
  }

  private roiText(rois: ScanRoi[], key: string): string {
    return rois.find((roi) => roi.key === key)?.text ?? "";
  }

  private async matchCandidates(
    fields: ScanParsedFields,
    searchHints: string[],
    game?: CardGame,
  ): Promise<ScanCardCandidate[]> {
    const scored = new Map<string, ScanCardCandidate>();

    for (const term of searchHints) {
      const results = await this.cardService.findBySearch(term, game);

      for (const card of results) {
        const score = scoreCard(card, fields);
        if (score > 0) {
          scored.set(card.id, toCandidate(card, score));
        }
      }

      if (
        results.some((card) => scoreCard(card, fields) >= STRONG_MATCH_SCORE)
      ) {
        break;
      }
    }

    return Array.from(scored.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_CANDIDATES);
  }

  // sans service vision, on reconstruit deux ROI à partir du texte parsé
  private fallbackRois(fields: ScanParsedFields): ScanRoi[] {
    const rois: ScanRoi[] = [];
    if (fields.cardName) rois.push({ key: "name", text: fields.cardName });
    if (fields.setCode) rois.push({ key: "number", text: fields.setCode });
    return rois;
  }
}

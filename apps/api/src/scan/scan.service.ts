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
import { ScanLogger } from "./logging/scan-logger";
import { type OcrProfile, OcrService } from "./ocr/ocr.service";
import {
  buildSearchHints,
  cleanName,
  parseNumber,
  parseOcrText,
} from "./parsing/scan-parser";
import { type VisionRoi, VisionService } from "./vision/vision.service";

const MAX_CANDIDATES = 10;

// en dessous, le candidat est trop faible pour être proposé
const MIN_CANDIDATE_SCORE = 0.4;

const TEXT_ROI_KEYS = new Set(["name", "number"]);

@Injectable()
export class ScanService {
  constructor(
    private readonly visionService: VisionService,
    private readonly ocrService: OcrService,
    private readonly cardService: CardService,
    private readonly scanLogger: ScanLogger,
  ) {}

  async recognize(
    image: Buffer,
    game?: CardGame,
  ): Promise<ScanRecognizeResponse> {
    const t0 = Date.now();
    const vision = await this.visionService.preprocess(image);
    const ocrTarget = vision?.normalizedImage ?? image;

    const t1 = Date.now();
    const { text, engine } = await this.ocrService.recognize(ocrTarget, "full");
    const rois = vision ? await this.readRois(vision.rois) : [];

    // texte plein en repli, puis on privilégie ce qui vient des ROI
    const fallback = parseOcrText(text);
    const fields = this.buildFields(rois, fallback.fields);
    const searchHints = buildSearchHints(fields);

    const t2 = Date.now();
    const candidates = await this.matchCandidates(fields, searchHints, game);
    const bestCard = candidates[0] ?? null;
    const { confidence, confidenceLevel } = computeConfidence(candidates);

    const response: ScanRecognizeResponse = {
      rawText: text,
      lines: fallback.lines,
      parsed: fields,
      rois: rois.length > 0 ? rois : this.fallbackRois(fields),
      candidates,
      bestCard,
      confidence,
      confidenceLevel,
      engine: vision ? `${vision.engine}+${engine}` : engine,
    };

    const t3 = Date.now();
    await this.scanLogger.log({
      inputImage: image,
      vision,
      response,
      timingsMs: {
        preprocess: t1 - t0,
        ocr: t2 - t1,
        match: t3 - t2,
        total: t3 - t0,
      },
    });

    return response;
  }

  // D1 : champs issus en priorité des ROI nom/numéro, sinon du texte plein
  private buildFields(
    rois: ScanRoi[],
    fallback: ScanParsedFields,
  ): ScanParsedFields {
    const nameText = this.roiText(rois, "name");
    const roiNumber = parseNumber(this.roiText(rois, "number"));

    return {
      cardName: (nameText && cleanName(nameText)) || fallback.cardName,
      setCode: roiNumber.setCode ?? fallback.setCode,
      setNumber: roiNumber.setNumber ?? fallback.setNumber,
      setTotal: roiNumber.setTotal ?? fallback.setTotal,
      setName: fallback.setName,
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
        if (score >= MIN_CANDIDATE_SCORE) {
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

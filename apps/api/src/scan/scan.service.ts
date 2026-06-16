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
import { OcrService } from "./ocr/ocr.service";
import { parseOcrText } from "./parsing/scan-parser";

const MAX_CANDIDATES = 10;

// orchestrateur du pipeline de scan : OCR -> parsing -> matching -> confiance.
@Injectable()
export class ScanService {
  constructor(
    private readonly ocrService: OcrService,
    private readonly cardService: CardService,
  ) {}

  async recognize(
    image: Buffer,
    game?: CardGame,
  ): Promise<ScanRecognizeResponse> {
    const { text, engine } = await this.ocrService.recognize(image);
    const { lines, fields, searchHints } = parseOcrText(text);

    const candidates = await this.matchCandidates(fields, searchHints, game);
    const bestCard = candidates[0] ?? null;
    const { confidence, confidenceLevel } = computeConfidence(candidates);

    return {
      rawText: text,
      lines,
      parsed: fields,
      rois: this.buildRois(fields),
      candidates,
      bestCard,
      confidence,
      confidenceLevel,
      engine,
    };
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

  private buildRois(fields: ScanParsedFields): ScanRoi[] {
    const rois: ScanRoi[] = [];
    if (fields.cardName) rois.push({ key: "name", text: fields.cardName });
    if (fields.setCode) rois.push({ key: "number", text: fields.setCode });
    return rois;
  }
}

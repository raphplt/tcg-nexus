import { Injectable } from "@nestjs/common";
import type {
  ScanCardCandidate,
  ScanParsedFields,
  ScanRecognizeResponse,
  ScanRoi,
} from "@repo/scan-contract";
import { CardService } from "../card/card.service";
import type { Card } from "../card/entities/card.entity";
import { CardGame } from "../common/enums/cardGame";
import { ScanLogger } from "./logging/scan-logger";
import {
  computeConfidence,
  STRONG_MATCH_SCORE,
  scoreCard,
  toCandidate,
} from "./matching/scan-matcher";
import { type OcrProfile, OcrService } from "./ocr/ocr.service";
import {
  buildSearchHints,
  cleanName,
  extractNameCandidates,
  parseNumber,
  parseOcrText,
} from "./parsing/scan-parser";
import { type VisionRoi, VisionService } from "./vision/vision.service";

const MAX_CANDIDATES = 10;

// en dessous, le candidat est trop faible pour être proposé
const MIN_CANDIDATE_SCORE = 0.4;

const TEXT_ROI_KEYS = new Set(["name", "number", "number_right"]);

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
    const nameCandidates = extractNameCandidates(
      this.roiText(rois, "name"),
      fallback.lines,
    );
    const searchHints = buildSearchHints(nameCandidates, fields.setCode);

    const t2 = Date.now();
    const candidates = await this.matchCandidates(
      fields,
      nameCandidates,
      searchHints,
      game,
    );
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
    // numéro bas-gauche (récentes) sinon bas-droite (anciennes)
    const numberText =
      [this.roiText(rois, "number"), this.roiText(rois, "number_right")].find(
        (t) => parseNumber(t).setNumber,
      ) ?? "";
    const roiNumber = parseNumber(numberText);

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
        const profile: OcrProfile = roi.key.startsWith("number")
          ? "number"
          : "name";
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
    nameCandidates: string[],
    searchHints: string[],
    game?: CardGame,
  ): Promise<ScanCardCandidate[]> {
    const scored = new Map<string, ScanCardCandidate>();

    const consider = (cards: Card[]) => {
      for (const card of cards) {
        const score = scoreCard(card, fields, nameCandidates);
        if (score >= MIN_CANDIDATE_SCORE) {
          scored.set(card.id, toCandidate(card, score));
        }
      }
    };
    const hasStrongMatch = () =>
      Array.from(scored.values()).some((c) => c.score >= STRONG_MATCH_SCORE);

    // 1) par numéro de carte : indépendant du nom (robuste au bruit OCR)
    if (fields.setNumber) {
      consider(
        await this.cardService.findByLocalId(
          fields.setNumber,
          fields.setTotal,
          game,
        ),
      );
    }

    // 2) par nom / hints, sauf si le numéro a déjà donné une correspondance sûre
    if (!hasStrongMatch()) {
      for (const term of searchHints) {
        consider(await this.cardService.findBySearch(term, game));
        if (hasStrongMatch()) break;
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

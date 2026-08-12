import { CatalogLocalizationService } from "src/card/catalog-localization.service";
import { Injectable } from "@nestjs/common";
import type {
  ScanCardCandidate,
  ScanConfidenceLevel,
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
  nameScore,
  scoreCard,
  toCandidate,
} from "./matching/scan-matcher";
import { type OcrProfile, OcrService } from "./ocr/ocr.service";
import {
  cleanName,
  extractNameCandidates,
  parseNumber,
  parseOcrText,
} from "./parsing/scan-parser";
import { type VisionRoi, VisionService } from "./vision/vision.service";

const MAX_CANDIDATES = 10;

// Score floor: candidates below this threshold are omitted
const MIN_CANDIDATE_SCORE = 0.4;

const TEXT_ROI_KEYS = new Set(["name", "number", "number_right"]);

// ORB visual tie-breaker: max candidate count compared and minimum good matches threshold
const VISUAL_TOP_K = 6;
const VISUAL_MIN_GOOD = 12;

const EMB_TOP_K = 10;
const EMB_FLOOR = 0.5; // Below this cutoff, visual match is too uncertain to override
const EMB_REL_MARGIN = 0.06; // Minimum confidence margin required for top candidate
const EMB_RESCUE = 0.6;
const EMB_RESCUE_MARGIN = 0.05;

const LEGACY_R2_HOST = "pub-27752f7846b4433d8e74edcc8bdc1dc8.r2.dev";

const cardImageUrl = (base?: string): string | undefined => {
  const value = base?.trim();
  if (!value) return undefined;
  const host = value.includes(LEGACY_R2_HOST)
    ? value.replace(LEGACY_R2_HOST, "cdn.tcg-nexus.org")
    : value;
  return `${host}/low.png`;
};

@Injectable()
export class ScanService {
  constructor(
    private readonly visionService: VisionService,
    private readonly ocrService: OcrService,
    private readonly cardService: CardService,
    private readonly scanLogger: ScanLogger,
    private readonly localization: CatalogLocalizationService,
  ) {}

  async recognize(
    images: Buffer[],
    game?: CardGame,
  ): Promise<ScanRecognizeResponse> {
    const frames = images.length > 0 ? images : [];
    const t0 = Date.now();
    // Vision service performs parallel OCR across frames and merges best results
    const vision = await this.visionService.preprocessBatch(frames);
    // Selected best frame: base for ORB, full text OCR fallback, and logging
    const bestFrame = frames[vision?.bestIndex ?? 0] ?? frames[0];
    const ocrTarget = vision?.normalizedImage ?? bestFrame;

    const t1 = Date.now();
    const { text, engine } = await this.ocrService.recognize(ocrTarget, "full");
    const rois = vision ? await this.readRois(vision.rois) : [];

    // Full text fallback: prioritized by fields extracted from ROI boxes
    const fallback = parseOcrText(text);
    const fields = this.buildFields(rois, fallback.fields);
    const nameCandidates = extractNameCandidates(
      this.roiText(rois, "name"),
      fallback.lines,
    );

    const t2 = Date.now();
    const textCandidates = await this.matchCandidates(
      fields,
      nameCandidates,
      game,
    );

    // Visual refinement: full catalog embedding if available (handles 0 text candidates case), otherwise ORB fallback
    const useEmbedding = Boolean(vision?.embedding?.length);
    const refined = useEmbedding
      ? await this.fuseWithVisual(vision!.embedding!, textCandidates, game)
      : await this.visualDisambiguate(bestFrame, textCandidates);

    const response: ScanRecognizeResponse = {
      rawText: text,
      lines: fallback.lines,
      parsed: fields,
      rois: rois.length > 0 ? rois : this.fallbackRois(fields),
      candidates: refined.candidates,
      bestCard: refined.candidates[0] ?? null,
      confidence: refined.confidence,
      confidenceLevel: refined.confidenceLevel,
      engine: `${vision ? `${vision.engine}+` : ""}${engine}${refined.usedVisual ? (useEmbedding ? "+clip" : "+orb") : ""}`,
    };

    const t3 = Date.now();
    await this.scanLogger.log({
      inputImage: bestFrame,
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

  // Extracted fields prioritized from ROI name/number boxes, falling back to full text
  private buildFields(
    rois: ScanRoi[],
    fallback: ScanParsedFields,
  ): ScanParsedFields {
    const nameText = this.roiText(rois, "name");
    // Card number from bottom-left (modern cards) or bottom-right (classic cards)
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
      // Vision service performs OCR on ROIs; tesseract fallback used only if missing text
      let text = roi.text?.trim() ?? "";
      if (roi.text === undefined && TEXT_ROI_KEYS.has(roi.key)) {
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
    game?: CardGame,
  ): Promise<ScanCardCandidate[]> {
    // Card collection: set number lookup (robust against name noise) + fuzzy name matching
    const pool = new Map<string, Card>();
    const add = (cards: Card[]) => {
      for (const card of cards) pool.set(card.id, card);
    };

    if (fields.setNumber) {
      add(
        await this.cardService.findByLocalId(
          fields.setNumber,
          fields.setTotal,
          game,
        ),
      );
    }

    const terms = Array.from(new Set(nameCandidates))
      .filter((t) => t.length >= 4)
      .sort((a, b) => b.length - a.length)
      .slice(0, 6);
    for (const term of terms) {
      add(await this.cardService.findByNameFuzzy(term, game));
    }

    const cards = Array.from(pool.values());

    // Scoring compares card names: labels originate from localized translations and must be resolved before measuring similarity
    await this.localization.resolveLabels(cards);

    // Best card name similarity score across all cards: baseline reference for relative guardrail in scoreCard
    const bestName = cards.reduce(
      (max, card) => Math.max(max, nameScore(card, nameCandidates)),
      0,
    );

    return cards
      .map((card) =>
        toCandidate(card, scoreCard(card, fields, nameCandidates, bestName)),
      )
      .filter((c) => c.score >= MIN_CANDIDATE_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_CANDIDATES);
  }

  // Ambiguous text resolution: compares card photo artwork to top candidate card images (ORB) and promotes top visual match
  private async visualDisambiguate(
    image: Buffer,
    candidates: ScanCardCandidate[],
  ): Promise<{
    candidates: ScanCardCandidate[];
    confidence: number;
    confidenceLevel: ScanConfidenceLevel;
    usedVisual: boolean;
  }> {
    const base = computeConfidence(candidates);
    const keep = { candidates, ...base, usedVisual: false };

    if (base.confidenceLevel === "high" || candidates.length < 2) return keep;

    const requested = candidates
      .slice(0, VISUAL_TOP_K)
      .map((c) => ({ id: c.id, url: cardImageUrl(c.image) }))
      .filter((c): c is { id: string; url: string } => Boolean(c.url));
    if (requested.length < 2) return keep;

    const scores = await this.visionService.match(image, requested);
    if (scores.size === 0) return keep;

    const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    const [bestId, bestScore] = ranked[0];
    const secondScore = ranked[1]?.[1] ?? 0;

    // Clear winner: sufficient matches and significantly ahead of runner-up
    if (bestScore < VISUAL_MIN_GOOD || bestScore < 2 * secondScore) return keep;

    const winner = candidates.find((c) => c.id === bestId);
    if (!winner) return keep;

    return {
      candidates: [winner, ...candidates.filter((c) => c.id !== bestId)],
      confidence: 0.95,
      confidenceLevel: "high",
      usedVisual: true,
    };
  }

  // Text + Visual Fusion. Visual scoring re-ranks text candidates (selecting top item if text is ambiguous),
  // without inflating confidence level. Full catalog visual rescue triggers only if text matching returns 0 candidates.
  private async fuseWithVisual(
    embedding: number[],
    textCandidates: ScanCardCandidate[],
    game?: CardGame,
  ): Promise<{
    candidates: ScanCardCandidate[];
    confidence: number;
    confidenceLevel: ScanConfidenceLevel;
    usedVisual: boolean;
  }> {
    const base = computeConfidence(textCandidates);
    const keep = { candidates: textCandidates, ...base, usedVisual: false };
    if (base.confidenceLevel === "high") return keep;

    // Empty text candidates -> full catalog visual rescue (e.g., full-art cards where OCR fails)
    if (textCandidates.length === 0) {
      return this.visualRescue(embedding, game);
    }

    const sims = await this.cardService.embeddingSimilarities(
      embedding,
      textCandidates.map((c) => c.id),
    );
    if (sims.size === 0) return keep;

    const ranked = textCandidates
      .map((c) => ({ c, sim: sims.get(c.id) ?? 0 }))
      .sort((a, b) => b.sim - a.sim);
    const top = ranked[0];
    const secondSim = ranked[1]?.sim ?? 0;

    // Visual match agrees with top text candidate or is indecisive: leave unchanged
    if (top.c.id === textCandidates[0].id) return keep;
    if (top.sim < EMB_FLOOR || top.sim - secondSim < EMB_REL_MARGIN)
      return keep;

    // Visual match favors an alternative candidate: promote to #1 while retaining text confidence level
    return {
      candidates: [top.c, ...textCandidates.filter((c) => c.id !== top.c.id)],
      confidence: base.confidence,
      confidenceLevel: base.confidenceLevel,
      usedVisual: true,
    };
  }

  // Zero text candidates: attempt full-catalog ANN visual rescue. Strict thresholds required as no text context bounds the search.
  private async visualRescue(
    embedding: number[],
    game?: CardGame,
  ): Promise<{
    candidates: ScanCardCandidate[];
    confidence: number;
    confidenceLevel: ScanConfidenceLevel;
    usedVisual: boolean;
  }> {
    const empty = {
      candidates: [] as ScanCardCandidate[],
      confidence: 0,
      confidenceLevel: "low" as ScanConfidenceLevel,
      usedVisual: false,
    };
    const hits = await this.cardService.findByEmbedding(
      embedding,
      game,
      EMB_TOP_K,
    );
    if (hits.length === 0) return empty;

    const best = hits[0];
    const second = hits[1]?.similarity ?? 0;
    const candidates = hits.map((h) =>
      toCandidate(h.card, Number(h.similarity.toFixed(3))),
    );

    // Clear and distinct visual match -> proposal to be confirmed (medium confidence)
    if (
      best.similarity >= EMB_RESCUE &&
      best.similarity - second >= EMB_RESCUE_MARGIN
    ) {
      return {
        candidates,
        confidence: Number(best.similarity.toFixed(3)),
        confidenceLevel: "medium",
        usedVisual: true,
      };
    }

    return { ...empty, candidates, usedVisual: true };
  }

  // Without vision service, reconstruct ROIs from parsed text fields
  private fallbackRois(fields: ScanParsedFields): ScanRoi[] {
    const rois: ScanRoi[] = [];
    if (fields.cardName) rois.push({ key: "name", text: fields.cardName });
    if (fields.setCode) rois.push({ key: "number", text: fields.setCode });
    return rois;
  }
}

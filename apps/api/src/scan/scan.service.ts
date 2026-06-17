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

// en dessous, le candidat est trop faible pour être proposé
const MIN_CANDIDATE_SCORE = 0.4;

const TEXT_ROI_KEYS = new Set(["name", "number", "number_right"]);

// départage visuel : nb max de candidats comparés, et seuil de bons matches ORB
const VISUAL_TOP_K = 6;
const VISUAL_MIN_GOOD = 12;

// recherche visuelle par embedding (CLIP/pgvector), similarités cosine 0..1
const EMB_TOP_K = 10;
const EMB_AGREE = 0.7; // texte n°1 confirmé par le visuel -> high
const EMB_STRONG = 0.82; // sauvetage : visuel seul assez net pour trancher
const EMB_MARGIN = 0.03; // ...et nettement devant le 2e

const LEGACY_R2_HOST = "pub-27752f7846b4433d8e74edcc8bdc1dc8.r2.dev";

// URL de l'image catalogue (base sans extension -> .../low.png), hôte réécrit
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
  ) {}

  async recognize(
    images: Buffer[],
    game?: CardGame,
  ): Promise<ScanRecognizeResponse> {
    const frames = images.length > 0 ? images : [];
    const t0 = Date.now();
    // best-of-N : plusieurs frames OCRisées en parallèle, meilleur résultat fusionné
    const vision = await this.visionService.preprocessBatch(frames);
    // frame retenue : base de l'ORB, du repli OCR plein texte et du log
    const bestFrame = frames[vision?.bestIndex ?? 0] ?? frames[0];
    const ocrTarget = vision?.normalizedImage ?? bestFrame;

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

    const t2 = Date.now();
    const textCandidates = await this.matchCandidates(
      fields,
      nameCandidates,
      game,
    );

    // départage visuel : embedding plein-catalogue si dispo (gère même 0 candidat
    // texte), sinon repli ORB sur les candidats texte.
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
      // le service vision OCRise déjà les ROI (nom/numéro) : on consomme son
      // texte. Repli tesseract.js uniquement si le service n'en fournit pas
      // (ancienne version sans OCR).
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
    // 1) collecte des cartes : par numéro (robuste au bruit du nom) + par nom fuzzy
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

    // 2) meilleur match de nom toutes cartes confondues : sert de référence au
    // garde-fou relatif (une carte trouvée par numéro mais au nom bien moins bon
    // que ce meilleur match a un numéro mal lu -> son numéro est ignoré).
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

  // départage visuel ORB : quand le texte est ambigu (pas déjà high), on compare
  // l'artwork de la photo aux images des top candidats et on promeut le gagnant.
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

    // gagnant visuel net (assez de matches ET franchement devant le 2e)
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

  // fusion texte + recherche visuelle par embedding (plein-catalogue).
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

    const hits = await this.cardService.findByEmbedding(
      embedding,
      game,
      EMB_TOP_K,
    );
    if (hits.length === 0) return keep;

    const best = hits[0];
    const second = hits[1]?.similarity ?? 0;

    // 1) le candidat texte n°1 est confirmé par le visuel -> on valide
    const textTop = textCandidates[0];
    const agree = hits.find((h) => h.card.id === textTop?.id);
    if (textTop && agree && agree.similarity >= EMB_AGREE) {
      return { ...keep, confidence: 0.95, confidenceLevel: "high", usedVisual: true };
    }

    // 2) sauvetage : texte faible mais visuel net et unique (full-art, holo…)
    if (best.similarity >= EMB_STRONG && best.similarity - second >= EMB_MARGIN) {
      const winner = toCandidate(best.card, best.similarity);
      return {
        candidates: [winner, ...textCandidates.filter((c) => c.id !== winner.id)],
        confidence: 0.92,
        confidenceLevel: "high",
        usedVisual: true,
      };
    }

    // 3) sinon on enrichit la liste de candidats visuels (à confirmer)
    const merged = this.mergeVisual(textCandidates, hits);
    return { candidates: merged, ...computeConfidence(merged), usedVisual: true };
  }

  // fusionne candidats texte et visuels (dédupe). Les visuels-seuls sont bornés
  // sous le seuil high : ils restent des suggestions à confirmer.
  private mergeVisual(
    text: ScanCardCandidate[],
    hits: Array<{ card: Card; similarity: number }>,
  ): ScanCardCandidate[] {
    const byId = new Map(text.map((c) => [c.id, c]));
    for (const h of hits) {
      if (!byId.has(h.card.id)) {
        byId.set(h.card.id, toCandidate(h.card, Number((h.similarity * 0.6).toFixed(3))));
      }
    }
    return [...byId.values()]
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

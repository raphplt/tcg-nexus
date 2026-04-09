"""
Pipeline d'analyse d'images pour les cartes :
- détection robuste des cartes (multi-cartes, classeurs, rotations légères)
- OCR enrichi pour extraire nom, numéro, set, illustrateur, etc.
"""
from __future__ import annotations

import io
import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Sequence, Tuple

from PIL import Image

try:
    import cv2  # type: ignore
    import numpy as np  # type: ignore
except Exception:  # pragma: no cover - OpenCV optionnel en local
    cv2 = None  # type: ignore
    np = None  # type: ignore

logger = logging.getLogger("app.analysis.image")

from app.services.card_text import CardTextExtractor


@dataclass
class DetectedCardFeatures:
    bounding_box: Tuple[int, int, int, int]
    raw_text: str
    probable_name: Optional[str]
    local_number: Optional[str]
    set_hint: Optional[str]
    hp_hint: Optional[str] = None
    type_hint: Optional[List[str]] = None
    attacks: Optional[List[str]] = None
    illustrator_hint: Optional[str] = None
    orientation: str = "original"
    confidence: float = 0.0
    release_year: Optional[str] = None
    raw_lines: Optional[List[str]] = None
    image_patch: Optional["np.ndarray"] = field(default=None, repr=False, compare=False)

    def to_payload(self) -> dict:
        return {
            "bounding_box": self.bounding_box,
            "raw_text": self.raw_text,
            "probable_name": self.probable_name,
            "local_number": self.local_number,
            "set_hint": self.set_hint,
            "hp_hint": self.hp_hint,
            "type_hint": self.type_hint,
            "attacks": self.attacks,
            "illustrator_hint": self.illustrator_hint,
            "orientation": self.orientation,
            "confidence": self.confidence,
            "release_year": self.release_year,
            "raw_lines": self.raw_lines,
        }


class ImageAnalyzer:
    """
    Détecte les cartes (rectangles) dans une image et extrait des informations textuelles.
    """

    def __init__(self) -> None:
        self.min_area_ratio = 0.01
        self.max_area_ratio = 0.95
        self.logger = logger
        self.text_extractor = CardTextExtractor()

    def analyze(self, image_bytes: bytes, subject_type: str = "cards") -> List[DetectedCardFeatures]:
        if subject_type != "cards":
            self.logger.info("⏭️  Analyse ignorée pour le type %s", subject_type)
            return []

        image, fallback_box = self._load_image(image_bytes)
        if image is None or cv2 is None or np is None:
            self.logger.warning("Impossible de décoder l'image ou OpenCV absent, fallback complet")
            return [
                DetectedCardFeatures(
                    bounding_box=fallback_box,
                    raw_text="",
                    probable_name=None,
                    local_number=None,
                    set_hint=None,
                    orientation="fallback",
                    confidence=0.1,
                )
            ]

        boxes = self._collect_candidate_boxes(image) or [{"box": fallback_box, "confidence": 0.1, "orientation": "fallback"}]
        self.logger.info("🃏 %s zone(s) candidate(s) détectées", len(boxes))

        detections: List[DetectedCardFeatures] = []
        for idx, candidate in enumerate(boxes, start=1):
            x, y, w, h = candidate["box"]
            crop = image[y : y + h, x : x + w]
            extraction = self.text_extractor.extract(crop)
            raw_text = "\n".join(extraction.raw_lines) if extraction.raw_lines else ""
            detections.append(
                DetectedCardFeatures(
                    bounding_box=(int(x), int(y), int(w), int(h)),
                    raw_text=raw_text,
                    probable_name=extraction.probable_name,
                    local_number=extraction.card_number,
                    set_hint=extraction.set_hint,
                    hp_hint=extraction.hp_hint,
                    type_hint=extraction.types,
                    attacks=extraction.attacks,
                    illustrator_hint=extraction.illustrator,
                    release_year=extraction.release_year,
                    raw_lines=extraction.raw_lines,
                    orientation=candidate.get("orientation", "original"),
                    confidence=candidate.get("confidence", 0.0),
                    image_patch=crop,
                )
            )
            self.logger.debug(
                "  ↳ zone #%s (%s) %sx%s - nom:%s num:%s set:%s conf:%.2f",
                idx,
                candidate.get("orientation"),
                w,
                h,
                extraction.probable_name,
                extraction.card_number,
                extraction.set_hint,
                candidate.get("confidence", 0.0),
            )

        return detections

    # --- Détection ---------------------------------------------------------

    def _load_image(self, data: bytes) -> tuple[Optional["np.ndarray"], Tuple[int, int, int, int]]:
        if cv2 is None or np is None:
            return None, (0, 0, 0, 0)

        array = np.frombuffer(data, dtype=np.uint8)
        image = cv2.imdecode(array, cv2.IMREAD_COLOR)
        if image is None:
            pil_image = Image.open(io.BytesIO(data)).convert("RGB")
            image = np.array(pil_image)
        h, w = image.shape[:2]
        return image, (0, 0, w, h)

    def _collect_candidate_boxes(self, image: "np.ndarray") -> List[Dict[str, object]]:
        if cv2 is None:
            return []

        variants = self._build_variants(image)
        aggregated: List[Dict[str, object]] = []

        for variant in variants:
            variant_boxes = self._detect_boxes_for_variant(variant, image.shape)
            aggregated.extend(variant_boxes)

        return self._deduplicate_boxes(aggregated)

    def _build_variants(self, image: "np.ndarray") -> List[Dict[str, object]]:
        if cv2 is None:
            return []

        variants = [
            {"image": image, "rotation": 0, "orientation": "original"},
            {"image": cv2.rotate(image, cv2.ROTATE_180), "rotation": 180, "orientation": "rot180"},
        ]

        # Ajoute un variant 90° si l'image est plus large que haute (classeurs horizontaux).
        if image.shape[1] > image.shape[0]:
            variants.append(
                {"image": cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE), "rotation": 90, "orientation": "rot90"}
            )
            variants.append(
                {"image": cv2.rotate(image, cv2.ROTATE_90_COUNTERCLOCKWISE), "rotation": 270, "orientation": "rot270"}
            )

        return variants

    def _detect_boxes_for_variant(
        self,
        variant: Dict[str, object],
        original_shape: Tuple[int, int, int],
    ) -> List[Dict[str, object]]:
        variant_img = variant["image"]
        if cv2 is None or not isinstance(variant_img, np.ndarray):
            return []

        base_boxes = self._base_rectangles(variant_img)
        refined: List[Dict[str, object]] = []

        for base in base_boxes:
            maybe_split = self._maybe_split_box(variant_img, base)
            refined.extend(maybe_split)

        remapped: List[Dict[str, object]] = []
        for box in refined:
            mapped_box = self._remap_box_to_original(
                box["box"],
                variant["rotation"],
                variant_img.shape,
                original_shape,
            )
            remapped.append(
                {
                    "box": mapped_box,
                    "confidence": box.get("confidence", 0.0),
                    "orientation": variant.get("orientation", "original"),
                }
            )
        return remapped

    def _base_rectangles(
        self,
        image: "np.ndarray",
        min_area_ratio: Optional[float] = None,
    ) -> List[Dict[str, object]]:
        if cv2 is None:
            return []

        height, width = image.shape[:2]
        image_area = float(height * width)
        threshold_area = (min_area_ratio or self.min_area_ratio) * image_area

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        blurred = cv2.bilateralFilter(enhanced, 11, 17, 17)
        binary = cv2.adaptiveThreshold(
            blurred,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV,
            41,
            7,
        )
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        closed = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=2)

        contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        boxes: List[Dict[str, object]] = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < threshold_area or area / image_area > self.max_area_ratio:
                continue
            x, y, w, h = cv2.boundingRect(contour)
            if w < 10 or h < 10:
                continue

            aspect = h / float(w)
            inverse_aspect = w / float(h)
            ratio_score = self._score_ratio(aspect, inverse_aspect)
            if ratio_score <= 0:
                continue

            area_ratio = (w * h) / image_area
            area_score = min(1.0, area_ratio / 0.2)
            confidence = round(0.35 + 0.4 * ratio_score + 0.25 * area_score, 3)

            boxes.append({"box": (x, y, w, h), "confidence": confidence})

        return boxes

    def _score_ratio(self, aspect: float, inverse_aspect: float) -> float:
        # Ratio cible approximatif d'une carte Pokémon (63 x 88 mm -> ~1.396)
        target = 1.4
        best_delta = min(abs(aspect - target), abs(inverse_aspect - target))
        score = max(0.0, 1 - (best_delta / target))
        return min(1.0, score)

    def _maybe_split_box(
        self,
        image: "np.ndarray",
        box_info: Dict[str, object],
    ) -> List[Dict[str, object]]:
        box = box_info["box"]
        x, y, w, h = box
        image_area = image.shape[0] * image.shape[1]
        box_area = w * h
        aspect = max(h / float(w), w / float(h))

        should_split = box_area / image_area > 0.35 or aspect > 2.2
        if not should_split:
            return [box_info]

        roi = image[y : y + h, x : x + w]
        if roi.size == 0:
            return [box_info]

        sub_boxes = self._base_rectangles(roi, min_area_ratio=0.08)
        if len(sub_boxes) <= 1:
            projection_boxes = self._split_by_projection(roi, x, y)
            if projection_boxes:
                return projection_boxes

        remapped_sub: List[Dict[str, object]] = []
        for sub in sub_boxes:
            sx, sy, sw, sh = sub["box"]
            remapped_sub.append(
                {
                    "box": (x + sx, y + sy, sw, sh),
                    "confidence": min(0.99, sub.get("confidence", 0.5)),
                }
            )
        return remapped_sub

    def _remap_box_to_original(
        self,
        box: Tuple[int, int, int, int],
        rotation: int,
        variant_shape: Tuple[int, int, int],
        original_shape: Tuple[int, int, int],
    ) -> Tuple[int, int, int, int]:
        if rotation == 0 or cv2 is None:
            return box

        mask = np.zeros((variant_shape[0], variant_shape[1]), dtype=np.uint8)
        x, y, w, h = box
        cv2.rectangle(mask, (x, y), (x + w, y + h), 255, -1)
        inverse_map = {
            90: cv2.ROTATE_90_COUNTERCLOCKWISE,
            180: cv2.ROTATE_180,
            270: cv2.ROTATE_90_CLOCKWISE,
        }
        rotation_code = inverse_map.get(rotation)
        if rotation_code is None:
            return box

        mask = cv2.rotate(mask, rotation_code)
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return box
        mapped = cv2.boundingRect(contours[0])
        return mapped

    def _deduplicate_boxes(self, boxes: Sequence[Dict[str, object]], iou_threshold: float = 0.25) -> List[Dict[str, object]]:
        sorted_boxes = sorted(boxes, key=lambda b: b.get("confidence", 0.0), reverse=True)
        kept: List[Dict[str, object]] = []

        for candidate in sorted_boxes:
            candidate_box = candidate["box"]
            if any(self._iou(candidate_box, existing["box"]) > iou_threshold for existing in kept):
                continue
            kept.append(candidate)
        return kept

    def _iou(self, box_a: Tuple[int, int, int, int], box_b: Tuple[int, int, int, int]) -> float:
        ax, ay, aw, ah = box_a
        bx, by, bw, bh = box_b

        x_left = max(ax, bx)
        y_top = max(ay, by)
        x_right = min(ax + aw, bx + bw)
        y_bottom = min(ay + ah, by + bh)

        if x_right <= x_left or y_bottom <= y_top:
            return 0.0

        intersection = (x_right - x_left) * (y_bottom - y_top)
        union = aw * ah + bw * bh - intersection
        return intersection / float(union)

    def _split_by_projection(
        self,
        roi: "np.ndarray",
        origin_x: int,
        origin_y: int,
    ) -> List[Dict[str, object]]:
        if cv2 is None:
            return []
        height, width = roi.shape[:2]
        if height < 200 and width < 200:
            return []
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        vertical_proj = np.sum(binary, axis=0)
        horizontal_proj = np.sum(binary, axis=1)

        vertical_bounds = self._compute_projection_boundaries(vertical_proj, width)
        horizontal_bounds = self._compute_projection_boundaries(horizontal_proj, height)

        boxes: List[Dict[str, object]] = []
        for i in range(len(horizontal_bounds) - 1):
            for j in range(len(vertical_bounds) - 1):
                y1, y2 = horizontal_bounds[i], horizontal_bounds[i + 1]
                x1, x2 = vertical_bounds[j], vertical_bounds[j + 1]
                w = x2 - x1
                h = y2 - y1
                if w < 80 or h < 80:
                    continue
                boxes.append(
                    {
                        "box": (origin_x + x1, origin_y + y1, w, h),
                        "confidence": 0.55,
                    }
                )
        return boxes

    def _compute_projection_boundaries(self, projection: "np.ndarray", length: int) -> List[int]:
        if projection.max() == 0:
            return [0, length]
        norm = projection / projection.max()
        gap_mask = norm < 0.25
        boundaries = [0]
        in_gap = False
        gap_start = 0
        for idx, is_gap in enumerate(gap_mask):
            if is_gap and not in_gap:
                gap_start = idx
                in_gap = True
            elif not is_gap and in_gap:
                in_gap = False
                if idx - gap_start > 25:
                    cut = (gap_start + idx) // 2
                    if cut - boundaries[-1] > 80:
                        boundaries.append(cut)
        if boundaries[-1] != length:
            boundaries.append(length)
        return boundaries

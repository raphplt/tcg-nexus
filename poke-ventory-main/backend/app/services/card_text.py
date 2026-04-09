"""
Extraction structurée du texte sur une carte Pokémon.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Dict, List, Optional

import numpy as np

from app.config import get_settings

logger = logging.getLogger("app.analysis.card_text")

try:  # pragma: no cover - dépendances optionnelles
    import easyocr  # type: ignore
except Exception:  # pragma: no cover
    easyocr = None  # type: ignore

try:
    import cv2  # type: ignore
except Exception:  # pragma: no cover
    cv2 = None  # type: ignore

try:
    import pytesseract  # type: ignore
except Exception:  # pragma: no cover
    pytesseract = None  # type: ignore


@dataclass
class TextExtractionResult:
    raw_lines: List[str]
    probable_name: Optional[str]
    card_number: Optional[str]
    set_hint: Optional[str]
    hp_hint: Optional[str]
    illustrator: Optional[str]
    types: List[str]
    attacks: List[str]
    release_year: Optional[str]


class CardTextExtractor:
    """
    Utilise EasyOCR (ou pytesseract en fallback) pour récupérer des informations
    à partir d'un crop d'image représentant une carte.
    """

    def __init__(self) -> None:
        settings = get_settings()
        self.languages = settings.analysis_languages
        self.reader = None
        if easyocr is not None:
            try:
                self.reader = easyocr.Reader(self.languages, gpu=False, verbose=False)
                logger.info("🧠 EasyOCR initialisé pour les langues %s", self.languages)
            except Exception as exc:  # pragma: no cover
                logger.warning("Impossible d'initialiser EasyOCR (%s), fallback pytesseract", exc)
                self.reader = None
        if self.reader is None and pytesseract is None:
            logger.warning("Aucun moteur OCR disponible, les extractions seront vides")

    def extract(self, image: "np.ndarray") -> TextExtractionResult:
        if cv2 is None:
            return TextExtractionResult([], None, None, None, None, None, [], [], None)

        h, w = image.shape[:2]
        segments = {
            "name": self._prepare_crop(image, 0, int(0.25 * h), 0, w),
            "hp": self._prepare_crop(image, 0, int(0.15 * h), int(0.55 * w), w),
            "body": self._prepare_crop(image, int(0.2 * h), int(0.8 * h), 0, w),
            "footer": self._prepare_crop(image, int(0.75 * h), h, 0, w),
        }

        lines: Dict[str, List[str]] = {}
        for key, crop in segments.items():
            if crop.size == 0:
                lines[key] = []
                continue
            texts = self._read_text(crop)
            cleaned = [self._clean_text(t) for t in texts if t.strip()]
            lines[key] = cleaned
            logger.debug("OCR %s -> %s", key, cleaned[:3])

        combined_footer = " ".join(lines.get("footer", []))
        combined_body = "\n".join(lines.get("body", []))
        combined_all = "\n".join(lines.get("name", []) + lines.get("body", []) + lines.get("footer", []))

        probable_name = self._extract_name(lines.get("name", []))
        number = self._extract_number(combined_footer) or self._extract_number(combined_all)
        set_hint = self._extract_set_hint(combined_footer)
        hp_hint = self._extract_hp(lines.get("hp", []) + lines.get("name", []))
        illustrator = self._extract_illustrator(combined_footer)
        release_year = self._extract_year(combined_footer)
        types = self._extract_types(combined_body + " " + combined_footer)
        attacks = self._extract_attacks(lines.get("body", []))

        return TextExtractionResult(
            raw_lines=list(
                filter(None, lines.get("name", []) + lines.get("body", []) + lines.get("footer", []))
            ),
            probable_name=probable_name,
            card_number=number,
            set_hint=set_hint,
            hp_hint=hp_hint,
            illustrator=illustrator,
            types=types,
            attacks=attacks,
            release_year=release_year,
        )

    # --- Internal helpers -------------------------------------------------

    def _prepare_crop(self, image: "np.ndarray", y1: int, y2: int, x1: int, x2: int) -> "np.ndarray":
        crop = image[y1:y2, x1:x2]
        if crop.size == 0 or cv2 is None:
            return crop
        resized = crop
        if min(crop.shape[:2]) < 120:
            scale = 120 / min(crop.shape[:2])
            resized = cv2.resize(crop, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
        gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
        blur = cv2.GaussianBlur(gray, (3, 3), 0)
        normalized = cv2.normalize(blur, None, 0, 255, cv2.NORM_MINMAX)
        return normalized

    def _read_text(self, image: "np.ndarray") -> List[str]:
        if self.reader is not None:
            try:
                results = self.reader.readtext(image, detail=0, paragraph=True)
                return [res for res in results if isinstance(res, str)]
            except Exception as exc:  # pragma: no cover
                logger.warning("EasyOCR erreur (%s), fallback pytesseract", exc)

        if pytesseract is None:
            return []
        text = pytesseract.image_to_string(image, lang="+".join(self.languages), config="--psm 6")
        return text.splitlines()

    def _clean_text(self, text: str) -> str:
        text = text.replace("’", "'").replace("`", "'")
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    def _extract_name(self, lines: List[str]) -> Optional[str]:
        for line in lines:
            candidate = line.strip()
            if not candidate or len(candidate) < 3:
                continue
            if any(char.isdigit() for char in candidate):
                continue
            if "ILLUS" in candidate.upper():
                continue
            return candidate.title()
        return None

    def _extract_number(self, text: str) -> Optional[str]:
        match = re.search(r"(\d{1,3})\s*/\s*(\d{1,3})", text)
        if match:
            return match.group(1).zfill(3)
        return None

    def _extract_set_hint(self, text: str) -> Optional[str]:
        match = re.search(r"\b([A-Z]{2,4})\b", text[-80:])
        if match:
            return match.group(1)
        return None

    def _extract_hp(self, text_lines: List[str]) -> Optional[str]:
        text = " ".join(text_lines)
        match = re.search(r"(\d{2,3})\s*(PV|HP)", text)
        if match:
            return match.group(1)
        return None

    def _extract_illustrator(self, text: str) -> Optional[str]:
        match = re.search(r"ILLUS(?:\.|TRATEUR)?[:\-\s]+([A-ZÉÈÀÂÊÎÔÛ' \-]+)", text.upper())
        if match:
            return match.group(1).title()
        return None

    def _extract_year(self, text: str) -> Optional[str]:
        match = re.search(r"(20\d{2})", text)
        if match:
            return match.group(1)
        return None

    def _extract_types(self, text: str) -> List[str]:
        normalized = text.upper()
        mapping = {
            "PLANTE": "Grass",
            "FEU": "Fire",
            "EAU": "Water",
            "ELECTRIQUE": "Lightning",
            "ELECTRIK": "Lightning",
            "PSY": "Psychic",
            "COMBAT": "Fighting",
            "TENEBRE": "Darkness",
            "METAL": "Metal",
            "DRAGON": "Dragon",
            "FEE": "Fairy",
        }
        types = []
        for key, label in mapping.items():
            if key in normalized:
                types.append(label)
        return list(dict.fromkeys(types))

    def _extract_attacks(self, lines: List[str]) -> List[str]:
        attacks: List[str] = []
        for line in lines:
            clean = line.strip()
            if len(clean) < 3:
                continue
            if clean.endswith("PV"):
                continue
            if re.search(r"\d{1,3}", clean):
                attacks.append(clean[:120])
        return attacks[:4]

"""
Matching visuel entre une carte détectée et l'artwork officiel via ORB.
"""
from __future__ import annotations

import logging
from functools import lru_cache
from typing import Optional

import numpy as np
import requests

from app.config import get_settings

logger = logging.getLogger("app.analysis.card_similarity")

try:
    import cv2  # type: ignore
except Exception:  # pragma: no cover
    cv2 = None  # type: ignore


class CardVisualMatcher:
    """
    Compare un crop détecté avec l'image officielle d'une carte.
    Retourne un score 0-1 basé sur le ratio de bons matches ORB.
    """

    def __init__(self) -> None:
        self.settings = get_settings()
        if cv2 is not None:
            self.orb = cv2.ORB_create(600)
            self.matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        else:  # pragma: no cover
            self.orb = None
            self.matcher = None

    def enabled(self) -> bool:
        return cv2 is not None and self.orb is not None and self.settings.analysis_visual_matching

    def score(self, crop: "np.ndarray", candidate_image_url: Optional[str]) -> Optional[float]:
        if not self.enabled() or crop is None or candidate_image_url is None:
            return None
        try:
            reference = self._fetch_image(candidate_image_url)
            if reference is None:
                return None
            crop_desc = self._compute_descriptor(crop)
            ref_desc = self._compute_descriptor(reference)
            if crop_desc is None or ref_desc is None:
                return None
            matches = self.matcher.match(crop_desc[1], ref_desc[1])  # type: ignore[index]
            if not matches:
                return None
            distances = sorted(m.distance for m in matches)
            good = sum(1 for d in distances if d < 35)
            score = min(1.0, good / max(len(matches), 1))
            logger.debug("🔁 Similarité visuelle %s => %.2f (%s/%s)", candidate_image_url, score, good, len(matches))
            return score
        except Exception as exc:  # pragma: no cover
            logger.debug("Similarity failure for %s (%s)", candidate_image_url, exc)
            return None

    def _compute_descriptor(self, image: "np.ndarray") -> Optional[tuple["np.ndarray", "np.ndarray"]]:
        if cv2 is None or self.orb is None:
            return None
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        kp, des = self.orb.detectAndCompute(gray, None)
        if des is None or len(kp) < 20:
            return None
        return kp, des

    @lru_cache(maxsize=128)
    def _fetch_image(self, url: str) -> Optional["np.ndarray"]:
        try:
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            data = np.frombuffer(response.content, dtype=np.uint8)
            if cv2 is None:
                return None
            image = cv2.imdecode(data, cv2.IMREAD_COLOR)
            return image
        except Exception:
            return None

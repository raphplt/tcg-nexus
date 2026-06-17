import os
import re
from concurrent.futures import ThreadPoolExecutor

import cv2
import numpy as np

try:
    import pytesseract
    from pytesseract import Output

    pytesseract.get_tesseract_version()
    HAS_TESSERACT = True
except Exception:  # pragma: no cover - dépend de l'environnement
    HAS_TESSERACT = False

LANGS = "eng+fra"
NUM_RE = re.compile(r"(\d{1,3})\s*/\s*(\d{2,3})")
NAME_NOISE = {
    "base", "pv", "hp", "niv", "niveau", "veau", "lv", "stage", "stade",
    "ex", "gx", "tag", "team", "the", "outil", "objet", "stade", "dresseur",
    "supporter", "energie", "énergie", "item", "trainer", "basic",
}

ROI_TARGET_H = 220
# le numéro (NN/MMM) est imprimé tout petit -> on agrandit davantage sa bande
# pour donner de la matière à tesseract.
NUMBER_TARGET_H = 340
_OCR_POOL = ThreadPoolExecutor(max_workers=min(8, (os.cpu_count() or 2)))


def _resize_h(gray: np.ndarray, target_h: int = ROI_TARGET_H) -> np.ndarray:
    scale = target_h / gray.shape[0]
    interp = cv2.INTER_CUBIC if scale > 1 else cv2.INTER_AREA
    gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=interp)
    return cv2.bilateralFilter(gray, 7, 40, 40)


def _variants(crop: np.ndarray, target_h: int = ROI_TARGET_H):
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY) if crop.ndim == 3 else crop
    g = _resize_h(gray, target_h)

    _, otsu = cv2.threshold(g, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(g)
    # blackhat : isole le texte sombre d'un fond holographique/dégradé (titres
    # des cartes ex), là où Otsu/CLAHE échouent complètement.
    k = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
    blackhat = cv2.morphologyEx(g, cv2.MORPH_BLACKHAT, k)
    _, bh = cv2.threshold(blackhat, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    ordered = [otsu, cv2.bitwise_not(otsu), clahe, cv2.bitwise_not(bh)]
    return [
        cv2.copyMakeBorder(im, 18, 18, 18, 18, cv2.BORDER_CONSTANT, value=255)
        for im in ordered
    ]


def _words(
    img: np.ndarray, psm: int, whitelist: str | None = None, lang: str = LANGS
):
    cfg = f"--oem 1 --psm {psm} -l {lang}"
    if whitelist:
        cfg += f" -c tessedit_char_whitelist={whitelist}"
    try:
        data = pytesseract.image_to_data(
            img, config=cfg, output_type=Output.DICT
        )
    except Exception:
        return []
    return [
        (w, int(c))
        for w, c in zip(data["text"], data["conf"])
        if w.strip() and int(c) >= 0
    ]


def _name_tokens(text: str) -> list[str]:
    return [
        t
        for t in re.findall(r"[A-Za-zÀ-ÿ]{3,}", text)
        if t.lower() not in NAME_NOISE
    ]


def _name_attempt(im: np.ndarray, psm: int) -> tuple[str, float]:
    toks = [(w, c) for w, c in _words(im, psm) if _name_tokens(w)]
    if not toks:
        return "", 0.0
    conf = sum(c * len(w) for w, c in toks) / sum(len(w) for w, _ in toks)
    text = " ".join(_name_tokens(" ".join(w for w, _ in toks)))
    return text, conf


def _number_attempt(im: np.ndarray, psm: int) -> tuple[str, float]:
    # chiffres seuls + 'eng' uniquement : ~2x plus rapide que eng+fra
    words = _words(im, psm, "0123456789/", lang="eng")
    match = NUM_RE.search(" ".join(w for w, _ in words))
    if not match:
        return "", 0.0
    conf = float(np.mean([c for _, c in words])) if words else 0.0
    return f"{match.group(1)}/{match.group(2)}", conf


def _best_attempt(
    crop: np.ndarray, attempt, psms=(11, 7), target_h: int = ROI_TARGET_H
) -> tuple[str, float]:
    """Lance toutes les variantes×PSM en parallèle et garde la meilleure conf."""
    if not HAS_TESSERACT or crop.size == 0:
        return "", 0.0
    tasks = [(im, psm) for im in _variants(crop, target_h) for psm in psms]
    results = _OCR_POOL.map(lambda t: attempt(*t), tasks)
    return max((r for r in results if r[0]), key=lambda r: r[1], default=("", 0.0))


def read_name(crop: np.ndarray) -> tuple[str, float]:
    """Nom de la carte + confiance (0..100). Garde les tokens alphabétiques
    pertinents (filtre BASE/PV/NIV…), pondère la confiance par la longueur."""
    return _best_attempt(crop, _name_attempt)


def read_number(crop: np.ndarray) -> tuple[str, float]:
    """Numéro de collection normalisé 'NN/MMM' + confiance, via regex sur un
    OCR chiffres-et-slash. Agrandissement plus fort et PSM 'ligne/mot' (7/8/6)
    en plus du sparse (11) car les chiffres forment une courte ligne isolée."""
    return _best_attempt(
        crop, _number_attempt, psms=(7, 11, 8, 6), target_h=NUMBER_TARGET_H
    )

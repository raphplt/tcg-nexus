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
except Exception:
    HAS_TESSERACT = False

LANGS = "eng+fra"
NUM_RE = re.compile(r"(\d{1,3})\s*/\s*(\d{2,3})")
NAME_NOISE = {
    "base", "pv", "hp", "niv", "niveau", "veau", "lv", "stage", "stade",
    "ex", "gx", "tag", "team", "the", "outil", "objet", "stade", "dresseur",
    "supporter", "energie", "énergie", "item", "trainer", "basic",
}

ROI_TARGET_H = 220
NUMBER_TARGET_H = 340
_OCR_POOL = ThreadPoolExecutor(max_workers=min(8, (os.cpu_count() or 2)))


def _resize_h(gray: np.ndarray, target_h: int = ROI_TARGET_H) -> np.ndarray:
    scale = target_h / gray.shape[0]
    interp = cv2.INTER_CUBIC if scale > 1 else cv2.INTER_AREA
    gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=interp)
    return cv2.bilateralFilter(gray, 7, 40, 40)


def _variants(crop: np.ndarray, target_h: int = ROI_TARGET_H):
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY) if crop.ndim == 3 else crop
    resized = _resize_h(gray, target_h)

    _, otsu = cv2.threshold(resized, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(resized)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
    blackhat = cv2.morphologyEx(resized, cv2.MORPH_BLACKHAT, kernel)
    _, blackhat_thresh = cv2.threshold(blackhat, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    tophat = cv2.morphologyEx(resized, cv2.MORPH_TOPHAT, kernel)
    _, tophat_thresh = cv2.threshold(tophat, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    ordered = [
        otsu,
        cv2.bitwise_not(otsu),
        clahe,
        cv2.bitwise_not(blackhat_thresh),
        cv2.bitwise_not(tophat_thresh),
    ]
    return [
        cv2.copyMakeBorder(variant, 18, 18, 18, 18, cv2.BORDER_CONSTANT, value=255)
        for variant in ordered
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
        (word, int(conf))
        for word, conf in zip(data["text"], data["conf"])
        if word.strip() and int(conf) >= 0
    ]


def _name_tokens(text: str) -> list[str]:
    return [
        token
        for token in re.findall(r"[A-Za-zÀ-ÿ]{3,}", text)
        if token.lower() not in NAME_NOISE
    ]


def _name_attempt(image: np.ndarray, psm: int) -> tuple[str, float]:
    tokens = [(word, conf) for word, conf in _words(image, psm) if _name_tokens(word)]
    if not tokens:
        return "", 0.0
    conf = sum(conf * len(word) for word, conf in tokens) / sum(len(word) for word, _ in tokens)
    text = " ".join(_name_tokens(" ".join(word for word, _ in tokens)))
    return text, conf


def _number_attempt(image: np.ndarray, psm: int) -> tuple[str, float]:
    words = _words(image, psm, "0123456789/", lang="eng")
    match = NUM_RE.search(" ".join(word for word, _ in words))
    if not match:
        return "", 0.0
    conf = float(np.mean([conf for _, conf in words])) if words else 0.0
    return f"{match.group(1)}/{match.group(2)}", conf


def _best_attempt(
    crop: np.ndarray, attempt, psms=(11, 7), target_h: int = ROI_TARGET_H
) -> tuple[str, float]:
    """Runs all variants x PSM configs in parallel and retains the highest confidence result."""
    if not HAS_TESSERACT or crop.size == 0:
        return "", 0.0
    tasks = [(variant, psm) for variant in _variants(crop, target_h) for psm in psms]
    results = _OCR_POOL.map(lambda task: attempt(*task), tasks)
    return max((res for res in results if res[0]), key=lambda res: res[1], default=("", 0.0))


def read_name(crop: np.ndarray) -> tuple[str, float]:
    """Recognizes card name and confidence score (0..100). Filters out noise words
    and weights confidence by token length."""
    return _best_attempt(crop, _name_attempt)


def read_number(crop: np.ndarray) -> tuple[str, float]:
    """Recognizes card number format 'NN/MMM' and associated confidence score."""
    return _best_attempt(
        crop, _number_attempt, psms=(7, 11, 8, 6), target_h=NUMBER_TARGET_H
    )


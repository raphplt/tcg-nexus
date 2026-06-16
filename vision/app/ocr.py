# OCR des ROI au plus près du pixel : tesseract natif + multi-variantes de
# binarisation, sélection par confiance. Bien plus robuste qu'un seul
# prétraitement : selon la carte (holo, bandeau coloré, texte blanc sur sombre)
# c'est tantôt Otsu, tantôt CLAHE, tantôt la polarité inverse qui gagne.

import re

import cv2
import numpy as np

try:
    import pytesseract
    from pytesseract import Output

    # sonde : lève si le binaire tesseract est absent du système
    pytesseract.get_tesseract_version()
    HAS_TESSERACT = True
except Exception:  # pragma: no cover - dépend de l'environnement
    HAS_TESSERACT = False

LANGS = "eng+fra"
NUM_RE = re.compile(r"(\d{1,3})\s*/\s*(\d{2,3})")
# mots du bandeau de titre qui ne sont jamais le nom de la carte
# mots de bandeau/type qui ne sont jamais le nom de la carte (FR + EN), plus
# résidus d'OCR fréquents (NIVEAU -> 'veau'). Filtrés des candidats de nom.
NAME_NOISE = {
    "base", "pv", "hp", "niv", "niveau", "veau", "lv", "stage", "stade",
    "ex", "gx", "tag", "team", "the", "outil", "objet", "stade", "dresseur",
    "supporter", "energie", "énergie", "item", "trainer", "basic",
}

# hauteur cible d'un crop ROI avant OCR (agrandit le petit texte)
ROI_TARGET_H = 220
# early-exit : au-delà, inutile d'essayer d'autres variantes
NAME_CONF_STOP = 85.0
NUMBER_CONF_STOP = 55.0


def _resize_h(gray: np.ndarray) -> np.ndarray:
    """Ramène le crop à une hauteur cible (agrandit le petit texte, réduit les
    crops géants des photos haute-déf -> OCR rapide ET lisible)."""
    scale = ROI_TARGET_H / gray.shape[0]
    interp = cv2.INTER_CUBIC if scale > 1 else cv2.INTER_AREA
    gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=interp)
    return cv2.bilateralFilter(gray, 7, 40, 40)


def _variants(crop: np.ndarray):
    """Variantes de prétraitement ordonnées par taux de réussite observé.
    Volontairement limité à 3 : couvre texte sombre/clair et fonds dégradés
    sans exploser le temps d'OCR."""
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY) if crop.ndim == 3 else crop
    g = _resize_h(gray)

    _, otsu = cv2.threshold(g, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(g)
    ordered = [otsu, cv2.bitwise_not(otsu), clahe]
    # marge blanche : tesseract lit mieux avec de l'espace autour du texte
    return [
        cv2.copyMakeBorder(im, 18, 18, 18, 18, cv2.BORDER_CONSTANT, value=255)
        for im in ordered
    ]


def _words(img: np.ndarray, psm: int, whitelist: str | None = None):
    cfg = f"--oem 1 --psm {psm} -l {LANGS}"
    if whitelist:
        cfg += f" -c tessedit_char_whitelist={whitelist}"
    try:
        data = pytesseract.image_to_data(
            img, config=cfg, output_type=Output.DICT
        )
    except Exception:  # tesseract peut planter sur un crop pathologique
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


def read_name(crop: np.ndarray) -> tuple[str, float]:
    """Nom de la carte + confiance (0..100). Garde les tokens alphabétiques
    pertinents (filtre BASE/PV/NIV…), pondère la confiance par la longueur."""
    if not HAS_TESSERACT or crop.size == 0:
        return "", 0.0
    best_text, best_conf = "", 0.0
    for im in _variants(crop):
        for psm in (11, 7):
            toks = [(w, c) for w, c in _words(im, psm) if _name_tokens(w)]
            if not toks:
                continue
            conf = sum(c * len(w) for w, c in toks) / sum(len(w) for w, _ in toks)
            text = " ".join(_name_tokens(" ".join(w for w, _ in toks)))
            if text and conf > best_conf:
                best_text, best_conf = text, conf
        if best_conf >= NAME_CONF_STOP:
            return best_text, best_conf
    return best_text, best_conf


def read_number(crop: np.ndarray) -> tuple[str, float]:
    """Numéro de collection normalisé 'NN/MMM' + confiance, via regex sur un
    OCR chiffres-et-slash."""
    if not HAS_TESSERACT or crop.size == 0:
        return "", 0.0
    best_text, best_conf = "", 0.0
    for im in _variants(crop):
        for psm in (11, 7):
            words = _words(im, psm, "0123456789/")
            match = NUM_RE.search(" ".join(w for w, _ in words))
            if not match:
                continue
            conf = float(np.mean([c for _, c in words])) if words else 0.0
            if conf > best_conf:
                best_text = f"{match.group(1)}/{match.group(2)}"
                best_conf = conf
        if best_conf >= NUMBER_CONF_STOP:
            return best_text, best_conf
    return best_text, best_conf

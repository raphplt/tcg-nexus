# Prétraitement des cartes avant OCR : détection + redressement, normalisation, ROI.

import base64
import math
import os
from concurrent.futures import ThreadPoolExecutor

import cv2
import numpy as np

from .ocr import HAS_TESSERACT as HAS_OCR
from .ocr import read_name, read_number

CARD_W = 600
CARD_H = 838

# Largeur max du warp servant à l'OCR : assez haute pour lire le petit texte,
# mais bornée pour rester rapide (un warp brut de photo 12 MP fait ~2000px+).
MAX_WARP_W = 1024

# En dessous de ce ratio d'aire, on considère que ce n'est pas la carte.
MIN_CARD_AREA_RATIO = 0.08

# Bande du nom : large et partant du haut pour tolérer les écarts de cadrage /
# détection (le nom est tout en haut et peut être rogné si la box démarre trop bas).
NAME_BAND = (0.06, 0.0, 0.80, 0.14)
# Bandes candidates pour le numéro : bas-gauche (cartes récentes) et bas-droite
# (anciennes).
NUMBER_BANDS = {
    "number": (0.02, 0.90, 0.46, 0.085),
    "number_right": (0.52, 0.90, 0.46, 0.085),
}
HP_BAND = (0.70, 0.040, 0.26, 0.060)


def _decode(image_b64: str) -> np.ndarray:
    data = base64.b64decode(image_b64)
    arr = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Image illisible (décodage échoué).")
    return img


def _encode_png(img: np.ndarray) -> str:
    ok, buf = cv2.imencode(".png", img)
    if not ok:
        raise ValueError("Encodage PNG échoué.")
    return base64.b64encode(buf.tobytes()).decode("ascii")


def _order_points(pts: np.ndarray) -> np.ndarray:
    # haut-gauche, haut-droite, bas-droite, bas-gauche
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect


def _card_contours(img: np.ndarray) -> list:
    """Contours candidats via 2 indices complémentaires : bords + saturation."""
    candidates = []

    # 1) bords (Canny) + fermeture morpho — marche sur cartes contrastées
    gray = cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), (5, 5), 0)
    edges = cv2.Canny(gray, 30, 120)
    kernel = np.ones((5, 5), np.uint8)
    edges = cv2.morphologyEx(
        cv2.dilate(edges, kernel, iterations=2), cv2.MORPH_CLOSE, kernel
    )
    candidates += list(
        cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[0]
    )

    # 2) saturation — une carte colorée ressort d'un fond neutre (bureau/mur)
    sat = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)[:, :, 1]
    _, mask = cv2.threshold(sat, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
    candidates += list(
        cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[0]
    )
    return candidates


def _find_card_box(img: np.ndarray):
    """Rectangle (tourné) de la carte : on privilégie une forme grande ET centrée
    (l'utilisateur vise la carte au centre, d'éventuelles voisines sont en bord)."""
    h, w = img.shape[:2]
    area = float(h * w)
    cx, cy = w / 2.0, h / 2.0
    diag = math.hypot(cx, cy)

    best = None
    best_score = -1.0
    for contour in _card_contours(img):
        a = cv2.contourArea(contour)
        if a < MIN_CARD_AREA_RATIO * area:
            continue
        moments = cv2.moments(contour)
        if moments["m00"] == 0:
            continue
        dist = (
            math.hypot(
                moments["m10"] / moments["m00"] - cx,
                moments["m01"] / moments["m00"] - cy,
            )
            / diag
        )
        # grand + centré
        score = a / area - 0.6 * dist
        if score > best_score:
            best_score = score
            best = contour

    if best is None:
        return None

    # minAreaRect tolère les coins arrondis (contrairement à approxPolyDP)
    return cv2.boxPoints(cv2.minAreaRect(best)).astype("float32")


def _warp_card(img: np.ndarray, box: np.ndarray) -> np.ndarray:
    """Redresse la carte et la ramène en portrait, en pleine résolution.
    On NE réduit PAS ici : les ROI sont extraites de ce warp haute-déf pour
    préserver le petit texte (nom/numéro) que l'OCR doit lire."""
    rect = _order_points(box)
    tl, tr, br, bl = rect

    width = max(np.linalg.norm(br - bl), np.linalg.norm(tr - tl))
    height = max(np.linalg.norm(tr - br), np.linalg.norm(tl - bl))
    max_w, max_h = max(int(width), 1), max(int(height), 1)

    dst = np.array(
        [[0, 0], [max_w - 1, 0], [max_w - 1, max_h - 1], [0, max_h - 1]],
        dtype="float32",
    )
    warped = cv2.warpPerspective(
        img, cv2.getPerspectiveTransform(rect, dst), (max_w, max_h)
    )

    # carte détectée couchée -> on la remet debout
    if max_w > max_h:
        warped = cv2.rotate(warped, cv2.ROTATE_90_CLOCKWISE)

    return _cap_width(warped)


def _cap_width(card: np.ndarray) -> np.ndarray:
    """Borne la largeur (perf OCR) sans monter en résolution inutilement."""
    w = card.shape[1]
    if w > MAX_WARP_W:
        scale = MAX_WARP_W / w
        card = cv2.resize(
            card, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA
        )
    return card


def _normalize(card_bgr: np.ndarray) -> np.ndarray:
    # CLAHE pour rattraper les éclairages inégaux, puis débruitage léger.
    gray = cv2.cvtColor(card_bgr, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    equalized = clahe.apply(gray)
    return cv2.fastNlMeansDenoising(equalized, h=10)


def _crop(card: np.ndarray, band: tuple) -> np.ndarray:
    h, w = card.shape[:2]
    fx, fy, fw, fh = band
    x, y = int(fx * w), int(fy * h)
    return card[y : y + int(fh * h), x : x + int(fw * w)]


def _roi(key: str, band: tuple, crop: np.ndarray, text: str, conf: float) -> dict:
    fx, fy, fw, fh = band
    return {
        "key": key,
        "box": {"x": fx, "y": fy, "width": fw, "height": fh},
        "image": _encode_png(crop),
        "text": text,
        "conf": round(float(conf), 1),
    }


def _extract_rois(card: np.ndarray) -> list:
    """ROI extraites du warp HAUTE-DÉF puis OCRisées (nom + numéro) avec
    sélection par confiance. Le crop renvoyé sert au debug/log côté API."""
    rois = []

    name_crop = _crop(card, NAME_BAND)
    if name_crop.size:
        text, conf = read_name(name_crop)
        rois.append(_roi("name", NAME_BAND, name_crop, text, conf))

    for key, band in NUMBER_BANDS.items():
        crop = _crop(card, band)
        if not crop.size:
            continue
        text, conf = read_number(crop)
        rois.append(_roi(key, band, crop, text, conf))

    hp_crop = _crop(card, HP_BAND)
    if hp_crop.size:
        rois.append(_roi("hp", HP_BAND, hp_crop, "", 0.0))

    return rois


def preprocess(image_b64: str) -> dict:
    img = _decode(image_b64)
    box = _find_card_box(img)
    detected = box is not None

    if detected:
        card = _warp_card(img, box)
    else:
        # pas de carte isolée : on redresse au moins en portrait
        upright = (
            cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
            if img.shape[1] > img.shape[0]
            else img
        )
        card = _cap_width(upright)

    rois = _extract_rois(card)

    # image normalisée 600x838 : aperçu/log + repli OCR plein texte côté API
    norm = _normalize(cv2.resize(card, (CARD_W, CARD_H)))

    return {
        "detected": detected,
        "engine": "opencv+tesseract" if rois and HAS_OCR else "opencv",
        "normalized_image": _encode_png(norm),
        "rois": rois,
    }


def _name_conf(result: dict) -> float:
    roi = next((r for r in result["rois"] if r["key"] == "name"), None)
    return roi["conf"] if roi and roi.get("text") else 0.0


def _best_number_roi(result: dict):
    """Meilleure ROI numéro (texte non vide) d'un résultat, sinon None."""
    cands = [
        r
        for r in result["rois"]
        if r["key"].startswith("number") and r.get("text")
    ]
    return max(cands, key=lambda r: r["conf"], default=None)


# pool réutilisé : l'OCR tesseract tourne en sous-process et libère le GIL,
# donc les frames d'une rafale s'OCRisent en parallèle (≈ x4 sur multi-cœurs).
_POOL = ThreadPoolExecutor(max_workers=min(8, (os.cpu_count() or 2)))


def preprocess_many(images_b64: list[str]) -> dict:
    """Best-of-N : OCRise plusieurs frames d'une même carte EN PARALLÈLE et
    fusionne le meilleur nom et le meilleur numéro (pas forcément la même frame).
    Robuste aux crops ratés : une frame mal cadrée est compensée par les autres."""
    if not images_b64:
        raise ValueError("Aucune image fournie.")
    if len(images_b64) == 1:
        result = preprocess(images_b64[0])
        result["best_index"] = 0
        result["frame_count"] = 1
        return result

    results = list(_POOL.map(_safe_preprocess, images_b64))
    valid = [(i, r) for i, r in enumerate(results) if r is not None]
    if not valid:
        raise ValueError("Toutes les frames ont échoué au prétraitement.")

    # frame gagnante = meilleure confiance de nom (sert aussi de base ORB côté API)
    best_index, best = max(valid, key=lambda pair: _name_conf(pair[1]))

    name_roi = next((r for r in best["rois"] if r["key"] == "name"), None)
    number_roi = max(
        (nr for nr in (_best_number_roi(r) for _, r in valid) if nr),
        key=lambda r: r["conf"],
        default=None,
    )

    fused_rois = [r for r in (name_roi, number_roi) if r]

    return {
        "detected": any(r["detected"] for _, r in valid),
        "engine": best["engine"],
        "normalized_image": best["normalized_image"],
        "rois": fused_rois,
        "best_index": best_index,
        "frame_count": len(images_b64),
    }


def _safe_preprocess(image_b64: str):
    try:
        return preprocess(image_b64)
    except Exception:
        return None

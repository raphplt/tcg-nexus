# Prétraitement des cartes avant OCR : détection + redressement, normalisation, ROI.

import base64
import math
import os
from concurrent.futures import ThreadPoolExecutor

import cv2
import numpy as np

from .embed import embed_artwork
from .ocr import HAS_TESSERACT as HAS_OCR
from .ocr import read_name, read_number

try:
    import pytesseract
    from pytesseract import Output
except Exception:  # pragma: no cover - dépend de l'environnement
    pytesseract = None

CARD_W = 600
CARD_H = 838

MAX_WARP_W = 1024
MIN_CARD_AREA_RATIO = 0.08
NAME_BAND = (0.06, 0.0, 0.80, 0.14)
# Bandes candidates pour le numéro : bas-gauche (cartes récentes) et bas-droite
# (anciennes). Fines et calées en bas : valable une fois le warp recadré au plus
# près de la carte (cf. _tighten_to_card), sinon la marge de pochette les décale.
NUMBER_BANDS = {
    "number": (0.02, 0.885, 0.46, 0.10),
    "number_right": (0.52, 0.885, 0.46, 0.10),
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

    return _cap_width(_tighten_to_card(warped))


def _cap_width(card: np.ndarray) -> np.ndarray:
    """Borne la largeur (perf OCR) sans monter en résolution inutilement."""
    w = card.shape[1]
    if w > MAX_WARP_W:
        scale = MAX_WARP_W / w
        card = cv2.resize(
            card, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA
        )
    return card


def _tighten_to_card(card: np.ndarray) -> np.ndarray:
    """Recadre au plus près de la carte. La détection se cale parfois sur la
    pochette/le toploader ou inclut une marge de tapis, ce qui laisse un bord
    autour de la carte et décale TOUTES les ROI relatives (nom ET numéro, qui
    lisaient alors le fond). Le warp étant déjà redressé, la carte est un grand
    rectangle clair ~vertical au centre : on prend sa boîte englobante. Conservateur
    -> on ne recadre que si on trouve une zone nettement plus petite et au ratio
    plausible d'une carte ; sinon image inchangée (zéro régression sur les photos
    déjà bien cadrées)."""
    h, w = card.shape[:2]
    if h == 0 or w == 0:
        return card
    gray = cv2.cvtColor(card, cv2.COLOR_BGR2GRAY)
    # la carte ressort (claire) du fond sombre (pochette/tapis)
    _, mask = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
    cnts = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[0]
    if not cnts:
        return card
    x, y, bw, bh = cv2.boundingRect(max(cnts, key=cv2.contourArea))
    area_ratio = (bw * bh) / float(w * h)
    aspect = bw / float(bh) if bh else 0.0
    # garde-fous : zone assez grande (vraie carte, pas un reflet), ratio plausible
    # de carte (~0.72), et recadrage réellement utile (sinon on n'y touche pas).
    if not (0.45 < area_ratio < 0.93) or not (0.55 < aspect < 0.95):
        return card
    pad = int(0.012 * max(w, h))
    x0, y0 = max(0, x - pad), max(0, y - pad)
    x1, y1 = min(w, x + bw + pad), min(h, y + bh + pad)
    return card[y0:y1, x0:x1]


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


def _read_name_roi(card: np.ndarray):
    """OCR de la bande du nom. Renvoie (crop, texte, conf) ; crop=None si vide."""
    crop = _crop(card, NAME_BAND)
    if not crop.size:
        return None, "", 0.0
    text, conf = read_name(crop)
    return crop, text, conf


def _extract_rois(card: np.ndarray, name=None) -> list:
    """ROI extraites du warp HAUTE-DÉF puis OCRisées (nom + numéro) avec
    sélection par confiance. Le crop renvoyé sert au debug/log côté API."""
    rois = []

    # nom déjà lu en amont (orientation) -> réutilisé pour éviter un double OCR
    if name is None:
        name = _read_name_roi(card)
    name_crop, name_text, name_conf = name
    if name_crop is not None:
        rois.append(_roi("name", NAME_BAND, name_crop, name_text, name_conf))

    # numéro : bas-gauche d'abord (cartes récentes), bas-droite seulement en
    # repli (anciennes) -> évite des appels OCR inutiles dans le cas courant.
    for key, band in NUMBER_BANDS.items():
        crop = _crop(card, band)
        if not crop.size:
            continue
        text, conf = read_number(crop)
        rois.append(_roi(key, band, crop, text, conf))
        if text:
            break

    hp_crop = _crop(card, HP_BAND)
    if hp_crop.size:
        rois.append(_roi("hp", HP_BAND, hp_crop, "", 0.0))

    return rois


# on détecte la carte sur une copie réduite (contours rapides), puis on warpe
# depuis l'original pour garder la résolution pour l'OCR.
DETECT_MAX_W = 900


def _to_card(img: np.ndarray) -> tuple[np.ndarray, bool]:
    """Carte redressée en portrait + indicateur de détection. Si aucune carte
    isolée n'est trouvée, on redresse au moins l'image en portrait."""
    h, w = img.shape[:2]
    scale = DETECT_MAX_W / w if w > DETECT_MAX_W else 1.0
    small = (
        cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
        if scale < 1.0
        else img
    )

    box = _find_card_box(small)
    if box is not None:
        if scale < 1.0:
            box = box / scale  # coords détection -> pleine résolution
        return _warp_card(img, box), True

    upright = cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE) if w > h else img
    return _cap_width(upright), False


OSD_MIN_CONF = 1.5


def _orient_upright(card: np.ndarray) -> np.ndarray:
    """Redresse une carte à l'envers/de travers via Tesseract OSD. On ne tourne
    que si OSD est confiant, sinon on laisse tel quel."""
    if pytesseract is None or not HAS_OCR:
        return card
    try:
        osd = pytesseract.image_to_osd(card, output_type=Output.DICT)
    except Exception:
        return card

    if float(osd.get("orientation_conf", 0.0)) < OSD_MIN_CONF:
        return card

    # rotate = degrés horaires à appliquer pour redresser
    rotate = int(osd.get("rotate", 0)) % 360
    if rotate == 90:
        return cv2.rotate(card, cv2.ROTATE_90_CLOCKWISE)
    if rotate == 180:
        return cv2.rotate(card, cv2.ROTATE_180)
    if rotate == 270:
        return cv2.rotate(card, cv2.ROTATE_90_COUNTERCLOCKWISE)
    return card


# au-delà, le nom est jugé bien lu -> carte à l'endroit, on saute l'OSD (coûteux)
NAME_OK_CONF = 55.0


def _build_result(card: np.ndarray, detected: bool) -> dict:
    # si le nom sort proprement la carte est à l'endroit ; sinon on vérifie l'OSD
    name = _read_name_roi(card)
    if name[2] < NAME_OK_CONF:
        oriented = _orient_upright(card)
        if oriented is not card:
            card = oriented
            name = _read_name_roi(card)

    rois = _extract_rois(card, name=name)
    norm = _normalize(cv2.resize(card, (CARD_W, CARD_H)))
    # embedding CLIP de l'illustration -> recherche visuelle plein-catalogue
    emb = embed_artwork([card])
    return {
        "detected": detected,
        "engine": "opencv+tesseract" if rois and HAS_OCR else "opencv",
        "normalized_image": _encode_png(norm),
        "rois": rois,
        "embedding": emb[0] if emb else None,
    }


def preprocess(image_b64: str) -> dict:
    card, detected = _to_card(_decode(image_b64))
    return _build_result(card, detected)


def _sharpness(card: np.ndarray) -> float:
    """Netteté du haut de la carte (zone nom) via variance du Laplacien :
    discrimine les frames floues/bougées d'une rafale sans rien OCRiser."""
    gray = cv2.cvtColor(card, cv2.COLOR_BGR2GRAY)
    top = gray[: int(0.20 * gray.shape[0])]
    return float(cv2.Laplacian(top, cv2.CV_64F).var())


def _prepare_frame(image_b64: str):
    """Étape légère (pas d'OCR) : redresse la frame et la note. Sert à choisir
    la meilleure frame d'une rafale avant l'unique passe OCR."""
    try:
        card, detected = _to_card(_decode(image_b64))
        # carte détectée privilégiée d'office, puis départage par netteté
        score = _sharpness(card) + (1e6 if detected else 0.0)
        return {"card": card, "detected": detected, "score": score}
    except Exception:
        return None


_POOL = ThreadPoolExecutor(max_workers=min(8, (os.cpu_count() or 2)))


def preprocess_many(images_b64: list[str]) -> dict:
    """Rafale : on prépare les frames (léger, en parallèle), on garde la plus
    nette avec carte détectée, et on ne fait l'OCR (coûteux) QUE sur celle-là.
    Plus rapide et plus cohérent qu'OCRiser puis fusionner toutes les frames."""
    if not images_b64:
        raise ValueError("Aucune image fournie.")
    if len(images_b64) == 1:
        result = preprocess(images_b64[0])
        result["best_index"] = 0
        result["frame_count"] = 1
        return result

    prepared = list(_POOL.map(_prepare_frame, images_b64))
    valid = [(i, p) for i, p in enumerate(prepared) if p is not None]
    if not valid:
        raise ValueError("Toutes les frames ont échoué au prétraitement.")

    best_index, best = max(valid, key=lambda pair: pair[1]["score"])
    result = _build_result(best["card"], best["detected"])
    result["best_index"] = best_index
    result["frame_count"] = len(images_b64)
    return result

# Prétraitement des cartes avant OCR : détection + redressement, normalisation, ROI.

import base64
import math

import cv2
import numpy as np

# Carte cadrée. Ratio carte Pokémon ≈ 63/88 mm.
CARD_W = 600
CARD_H = 838

# En dessous de ce ratio d'aire, on considère que ce n'est pas la carte.
MIN_CARD_AREA_RATIO = 0.08

# Zones d'intérêt en fractions (x, y, largeur, hauteur).
ROI_LAYOUT = {
    "name": (0.14, 0.045, 0.62, 0.075),
    "hp": (0.70, 0.040, 0.26, 0.060),
    "number": (0.05, 0.915, 0.45, 0.060),
    "number_right": (0.52, 0.945, 0.45, 0.050),
}

# hauteur cible des crops ROI : agrandis pour que l'OCR lise le petit texte
ROI_TARGET_H = 160


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


def _warp_to_portrait(img: np.ndarray, box: np.ndarray) -> np.ndarray:
    """Redresse la carte et la ramène en portrait (carte couchée -> tournée)."""
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

    return cv2.resize(warped, (CARD_W, CARD_H))


def _normalize(card_bgr: np.ndarray) -> np.ndarray:
    # CLAHE pour rattraper les éclairages inégaux, puis débruitage léger.
    gray = cv2.cvtColor(card_bgr, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    equalized = clahe.apply(gray)
    return cv2.fastNlMeansDenoising(equalized, h=10)


def _extract_rois(norm: np.ndarray) -> list:
    h, w = norm.shape[:2]
    rois = []
    for key, (fx, fy, fw, fh) in ROI_LAYOUT.items():
        x, y = int(fx * w), int(fy * h)
        ww, hh = int(fw * w), int(fh * h)
        crop = norm[y : y + hh, x : x + ww]
        if crop.size == 0:
            continue
        scale = ROI_TARGET_H / crop.shape[0]
        if scale > 1:
            crop = cv2.resize(
                crop, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC
            )
        rois.append(
            {
                "key": key,
                "box": {"x": fx, "y": fy, "width": fw, "height": fh},
                "image": _encode_png(crop),
            }
        )
    return rois


def preprocess(image_b64: str) -> dict:
    img = _decode(image_b64)
    box = _find_card_box(img)
    detected = box is not None

    if detected:
        card = _warp_to_portrait(img, box)
    else:
        # pas de carte isolée : on redresse au moins en portrait avant de réduire
        upright = (
            cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
            if img.shape[1] > img.shape[0]
            else img
        )
        card = cv2.resize(upright, (CARD_W, CARD_H))

    norm = _normalize(card)

    return {
        "detected": detected,
        "engine": "opencv",
        "normalized_image": _encode_png(norm),
        "rois": _extract_rois(norm),
    }

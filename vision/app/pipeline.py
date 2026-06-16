# Prétraitement des cartes avant OCR : détection + redressement, normalisation, ROI.

import base64

import cv2
import numpy as np

# Carte cadrée. Ratio carte Pokémon ≈ 63/88 mm.
CARD_W = 600
CARD_H = 838

# En dessous de ce ratio d'aire, on considère que ce n'est pas la carte.
MIN_CARD_AREA_RATIO = 0.20

# Zones d'intérêt en fractions (x, y, largeur, hauteur).
ROI_LAYOUT = {
    "name": (0.06, 0.045, 0.70, 0.075),
    "hp": (0.70, 0.040, 0.26, 0.060),
    "number": (0.05, 0.915, 0.42, 0.060),
}


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


def _find_card_quad(img: np.ndarray):
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(gray, 50, 150)
    edges = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=1)

    contours, _ = cv2.findContours(
        edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )
    if not contours:
        return None

    img_area = float(w * h)
    # on ne garde que les plus gros contours, et le premier qui forme un quadrilatère
    for contour in sorted(contours, key=cv2.contourArea, reverse=True)[:5]:
        if cv2.contourArea(contour) < MIN_CARD_AREA_RATIO * img_area:
            continue
        peri = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
        if len(approx) == 4:
            return approx.reshape(4, 2).astype("float32")
    return None


def _warp(img: np.ndarray, quad: np.ndarray) -> np.ndarray:
    rect = _order_points(quad)
    dst = np.array(
        [[0, 0], [CARD_W - 1, 0], [CARD_W - 1, CARD_H - 1], [0, CARD_H - 1]],
        dtype="float32",
    )
    matrix = cv2.getPerspectiveTransform(rect, dst)
    return cv2.warpPerspective(img, matrix, (CARD_W, CARD_H))


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
    quad = _find_card_quad(img)
    detected = quad is not None

    # pas de carte détectée : on travaille sur l'image entière redimensionnée
    card = _warp(img, quad) if detected else cv2.resize(img, (CARD_W, CARD_H))
    norm = _normalize(card)

    return {
        "detected": detected,
        "engine": "opencv",
        "normalized_image": _encode_png(norm),
        "rois": _extract_rois(norm),
    }

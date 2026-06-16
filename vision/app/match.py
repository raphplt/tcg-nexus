# Désambiguïsation visuelle par features ORB : compare la carte scannée aux
# images catalogue des candidats. Robuste au gap photo<->catalogue (contrairement
# aux hash perceptuels). Aucun précalcul : on télécharge les candidats à la volée.

import urllib.request

import cv2
import numpy as np

from .pipeline import _decode, _find_card_box, _warp_to_portrait

# taille commune scan/catalogue pour comparer à échelle équivalente
_REF_SIZE = (245, 337)
_RATIO = 0.75  # test de Lowe

_orb = cv2.ORB_create(nfeatures=700)
_bf = cv2.BFMatcher(cv2.NORM_HAMMING)


def _art(gray: np.ndarray) -> np.ndarray:
    # fenêtre artwork (haut/milieu) : la partie qui distingue vraiment les cartes
    h, w = gray.shape
    return gray[int(0.08 * h) : int(0.55 * h), int(0.05 * w) : int(0.95 * w)]


def _descriptors(gray: np.ndarray):
    return _orb.detectAndCompute(_art(cv2.resize(gray, _REF_SIZE)), None)[1]


def _good_matches(d1, d2) -> int:
    if d1 is None or d2 is None:
        return 0
    good = 0
    for pair in _bf.knnMatch(d1, d2, k=2):
        if len(pair) == 2 and pair[0].distance < _RATIO * pair[1].distance:
            good += 1
    return good


def _download_gray(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": "tcg-nexus"})
    data = urllib.request.urlopen(req, timeout=15).read()
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    return None if img is None else cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)


def _scan_gray(image_b64: str) -> np.ndarray:
    img = _decode(image_b64)
    box = _find_card_box(img)
    if box is not None:
        warp = _warp_to_portrait(img, box)
    else:
        upright = (
            cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
            if img.shape[1] > img.shape[0]
            else img
        )
        warp = cv2.resize(upright, (600, 838))
    return cv2.cvtColor(warp, cv2.COLOR_BGR2GRAY)


def match(image_b64: str, candidates: list) -> list:
    scan_desc = _descriptors(_scan_gray(image_b64))
    results = []
    for cand in candidates:
        score = 0
        try:
            gray = _download_gray(cand["url"])
            if gray is not None:
                score = _good_matches(scan_desc, _descriptors(gray))
        except Exception:
            score = 0
        results.append({"id": cand["id"], "score": score})
    return results

# Embeddings d'images (OpenCLIP ViT-B/32) pour la recherche visuelle de cartes.

import cv2
import numpy as np

MODEL_NAME = "ViT-B-32"
PRETRAINED = "laion2b_s34b_b79k"
EMBED_DIM = 512

try:
    import open_clip
    import torch
    from PIL import Image

    _model, _, _preprocess = open_clip.create_model_and_transforms(
        MODEL_NAME, pretrained=PRETRAINED
    )
    _model.eval()
    HAS_CLIP = True
except Exception:  # pragma: no cover - dépend de l'environnement
    HAS_CLIP = False


def _to_pil(bgr: np.ndarray):
    return Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))


# Fenêtre de l'illustration sur une carte standard (sous le bandeau nom/PV,
# au-dessus du bloc d'attaques). C'est la zone la plus discriminante : le reste
# du gabarit (bordures, symboles d'énergie, textes) est commun à toutes les
# cartes et brouille la comparaison CLIP. On applique le MÊME crop côté
# catalogue et côté scan pour que les vecteurs soient comparables.
ARTWORK_BAND = (0.07, 0.115, 0.86, 0.42)


def artwork_crop(bgr: np.ndarray) -> np.ndarray:
    """Recadre la fenêtre d'illustration. Sur les full-arts l'illustration
    déborde de cette fenêtre, mais sa zone centrale reste l'élément distinctif."""
    h, w = bgr.shape[:2]
    fx, fy, fw, fh = ARTWORK_BAND
    x, y = int(fx * w), int(fy * h)
    crop = bgr[y : y + int(fh * h), x : x + int(fw * w)]
    return crop if crop.size else bgr


def embed_many(bgrs: list[np.ndarray]) -> list[list[float]]:
    """Vecteurs L2-normalisés (cosine via produit scalaire) pour une liste
    d'images BGR. Vide si le modèle n'a pas pu charger."""
    if not HAS_CLIP or not bgrs:
        return []
    batch = torch.stack([_preprocess(_to_pil(b)) for b in bgrs])
    with torch.no_grad():
        feats = _model.encode_image(batch)
        feats = feats / feats.norm(dim=-1, keepdim=True)
    return feats.cpu().tolist()


def embed_artwork(bgrs: list[np.ndarray]) -> list[list[float]]:
    """Embeddings sur la seule fenêtre d'illustration (recherche visuelle)."""
    return embed_many([artwork_crop(b) for b in bgrs])

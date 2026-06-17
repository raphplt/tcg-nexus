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

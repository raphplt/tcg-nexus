import cv2
import numpy as np
from PIL import Image

MODEL_NAME = "ViT-B-32"
PRETRAINED = "laion2b_s34b_b79k"
EMBED_DIM = 512

_model = None
_preprocess = None
torch = None

try:
    import open_clip
    import torch

    torch.set_num_threads(1)

    _model, _, _preprocess = open_clip.create_model_and_transforms(
        MODEL_NAME, pretrained=PRETRAINED
    )
    _model.eval()
    HAS_CLIP = True
except Exception:
    HAS_CLIP = False


def _to_pil(bgr: np.ndarray):
    return Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))


ARTWORK_BAND = (0.07, 0.115, 0.86, 0.42)


def artwork_crop(bgr: np.ndarray) -> np.ndarray:
    """Crops the illustration window. On full-art cards the illustration
    extends beyond this window, but its central zone remains the distinct feature."""
    height, width = bgr.shape[:2]
    frac_x, frac_y, frac_w, frac_h = ARTWORK_BAND
    start_x, start_y = int(frac_x * width), int(frac_y * height)
    crop = bgr[
        start_y : start_y + int(frac_h * height),
        start_x : start_x + int(frac_w * width),
    ]
    return crop if crop.size else bgr


def embed_many(bgrs: list[np.ndarray]) -> list[list[float]]:
    """Returns L2-normalized vectors (cosine distance via dot product) for a list
    of BGR images. Returns empty list if CLIP model is not available."""
    if not HAS_CLIP or not bgrs:
        return []
    batch = torch.stack([_preprocess(_to_pil(img_bgr)) for img_bgr in bgrs])
    with torch.no_grad():
        feats = _model.encode_image(batch)
        feats = feats / feats.norm(dim=-1, keepdim=True)
    return feats.cpu().tolist()


def embed_artwork(bgrs: list[np.ndarray]) -> list[list[float]]:
    """Generates embeddings exclusively on the artwork crop window."""
    return embed_many([artwork_crop(img_bgr) for img_bgr in bgrs])


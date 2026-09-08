import unittest
from unittest.mock import MagicMock, patch

import numpy as np
from PIL import Image

from app import embed
from app.embed import _to_pil, artwork_crop, embed_artwork, embed_many


class TestEmbed(unittest.TestCase):
    def setUp(self):
        self.sample_bgr = np.full((400, 300, 3), 120, dtype=np.uint8)

    def test_to_pil(self):
        pil_img = _to_pil(self.sample_bgr)
        self.assertIsInstance(pil_img, Image.Image)
        self.assertEqual(pil_img.size, (300, 400))  # width, height

    def test_artwork_crop_normal(self):
        cropped = artwork_crop(self.sample_bgr)
        self.assertLess(cropped.shape[0], self.sample_bgr.shape[0])
        self.assertLess(cropped.shape[1], self.sample_bgr.shape[1])
        self.assertGreater(cropped.size, 0)

    def test_artwork_crop_empty(self):
        empty = np.zeros((0, 0, 3), dtype=np.uint8)
        result = artwork_crop(empty)
        self.assertEqual(result.size, 0)

    def test_embed_many_empty_or_no_clip(self):
        self.assertEqual(embed_many([]), [])

        with patch.object(embed, "HAS_CLIP", False):
            self.assertEqual(embed_many([self.sample_bgr]), [])

    def test_embed_many_with_clip(self):
        mock_torch = MagicMock()
        mock_torch.stack.return_value = MagicMock()
        mock_torch.no_grad.return_value.__enter__ = MagicMock()
        mock_torch.no_grad.return_value.__exit__ = MagicMock()

        mock_model = MagicMock()
        mock_preprocess = MagicMock()

        # Mock tensor outputs
        class MockTensor:
            def norm(self, dim=-1, keepdim=True):
                return self

            def __truediv__(self, other):
                return self

            def cpu(self):
                return self

            def tolist(self):
                return [[0.1, 0.2, 0.3]]

        mock_model.encode_image.return_value = MockTensor()
        mock_preprocess.return_value = MagicMock()

        with patch.object(embed, "HAS_CLIP", True), \
             patch.object(embed, "torch", mock_torch), \
             patch.object(embed, "_model", mock_model), \
             patch.object(embed, "_preprocess", mock_preprocess):
            vectors = embed_many([self.sample_bgr])
            self.assertEqual(vectors, [[0.1, 0.2, 0.3]])

    def test_embed_artwork(self):
        with patch("app.embed.embed_many") as mock_embed_many:
            mock_embed_many.return_value = [[0.5] * 512]
            res = embed_artwork([self.sample_bgr])
            self.assertEqual(res, [[0.5] * 512])
            mock_embed_many.assert_called_once()


if __name__ == "__main__":
    unittest.main()

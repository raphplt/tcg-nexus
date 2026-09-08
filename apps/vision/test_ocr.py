import unittest
from unittest.mock import MagicMock, patch

import cv2
import numpy as np

from app import ocr
from app.ocr import (
    _best_attempt,
    _name_attempt,
    _name_tokens,
    _number_attempt,
    _resize_h,
    _variants,
    _words,
    read_name,
    read_number,
)


class TestOcr(unittest.TestCase):
    def setUp(self):
        self.sample_gray = np.full((100, 150), 128, dtype=np.uint8)
        self.sample_bgr = np.full((100, 150, 3), 128, dtype=np.uint8)

    def test_resize_h_upscale_and_downscale(self):
        # Upscale
        small = np.full((50, 50), 128, dtype=np.uint8)
        resized_up = _resize_h(small, target_h=200)
        self.assertEqual(resized_up.shape[0], 200)

        # Downscale
        large = np.full((400, 400), 128, dtype=np.uint8)
        resized_down = _resize_h(large, target_h=200)
        self.assertEqual(resized_down.shape[0], 200)

    def test_variants_bgr_and_gray(self):
        variants_bgr = _variants(self.sample_bgr, target_h=100)
        self.assertEqual(len(variants_bgr), 5)

        variants_gray = _variants(self.sample_gray, target_h=100)
        self.assertEqual(len(variants_gray), 5)

    @patch("app.ocr.pytesseract.image_to_data")
    def test_words_success(self, mock_image_to_data):
        mock_image_to_data.return_value = {
            "text": ["Pikachu", "", "   ", "Thunder"],
            "conf": ["95", "-1", "80", "85"],
        }
        words = _words(self.sample_gray, psm=7, whitelist="abc")
        self.assertEqual(words, [("Pikachu", 95), ("Thunder", 85)])

    @patch("app.ocr.pytesseract.image_to_data", side_effect=Exception("OCR failure"))
    def test_words_exception(self, mock_image_to_data):
        words = _words(self.sample_gray, psm=7)
        self.assertEqual(words, [])

    def test_name_tokens(self):
        tokens = _name_tokens("Pikachu PV 60 Basic Trainer Dracaufeu")
        self.assertIn("Pikachu", tokens)
        self.assertIn("Dracaufeu", tokens)
        # Noise should be filtered
        self.assertNotIn("PV", tokens)
        self.assertNotIn("Basic", tokens)
        self.assertNotIn("Trainer", tokens)

    @patch("app.ocr._words")
    def test_name_attempt(self, mock_words):
        mock_words.return_value = [("Charizard", 90), ("EX", 95)]
        text, conf = _name_attempt(self.sample_gray, psm=7)
        self.assertEqual(text, "Charizard")
        self.assertAlmostEqual(conf, 90.0)

        # No valid tokens
        mock_words.return_value = [("EX", 95)]
        text_empty, conf_empty = _name_attempt(self.sample_gray, psm=7)
        self.assertEqual(text_empty, "")
        self.assertEqual(conf_empty, 0.0)

    @patch("app.ocr._words")
    def test_number_attempt(self, mock_words):
        mock_words.return_value = [("Card", 80), ("058/102", 90)]
        text, conf = _number_attempt(self.sample_gray, psm=7)
        self.assertEqual(text, "058/102")
        self.assertAlmostEqual(conf, 85.0)

        # No number match
        mock_words.return_value = [("Card", 80)]
        text_none, conf_none = _number_attempt(self.sample_gray, psm=7)
        self.assertEqual(text_none, "")
        self.assertEqual(conf_none, 0.0)

    def test_best_attempt_empty_crop(self):
        empty = np.zeros((0, 0), dtype=np.uint8)
        self.assertEqual(_best_attempt(empty, _name_attempt), ("", 0.0))

    def test_best_attempt_no_tesseract(self):
        with patch.object(ocr, "HAS_TESSERACT", False):
            self.assertEqual(_best_attempt(self.sample_gray, _name_attempt), ("", 0.0))

    def test_read_name_and_number_wiring(self):
        with patch("app.ocr._best_attempt") as mock_best:
            mock_best.return_value = ("Gengar", 92.5)
            self.assertEqual(read_name(self.sample_gray), ("Gengar", 92.5))
            mock_best.assert_called_once()

        with patch("app.ocr._best_attempt") as mock_best:
            mock_best.return_value = ("94/165", 88.0)
            self.assertEqual(read_number(self.sample_gray), ("94/165", 88.0))
            mock_best.assert_called_once()


if __name__ == "__main__":
    unittest.main()

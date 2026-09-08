import base64
import unittest
from unittest.mock import MagicMock, patch

import cv2
import numpy as np

from app.match import (
    _art,
    _descriptors,
    _download_gray,
    _good_matches,
    _scan_gray,
    match,
)


def _encode_image_b64(img: np.ndarray) -> str:
    ok, buf = cv2.imencode(".png", img)
    return base64.b64encode(buf.tobytes()).decode("ascii")


class TestMatch(unittest.TestCase):
    def setUp(self):
        self.sample_gray = np.full((300, 200), 128, dtype=np.uint8)
        # Add some distinct features for ORB
        cv2.rectangle(self.sample_gray, (30, 30), (170, 270), 0, 2)
        cv2.circle(self.sample_gray, (100, 150), 25, 255, -1)

    def test_art_crop(self):
        art_region = _art(self.sample_gray)
        self.assertTrue(art_region.size > 0)
        self.assertLess(art_region.shape[0], self.sample_gray.shape[0])
        self.assertLess(art_region.shape[1], self.sample_gray.shape[1])

    def test_descriptors(self):
        descriptors = _descriptors(self.sample_gray)
        # ORB should detect keypoints on the circle/rectangle features
        self.assertIsNotNone(descriptors)
        self.assertGreater(len(descriptors), 0)

    def test_good_matches(self):
        # When descriptors are None
        self.assertEqual(_good_matches(None, None), 0)
        self.assertEqual(_good_matches(np.zeros((5, 32), dtype=np.uint8), None), 0)
        self.assertEqual(_good_matches(None, np.zeros((5, 32), dtype=np.uint8)), 0)

        # Same descriptors should have high match count
        desc = _descriptors(self.sample_gray)
        if desc is not None and len(desc) >= 2:
            score = _good_matches(desc, desc)
            self.assertGreaterEqual(score, 1)

    @patch("app.match.assert_safe_url")
    @patch("urllib.request.urlopen")
    def test_download_gray_success(self, mock_urlopen, mock_assert_safe):
        color_img = np.full((100, 100, 3), 200, dtype=np.uint8)
        _, encoded = cv2.imencode(".png", color_img)

        mock_response = MagicMock()
        mock_response.geturl.return_value = "https://example.com/card.png"
        mock_response.read.return_value = encoded.tobytes()
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response

        result = _download_gray("https://example.com/card.png")
        self.assertIsNotNone(result)
        self.assertEqual(result.shape, (100, 100))

    @patch("app.match.assert_safe_url")
    @patch("urllib.request.urlopen")
    def test_download_gray_exceeds_max_bytes(self, mock_urlopen, mock_assert_safe):
        mock_response = MagicMock()
        mock_response.geturl.return_value = "https://example.com/huge.png"
        mock_response.read.return_value = b"x" * (10 * 1024 * 1024 + 2)
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response

        result = _download_gray("https://example.com/huge.png")
        self.assertIsNone(result)

    @patch("app.match.assert_safe_url")
    @patch("urllib.request.urlopen")
    def test_download_gray_corrupt_data(self, mock_urlopen, mock_assert_safe):
        mock_response = MagicMock()
        mock_response.geturl.return_value = "https://example.com/corrupt.png"
        mock_response.read.return_value = b"corrupt-image-data"
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response

        result = _download_gray("https://example.com/corrupt.png")
        self.assertIsNone(result)

    def test_scan_gray_with_card_detected(self):
        # Synthetic card with strong borders
        img = np.full((900, 700, 3), 30, np.uint8)
        cv2.rectangle(img, (90, 70), (610, 820), (240, 240, 240), -1)
        image_b64 = _encode_image_b64(img)

        gray = _scan_gray(image_b64)
        self.assertIsNotNone(gray)
        self.assertEqual(len(gray.shape), 2)

    def test_scan_gray_without_card_detected(self):
        # Plain uniform image where no card box is found
        img = np.full((500, 800, 3), 100, np.uint8)
        image_b64 = _encode_image_b64(img)

        gray = _scan_gray(image_b64)
        self.assertIsNotNone(gray)
        self.assertEqual(gray.shape, (838, 600))

    @patch("app.match._download_gray")
    def test_match_candidates(self, mock_download):
        # One valid candidate and one failing candidate
        mock_download.side_effect = [self.sample_gray, Exception("Network error")]

        img = np.full((900, 700, 3), 30, np.uint8)
        cv2.rectangle(img, (90, 70), (610, 820), (240, 240, 240), -1)
        image_b64 = _encode_image_b64(img)

        candidates = [
            {"id": "card-ok", "url": "https://example.com/ok.png"},
            {"id": "card-fail", "url": "https://example.com/fail.png"},
        ]

        results = match(image_b64, candidates)
        self.assertEqual(len(results), 2)
        self.assertEqual(results[0]["id"], "card-ok")
        self.assertEqual(results[1]["id"], "card-fail")
        self.assertEqual(results[1]["score"], 0)


if __name__ == "__main__":
    unittest.main()

import base64
import unittest
from unittest.mock import MagicMock, patch

import cv2
import numpy as np
from app import pipeline
from app.pipeline import (
    MAX_WARP_W,
    _build_result,
    _cap_width,
    _card_contours,
    _crop,
    _decode,
    _encode_png,
    _extract_rois,
    _find_card_box,
    _normalize,
    _order_points,
    _orient_upright,
    _prepare_frame,
    _read_name_roi,
    _roi,
    _sharpness,
    _tighten_to_card,
    _to_card,
    _warp_card,
    preprocess_many,
)


def _encode_b64(img: np.ndarray) -> str:
    ok, buf = cv2.imencode(".png", img)
    return base64.b64encode(buf.tobytes()).decode("ascii")


class TestPipeline(unittest.TestCase):
    def setUp(self):
        self.sample_card = np.full((900, 700, 3), 30, np.uint8)
        cv2.rectangle(self.sample_card, (90, 70), (610, 820), (240, 240, 240), -1)
        cv2.putText(
            self.sample_card,
            "Pikachu",
            (120, 140),
            cv2.FONT_HERSHEY_SIMPLEX,
            1.4,
            (10, 10, 10),
            3,
        )
        cv2.putText(
            self.sample_card,
            "58/102",
            (120, 790),
            cv2.FONT_HERSHEY_SIMPLEX,
            1.0,
            (10, 10, 10),
            2,
        )
        self.sample_b64 = _encode_b64(self.sample_card)

    def test_decode_valid_and_invalid(self):
        img = _decode(self.sample_b64)
        self.assertIsNotNone(img)
        self.assertEqual(img.shape[0], 900)

        with self.assertRaises(ValueError):
            _decode("invalid-base-64-corrupt")

    def test_encode_png(self):
        encoded = _encode_png(self.sample_card)
        self.assertIsInstance(encoded, str)
        self.assertGreater(len(encoded), 10)

        with patch("cv2.imencode", return_value=(False, None)):
            with self.assertRaises(ValueError):
                _encode_png(self.sample_card)

    def test_order_points(self):
        points = np.array([[100, 200], [0, 0], [200, 0], [0, 200]], dtype="float32")
        ordered = _order_points(points)
        self.assertEqual(ordered.shape, (4, 2))
        # Top-left should be (0, 0)
        np.testing.assert_array_equal(ordered[0], [0, 0])

    def test_card_contours(self):
        contours = _card_contours(self.sample_card)
        self.assertIsInstance(contours, list)
        self.assertGreater(len(contours), 0)

    def test_find_card_box(self):
        box = _find_card_box(self.sample_card)
        self.assertIsNotNone(box)
        self.assertEqual(box.shape, (4, 2))

        # Uniform empty background -> no card found
        empty = np.full((300, 300, 3), 128, dtype=np.uint8)
        self.assertIsNone(_find_card_box(empty))

    def test_warp_card(self):
        box = _find_card_box(self.sample_card)
        warped = _warp_card(self.sample_card, box)
        self.assertIsNotNone(warped)
        self.assertGreater(warped.shape[0], warped.shape[1])  # Portrait orientation

    def test_cap_width(self):
        wide_img = np.full((800, 1500, 3), 128, dtype=np.uint8)
        capped = _cap_width(wide_img)
        self.assertEqual(capped.shape[1], MAX_WARP_W)

        small_img = np.full((800, 500, 3), 128, dtype=np.uint8)
        self.assertEqual(_cap_width(small_img).shape[1], 500)

    def test_tighten_to_card_empty_or_normal(self):
        empty = np.zeros((0, 0, 3), dtype=np.uint8)
        self.assertEqual(_tighten_to_card(empty).size, 0)

        # Card with borders that can be tightened
        tight = _tighten_to_card(self.sample_card)
        self.assertIsNotNone(tight)

    def test_normalize(self):
        norm = _normalize(self.sample_card)
        self.assertEqual(norm.shape[:2], self.sample_card.shape[:2])

    def test_crop_and_roi(self):
        band = (0.1, 0.1, 0.5, 0.5)
        cropped = _crop(self.sample_card, band)
        self.assertGreater(cropped.size, 0)

        roi_data = _roi("test_key", band, cropped, "Pikachu", 95.0)
        self.assertEqual(roi_data["key"], "test_key")
        self.assertEqual(roi_data["text"], "Pikachu")
        self.assertEqual(roi_data["conf"], 95.0)

    def test_read_name_roi(self):
        crop, text, conf = _read_name_roi(self.sample_card)
        self.assertIsNotNone(crop)

        empty_card = np.zeros((0, 0, 3), dtype=np.uint8)
        crop_empty, text_empty, conf_empty = _read_name_roi(empty_card)
        self.assertIsNone(crop_empty)
        self.assertEqual(text_empty, "")

    def test_extract_rois(self):
        rois = _extract_rois(self.sample_card)
        self.assertIsInstance(rois, list)
        self.assertGreater(len(rois), 0)

    def test_to_card(self):
        # Detectable card
        card, detected = _to_card(self.sample_card)
        self.assertTrue(detected)
        self.assertIsNotNone(card)

        # Non-detectable uniform image
        flat = np.full((400, 600, 3), 128, dtype=np.uint8)
        card_flat, detected_flat = _to_card(flat)
        self.assertFalse(detected_flat)
        # Should be rotated to portrait because width > height
        self.assertGreaterEqual(card_flat.shape[0], card_flat.shape[1])

    def test_orient_upright(self):
        # When pytesseract is None or HAS_OCR is False
        with patch.object(pipeline, "HAS_OCR", False):
            self.assertEqual(
                _orient_upright(self.sample_card).shape, self.sample_card.shape
            )

        # When image_to_osd throws
        with patch(
            "app.pipeline.pytesseract.image_to_osd", side_effect=Exception("OSD error")
        ):
            self.assertEqual(
                _orient_upright(self.sample_card).shape, self.sample_card.shape
            )

        # When orientation confidence is too low
        with patch(
            "app.pipeline.pytesseract.image_to_osd",
            return_value={"orientation_conf": 0.5, "rotate": 90},
        ):
            self.assertEqual(
                _orient_upright(self.sample_card).shape, self.sample_card.shape
            )

        # When rotate is 90, 180, 270
        for angle in [90, 180, 270]:
            with patch(
                "app.pipeline.pytesseract.image_to_osd",
                return_value={"orientation_conf": 5.0, "rotate": angle},
            ):
                rotated = _orient_upright(self.sample_card)
                self.assertIsNotNone(rotated)

    def test_build_result_and_flip(self):
        # Low confidence name triggers 180 flip
        with patch("app.pipeline._read_name_roi") as mock_read_name:
            mock_read_name.side_effect = [
                (self.sample_card, "Unknown", 30.0),  # initial low confidence
                (self.sample_card, "Pikachu", 85.0),  # flipped high confidence
            ]
            res = _build_result(self.sample_card, detected=True)
            self.assertTrue(res["detected"])

    def test_sharpness(self):
        sharp = _sharpness(self.sample_card)
        self.assertIsInstance(sharp, float)

    def test_prepare_frame(self):
        prep = _prepare_frame(self.sample_b64)
        self.assertIsNotNone(prep)
        self.assertIn("card", prep)
        self.assertIn("detected", prep)
        self.assertIn("score", prep)

        # Corrupt b64 -> returns None
        self.assertIsNone(_prepare_frame("not-valid-b64"))

    def test_preprocess_many(self):
        # Empty list -> raises ValueError
        with self.assertRaises(ValueError):
            preprocess_many([])

        # Single image
        res_single = preprocess_many([self.sample_b64])
        self.assertEqual(res_single["frame_count"], 1)
        self.assertEqual(res_single["best_index"], 0)

        # Multiple images
        res_multi = preprocess_many([self.sample_b64, self.sample_b64])
        self.assertEqual(res_multi["frame_count"], 2)

        # All frames invalid -> raises ValueError
        with self.assertRaises(ValueError):
            preprocess_many(["bad-frame-1", "bad-frame-2"])


if __name__ == "__main__":
    unittest.main()

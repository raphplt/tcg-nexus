import base64
import unittest

try:
    import cv2
    import numpy as np
    from app.pipeline import preprocess
    HAS_DEPS = True
except ImportError:
    HAS_DEPS = False


class TestPipeline(unittest.TestCase):
    @unittest.skipUnless(HAS_DEPS, "OpenCV and numpy required for pipeline tests")
    def test_preprocess_synthetic_card(self):
        img = np.full((900, 700, 3), 30, np.uint8)
        cv2.rectangle(img, (90, 70), (610, 820), (240, 240, 240), -1)
        cv2.putText(img, "Pikachu", (120, 140), cv2.FONT_HERSHEY_SIMPLEX, 1.4, (10, 10, 10), 3)
        cv2.putText(img, "58/102", (120, 790), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (10, 10, 10), 2)

        ok, buf = cv2.imencode(".jpg", img)
        self.assertTrue(ok)
        image_b64 = base64.b64encode(buf.tobytes()).decode("ascii")

        result = preprocess(image_b64)
        self.assertIn("detected", result)
        self.assertIn("engine", result)
        self.assertIn("normalized_image", result)
        self.assertIn("rois", result)


if __name__ == "__main__":
    unittest.main()

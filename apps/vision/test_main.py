import base64
import unittest
from unittest.mock import patch

import cv2
import numpy as np
from app.main import app
from fastapi.testclient import TestClient


def _create_test_image_b64() -> str:
    image = np.full((300, 200, 3), 128, dtype=np.uint8)
    ok, buffer = cv2.imencode(".png", image)
    return base64.b64encode(buffer.tobytes()).decode("ascii")


class TestMainApi(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.test_b64 = _create_test_image_b64()

    def test_health_endpoint(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_preprocess_endpoint_success(self):
        response = self.client.post("/preprocess", json={"image": self.test_b64})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("detected", data)
        self.assertIn("rois", data)

    def test_preprocess_endpoint_invalid_image(self):
        response = self.client.post(
            "/preprocess", json={"image": "invalid_base64_string"}
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.json())

    def test_preprocess_batch_endpoint_success(self):
        response = self.client.post(
            "/preprocess-batch", json={"images": [self.test_b64, self.test_b64]}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get("frame_count"), 2)

    def test_preprocess_batch_endpoint_empty(self):
        response = self.client.post("/preprocess-batch", json={"images": []})
        self.assertEqual(response.status_code, 400)

    @patch("app.main.match")
    def test_match_endpoint(self, mock_match):
        mock_match.return_value = [{"id": "card-1", "score": 42}]
        response = self.client.post(
            "/match",
            json={
                "image": self.test_b64,
                "candidates": [
                    {"id": "card-1", "url": "https://example.com/card1.png"}
                ],
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"results": [{"id": "card-1", "score": 42}]})

    def test_embed_endpoint_success(self):
        response = self.client.post("/embed", json={"images": [self.test_b64]})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("embeddings", data)

    def test_embed_endpoint_invalid_image(self):
        response = self.client.post("/embed", json={"images": ["not-valid-b64"]})
        self.assertEqual(response.status_code, 400)

    def test_middleware_payload_too_large(self):
        headers = {"content-length": str(40 * 1024 * 1024)}
        response = self.client.post(
            "/preprocess",
            json={"image": self.test_b64},
            headers=headers,
        )
        self.assertEqual(response.status_code, 413)

    def test_middleware_api_key_auth(self):
        with patch("app.main._API_KEY", "secret-test-key"):
            # Without key -> 401
            response = self.client.post("/preprocess", json={"image": self.test_b64})
            self.assertEqual(response.status_code, 401)

            # With wrong key -> 401
            response = self.client.post(
                "/preprocess",
                json={"image": self.test_b64},
                headers={"x-vision-key": "wrong-key"},
            )
            self.assertEqual(response.status_code, 401)

            # With valid key -> 200
            response = self.client.post(
                "/preprocess",
                json={"image": self.test_b64},
                headers={"x-vision-key": "secret-test-key"},
            )
            self.assertEqual(response.status_code, 200)

            # Health is public -> 200 without key
            health_res = self.client.get("/health")
            self.assertEqual(health_res.status_code, 200)

    def test_direct_endpoint_function_calls(self):
        from app.main import (
            EmbedRequest,
            MatchRequest,
            PreprocessBatchRequest,
            PreprocessRequest,
            embed_endpoint,
            health,
            match_endpoint,
            preprocess_batch_endpoint,
            preprocess_endpoint,
        )
        from fastapi import HTTPException

        self.assertEqual(health(), {"status": "ok"})

        res_prep = preprocess_endpoint(PreprocessRequest(image=self.test_b64))
        self.assertIn("detected", res_prep)

        with self.assertRaises(HTTPException):
            preprocess_endpoint(PreprocessRequest(image="bad-image-b64"))

        res_batch = preprocess_batch_endpoint(
            PreprocessBatchRequest(images=[self.test_b64])
        )
        self.assertEqual(res_batch["frame_count"], 1)

        with self.assertRaises(HTTPException):
            preprocess_batch_endpoint(PreprocessBatchRequest(images=[]))

        res_match = match_endpoint(MatchRequest(image=self.test_b64, candidates=[]))
        self.assertEqual(res_match, {"results": []})

        res_embed = embed_endpoint(EmbedRequest(images=[self.test_b64]))
        self.assertIn("embeddings", res_embed)

        with self.assertRaises(HTTPException):
            embed_endpoint(EmbedRequest(images=["bad-image-b64"]))


if __name__ == "__main__":
    unittest.main()

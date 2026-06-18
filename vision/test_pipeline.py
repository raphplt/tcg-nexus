# smoke test : carte synthétique -> preprocess()

import base64

import cv2
import numpy as np

from app.pipeline import preprocess

# fond sombre + carte claire + un peu de texte
img = np.full((900, 700, 3), 30, np.uint8)
cv2.rectangle(img, (90, 70), (610, 820), (240, 240, 240), -1)
cv2.putText(img, "Pikachu", (120, 140), cv2.FONT_HERSHEY_SIMPLEX, 1.4, (10, 10, 10), 3)
cv2.putText(img, "58/102", (120, 790), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (10, 10, 10), 2)

ok, buf = cv2.imencode(".jpg", img)
image_b64 = base64.b64encode(buf.tobytes()).decode("ascii")

result = preprocess(image_b64)
print("detected:", result["detected"])
print("engine:", result["engine"])
print("normalized_image bytes:", len(base64.b64decode(result["normalized_image"])))
print("rois:", [(r["key"], r["box"]) for r in result["rois"]])

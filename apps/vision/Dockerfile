FROM python:3.11-slim

WORKDIR /app

# libglib2.0-0 : runtime OpenCV. tesseract-ocr (+ eng/fra) : OCR natif des ROI.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libglib2.0-0 \
        tesseract-ocr \
        tesseract-ocr-eng \
        tesseract-ocr-fra \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Recherche visuelle (CLIP) : torch CPU only (évite le CUDA), puis open_clip.
RUN pip install --no-cache-dir torch==2.5.1 torchvision==0.20.1 \
        --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir open_clip_torch==2.30.0
# poids ViT-B/32 embarqués dans l'image (pas de téléchargement au runtime)
RUN python -c "import open_clip; open_clip.create_model_and_transforms('ViT-B-32', pretrained='laion2b_s34b_b79k')"

COPY app ./app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

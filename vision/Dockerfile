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

COPY app ./app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

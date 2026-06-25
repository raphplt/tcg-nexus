FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && mkdir -p /app/tessdata \
    && curl -fsSL -o /app/tessdata/eng.traineddata.gz https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz \
    && curl -fsSL -o /app/tessdata/fra.traineddata.gz https://tessdata.projectnaptha.com/4.0.0/fra.traineddata.gz \
    && apt-get purge -y curl \
    && rm -rf /var/lib/apt/lists/*
ENV OCR_LANG_PATH=/app/tessdata

COPY package*.json /app/
COPY apps/api/package*.json /app/apps/api/
COPY packages/scan-contract /app/packages/scan-contract
RUN npm ci --workspace=api

COPY apps/api /app/apps/api
RUN mkdir -p /app/data

WORKDIR /app/apps/api
RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "start:prod"]

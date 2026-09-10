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
COPY packages/pokemon-dataset /app/packages/pokemon-dataset
RUN npm ci --workspace=api

RUN npx tsc -p packages/pokemon-dataset/tsconfig.build.json

COPY apps/api /app/apps/api

COPY data /app/data

ENV TCG_DATA_DIR=/app/data

WORKDIR /app/apps/api
RUN npm run build
RUN node -e "require('./dist/main.js')" \
    || (echo "ERREUR: dist/main.js ne se charge pas (voir la trace ci-dessus)" \
        && exit 1)

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=5 \
    CMD node -e "require('http').get('http://127.0.0.1:3001/api/health/live',(response)=>process.exit(response.statusCode<500?0:1)).on('error',()=>process.exit(1))"

CMD ["npm", "run", "start:prod"]

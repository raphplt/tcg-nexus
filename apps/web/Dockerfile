FROM node:20-bookworm-slim

WORKDIR /app

# Copy root package files
COPY package*.json /app/

# Copy workspace package.json files
COPY apps/web/package*.json /app/apps/web/
COPY packages/ui/package*.json /app/packages/ui/
COPY packages/typescript-config/package*.json /app/packages/typescript-config/

# Install dependencies only for the web workspace
RUN npm ci --workspace=web

# Copy source files
COPY apps/web /app/apps/web
COPY packages/ui /app/packages/ui
COPY packages/typescript-config /app/packages/typescript-config

# Copy configs from root
COPY tsconfig.json /app/
COPY turbo.json /app/

RUN if [ -f .env ]; then cp .env apps/web/.env; fi

RUN npm run build --workspace=web

WORKDIR /app/apps/web

EXPOSE 3000

CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]


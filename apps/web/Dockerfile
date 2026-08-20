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

RUN if [ -f .env ]; then cp .env apps/web/.env; fi

# Next.js inlines NEXT_PUBLIC_* into the client bundle at build time: they must
# be present here, not only at runtime through env_file.
ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_SEALED_CDN_URL
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_SEALED_CDN_URL=$NEXT_PUBLIC_SEALED_CDN_URL \
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

RUN npm run build --workspace=web

WORKDIR /app/apps/web

EXPOSE 3000

CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]


FROM node:20-bookworm-slim AS dependencies

WORKDIR /app

COPY package*.json /app/
COPY apps/web/package*.json /app/apps/web/
COPY packages/ui/package*.json /app/packages/ui/
COPY packages/typescript-config/package*.json /app/packages/typescript-config/

RUN npm ci --workspace=web

FROM dependencies AS builder

COPY apps/web /app/apps/web
COPY packages/ui /app/packages/ui
COPY packages/typescript-config /app/packages/typescript-config

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

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build --workspace=web

FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public /app/apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone /app/
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static /app/apps/web/.next/static

WORKDIR /app/apps/web

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]

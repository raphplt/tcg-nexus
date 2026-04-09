FROM node:20-alpine

WORKDIR /app

ENV NUXT_TELEMETRY_DISABLED=1 \
    NUXT_UI_TELEMETRY_DISABLED=1

RUN apk add --no-cache libc6-compat

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install

COPY . .

EXPOSE 3000

CMD ["pnpm", "dev", "--host", "0.0.0.0", "--port", "3000"]

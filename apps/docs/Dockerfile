FROM node:20-bookworm-slim AS builder

WORKDIR /app

ARG DOCS_URL=https://docs.tcg-nexus.org
ARG SWAGGER_URL=https://api.tcg-nexus.org/api/docs
ENV DOCS_URL=$DOCS_URL
ENV SWAGGER_URL=$SWAGGER_URL

COPY package*.json /app/
COPY apps/docs/package*.json /app/apps/docs/

RUN npm ci --workspace=apps-docs

COPY apps/docs /app/apps/docs

RUN npm run build --workspace=apps-docs

FROM nginx:1.27-alpine AS runner

COPY --from=builder /app/apps/docs/build /usr/share/nginx/html

RUN sed -i 's/listen       80;/listen       3002;/' /etc/nginx/conf.d/default.conf

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3002/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

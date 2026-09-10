FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package*.json /app/
COPY apps/docs/package*.json /app/apps/docs/

RUN npm ci --workspace=apps-docs

COPY apps/docs /app/apps/docs

RUN npm run build --workspace=apps-docs

FROM nginx:1.27-alpine AS runner

COPY --from=builder /app/apps/docs/build /usr/share/nginx/html

RUN sed -i 's/listen       80;/listen       3002;/' /etc/nginx/conf.d/default.conf

EXPOSE 3002

CMD ["nginx", "-g", "daemon off;"]

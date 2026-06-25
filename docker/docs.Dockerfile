FROM node:20-bookworm-slim AS docs-builder

WORKDIR /app

COPY . /app

RUN npm ci
RUN npm run build --workspace=apps-docs

FROM nginx:alpine

COPY --from=docs-builder /app/apps/docs/build /usr/share/nginx/html
COPY docker/docs.nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3002

CMD ["nginx", "-g", "daemon off;"]

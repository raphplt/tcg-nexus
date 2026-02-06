FROM node:20-bookworm-slim

WORKDIR /app

COPY apps/api/package*.json /app/apps/api/
WORKDIR /app/apps/api
RUN npm ci

COPY apps/api /app/apps/api

RUN npm run build
RUN npm prune --omit=dev

EXPOSE 3001

CMD ["npm", "run", "start:prod"]

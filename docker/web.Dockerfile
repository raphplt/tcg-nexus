FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json turbo.json /app/
COPY apps/web/package*.json /app/apps/web/
COPY packages/ui/package*.json /app/packages/ui/
COPY packages/eslint-config/package*.json /app/packages/eslint-config/
COPY packages/typescript-config/package*.json /app/packages/typescript-config/

RUN npm ci

COPY . /app

RUN npm run build --workspace=web

WORKDIR /app/apps/web

EXPOSE 3000

CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]

FROM node:20-bookworm-slim

WORKDIR /app

COPY . /app
RUN if [ -f .env ]; then cp .env apps/web/.env; fi

RUN npm ci
RUN npm run build --workspace=web

WORKDIR /app/apps/web

EXPOSE 3000

CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]

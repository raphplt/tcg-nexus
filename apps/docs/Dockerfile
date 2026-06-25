FROM node:20-bookworm-slim

WORKDIR /app

COPY . /app

RUN npm ci
RUN npm run build --workspace=apps-docs

EXPOSE 3002

CMD ["npm", "run", "serve", "--workspace=apps-docs", "--", "--port", "3002", "--host", "0.0.0.0"]

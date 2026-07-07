FROM node:20-bookworm-slim

WORKDIR /app

# Copy root package files
COPY package*.json /app/

# Copy workspace package.json files
COPY apps/docs/package*.json /app/apps/docs/

# Install dependencies only for the docs workspace
RUN npm ci --workspace=apps-docs

# Copy source files
COPY apps/docs /app/apps/docs

RUN npm run build --workspace=apps-docs

EXPOSE 3002

CMD ["npm", "run", "serve", "--workspace=apps-docs", "--", "--port", "3002", "--host", "0.0.0.0"]


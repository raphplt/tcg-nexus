FROM node:20-bookworm-slim

WORKDIR /app

COPY apps/api/package*.json /app/apps/api/
RUN npm ci --workspace=api

COPY apps/api /app/apps/api
COPY apps/data /app/apps/data
COPY data /app/data

WORKDIR /app/apps/api
RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "start:prod"]

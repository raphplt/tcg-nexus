import type { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";

const DEVELOPMENT_ORIGINS = ["http://localhost:3000", "http://localhost:8081"];

/**
 * Builds the CORS configuration shared by every WebSocket gateway.
 *
 * Gateways authenticate through the `accessToken` cookie, which the browser
 * attaches automatically. Accepting any origin would therefore expose every
 * socket to cross-site hijacking, so the allowed origins mirror the HTTP CORS
 * policy declared in `main.ts`.
 *
 * @returns CORS options restricted to the frontend origins of the environment.
 */
export function buildWebSocketCorsOptions(): CorsOptions {
  const allowedOrigins =
    process.env.NODE_ENV === "production"
      ? [process.env.FRONTEND_URL || "https://tcg-nexus.org"]
      : DEVELOPMENT_ORIGINS;

  return {
    origin: allowedOrigins,
    credentials: true,
  };
}

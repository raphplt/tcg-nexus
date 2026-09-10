import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import * as dotenv from "dotenv";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { applyGlobalRequestContract } from "./common/global-request-contract";

dotenv.config();

/**
 * Bootstraps the NestJS application instance, configuring global pipes, filters, interceptors, CORS, and Swagger documentation.
 */
export async function bootstrap() {
  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      rawBody: true,
    });
    const swaggerEnabled =
      process.env.NODE_ENV !== "production" ||
      process.env.SWAGGER_ENABLED === "true";
    const swaggerPath = "/api/docs";

    // Behind a reverse proxy (Docker, Railway, nginx), the throttler and the
    // secure-cookie logic need the forwarded client IP and protocol.
    if (process.env.TRUST_PROXY !== "false") {
      app.set("trust proxy", 1);
    }

    const commonHelmetOptions = {
      crossOriginEmbedderPolicy: false,
      hsts:
        process.env.NODE_ENV === "production"
          ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
          : false,
      referrerPolicy: { policy: "no-referrer" as const },
    };
    const apiSecurityHeaders = helmet({
      ...commonHelmetOptions,
      // The API serves JSON only: a restrictive CSP avoids any inline
      // execution should a response ever be rendered as a document.
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'none'"],
        },
      },
    });
    const swaggerSecurityHeaders = helmet({
      ...commonHelmetOptions,
      // Swagger UI needs its bundled scripts and inline styles. Keep the
      // exception scoped to the documentation routes.
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", "data:"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          imgSrc: ["'self'", "data:"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
    });

    app.use((request, response, next) => {
      const securityHeaders =
        swaggerEnabled && request.path.startsWith(swaggerPath)
          ? swaggerSecurityHeaders
          : apiSecurityHeaders;
      securityHeaders(request, response, next);
    });

    app.use(cookieParser());
    app.setGlobalPrefix("api");

    if (swaggerEnabled) {
      const config = new DocumentBuilder()
        .setTitle("TCG Nexus API")
        .setDescription("API documentation for TCG Nexus")
        .setVersion("1.0")
        .addBearerAuth(
          {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            name: "Authorization",
            description: "Enter JWT token",
            in: "header",
          },
          "bearerAuth",
        )
        .build();
      const documentFactory = () => SwaggerModule.createDocument(app, config);
      SwaggerModule.setup("api/docs", app, documentFactory, {
        swaggerOptions: {
          docExpansion: "none",
          defaultModelsExpandDepth: -1,
        },
      });
    }

    applyGlobalRequestContract(app);

    app.enableCors({
      origin:
        process.env.NODE_ENV === "production"
          ? process.env.FRONTEND_URL || "https://tcg-nexus.org"
          : ["http://localhost:3000", "http://localhost:8081"],
      credentials: true,
    });

    const port = process.env.PORT ?? 3001;

    const server = app.getHttpServer();
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 70000;

    await app.listen(port, "0.0.0.0").then(() => {
      console.log(`🚀 Server running on http://0.0.0.0:${port}`);
      if (swaggerEnabled) {
        console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
      }
    });
  } catch (error) {
    // A failed bootstrap must not leave a half-started process alive: rethrow
    // so the supervisor restarts it instead of serving a broken API.
    console.error("Fatal error during bootstrap", error);
    throw error;
  }
}

// Only auto-start when executed as an entrypoint (not when imported by tests).
if (require.main === module) {
  bootstrap().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

import { ForbiddenException, Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const SESSION_COOKIES = ["accessToken", "refreshToken"];

function allowedOrigins(): string[] {
  const configured = [
    process.env.FRONTEND_URL,
    ...(process.env.CSRF_ALLOWED_ORIGINS?.split(",") ?? []),
  ];

  if (process.env.NODE_ENV !== "production") {
    configured.push("http://localhost:3000", "http://localhost:8081");
  }

  return configured
    .map((origin) => origin?.trim().replace(/\/$/, ""))
    .filter((origin): origin is string => Boolean(origin));
}

/**
 * Refuse les écritures cross-site authentifiées par cookie.
 *
 * CORS n'empêche pas l'envoi d'une requête cross-origin, seulement la lecture
 * de la réponse : sans contrôle d'Origin, un formulaire tiers peut déclencher
 * une mutation avec le cookie de session de la victime.
 *
 * On refuse uniquement une origine *présente et non autorisée* : un navigateur
 * envoie toujours Origin sur une requête cross-origin, alors qu'un appel
 * serveur-à-serveur légitime (le middleware Next relaie les cookies vers
 * /auth/profile et /auth/refresh) n'en envoie aucune.
 */
@Injectable()
export class CsrfOriginMiddleware implements NestMiddleware {
  private readonly origins = allowedOrigins();

  use(req: Request, _res: Response, next: NextFunction): void {
    if (SAFE_METHODS.has(req.method)) {
      return next();
    }

    const cookies = (req as Request & { cookies?: Record<string, string> })
      .cookies;
    const hasSessionCookie = SESSION_COOKIES.some((name) => cookies?.[name]);
    if (!hasSessionCookie) {
      return next();
    }

    const origin =
      req.headers.origin ??
      (req.headers.referer
        ? safeOrigin(req.headers.referer as string)
        : undefined);

    if (origin && !this.origins.includes(origin.replace(/\/$/, ""))) {
      throw new ForbiddenException({
        code: "CSRF_ORIGIN_REJECTED",
        message: "Origine non autorisée pour cette requête",
      });
    }

    next();
  }
}

function safeOrigin(referer: string): string | undefined {
  try {
    return new URL(referer).origin;
  } catch {
    return undefined;
  }
}

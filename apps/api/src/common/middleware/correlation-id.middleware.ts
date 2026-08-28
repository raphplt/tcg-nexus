import * as crypto from "node:crypto";
import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

/**
 * Middleware ensuring every incoming and outgoing HTTP request is tagged with a unique X-Request-ID.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const rawId = req.headers["x-request-id"];
    const requestId =
      typeof rawId === "string" && rawId.trim().length > 0
        ? rawId.trim()
        : crypto.randomUUID();

    req.headers["x-request-id"] = requestId;
    (req as any).id = requestId;
    res.setHeader("X-Request-ID", requestId);

    next();
  }
}

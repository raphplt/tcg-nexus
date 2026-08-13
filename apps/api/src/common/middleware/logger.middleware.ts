import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger("HTTP");

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const start = process.hrtime.bigint();

    res.on("finish", () => {
      const { statusCode } = res;
      const durationMs =
        Number(process.hrtime.bigint() - start) / 1_000_000;
      const userId = (req.user as { id?: number } | undefined)?.id ?? null;

      this.logger.log(
        `${method} ${originalUrl} ${statusCode} ${durationMs.toFixed(1)}ms userId=${userId ?? "anonymous"}`,
      );
    });

    next();
  }
}

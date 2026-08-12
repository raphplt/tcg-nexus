import { HttpException, HttpStatus } from "@nestjs/common";

/**
 * Erreur métier portant un code stable, indépendant de la langue.
 * Le client traduit le code ; `message` ne sert que de repli pendant la
 * migration et pour les logs.
 */
export class DomainException extends HttpException {
  readonly code: string;
  readonly params: Record<string, unknown>;

  constructor(options: {
    status: HttpStatus;
    code: string;
    message?: string;
    params?: Record<string, unknown>;
  }) {
    super(
      {
        code: options.code,
        params: options.params ?? {},
        message: options.message ?? options.code,
      },
      options.status,
    );
    this.code = options.code;
    this.params = options.params ?? {};
  }
}

/** Codes renvoyés par défaut quand aucune erreur métier n'est déclarée. */
export const STATUS_CODES: Partial<Record<HttpStatus, string>> = {
  [HttpStatus.BAD_REQUEST]: "BAD_REQUEST",
  [HttpStatus.UNAUTHORIZED]: "UNAUTHORIZED",
  [HttpStatus.FORBIDDEN]: "FORBIDDEN",
  [HttpStatus.NOT_FOUND]: "NOT_FOUND",
  [HttpStatus.CONFLICT]: "CONFLICT",
  [HttpStatus.UNPROCESSABLE_ENTITY]: "VALIDATION_ERROR",
  [HttpStatus.TOO_MANY_REQUESTS]: "TOO_MANY_REQUESTS",
  [HttpStatus.INTERNAL_SERVER_ERROR]: "INTERNAL_ERROR",
};

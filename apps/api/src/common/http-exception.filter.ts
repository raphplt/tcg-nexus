import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";
import { DomainException, STATUS_CODES } from "./domain.exception";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Une erreur interne est survenue.";
    let error: string | null = null;
    let code: string | null = null;
    let params: Record<string, unknown> = {};
    let fields: Record<string, unknown> | null = null;

    if (exception instanceof DomainException) {
      status = exception.getStatus();
      code = exception.code;
      params = exception.params;
      const res = exception.getResponse() as { message?: string };
      message = res.message ?? exception.code;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === "string") {
        message = res;
      } else if (typeof res === "object" && res !== null) {
        const responseObj = res as {
          message?: string | string[];
          error?: string;
          code?: string;
        };
        // class-validator renvoie un tableau de messages
        if (Array.isArray(responseObj.message)) {
          code = "VALIDATION_ERROR";
          fields = { messages: responseObj.message };
          message = responseObj.message.join(", ");
        } else {
          message = responseObj.message ?? "";
        }
        error = responseObj.error || null;
        code = code ?? responseObj.code ?? null;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    switch (status) {
      case HttpStatus.BAD_REQUEST:
        message = message || "Requête invalide.";
        break;
      case HttpStatus.UNAUTHORIZED:
        message = message || "Non autorisé.";
        break;
      case HttpStatus.FORBIDDEN:
        message = message || "Accès interdit.";
        break;
      case HttpStatus.NOT_FOUND:
        message = message || "Ressource non trouvée.";
        break;
      case HttpStatus.CONFLICT:
        message = message || "Conflit de données.";
        break;
      default:
        message = message || "Une erreur interne est survenue.";
    }

    // une erreur interne ne doit jamais exposer son message technique
    if (
      status === HttpStatus.INTERNAL_SERVER_ERROR &&
      process.env.NODE_ENV === "production"
    ) {
      message = "Une erreur interne est survenue.";
    }

    response.status(status).json({
      statusCode: status,
      code: code ?? STATUS_CODES[status] ?? "INTERNAL_ERROR",
      params,
      ...(fields ? { fields } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      error,
    });
  }
}

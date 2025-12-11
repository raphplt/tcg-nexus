import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Une erreur interne est survenue.';
    let error: string | null = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const responseObj = res as { message?: string; error?: string };
        // Use explicit message when provided, otherwise let switch set defaults
        message = responseObj.message ?? '';
        error = responseObj.error || null;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    switch (status) {
      case HttpStatus.BAD_REQUEST:
        message = message || 'Requête invalide.';
        break;
      case HttpStatus.UNAUTHORIZED:
        message = message || 'Non autorisé.';
        break;
      case HttpStatus.FORBIDDEN:
        message = message || 'Accès interdit.';
        break;
      case HttpStatus.NOT_FOUND:
        message = message || 'Ressource non trouvée.';
        break;
      case HttpStatus.CONFLICT:
        message = message || 'Conflit de données.';
        break;
      default:
        message = message || 'Une erreur interne est survenue.';
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      error
    });
  }
}

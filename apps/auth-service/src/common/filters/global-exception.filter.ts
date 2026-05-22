import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  details?: any;
  timestamp: string;
  path: string;
  correlationId?: string;
}

/**
 * Centralized exception filter for consistent API error responses.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';
    let details: any = undefined;

    const correlationId =
      request.headers['x-correlation-id'] ||
      request.headers['x-request-id'] ||
      (Array.isArray(request.headers['x-correlation-id']) 
        ? request.headers['x-correlation-id'][0] 
        : request.headers['x-correlation-id']) ||
      'unknown';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = this.getErrorName(statusCode);
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as any;
        message = resp.message || message;
        error = resp.error || this.getErrorName(statusCode);
        details = resp.details;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      
      // Don't expose internal errors in production
      if (process.env.NODE_ENV === 'production') {
        message = 'An unexpected error occurred';
      }
    }

    const errorResponse: ApiErrorResponse = {
      statusCode,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId,
    };

    if (details) {
      errorResponse.details = details;
    }

    // Log error
    if (statusCode >= 500) {
      this.logger.error(
        `[${correlationId}] ${statusCode} ${error}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(statusCode).json(errorResponse);
  }

  private getErrorName(statusCode: number): string {
    const statusNames: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    };
    return statusNames[statusCode] || 'Error';
  }
}
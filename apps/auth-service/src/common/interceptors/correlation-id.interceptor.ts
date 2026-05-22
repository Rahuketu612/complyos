import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

export const CORRELATION_ID_KEY = 'correlationId';

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  private readonly logger = new Logger('CorrelationId');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Get existing correlation ID from header or generate new one
    const correlationId =
      request.headers['x-correlation-id'] ||
      request.headers['x-request-id'] ||
      uuidv4();

    // Attach to request
    request.correlationId = correlationId;

    // Add to response headers
    response.setHeader('x-correlation-id', correlationId);

    const startTime = Date.now();
    const { method, url } = request;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.logger.log(
            `[${correlationId}] ${method} ${url} ${response.statusCode} ${duration}ms`,
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `[${correlationId}] ${method} ${url} ${error.status || 500} ${duration}ms - ${error.message}`,
          );
        },
      }),
    );
  }
}
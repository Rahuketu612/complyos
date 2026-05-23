/**
 * Error Tracking Service - Centralized frontend error tracking
 * Stores errors locally in DB/logs (no third-party like Sentry)
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ClientError {
  tenantId: string;
  userId?: string;
  errorType: string;
  message: string;
  page?: string;
  stack?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface ErrorSummary {
  totalErrors: number;
  byType: Record<string, number>;
  byPage: Record<string, number>;
  recentErrors: Array<{
    id: string;
    errorType: string;
    message: string;
    page: string | null;
    createdAt: Date;
  }>;
}

@Injectable()
export class ErrorTrackingService {
  private readonly logger = new Logger(ErrorTrackingService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Log a client-side error
   */
  async logError(error: ClientError): Promise<string> {
    try {
      const event = await this.prisma.analyticsEvent.create({
        data: {
          tenantId: error.tenantId,
          userId: error.userId,
          eventType: `error_${error.errorType}`,
          eventCategory: 'error',
          severity: 'error',
          page: error.page,
          action: 'crash',
          target: 'client',
          metadata: {
            message: error.message,
            stack: error.stack,
            userAgent: error.userAgent,
            ...error.metadata,
          },
        },
      });

      // Also log to console for server-side visibility
      this.logger.error(
        `Client Error [${error.errorType}]: ${error.message}`,
        { page: error.page, userId: error.userId, eventId: event.id }
      );

      return event.id;
    } catch (err) {
      this.logger.error(`Failed to log error: ${err.message}`);
      return '';
    }
  }

  /**
   * Log API call failure
   */
  async logApiError(
    tenantId: string,
    userId: string | undefined,
    endpoint: string,
    method: string,
    statusCode: number,
    errorMessage: string
  ): Promise<void> {
    await this.logError({
      tenantId,
      userId,
      errorType: 'api_call_failed',
      message: `API ${method} ${endpoint} failed: ${statusCode} - ${errorMessage}`,
      page: endpoint,
      metadata: {
        endpoint,
        method,
        statusCode,
      },
    });
  }

  /**
   * Log runtime error
   */
  async logRuntimeError(
    tenantId: string,
    userId: string | undefined,
    errorName: string,
    errorMessage: string,
    stack?: string,
    page?: string
  ): Promise<void> {
    await this.logError({
      tenantId,
      userId,
      errorType: 'runtime_error',
      message: `${errorName}: ${errorMessage}`,
      page,
      stack,
    });
  }

  /**
   * Get error summary for tenant
   */
  async getErrorSummary(tenantId: string, days: number = 7): Promise<ErrorSummary> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const errors = await this.prisma.analyticsEvent.findMany({
      where: {
        tenantId,
        eventCategory: 'error',
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const summary: ErrorSummary = {
      totalErrors: errors.length,
      byType: {},
      byPage: {},
      recentErrors: errors.map(e => ({
        id: e.id,
        errorType: e.eventType,
        message: (e.metadata as any)?.message || '',
        page: e.page,
        createdAt: e.createdAt,
      })),
    };

    for (const error of errors) {
      const type = error.eventType.replace('error_', '');
      summary.byType[type] = (summary.byType[type] || 0) + 1;
      if (error.page) {
        summary.byPage[error.page] = (summary.byPage[error.page] || 0) + 1;
      }
    }

    return summary;
  }

  /**
   * Get critical errors (last 24 hours)
   */
  async getCriticalErrors(tenantId: string): Promise<any[]> {
    const since = new Date();
    since.setHours(since.getHours() - 24);

    return this.prisma.analyticsEvent.findMany({
      where: {
        tenantId,
        eventCategory: 'error',
        severity: 'error',
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

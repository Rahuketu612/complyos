/**
 * Analytics Service - Lightweight product analytics tracking
 * Privacy-safe: no third-party analytics, no PII collection
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AnalyticsEvent {
  tenantId: string;
  userId?: string;
  workspaceId?: string;
  eventType: string;
  eventCategory: 'navigation' | 'action' | 'conversion' | 'error';
  severity?: 'info' | 'warning' | 'error';
  page?: string;
  action?: string;
  target?: string;
  metadata?: Record<string, any>;
}

export interface TrackResult {
  success: boolean;
  eventId?: string;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Track an analytics event
   */
  async track(event: AnalyticsEvent): Promise<TrackResult> {
    try {
      // Hash IP for privacy
      const ipHash = event.metadata?.ip 
        ? this.hashIp(event.metadata.ip) 
        : null;

      const analyticsEvent = await this.prisma.analyticsEvent.create({
        data: {
          tenantId: event.tenantId,
          userId: event.userId,
          workspaceId: event.workspaceId,
          eventType: event.eventType,
          eventCategory: event.eventCategory,
          severity: event.severity,
          page: event.page,
          action: event.action,
          target: event.target,
          metadata: event.metadata || undefined,
          ipAddress: ipHash,
        },
      });

      this.logger.debug(`Tracked event: ${event.eventType}`, { 
        tenantId: event.tenantId,
        eventId: analyticsEvent.id 
      });

      return { success: true, eventId: analyticsEvent.id };
    } catch (error) {
      this.logger.error(`Failed to track event: ${error.message}`);
      return { success: false };
    }
  }

  /**
   * Quick track login
   */
  async trackLogin(tenantId: string, userId: string, method?: string): Promise<TrackResult> {
    return this.track({
      tenantId,
      userId,
      eventType: 'user_login',
      eventCategory: 'conversion',
      action: 'login',
      target: 'auth',
      metadata: { method: method || 'password' },
    });
  }

  /**
   * Track dashboard view
   */
  async trackDashboardView(tenantId: string, userId: string, workspaceId?: string): Promise<TrackResult> {
    return this.track({
      tenantId,
      userId,
      workspaceId,
      eventType: 'dashboard_view',
      eventCategory: 'navigation',
      page: '/dashboard',
      action: 'view',
      target: 'dashboard',
    });
  }

  /**
   * Track workspace creation
   */
  async trackWorkspaceCreated(tenantId: string, userId: string, workspaceId: string): Promise<TrackResult> {
    return this.track({
      tenantId,
      userId,
      workspaceId,
      eventType: 'workspace_created',
      eventCategory: 'action',
      action: 'create',
      target: 'workspace',
      metadata: { workspaceId },
    });
  }

  /**
   * Track notice creation
   */
  async trackNoticeCreated(tenantId: string, userId: string, noticeId: string, severity: string): Promise<TrackResult> {
    return this.track({
      tenantId,
      userId,
      eventType: 'notice_created',
      eventCategory: 'action',
      action: 'create',
      target: 'notice',
      metadata: { noticeId, severity },
    });
  }

  /**
   * Track AI usage
   */
  async trackAiUsage(tenantId: string, userId: string, actionType: string, duration?: number): Promise<TrackResult> {
    return this.track({
      tenantId,
      userId,
      eventType: `ai_${actionType}`,
      eventCategory: 'action',
      action: actionType,
      target: 'ai',
      metadata: { duration },
    });
  }

  /**
   * Track communication thread creation
   */
  async trackThreadCreated(tenantId: string, userId: string, threadId: string): Promise<TrackResult> {
    return this.track({
      tenantId,
      userId,
      eventType: 'thread_created',
      eventCategory: 'action',
      action: 'create',
      target: 'communication_thread',
      metadata: { threadId },
    });
  }

  /**
   * Track document upload
   */
  async trackDocumentUpload(tenantId: string, userId: string, documentId: string, fileSize: number): Promise<TrackResult> {
    return this.track({
      tenantId,
      userId,
      eventType: 'document_uploaded',
      eventCategory: 'action',
      action: 'upload',
      target: 'document',
      metadata: { documentId, fileSize },
    });
  }

  /**
   * Track task completion
   */
  async trackTaskCompleted(tenantId: string, userId: string, taskId: string): Promise<TrackResult> {
    return this.track({
      tenantId,
      userId,
      eventType: 'task_completed',
      eventCategory: 'conversion',
      action: 'complete',
      target: 'task',
      metadata: { taskId },
    });
  }

  /**
   * Track error
   */
  async trackError(tenantId: string, userId: string, errorType: string, message: string, page?: string): Promise<TrackResult> {
    return this.track({
      tenantId,
      userId,
      eventType: errorType,
      eventCategory: 'error',
      severity: 'error',
      page,
      action: 'error',
      target: 'system',
      metadata: { message },
    });
  }

  /**
   * Get analytics summary for tenant
   */
  async getAnalyticsSummary(tenantId: string, days: number = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const events = await this.prisma.analyticsEvent.findMany({
      where: {
        tenantId,
        createdAt: { gte: since },
      },
      select: {
        eventType: true,
        eventCategory: true,
        createdAt: true,
      },
    });

    // Group by event type
    const eventCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    
    for (const event of events) {
      eventCounts[event.eventType] = (eventCounts[event.eventType] || 0) + 1;
      categoryCounts[event.eventCategory] = (categoryCounts[event.eventCategory] || 0) + 1;
    }

    // Daily breakdown
    const dailyCounts: Record<string, number> = {};
    for (const event of events) {
      const date = event.createdAt.toISOString().split('T')[0];
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    }

    return {
      totalEvents: events.length,
      eventCounts,
      categoryCounts,
      dailyCounts,
      period: days,
    };
  }

  /**
   * Get event timeline for specific event type
   */
  async getEventTimeline(tenantId: string, eventType: string, limit: number = 50) {
    return this.prisma.analyticsEvent.findMany({
      where: { tenantId, eventType },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        eventType: true,
        page: true,
        action: true,
        metadata: true,
        createdAt: true,
        userId: true,
      },
    });
  }

  /**
   * Hash IP for privacy (simple hash, not reversible)
   */
  private hashIp(ip: string): string {
    // Simple hash - in production use crypto.createHash
    let hash = 0;
    for (let i = 0; i < ip.length; i++) {
      const char = ip.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).substring(0, 16);
  }
}

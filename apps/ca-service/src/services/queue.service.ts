/**
 * Queue Service - Centralized queue operations with graceful Redis fallback
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  QUEUES,
  AIActionJobData,
  NotificationJobData,
  AuditJobData,
  RetentionJobData,
} from '@complyos/shared';

export interface QueueJobResult {
  success: boolean;
  jobId?: string;
  error?: string;
}

@Injectable()
export class QueueService implements OnModuleInit {
  private readonly logger = new Logger(QueueService.name);
  private isRedisConnected = false;

  constructor(
    @InjectQueue(QUEUES.NOTIFICATIONS) private notificationQueue: Queue,
    @InjectQueue(QUEUES.AUDIT_PROCESSING) private auditQueue: Queue,
    @InjectQueue(QUEUES.RETENTION_CLEANUP) private retentionQueue: Queue,
  ) {}

  async onModuleInit() {
    try {
      // Check if queue is ready by waiting for connection
      await this.notificationQueue.waitUntilReady();
      this.isRedisConnected = true;
      this.logger.log('Redis connection: OK');
    } catch (error) {
      this.isRedisConnected = false;
      this.logger.warn('Redis unavailable - queue operations will be skipped');
    }
  }

  /**
   * Enqueue notification job with graceful fallback
   */
  async enqueueNotification(data: NotificationJobData): Promise<QueueJobResult> {
    if (!this.isRedisConnected) {
      this.logger.warn('Skipping notification enqueue - Redis unavailable');
      return { success: false, error: 'Redis unavailable' };
    }

    try {
      const job = await this.notificationQueue.add('notification', data, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      });
      this.logger.log(`Notification queued: ${job.id}`);
      return { success: true, jobId: job.id };
    } catch (error) {
      this.logger.error(`Failed to enqueue notification: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enqueue AI action job with throttle support
   */
  async enqueueAIAction(data: AIActionJobData): Promise<QueueJobResult> {
    if (!this.isRedisConnected) {
      this.logger.warn('Skipping AI action enqueue - Redis unavailable');
      return { success: false, error: 'Redis unavailable' };
    }

    try {
      const job = await this.notificationQueue.add('ai-action', data, {
        attempts: 2,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 25 },
        jobId: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      });
      this.logger.log(`AI action queued: ${job.id}`);
      return { success: true, jobId: job.id };
    } catch (error) {
      this.logger.error(`Failed to enqueue AI action: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enqueue audit job for write/read/delete operations
   */
  async enqueueAudit(data: AuditJobData): Promise<QueueJobResult> {
    if (!this.isRedisConnected) {
      this.logger.warn('Skipping audit enqueue - Redis unavailable');
      return { success: false, error: 'Redis unavailable' };
    }

    try {
      const job = await this.auditQueue.add('audit-record', data, {
        attempts: 5,
        backoff: { type: 'exponential', delay: 500 },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 100 },
      });
      this.logger.log(`Audit queued: ${job.id}`);
      return { success: true, jobId: job.id };
    } catch (error) {
      this.logger.error(`Failed to enqueue audit: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enqueue retention cleanup job
   */
  async enqueueRetention(data: RetentionJobData): Promise<QueueJobResult> {
    if (!this.isRedisConnected) {
      this.logger.warn('Skipping retention enqueue - Redis unavailable');
      return { success: false, error: 'Redis unavailable' };
    }

    try {
      const job = await this.retentionQueue.add(
        data.dryRun ? 'retention-dry-run' : 'retention-cleanup',
        data,
        {
          attempts: 3,
          backoff: { type: 'fixed', delay: 5000 },
          removeOnComplete: { count: 10 },
          removeOnFail: { count: 5 },
        }
      );
      this.logger.log(`Retention job queued: ${job.id}`);
      return { success: true, jobId: job.id };
    } catch (error) {
      this.logger.error(`Failed to enqueue retention: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get queue health status
   */
  async getQueueHealth() {
    try {
      const [notificationHealth, auditHealth, retentionHealth] = await Promise.all([
        this.notificationQueue.getJobCounts(),
        this.auditQueue.getJobCounts(),
        this.retentionQueue.getJobCounts(),
      ]);

      return {
        redis: this.isRedisConnected,
        queues: {
          notifications: notificationHealth,
          audit: auditHealth,
          retention: retentionHealth,
        },
      };
    } catch (error) {
      return {
        redis: false,
        error: error.message,
      };
    }
  }
}

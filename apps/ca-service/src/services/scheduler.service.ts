/**
 * Scheduler Service - Cron jobs for periodic operations
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { QueueService } from './queue.service';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private queueService: QueueService,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  async onModuleInit() {
    this.logger.log('Scheduler service initialized');
  }

  /**
   * Daily audit integrity verification at 2 AM
   */
  @Cron('0 2 * * *', { name: 'audit-integrity-check' })
  async runAuditIntegrityCheck() {
    this.logger.log('Starting daily audit integrity verification');
    try {
      await this.queueService.enqueueAudit({
        tenantId: 'system',
        auditType: 'read',
        entityType: 'audit_chain',
        entityId: 'integrity-verification',
        metadata: { scheduled: true, jobName: 'audit-integrity-check' },
      });
      this.logger.log('Audit integrity verification job queued');
    } catch (error) {
      this.logger.error(`Audit integrity check failed: ${error.message}`);
    }
  }

  /**
   * Weekly retention dry-run on Sunday at 3 AM
   */
  @Cron('0 3 * * 0', { name: 'retention-dry-run' })
  async runRetentionDryRun() {
    this.logger.log('Starting weekly retention dry-run');
    try {
      // Queue retention job for system-wide cleanup
      await this.queueService.enqueueRetention({
        tenantId: 'system',
        retentionType: 'cleanup_documents',
        olderThanDays: 365,
        dryRun: true,
      });
      this.logger.log('Retention dry-run queued');
    } catch (error) {
      this.logger.error(`Retention dry-run failed: ${error.message}`);
    }
  }

  /**
   * Stale task reminder - every 4 hours (placeholder - Task model TBD)
   */
  @Cron('0 */4 * * *', { name: 'stale-task-reminder' })
  async runStaleTaskReminder() {
    this.logger.log('Checking for stale tasks');
    // Task model not yet implemented - placeholder for future
    // Will be enabled when Task model is added to schema
  }

  /**
   * Cleanup expired sessions - daily at midnight
   */
  @Cron('0 0 * * *', { name: 'session-cleanup' })
  async runSessionCleanup() {
    this.logger.log('Starting session cleanup');
    try {
      await this.queueService.enqueueRetention({
        tenantId: 'system',
        retentionType: 'purge_sessions',
        olderThanDays: 7,
        dryRun: false,
      });
      this.logger.log('Session cleanup job queued');
    } catch (error) {
      this.logger.error(`Session cleanup failed: ${error.message}`);
    }
  }

  /**
   * Manual trigger for audit verification (can be called from API)
   */
  async triggerAuditVerification(tenantId: string): Promise<void> {
    await this.queueService.enqueueAudit({
      tenantId,
      auditType: 'read',
      entityType: 'audit_chain',
      entityId: `manual-verification-${Date.now()}`,
      metadata: { triggeredBy: 'api' },
    });
  }

  /**
   * Manual trigger for retention dry-run report
   */
  async triggerRetentionDryRun(tenantId: string): Promise<void> {
    await this.queueService.enqueueRetention({
      tenantId,
      retentionType: 'cleanup_documents',
      olderThanDays: 365,
      dryRun: true,
    });
  }
}

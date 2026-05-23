/**
 * Queue Worker Module
 * Handles BullMQ job processing
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from '@complyos/shared';
import { AuditProcessorWorker } from './audit.processor';
import { NotificationProcessorWorker } from './notification.processor';
import { RetentionProcessorWorker } from './retention.processor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    }),
    BullModule.registerQueue(
      { name: QUEUES.AUDIT_PROCESSING },
      { name: QUEUES.NOTIFICATIONS },
      { name: QUEUES.RETENTION_CLEANUP },
      { name: QUEUES.EMAIL },
    ),
  ],
  providers: [
    AuditProcessorWorker,
    NotificationProcessorWorker,
    RetentionProcessorWorker,
  ],
  exports: [BullModule],
})
export class QueueModule {}

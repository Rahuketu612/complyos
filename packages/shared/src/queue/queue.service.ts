/**
 * Queue Service
 * Centralized queue management for BullMQ
 */

import { Queue, Worker, Job } from 'bullmq';
import { QUEUES, QueueName } from './queue-names';
import { JobData } from './job-types';

// Connection config - use env variables
const getRedisConfig = () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

// Default job options
export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 1000,
  },
  removeOnComplete: {
    count: 1000,
    age: 24 * 60 * 60, // 24 hours
  },
  removeOnFail: {
    count: 5000,
    age: 7 * 24 * 60 * 60, // 7 days
  },
};

// Queue instances cache
const queueInstances = new Map<QueueName, Queue>();

export function getQueue(name: QueueName): Queue {
  if (!queueInstances.has(name)) {
    queueInstances.set(
      name,
      new Queue(name, {
        connection: getRedisConfig(),
        defaultJobOptions: DEFAULT_JOB_OPTIONS,
      })
    );
  }
  return queueInstances.get(name)!;
}

export async function addJob<T extends JobData>(
  queueName: QueueName,
  jobName: string,
  data: T,
  options?: {
    priority?: number;
    delay?: number;
    jobId?: string;
  }
): Promise<Job> {
  const queue = getQueue(queueName);
  return queue.add(jobName, data, {
    ...options,
    ...DEFAULT_JOB_OPTIONS,
  });
}

// Convenience methods for common job types
export async function addAIJob(data: JobData & { actionType: string }): Promise<Job> {
  return addJob(QUEUES.AI_TASKS, 'ai-action', data as any);
}

export async function addNotificationJob(data: JobData & { title: string; message: string }): Promise<Job> {
  return addJob(QUEUES.NOTIFICATIONS, 'notification', data as any);
}

export async function addAuditJob(data: JobData & { entityType: string }): Promise<Job> {
  return addJob(QUEUES.AUDIT_PROCESSING, 'audit-process', data as any);
}

export async function addEmailJob(data: JobData & { to: string | string[]; subject: string }): Promise<Job> {
  return addJob(QUEUES.EMAIL, 'send-email', data as any);
}

export async function addRetentionJob(data: JobData & { retentionType: string }): Promise<Job> {
  return addJob(QUEUES.RETENTION_CLEANUP, 'retention-cleanup', data);
}

// Health check
export async function checkQueueHealth(queueName: QueueName): Promise<{
  healthy: boolean;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}> {
  try {
    const queue = getQueue(queueName);
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);
    return {
      healthy: true,
      waiting,
      active,
      completed,
      failed,
    };
  } catch (error) {
    return {
      healthy: false,
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
    };
  }
}

// Graceful shutdown
export async function closeAllQueues(): Promise<void> {
  await Promise.all(
    Array.from(queueInstances.values()).map(queue => queue.close())
  );
  queueInstances.clear();
}

// Create a worker with common error handling
export function createWorker<T extends JobData>(
  queueName: QueueName,
  processor: (job: Job<T>) => Promise<void>,
  options?: {
    concurrency?: number;
  }
): Worker {
  return new Worker(queueName, processor, {
    connection: getRedisConfig(),
    concurrency: options?.concurrency || 5,
  });
}

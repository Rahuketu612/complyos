/**
 * Queue Names
 * Centralized queue name definitions for BullMQ
 */

export const QUEUES = {
  // AI Processing Queue
  AI_TASKS: 'ai-tasks',
  
  // Notification Queue
  NOTIFICATIONS: 'notifications',
  
  // Audit Processing Queue
  AUDIT_PROCESSING: 'audit-processing',
  
  // Retention Cleanup Queue
  RETENTION_CLEANUP: 'retention-cleanup',
  
  // Email Queue
  EMAIL: 'email',
  
  // Document Processing Queue
  DOCUMENT_PROCESSING: 'document-processing',
  
  // General Purpose Queue
  GENERAL: 'general',
} as const;

export type QueueName = typeof QUEUES[keyof typeof QUEUES];

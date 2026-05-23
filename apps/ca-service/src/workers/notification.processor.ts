/**
 * Notification Processor Worker
 * Handles email, push, in-app, and SMS notifications
 */

import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QUEUES, NotificationJobData } from '@complyos/shared';
import { Logger } from '@nestjs/common';

@Processor(QUEUES.NOTIFICATIONS)
export class NotificationProcessorWorker extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessorWorker.name);

  async process(job: Job<NotificationJobData>): Promise<any> {
    this.logger.log(`Processing notification job ${job.id} - type: ${job.data.type}`);

    switch (job.data.type) {
      case 'email':
        return this.sendEmail(job);
      case 'push':
        return this.sendPush(job);
      case 'in_app':
        return this.sendInApp(job);
      case 'sms':
        return this.sendSMS(job);
      default:
        this.logger.warn(`Unknown notification type: ${job.data.type}`);
        return { status: 'skipped' };
    }
  }

  private async sendEmail(job: Job<NotificationJobData>): Promise<any> {
    this.logger.log(`Sending email to ${job.data.recipientUserId}: ${job.data.title}`);
    // Integration: SendGrid, AWS SES, etc.
    return {
      status: 'sent',
      type: 'email',
      recipient: job.data.recipientUserId,
    };
  }

  private async sendPush(job: Job<NotificationJobData>): Promise<any> {
    this.logger.log(`Sending push notification to ${job.data.recipientUserId}`);
    // Integration: Firebase, OneSignal, etc.
    return {
      status: 'sent',
      type: 'push',
      recipient: job.data.recipientUserId,
    };
  }

  private async sendInApp(job: Job<NotificationJobData>): Promise<any> {
    this.logger.log(`Creating in-app notification for ${job.data.recipientUserId}`);
    // Integration: Store in DB for UI polling
    return {
      status: 'created',
      type: 'in_app',
      recipient: job.data.recipientUserId,
    };
  }

  private async sendSMS(job: Job<NotificationJobData>): Promise<any> {
    this.logger.log(`Sending SMS to ${job.data.recipientUserId}`);
    // Integration: Twilio, AWS SNS, etc.
    return {
      status: 'sent',
      type: 'sms',
      recipient: job.data.recipientUserId,
    };
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Notification job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Notification job ${job.id} failed: ${error.message}`);
  }
}

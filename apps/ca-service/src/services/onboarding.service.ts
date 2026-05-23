/**
 * Onboarding Service - Track and guide user onboarding progress
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface OnboardingStatus {
  workspaceCreated: boolean;
  firstClientAdded: boolean;
  firstDocumentUploaded: boolean;
  firstTaskCreated: boolean;
  firstNoticeResolved: boolean;
  completionPercentage: number;
  completedAt: Date | null;
}

export interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  completedAt?: Date;
}

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get or create onboarding progress for user
   */
  async getOnboardingProgress(tenantId: string, userId: string): Promise<OnboardingStatus> {
    let progress = await this.prisma.onboardingProgress.findUnique({
      where: {
        tenantId_userId: { tenantId, userId },
      },
    });

    if (!progress) {
      progress = await this.prisma.onboardingProgress.create({
        data: {
          tenantId,
          userId,
        },
      });
    }

    return {
      workspaceCreated: progress.workspaceCreated,
      firstClientAdded: progress.firstClientAdded,
      firstDocumentUploaded: progress.firstDocumentUploaded,
      firstTaskCreated: progress.firstTaskCreated,
      firstNoticeResolved: progress.firstNoticeResolved,
      completionPercentage: progress.completionPercentage,
      completedAt: progress.completedAt,
    };
  }

  /**
   * Mark workspace created
   */
  async markWorkspaceCreated(tenantId: string, userId: string): Promise<void> {
    await this.updateProgress(tenantId, userId, 'workspaceCreated');
  }

  /**
   * Mark first client added
   */
  async markFirstClientAdded(tenantId: string, userId: string): Promise<void> {
    await this.updateProgress(tenantId, userId, 'firstClientAdded');
  }

  /**
   * Mark first document uploaded
   */
  async markFirstDocumentUploaded(tenantId: string, userId: string): Promise<void> {
    await this.updateProgress(tenantId, userId, 'firstDocumentUploaded');
  }

  /**
   * Mark first task created
   */
  async markFirstTaskCreated(tenantId: string, userId: string): Promise<void> {
    await this.updateProgress(tenantId, userId, 'firstTaskCreated');
  }

  /**
   * Mark first notice resolved
   */
  async markFirstNoticeResolved(tenantId: string, userId: string): Promise<void> {
    await this.updateProgress(tenantId, userId, 'firstNoticeResolved');
  }

  /**
   * Get onboarding checklist items
   */
  async getChecklist(tenantId: string, userId: string): Promise<ChecklistItem[]> {
    const progress = await this.getOnboardingProgress(tenantId, userId);

    const items: ChecklistItem[] = [
      {
        id: 'workspace',
        label: 'Create your workspace',
        description: 'Set up your CA firm workspace to manage clients',
        completed: progress.workspaceCreated,
      },
      {
        id: 'client',
        label: 'Add your first client',
        description: 'Add a client business to your workspace',
        completed: progress.firstClientAdded,
      },
      {
        id: 'document',
        label: 'Upload your first document',
        description: 'Upload a compliance document to your vault',
        completed: progress.firstDocumentUploaded,
      },
      {
        id: 'task',
        label: 'Create your first task',
        description: 'Create a compliance task to track deadlines',
        completed: progress.firstTaskCreated,
      },
      {
        id: 'notice',
        label: 'Resolve your first notice',
        description: 'Manage and resolve a GST notice',
        completed: progress.firstNoticeResolved,
      },
    ];

    return items;
  }

  /**
   * Update specific progress item
   */
  private async updateProgress(
    tenantId: string,
    userId: string,
    field: keyof Pick<
      OnboardingProgress,
      'workspaceCreated' | 'firstClientAdded' | 'firstDocumentUploaded' | 'firstTaskCreated' | 'firstNoticeResolved'
    >
  ): Promise<void> {
    const updateData: any = { [field]: true };
    
    // Get current progress to calculate percentage
    const progress = await this.prisma.onboardingProgress.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });

    if (!progress) return;

    // Calculate new completion percentage
    const fields: Array<keyof Pick<OnboardingProgress, 'workspaceCreated' | 'firstClientAdded' | 'firstDocumentUploaded' | 'firstTaskCreated' | 'firstNoticeResolved'>> = [
      'workspaceCreated', 'firstClientAdded', 'firstDocumentUploaded', 'firstTaskCreated', 'firstNoticeResolved'
    ];
    
    let completed = 0;
    for (const f of fields) {
      if (progress[f] || f === field) completed++;
    }

    const percentage = (completed / fields.length) * 100;
    updateData.completionPercentage = percentage;

    // Mark as completed if 100%
    if (percentage === 100 && !progress.completedAt) {
      updateData.completedAt = new Date();
    }

    await this.prisma.onboardingProgress.update({
      where: { tenantId_userId: { tenantId, userId } },
      data: updateData,
    });

    this.logger.log(`Onboarding progress updated: ${field}`, { tenantId, percentage });
  }

  /**
   * Reset onboarding progress (for testing)
   */
  async resetProgress(tenantId: string, userId: string): Promise<void> {
    await this.prisma.onboardingProgress.update({
      where: { tenantId_userId: { tenantId, userId } },
      data: {
        workspaceCreated: false,
        firstClientAdded: false,
        firstDocumentUploaded: false,
        firstTaskCreated: false,
        firstNoticeResolved: false,
        completionPercentage: 0,
        completedAt: null,
      },
    });
  }
}

// Type for reference
type OnboardingProgress = {
  workspaceCreated: boolean;
  firstClientAdded: boolean;
  firstDocumentUploaded: boolean;
  firstTaskCreated: boolean;
  firstNoticeResolved: boolean;
  completionPercentage: number;
  completedAt: Date | null;
};

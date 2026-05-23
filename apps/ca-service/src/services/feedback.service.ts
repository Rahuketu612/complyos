/**
 * Feedback Service - In-app feedback collection for pilot users
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateFeedbackDto {
  type: 'issue' | 'feature_request' | 'general' | 'praise';
  category?: string;
  subject: string;
  description: string;
  screenshots?: string[];
  pageOrigin?: string;
}

export interface FeedbackSummary {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
}

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create new feedback
   */
  async createFeedback(
    tenantId: string,
    userId: string | null,
    dto: CreateFeedbackDto
  ) {
    const feedback = await this.prisma.feedback.create({
      data: {
        tenantId,
        userId,
        type: dto.type as any,
        category: dto.category,
        subject: dto.subject,
        description: dto.description,
        screenshots: dto.screenshots || undefined,
        pageOrigin: dto.pageOrigin,
      },
    });

    this.logger.log(`Feedback created: ${feedback.id}`, { tenantId, type: dto.type });
    
    return feedback;
  }

  /**
   * Get feedback list for tenant (admin only)
   */
  async getFeedbackList(tenantId: string, options?: {
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, type, page = 1, limit = 20 } = options || {};
    
    const where: any = { tenantId };
    if (status) where.status = status;
    if (type) where.type = type;

    const [feedback, total] = await Promise.all([
      this.prisma.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.feedback.count({ where }),
    ]);

    return {
      feedback,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update feedback status
   */
  async updateFeedbackStatus(
    feedbackId: string,
    tenantId: string,
    status: string,
    assignedTo?: string,
    resolution?: string
  ) {
    const feedback = await this.prisma.feedback.update({
      where: { id: feedbackId },
      data: {
        status: status as any,
        assignedTo,
        resolution,
        resolvedAt: status === 'RESOLVED' ? new Date() : undefined,
      },
    });

    this.logger.log(`Feedback updated: ${feedbackId}`, { status });
    
    return feedback;
  }

  /**
   * Get feedback summary stats
   */
  async getFeedbackSummary(tenantId: string): Promise<FeedbackSummary> {
    const feedback = await this.prisma.feedback.findMany({
      where: { tenantId },
    });

    const summary: FeedbackSummary = {
      total: feedback.length,
      open: feedback.filter(f => f.status === 'OPEN').length,
      inProgress: feedback.filter(f => f.status === 'IN_PROGRESS').length,
      resolved: feedback.filter(f => f.status === 'RESOLVED').length,
      byType: {},
      byPriority: {},
    };

    for (const f of feedback) {
      summary.byType[f.type] = (summary.byType[f.type] || 0) + 1;
      summary.byPriority[f.priority] = (summary.byPriority[f.priority] || 0) + 1;
    }

    return summary;
  }

  /**
   * Get single feedback by ID
   */
  async getFeedbackById(feedbackId: string, tenantId: string) {
    return this.prisma.feedback.findFirst({
      where: { id: feedbackId, tenantId },
    });
  }
}

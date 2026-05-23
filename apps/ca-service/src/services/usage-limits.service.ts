/**
 * Usage Limits Service - Configurable beta limits
 * Soft-warning only during beta phase
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface BetaLimits {
  maxWorkspaces: number;
  maxUsers: number;
  maxDocuments: number;
  maxAiRequestsPerDay: number;
}

export interface UsageStatus {
  workspaces: { current: number; limit: number; percentage: number };
  users: { current: number; limit: number; percentage: number };
  documents: { current: number; limit: number; percentage: number };
  aiRequestsToday: { current: number; limit: number; percentage: number };
  isLimited: boolean;
  warnings: string[];
}

@Injectable()
export class UsageLimitsService {
  private readonly logger = new Logger(UsageLimitsService.name);

  // Default beta limits
  private readonly defaultLimits: BetaLimits = {
    maxWorkspaces: 100,
    maxUsers: 25,
    maxDocuments: 500,
    maxAiRequestsPerDay: 50,
  };

  constructor(private prisma: PrismaService) {}

  /**
   * Get current usage status for tenant
   */
  async getUsageStatus(tenantId: string): Promise<UsageStatus> {
    const limits = await this.getTenantLimits(tenantId);
    
    const [workspaceCount, userCount, documentCount, aiToday] = await Promise.all([
      this.prisma.clientWorkspace.count({ where: { tenantId } }),
      this.prisma.user.count({ where: { tenantId } }),
      this.prisma.documentVault.count({ where: { tenantId } }),
      this.getAiRequestsToday(tenantId),
    ]);

    const status: UsageStatus = {
      workspaces: {
        current: workspaceCount,
        limit: limits.maxWorkspaces,
        percentage: Math.round((workspaceCount / limits.maxWorkspaces) * 100),
      },
      users: {
        current: userCount,
        limit: limits.maxUsers,
        percentage: Math.round((userCount / limits.maxUsers) * 100),
      },
      documents: {
        current: documentCount,
        limit: limits.maxDocuments,
        percentage: Math.round((documentCount / limits.maxDocuments) * 100),
      },
      aiRequestsToday: {
        current: aiToday,
        limit: limits.maxAiRequestsPerDay,
        percentage: Math.round((aiToday / limits.maxAiRequestsPerDay) * 100),
      },
      isLimited: false,
      warnings: [],
    };

    // Check for warnings (>80% usage)
    const checks = [
      { name: 'workspaces', value: status.workspaces.percentage },
      { name: 'users', value: status.users.percentage },
      { name: 'documents', value: status.documents.percentage },
      { name: 'AI requests', value: status.aiRequestsToday.percentage },
    ];

    for (const check of checks) {
      if (check.value >= 100) {
        status.isLimited = true;
        status.warnings.push(`${check.name}: limit reached`);
      } else if (check.value >= 80) {
        status.warnings.push(`${check.name}: ${check.value}% used (${check.name === 'AI requests' ? 'resets daily' : 'contact support to increase'})`);
      }
    }

    return status;
  }

  /**
   * Check if action is allowed based on limits
   */
  async checkLimit(tenantId: string, action: 'create_workspace' | 'add_user' | 'upload_document' | 'ai_request'): Promise<{
    allowed: boolean;
    warning?: string;
  }> {
    const status = await this.getUsageStatus(tenantId);

    switch (action) {
      case 'create_workspace':
        if (status.workspaces.percentage >= 100) {
          return { allowed: false, warning: 'Maximum workspaces reached. Contact support to increase limit.' };
        }
        if (status.workspaces.percentage >= 80) {
          return { allowed: true, warning: 'Approaching workspace limit (80% used).' };
        }
        break;

      case 'add_user':
        if (status.users.percentage >= 100) {
          return { allowed: false, warning: 'Maximum users reached. Contact support to increase limit.' };
        }
        if (status.users.percentage >= 80) {
          return { allowed: true, warning: 'Approaching user limit (80% used).' };
        }
        break;

      case 'upload_document':
        if (status.documents.percentage >= 100) {
          return { allowed: false, warning: 'Maximum documents reached. Contact support to increase limit.' };
        }
        if (status.documents.percentage >= 80) {
          return { allowed: true, warning: 'Approaching document limit (80% used).' };
        }
        break;

      case 'ai_request':
        if (status.aiRequestsToday.percentage >= 100) {
          return { allowed: false, warning: 'Daily AI request limit reached. Resets at midnight.' };
        }
        if (status.aiRequestsToday.percentage >= 80) {
          return { allowed: true, warning: 'Approaching daily AI limit (80% used).' };
        }
        break;
    }

    return { allowed: true };
  }

  /**
   * Get or create tenant limits
   */
  private async getTenantLimits(tenantId: string): Promise<BetaLimits> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return this.defaultLimits;
    }

    // Use tenant-specific limits if set, otherwise defaults
    return {
      maxWorkspaces: (tenant as any).maxWorkspaces || this.defaultLimits.maxWorkspaces,
      maxUsers: tenant.maxUsers || this.defaultLimits.maxUsers,
      maxDocuments: (tenant as any).maxDocuments || this.defaultLimits.maxDocuments,
      maxAiRequestsPerDay: (tenant as any).maxAiRequestsPerDay || this.defaultLimits.maxAiRequestsPerDay,
    };
  }

  /**
   * Get AI requests count for today
   */
  private async getAiRequestsToday(tenantId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.analyticsEvent.count({
      where: {
        tenantId,
        eventType: { contains: 'ai_' },
        createdAt: { gte: today },
      },
    });
  }

  /**
   * Get limits info (for display in UI)
   */
  async getLimitsInfo(tenantId: string): Promise<BetaLimits & { plan: string }> {
    const limits = await this.getTenantLimits(tenantId);
    return {
      ...limits,
      plan: 'beta',
    };
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async logAudit(params: {
    tenantId: string;
    userId: string;
    action: string;
    entityType: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    eventCategory?: string;
  }) {
    const { tenantId, userId, action, entityType, entityId, metadata, ipAddress, userAgent, eventCategory } = params;
    
    return this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action,
        entityType,
        entityId,
        metadata: metadata || {},
        ipAddress,
        userAgent,
        eventCategory: eventCategory as any || 'DATA_MODIFICATION',
      },
    });
  }
}
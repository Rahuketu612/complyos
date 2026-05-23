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
    ipAddress?: string;
    userAgent?: string;
    eventCategory?: string;
    success?: boolean;
    errorMessage?: string;
  }) {
    const { tenantId, userId, action, entityType, entityId, ipAddress, userAgent, eventCategory, success, errorMessage } = params;
    
    return this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action,
        entityType,
        entityId,
        ipAddress,
        userAgent,
        eventCategory: eventCategory as any || 'DATA_MODIFICATION',
        success: success !== undefined ? success : true,
        errorMessage,
      },
    });
  }
}
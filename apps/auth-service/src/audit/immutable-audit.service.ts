/**
 * Immutable Audit Service
 * Implements CERT-In compliant audit logging with hash chain integrity
 * 
 * Features:
 * - Hash chain for tamper detection (previousHash + current hash)
 * - SHA-256 checksums for each entry
 * - No update/delete operations exposed
 * - Correlation ID tracking for request tracing
 * - Event categorization for security classification
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

export enum AuditEventCategory {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  GST_ACTION = 'GST_ACTION',
  VENDOR_ACTION = 'VENDOR_ACTION',
  DATA_EXPORT = 'DATA_EXPORT',
  ADMIN_ACTION = 'ADMIN_ACTION',
  SECURITY_INCIDENT = 'SECURITY_INCIDENT',
  DATA_ACCESS = 'DATA_ACCESS',
  DATA_MODIFICATION = 'DATA_MODIFICATION',
  SYSTEM_CONFIG = 'SYSTEM_CONFIG',
}

interface AuditLogInput {
  tenantId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  eventCategory?: AuditEventCategory;
  oldValues?: any;
  newValues?: any;
  correlationId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestMethod?: string;
  requestPath?: string;
  success?: boolean;
  errorMessage?: string;
}

@Injectable()
export class ImmutableAuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new audit log entry with hash chain integrity
   * This is the ONLY write operation - no update or delete exposed
   */
  async log(input: AuditLogInput): Promise<void> {
    // Get the previous entry's hash for chain integrity
    const lastEntry = await this.prisma.auditLog.findFirst({
      where: { tenantId: input.tenantId },
      orderBy: { timestamp: 'desc' },
      select: { checksum: true },
    });

    // Generate hash for this entry
    const timestamp = new Date();
    const hashInput = this.buildHashInput({
      ...input,
      timestamp,
      previousHash: lastEntry?.checksum ?? undefined,
    });
    const checksum = this.computeChecksum(hashInput);

    // Create immutable audit log entry
    await this.prisma.auditLog.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId ?? undefined,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? undefined,
        eventCategory: input.eventCategory as any,
        oldValues: input.oldValues ? JSON.stringify(input.oldValues) : undefined,
        newValues: input.newValues ? JSON.stringify(input.newValues) : undefined,
        correlationId: input.correlationId ?? undefined,
        ipAddress: input.ipAddress ?? undefined,
        userAgent: input.userAgent ?? undefined,
        requestMethod: input.requestMethod ?? undefined,
        requestPath: input.requestPath ?? undefined,
        success: input.success ?? true,
        errorMessage: input.errorMessage ?? undefined,
        previousHash: lastEntry?.checksum ?? undefined,
        checksum,
        timestamp,
      },
    });
  }

  /**
   * Build deterministic hash input string
   */
  private buildHashInput(data: {
    timestamp: Date;
    action: string;
    entityType: string;
    entityId?: string;
    userId?: string;
    correlationId?: string;
    success?: boolean;
    previousHash?: string;
  }): string {
    return [
      data.timestamp.toISOString(),
      data.action,
      data.entityType,
      data.entityId || '',
      data.userId || '',
      data.correlationId || '',
      (data.success ?? true).toString(),
      data.previousHash || 'GENESIS',
    ].join('|');
  }

  /**
   * Compute SHA-256 checksum
   */
  private computeChecksum(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  /**
   * Verify audit log chain integrity
   * Returns list of broken chain links
   */
  async verifyChain(tenantId: string): Promise<{ valid: boolean; brokenAt?: string }> {
    const entries = await this.prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { timestamp: 'asc' },
      select: {
        id: true,
        timestamp: true,
        action: true,
        entityType: true,
        entityId: true,
        userId: true,
        correlationId: true,
        success: true,
        previousHash: true,
        checksum: true,
      },
    });

    let previousHash: string | undefined;

    for (const entry of entries) {
      const expectedPreviousHash = previousHash;
      
      // Verify previous hash matches
      if (entry.previousHash !== expectedPreviousHash) {
        return { valid: false, brokenAt: entry.id };
      }

      // Verify checksum
      const hashInput = this.buildHashInput({
        timestamp: entry.timestamp,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? undefined,
        userId: entry.userId ?? undefined,
        correlationId: entry.correlationId ?? undefined,
        success: entry.success,
        previousHash: entry.previousHash ?? undefined,
      });
      
      const computedChecksum = this.computeChecksum(hashInput);
      if (computedChecksum !== entry.checksum) {
        return { valid: false, brokenAt: entry.id };
      }

      previousHash = entry.checksum ?? undefined;
    }

    return { valid: true };
  }

  /**
   * Query audit logs (read-only)
   */
  async query(filters: {
    tenantId: string;
    userId?: string;
    eventCategory?: AuditEventCategory;
    entityType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    return this.prisma.auditLog.findMany({
      where: {
        tenantId: filters.tenantId,
        userId: filters.userId,
        eventCategory: filters.eventCategory as any,
        entityType: filters.entityType,
        timestamp: {
          gte: filters.startDate,
          lte: filters.endDate,
        },
      },
      orderBy: { timestamp: 'desc' },
      take: filters.limit ?? 100,
      skip: filters.offset ?? 0,
      // Exclude checksum fields from general queries for performance
      select: {
        id: true,
        tenantId: true,
        userId: true,
        action: true,
        entityType: true,
        entityId: true,
        eventCategory: true,
        correlationId: true,
        ipAddress: true,
        success: true,
        errorMessage: true,
        timestamp: true,
      },
    });
  }
}
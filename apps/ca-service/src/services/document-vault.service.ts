import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceService } from './workspace.service';
import { AuditService } from './audit.service';

@Injectable()
export class DocumentVaultService {
  constructor(
    private prisma: PrismaService,
    private workspaceService: WorkspaceService,
    private auditService: AuditService,
  ) {}

  async createDocument(tenantId: string, userId: string, workspaceId: string, data: {
    fileName: string;
    originalName: string;
    fileType: string;
    mimeType: string;
    size: number;
    category: string;
    storageKey?: string;
    fileHash?: string;
    businessId?: string;
    retentionCategory?: string;
    tags?: string[];
    notes?: string;
  }) {
    // Check access
    const hasAccess = await this.workspaceService.hasWorkspaceAccess(workspaceId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const document = await this.prisma.documentVault.create({
      data: {
        tenantId,
        workspaceId,
        fileName: data.fileName,
        originalName: data.originalName,
        fileType: data.fileType,
        mimeType: data.mimeType,
        size: data.size,
        category: data.category as any,
        storageKey: data.storageKey,
        fileHash: data.fileHash,
        uploadedBy: userId,
        businessId: data.businessId,
        retentionCategory: (data.retentionCategory as any) || 'GST_RECORDS',
        tags: data.tags || [],
        notes: data.notes,
      },
      include: {
        uploader: { select: { id: true, firstName: true, lastName: true, email: true } },
        workspace: { select: { id: true, name: true } },
      },
    });

    // Notify workspace members
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId, status: 'active', userId: { not: userId } },
      select: { userId: true },
    });

    await this.prisma.userNotification.createMany({
      data: members.map((m: any) => ({
        tenantId,
        userId: m.userId,
        workspaceId,
        type: 'DOCUMENT_UPLOADED',
        title: 'New Document Uploaded',
        message: `${data.originalName} was uploaded`,
        data: { documentId: document.id, workspaceId, category: data.category },
      })),
    });

    await this.auditService.logAudit({
      tenantId,
      userId,
      action: 'DOCUMENT_UPLOADED',
      entityType: 'DocumentVault',
      entityId: document.id,
      metadata: { fileName: data.originalName, category: data.category },
      eventCategory: 'DATA_MODIFICATION',
    });

    return document;
  }

  async getDocument(tenantId: string, userId: string, documentId: string) {
    const document = await this.prisma.documentVault.findFirst({
      where: { id: documentId, tenantId },
      include: {
        uploader: { select: { id: true, firstName: true, lastName: true, email: true } },
        workspace: { select: { id: true, name: true, firmId: true } },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Check workspace access
    const hasAccess = await this.workspaceService.hasWorkspaceAccess(document.workspaceId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return document;
  }

  async listDocuments(tenantId: string, userId: string, workspaceId: string, filters?: {
    category?: string;
    businessId?: string;
    uploadedBy?: string;
    search?: string;
  }) {
    // Check access
    const hasAccess = await this.workspaceService.hasWorkspaceAccess(workspaceId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const where: any = { workspaceId, status: 'active' };
    
    if (filters?.category) where.category = filters.category;
    if (filters?.businessId) where.businessId = filters.businessId;
    if (filters?.uploadedBy) where.uploadedBy = filters.uploadedBy;
    if (filters?.search) {
      where.OR = [
        { fileName: { contains: filters.search, mode: 'insensitive' } },
        { originalName: { contains: filters.search, mode: 'insensitive' } },
        { tags: { hasSome: [filters.search] } },
      ];
    }

    return this.prisma.documentVault.findMany({
      where,
      include: {
        uploader: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateDocument(tenantId: string, userId: string, documentId: string, data: {
    tags?: string[];
    notes?: string;
    businessId?: string;
  }) {
    const document = await this.getDocument(tenantId, userId, documentId);

    const updated = await this.prisma.documentVault.update({
      where: { id: documentId },
      data: {
        ...(data.tags && { tags: data.tags }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.businessId !== undefined && { businessId: data.businessId }),
      },
    });

    await this.auditService.logAudit({
      tenantId,
      userId,
      action: 'DOCUMENT_UPDATED',
      entityType: 'DocumentVault',
      entityId: documentId,
      eventCategory: 'DATA_MODIFICATION',
    });

    return updated;
  }

  async deleteDocument(tenantId: string, userId: string, documentId: string) {
    const document = await this.getDocument(tenantId, userId, documentId);
    
    // Check if user is ADMIN, CA, or the uploader
    const role = await this.workspaceService.getUserWorkspaceRole(document.workspaceId, userId);
    if (!['ADMIN', 'CA'].includes(role || '') && document.uploadedBy !== userId) {
      throw new ForbiddenException('Cannot delete this document');
    }

    // Soft delete
    await this.prisma.documentVault.update({
      where: { id: documentId },
      data: { status: 'deleted', deletedAt: new Date() },
    });

    await this.auditService.logAudit({
      tenantId,
      userId,
      action: 'DOCUMENT_DELETED',
      entityType: 'DocumentVault',
      entityId: documentId,
      eventCategory: 'DATA_MODIFICATION',
    });

    return { success: true };
  }
}
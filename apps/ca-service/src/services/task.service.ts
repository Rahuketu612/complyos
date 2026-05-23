import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceService } from './workspace.service';
import { AuditService } from './audit.service';

@Injectable()
export class TaskService {
  constructor(
    private prisma: PrismaService,
    private workspaceService: WorkspaceService,
    private auditService: AuditService,
  ) {}

  async createTask(tenantId: string, userId: string, workspaceId: string, data: {
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    complianceType?: string;
    dueDate?: Date;
    assignedTo?: string;
    linkedBusinessId?: string;
    notes?: string;
  }) {
    // Check access
    const hasAccess = await this.workspaceService.hasWorkspaceAccess(workspaceId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const task = await this.prisma.complianceTask.create({
      data: {
        tenantId,
        workspaceId,
        title: data.title,
        description: data.description,
        status: (data.status as any) || 'PENDING',
        priority: (data.priority as any) || 'MEDIUM',
        complianceType: (data.complianceType as any) || 'GST',
        dueDate: data.dueDate,
        assignedTo: data.assignedTo,
        createdBy: userId,
        linkedBusinessId: data.linkedBusinessId,
        notes: data.notes,
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        creator: { select: { id: true, firstName: true, lastName: true, email: true } },
        business: { select: { id: true, name: true } },
      },
    });

    // Notify assignee if set
    if (data.assignedTo) {
      await this.prisma.userNotification.create({
        data: {
          tenantId,
          userId: data.assignedTo,
          workspaceId,
          type: 'TASK_ASSIGNED',
          title: 'New Task Assigned',
          message: `You have been assigned: ${data.title}`,
          data: { taskId: task.id, workspaceId },
        },
      });
    }

    await this.auditService.logAudit({
      tenantId,
      userId,
      action: 'TASK_CREATED',
      entityType: 'ComplianceTask',
      entityId: task.id,
      success: true,
      eventCategory: 'DATA_MODIFICATION',
    });

    return task;
  }

  async getTask(tenantId: string, userId: string, taskId: string) {
    const task = await this.prisma.complianceTask.findFirst({
      where: { id: taskId, tenantId },
      include: {
        workspace: { select: { id: true, name: true, firmId: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        creator: { select: { id: true, firstName: true, lastName: true, email: true } },
        business: { select: { id: true, name: true } },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check workspace access
    const hasAccess = await this.workspaceService.hasWorkspaceAccess(task.workspaceId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return task;
  }

  async listTasks(tenantId: string, userId: string, workspaceId: string, filters?: {
    status?: string;
    priority?: string;
    complianceType?: string;
    assignedTo?: string;
    dueBefore?: Date;
    dueAfter?: Date;
  }) {
    // Check access
    const hasAccess = await this.workspaceService.hasWorkspaceAccess(workspaceId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const where: any = { workspaceId };
    
    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.complianceType) where.complianceType = filters.complianceType;
    if (filters?.assignedTo) where.assignedTo = filters.assignedTo;
    if (filters?.dueBefore) where.dueDate = { ...where.dueDate, lte: filters.dueBefore };
    if (filters?.dueAfter) where.dueDate = { ...where.dueDate, gte: filters.dueAfter };

    return this.prisma.complianceTask.findMany({
      where,
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        creator: { select: { id: true, firstName: true, lastName: true, email: true } },
        business: { select: { id: true, name: true } },
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
      ],
    });
  }

  async updateTask(tenantId: string, userId: string, taskId: string, data: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    complianceType?: string;
    dueDate?: Date;
    assignedTo?: string;
    notes?: string;
  }) {
    const task = await this.getTask(tenantId, userId, taskId);
    
    const updated = await this.prisma.complianceTask.update({
      where: { id: taskId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status && { 
          status: data.status as any,
          ...(data.status === 'COMPLETED' && { completedAt: new Date() }),
        }),
        ...(data.priority && { priority: data.priority as any }),
        ...(data.complianceType && { complianceType: data.complianceType as any }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
        ...(data.assignedTo !== undefined && { assignedTo: data.assignedTo }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        creator: { select: { id: true, firstName: true, lastName: true, email: true } },
        business: { select: { id: true, name: true } },
      },
    });

    // Notify if reassigned
    if (data.assignedTo && data.assignedTo !== task.assignedTo) {
      await this.prisma.userNotification.create({
        data: {
          tenantId,
          userId: data.assignedTo,
          workspaceId: task.workspaceId,
          type: 'TASK_ASSIGNED',
          title: 'Task Reassigned',
          message: `You have been assigned: ${updated.title}`,
          data: { taskId: updated.id, workspaceId: task.workspaceId },
        },
      });
    }

    await this.auditService.logAudit({
      tenantId,
      userId,
      action: 'TASK_UPDATED',
      entityType: 'ComplianceTask',
      entityId: taskId,
      eventCategory: 'DATA_MODIFICATION',
    });

    return updated;
  }

  async deleteTask(tenantId: string, userId: string, taskId: string) {
    const task = await this.getTask(tenantId, userId, taskId);
    
    // Check if user is ADMIN or CA
    const role = await this.workspaceService.getUserWorkspaceRole(task.workspaceId, userId);
    if (!['ADMIN', 'CA'].includes(role || '')) {
      throw new ForbiddenException('Only ADMIN or CA can delete tasks');
    }

    await this.prisma.complianceTask.delete({ where: { id: taskId } });

    await this.auditService.logAudit({
      tenantId,
      userId,
      action: 'TASK_DELETED',
      entityType: 'ComplianceTask',
      entityId: taskId,
      eventCategory: 'DATA_MODIFICATION',
    });

    return { success: true };
  }

  async getMyTasks(tenantId: string, userId: string) {
    return this.prisma.complianceTask.findMany({
      where: {
        tenantId,
        assignedTo: userId,
        status: { not: 'COMPLETED' },
      },
      include: {
        workspace: { select: { id: true, name: true } },
        business: { select: { id: true, name: true } },
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
      ],
    });
  }
}
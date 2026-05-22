import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';

@Injectable()
export class WorkspaceService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // Firm operations
  async createFirm(tenantId: string, userId: string, data: { name: string; email?: string; phone?: string; gstin?: string; pan?: string; firmType?: string }) {
    const firm = await this.prisma.firm.create({
      data: {
        tenantId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        gstin: data.gstin,
        pan: data.pan,
        firmType: data.firmType,
        caMemberId: userId,
      },
    });

    await this.auditService.logAudit({
      tenantId,
      userId,
      action: 'FIRM_CREATED',
      entityType: 'Firm',
      entityId: firm.id,
      eventCategory: 'ADMIN_ACTION',
    });

    return firm;
  }

  async getFirm(tenantId: string, firmId: string) {
    const firm = await this.prisma.firm.findFirst({
      where: { id: firmId, tenantId },
      include: {
        workspaces: {
          include: {
            business: true,
            members: {
              include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
            },
          },
        },
      },
    });

    if (!firm) {
      throw new NotFoundException('Firm not found');
    }

    return firm;
  }

  async listFirms(tenantId: string) {
    return this.prisma.firm.findMany({
      where: { tenantId },
      include: {
        workspaces: true,
        _count: { select: { workspaces: true, workspaceMembers: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Workspace operations
  async createWorkspace(tenantId: string, userId: string, firmId: string, data: { name: string; description?: string; businessId?: string }) {
    // Verify user is ADMIN or CA in this firm
    const isAdmin = await this.isFirmAdmin(firmId, userId);
    if (!isAdmin) {
      throw new ForbiddenException('Only firm admin can create workspaces');
    }

    const workspace = await this.prisma.clientWorkspace.create({
      data: {
        tenantId,
        firmId,
        name: data.name,
        description: data.description,
        businessId: data.businessId,
      },
    });

    // Add creator as ADMIN
    await this.prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId,
        firmId,
        role: 'ADMIN',
        status: 'active',
        invitedBy: userId,
      },
    });

    await this.auditService.logAudit({
      tenantId,
      userId,
      action: 'WORKSPACE_CREATED',
      entityType: 'ClientWorkspace',
      entityId: workspace.id,
      eventCategory: 'ADMIN_ACTION',
    });

    return workspace;
  }

  async getWorkspace(tenantId: string, workspaceId: string, userId: string) {
    // Check access
    const member = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId, status: 'active' },
    });

    if (!member) {
      throw new ForbiddenException('Access denied to this workspace');
    }

    const workspace = await this.prisma.clientWorkspace.findFirst({
      where: { id: workspaceId, tenantId },
      include: {
        firm: true,
        business: true,
        members: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
        tasks: { take: 5, orderBy: { dueDate: 'asc' } },
        documents: { take: 5, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return { ...workspace, currentUserRole: member.role };
  }

  async listWorkspaces(tenantId: string, userId: string) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId, status: 'active' },
      include: {
        workspace: {
          include: {
            firm: true,
            business: true,
            _count: { select: { tasks: true, documents: true } },
          },
        },
      },
    });

    return memberships.map((m: any) => ({
      ...m.workspace,
      role: m.role,
    }));
  }

  async addMember(tenantId: string, userId: string, workspaceId: string, memberData: { email: string; role: string }) {
    // Check if current user can add members
    const currentMember = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId, status: 'active' },
    });

    if (!currentMember || !['ADMIN', 'CA'].includes(currentMember.role)) {
      throw new ForbiddenException('Cannot add members');
    }

    // Find user by email
    const newUser = await this.prisma.user.findFirst({
      where: { tenantId, email: memberData.email },
    });

    if (!newUser) {
      throw new NotFoundException('User not found in this tenant');
    }

    const member = await this.prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: newUser.id,
        firmId: currentMember.firmId,
        role: memberData.role as any,
        status: 'active',
        invitedBy: userId,
      },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });

    // Create notification
    await this.prisma.userNotification.create({
      data: {
        tenantId,
        userId: newUser.id,
        workspaceId,
        type: 'WORKSPACE_INVITE',
        title: 'Workspace Invitation',
        message: `You have been invited to workspace`,
        data: { workspaceId, role: memberData.role, invitedBy: userId },
      },
    });

    await this.auditService.logAudit({
      tenantId,
      userId,
      action: 'MEMBER_ADDED',
      entityType: 'WorkspaceMember',
      entityId: member.id,
      metadata: { newUserId: newUser.id, role: memberData.role },
      eventCategory: 'DATA_MODIFICATION',
    });

    return member;
  }

  async isFirmAdmin(firmId: string, userId: string): Promise<boolean> {
    const firm = await this.prisma.firm.findFirst({
      where: { id: firmId, caMemberId: userId },
    });
    return !!firm;
  }

  async hasWorkspaceAccess(workspaceId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId, status: 'active' },
    });
    return !!member;
  }

  async getUserWorkspaceRole(workspaceId: string, userId: string): Promise<string | null> {
    const member = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId, status: 'active' },
    });
    return member?.role || null;
  }
}
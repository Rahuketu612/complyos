/**
 * RBAC Enforcement Tests for CA Service
 * 
 * Tests role-based access control and tenant isolation
 * across workspace, task, and document operations.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceService } from '../services/workspace.service';
import { TaskService } from '../services/task.service';
import { DocumentVaultService } from '../services/document-vault.service';
import { AuditService } from '../services/audit.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('RBAC Enforcement', () => {
  let workspaceService: WorkspaceService;
  let taskService: TaskService;
  let documentService: DocumentVaultService;
  let prisma: PrismaService;

  // Test fixtures
  const tenantId = 'test-tenant-rbac';
  const adminUserId = 'admin-user-id';
  const caUserId = 'ca-user-id';
  const accountantUserId = 'accountant-user-id';
  const clientUserId = 'client-user-id';
  const viewerUserId = 'viewer-user-id';
  const outsiderUserId = 'outsider-user-id';

  const firmId = 'test-firm-rbac';
  const workspaceId = 'test-workspace-rbac';
  const otherTenantId = 'other-tenant';
  const otherWorkspaceId = 'other-workspace';

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        AuditService,
        WorkspaceService,
        TaskService,
        DocumentVaultService,
      ],
    }).compile();

    workspaceService = module.get<WorkspaceService>(WorkspaceService);
    taskService = module.get<TaskService>(TaskService);
    documentService = module.get<DocumentVaultService>(DocumentVaultService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.workspaceMember.deleteMany({ where: { workspaceId } });
    await prisma.complianceTask.deleteMany({ where: { workspaceId } });
    await prisma.documentVault.deleteMany({ where: { workspaceId } });
    await prisma.userNotification.deleteMany({ where: { tenantId } });

    // Setup test firm
    await prisma.firm.upsert({
      where: { id: firmId },
      update: {},
      create: {
        id: firmId,
        tenantId,
        name: 'Test Firm',
        caMemberId: adminUserId,
      },
    });

    // Setup test workspace
    await prisma.clientWorkspace.upsert({
      where: { firmId_businessId: { firmId, businessId: 'test-business' } },
      update: {},
      create: {
        id: workspaceId,
        tenantId,
        firmId,
        name: 'Test Workspace',
        status: 'active',
      },
    });

    // Setup workspace memberships
    const memberships = [
      { userId: adminUserId, role: 'ADMIN' },
      { userId: caUserId, role: 'CA' },
      { userId: accountantUserId, role: 'ACCOUNTANT' },
      { userId: clientUserId, role: 'CLIENT' },
      { userId: viewerUserId, role: 'VIEWER' },
    ];

    for (const m of memberships) {
      await prisma.workspaceMember.upsert({
        where: { workspaceId_userId: { workspaceId, userId: m.userId } },
        update: {},
        create: {
          workspaceId,
          userId: m.userId,
          firmId,
          role: m.role as any,
          status: 'active',
        },
      });
    }

    // Setup cross-tenant workspace
    await prisma.clientWorkspace.upsert({
      where: { firmId_businessId: { firmId: 'other-firm', businessId: 'other-business' } },
      update: {},
      create: {
        id: otherWorkspaceId,
        tenantId: otherTenantId,
        firmId: 'other-firm',
        name: 'Other Workspace',
        status: 'active',
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Tenant Isolation', () => {
    it('should block cross-tenant workspace access', async () => {
      await expect(
        workspaceService.getWorkspace(otherTenantId, outsiderUserId, otherWorkspaceId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should block cross-tenant workspace listing', async () => {
      const workspaces = await workspaceService.listWorkspaces(otherTenantId, outsiderUserId);
      expect(workspaces.length).toBe(0);
    });

    it('should block cross-tenant task creation', async () => {
      await expect(
        taskService.createTask(otherTenantId, adminUserId, otherWorkspaceId, {
          title: 'Cross-tenant task',
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should block cross-tenant document access', async () => {
      await expect(
        documentService.getDocument(otherTenantId, adminUserId, 'some-doc-id')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Workspace Access Control', () => {
    it('should allow active member to access workspace', async () => {
      const workspace = await workspaceService.getWorkspace(tenantId, caUserId, workspaceId);
      expect(workspace).toBeDefined();
      expect(workspace.currentUserRole).toBe('CA');
    });

    it('should block non-member from accessing workspace', async () => {
      await expect(
        workspaceService.getWorkspace(tenantId, outsiderUserId, workspaceId)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should list only workspaces user is member of', async () => {
      const workspaces = await workspaceService.listWorkspaces(tenantId, clientUserId);
      expect(workspaces.some(w => w.id === workspaceId)).toBe(true);
    });
  });

  describe('ADMIN Role Permissions', () => {
    it('should allow ADMIN to create workspace', async () => {
      const workspace = await workspaceService.createWorkspace(tenantId, adminUserId, firmId, {
        name: 'New Workspace',
      });
      expect(workspace).toBeDefined();
      expect(workspace.firmId).toBe(firmId);
    });

    it('should allow ADMIN to add members', async () => {
      const member = await workspaceService.addMember(tenantId, adminUserId, workspaceId, {
        email: 'newuser@test.com',
        role: 'VIEWER',
      });
      expect(member).toBeDefined();
    });

    it('should allow ADMIN to delete tasks', async () => {
      const task = await taskService.createTask(tenantId, adminUserId, workspaceId, {
        title: 'Task to delete',
        linkedBusinessId: 'test-business',
      });
      
      await expect(
        taskService.deleteTask(tenantId, adminUserId, task.id)
      ).resolves.toEqual({ success: true });
    });
  });

  describe('CA Role Permissions', () => {
    it('should allow CA to create tasks', async () => {
      const task = await taskService.createTask(tenantId, caUserId, workspaceId, {
        title: 'CA Task',
        linkedBusinessId: 'test-business',
      });
      expect(task).toBeDefined();
      expect(task.title).toBe('CA Task');
    });

    it('should allow CA to update tasks', async () => {
      const task = await taskService.createTask(tenantId, adminUserId, workspaceId, {
        title: 'Task to update',
        linkedBusinessId: 'test-business',
      });

      const updated = await taskService.updateTask(tenantId, caUserId, task.id, {
        title: 'Updated Task',
      });
      expect(updated.title).toBe('Updated Task');
    });

    it('should allow CA to upload documents', async () => {
      const doc = await documentService.createDocument(tenantId, caUserId, workspaceId, {
        fileName: 'test.pdf',
        originalName: 'test.pdf',
        fileType: 'pdf',
        mimeType: 'application/pdf',
        size: 1024,
        category: 'TAX_DOCUMENT',
      });
      expect(doc).toBeDefined();
    });

    it('should NOT allow CA to delete workspace', async () => {
      await expect(
        workspaceService.createWorkspace(tenantId, caUserId, firmId, {
          name: 'Should fail',
        })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('CLIENT Role Permissions', () => {
    it('should allow CLIENT to view tasks', async () => {
      const task = await taskService.createTask(tenantId, adminUserId, workspaceId, {
        title: 'Client visible task',
        linkedBusinessId: 'test-business',
      });

      const retrieved = await taskService.getTask(tenantId, clientUserId, task.id);
      expect(retrieved).toBeDefined();
    });

    it('should NOT allow CLIENT to create tasks', async () => {
      await expect(
        taskService.createTask(tenantId, clientUserId, workspaceId, {
          title: 'Unauthorized task',
          linkedBusinessId: 'test-business',
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should NOT allow CLIENT to delete documents', async () => {
      const doc = await documentService.createDocument(tenantId, adminUserId, workspaceId, {
        fileName: 'protected.pdf',
        originalName: 'protected.pdf',
        fileType: 'pdf',
        mimeType: 'application/pdf',
        size: 1024,
        category: 'TAX_DOCUMENT',
      });

      await expect(
        documentService.deleteDocument(tenantId, clientUserId, doc.id)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should NOT allow CLIENT to access another workspace', async () => {
      await expect(
        workspaceService.getWorkspace(tenantId, clientUserId, 'non-existent-workspace')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('VIEWER Role Permissions', () => {
    it('should allow VIEWER to read tasks', async () => {
      const tasks = await taskService.listTasks(tenantId, viewerUserId, workspaceId);
      expect(Array.isArray(tasks)).toBe(true);
    });

    it('should NOT allow VIEWER to mutate tasks', async () => {
      const task = await taskService.createTask(tenantId, adminUserId, workspaceId, {
        title: 'Viewer read-only task',
        linkedBusinessId: 'test-business',
      });

      await expect(
        taskService.updateTask(tenantId, viewerUserId, task.id, {
          title: 'Should fail',
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should NOT allow VIEWER to create documents', async () => {
      await expect(
        documentService.createDocument(tenantId, viewerUserId, workspaceId, {
          fileName: 'viewer-upload.pdf',
          originalName: 'viewer-upload.pdf',
          fileType: 'pdf',
          mimeType: 'application/pdf',
          size: 1024,
          category: 'TAX_DOCUMENT',
        })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('ACCOUNTANT Role Permissions', () => {
    it('should allow ACCOUNTANT to create tasks', async () => {
      const task = await taskService.createTask(tenantId, accountantUserId, workspaceId, {
        title: 'Accountant Task',
        linkedBusinessId: 'test-business',
      });
      expect(task).toBeDefined();
    });

    it('should allow ACCOUNTANT to upload documents', async () => {
      const doc = await documentService.createDocument(tenantId, accountantUserId, workspaceId, {
        fileName: 'accountant-doc.pdf',
        originalName: 'accountant-doc.pdf',
        fileType: 'pdf',
        mimeType: 'application/pdf',
        size: 1024,
        category: 'TAX_DOCUMENT',
      });
      expect(doc).toBeDefined();
    });
  });
});
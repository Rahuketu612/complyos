/**
 * Communication Workflow Tests
 * 
 * Tests for:
 * - Internal notes visibility (CLIENT vs CA/ADMIN)
 * - Tenant isolation for communication threads
 * - Evidence request lifecycle
 * - AI summary integration
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CommunicationService } from '../services/communication.service';
import { AuditService } from '../services/audit.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('Communication Workflow', () => {
  let communicationService: CommunicationService;
  let prisma: PrismaService;

  // Test fixtures
  const tenantId = 'test-tenant-comm';
  const adminUserId = 'admin-user-id';
  const caUserId = 'ca-user-id';
  const clientUserId = 'client-user-id';
  const otherTenantId = 'other-tenant';
  const workspaceId = 'test-workspace-comm';
  const otherWorkspaceId = 'other-workspace';

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        AuditService,
        CommunicationService,
      ],
    }).compile();

    communicationService = module.get<CommunicationService>(CommunicationService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.communicationMessage.deleteMany({ where: { tenantId } });
    await prisma.communicationThread.deleteMany({ where: { tenantId } });
    await prisma.evidenceRequest.deleteMany({ where: { tenantId } });

    // Setup test users
    await prisma.user.upsert({
      where: { tenantId_email: { tenantId, email: 'admin@test.com' } },
      update: {},
      create: {
        id: adminUserId,
        tenantId,
        email: 'admin@test.com',
        passwordHash: 'hash',
        firstName: 'Admin',
        lastName: 'User',
        role: 'organization_admin',
        status: 'active',
        emailVerified: true,
      },
    });

    await prisma.user.upsert({
      where: { tenantId_email: { tenantId, email: 'ca@test.com' } },
      update: {},
      create: {
        id: caUserId,
        tenantId,
        email: 'ca@test.com',
        passwordHash: 'hash',
        firstName: 'CA',
        lastName: 'User',
        role: 'CA',
        status: 'active',
        emailVerified: true,
      },
    });

    await prisma.user.upsert({
      where: { tenantId_email: { tenantId, email: 'client@test.com' } },
      update: {},
      create: {
        id: clientUserId,
        tenantId,
        email: 'client@test.com',
        passwordHash: 'hash',
        firstName: 'Client',
        lastName: 'User',
        role: 'CLIENT',
        status: 'active',
        emailVerified: true,
      },
    });

    // Setup workspace
    await prisma.clientWorkspace.upsert({
      where: { firmId_businessId: { firmId: 'firm-comm', businessId: 'test-business' } },
      update: {},
      create: {
        id: workspaceId,
        tenantId,
        firmId: 'firm-comm',
        name: 'Test Workspace',
        status: 'active',
      },
    });
  });

  describe('Thread Creation', () => {
    it('should create a communication thread', async () => {
      const thread = await communicationService.createThread({
        tenantId,
        workspaceId,
        subject: 'Test Thread',
        type: 'GENERAL',
        createdBy: adminUserId,
      });

      expect(thread).toBeDefined();
      expect(thread.id).toBeDefined();
      expect(thread.subject).toBe('Test Thread');
      expect(thread.status).toBe('OPEN');
      expect(thread.type).toBe('GENERAL');
    });

    it('should create thread with initial system message', async () => {
      const thread = await communicationService.createThread({
        tenantId,
        workspaceId,
        subject: 'Thread with Message',
        type: 'NOTICE',
        createdBy: caUserId,
      });

      expect(thread.messages).toBeDefined();
      expect(thread.messages.length).toBeGreaterThan(0);
      expect(thread.messages[0].messageType).toBe('SYSTEM');
      expect(thread.messages[0].senderRole).toBe('ca');
    });
  });

  describe('Internal Notes Visibility', () => {
    let threadId: string;

    beforeEach(async () => {
      const thread = await communicationService.createThread({
        tenantId,
        workspaceId,
        subject: 'Internal Note Test',
        type: 'GENERAL',
        createdBy: adminUserId,
      });
      threadId = thread.id;

      // Add public message
      await communicationService.addMessage({
        tenantId,
        threadId,
        senderId: caUserId,
        message: 'This is a public message',
        isInternalNote: false,
      });

      // Add internal note
      await communicationService.addMessage({
        tenantId,
        threadId,
        senderId: caUserId,
        message: 'This is an internal note - strategy discussion',
        isInternalNote: true,
      });
    });

    it('should NOT include internal notes when includeInternal is false', async () => {
      const thread = await communicationService.getThread({
        tenantId,
        threadId,
        includeInternal: false,
      });

      const internalNotes = thread.messages.filter(m => m.isInternalNote);
      expect(internalNotes.length).toBe(0);

      const publicMessages = thread.messages.filter(m => !m.isInternalNote);
      expect(publicMessages.length).toBeGreaterThan(0);
    });

    it('should include internal notes when includeInternal is true', async () => {
      const thread = await communicationService.getThread({
        tenantId,
        threadId,
        includeInternal: true,
      });

      const internalNotes = thread.messages.filter(m => m.isInternalNote);
      expect(internalNotes.length).toBeGreaterThan(0);
    });

    it('should allow CA to create internal note', async () => {
      const message = await communicationService.addMessage({
        tenantId,
        threadId,
        senderId: caUserId,
        message: 'CA internal strategy note',
        isInternalNote: true,
      });

      expect(message.isInternalNote).toBe(true);
      expect(message.senderRole).toBe('ca');
    });

    it('should not filter by internal status when fetching messages without filter', async () => {
      const result = await communicationService.getMessages({
        tenantId,
        threadId,
        includeInternal: false,
        limit: 10,
      });

      // Only public messages
      const hasInternal = result.messages.some(m => m.isInternalNote);
      expect(hasInternal).toBe(false);
    });
  });

  describe('Tenant Isolation', () => {
    beforeAll(async () => {
      // Setup other tenant workspace
      await prisma.clientWorkspace.upsert({
        where: { firmId_businessId: { firmId: 'firm-other', businessId: 'other-business' } },
        update: {},
        create: {
          id: otherWorkspaceId,
          tenantId: otherTenantId,
          firmId: 'firm-other',
          name: 'Other Tenant Workspace',
          status: 'active',
        },
      });
    });

    it('should block access to thread from different tenant', async () => {
      // Create thread in tenant 1
      const thread = await communicationService.createThread({
        tenantId,
        workspaceId,
        subject: 'Tenant Isolation Test',
        type: 'GENERAL',
        createdBy: adminUserId,
      });

      // Try to access from tenant 2
      await expect(
        communicationService.getThread({
          tenantId: otherTenantId,
          threadId: thread.id,
          includeInternal: false,
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should block listing threads from different tenant', async () => {
      // Create thread in tenant 1
      await communicationService.createThread({
        tenantId,
        workspaceId,
        subject: 'Private Thread',
        type: 'GENERAL',
        createdBy: adminUserId,
      });

      // List threads for tenant 2 - should not see tenant 1 threads
      const result = await communicationService.getThreads({
        tenantId: otherTenantId,
        workspaceId: otherWorkspaceId,
      });

      const privateThread = result.threads.find(t => t.subject === 'Private Thread');
      expect(privateThread).toBeUndefined();
    });

    it('should block adding message to thread from different tenant', async () => {
      const thread = await communicationService.createThread({
        tenantId,
        workspaceId,
        subject: 'Cross Tenant Message Test',
        type: 'GENERAL',
        createdBy: adminUserId,
      });

      // Try to add message from different tenant
      await expect(
        communicationService.addMessage({
          tenantId: otherTenantId,
          threadId: thread.id,
          senderId: adminUserId,
          message: 'Unauthorized message',
        })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Evidence Request Lifecycle', () => {
    let threadId: string;

    beforeEach(async () => {
      const thread = await communicationService.createThread({
        tenantId,
        workspaceId,
        subject: 'Evidence Lifecycle Test',
        type: 'DOCUMENT_REQUEST',
        createdBy: caUserId,
      });
      threadId = thread.id;
    });

    it('should create evidence request with REQUESTED status', async () => {
      const request = await communicationService.createEvidenceRequest({
        tenantId,
        workspaceId,
        requesterId: caUserId,
        title: 'Bank Statements',
        description: 'FY 2024-25 bank statements',
        threadId,
      });

      expect(request.status).toBe('REQUESTED');
      expect(request.title).toBe('Bank Statements');
      expect(request.threadId).toBe(threadId);
    });

    it('should update status to UPLOADED with document', async () => {
      // Create evidence request
      const request = await communicationService.createEvidenceRequest({
        tenantId,
        workspaceId,
        requesterId: caUserId,
        title: 'Invoice Copy',
        threadId,
      });

      // Update to UPLOADED
      const updated = await communicationService.updateEvidenceStatus({
        tenantId,
        requestId: request.id,
        status: 'UPLOADED',
        userId: caUserId,
        documentId: 'doc-123',
      });

      expect(updated.status).toBe('UPLOADED');
      expect(updated.documentId).toBe('doc-123');
      expect(updated.uploadedAt).toBeDefined();
    });

    it('should update status to VERIFIED', async () => {
      const request = await communicationService.createEvidenceRequest({
        tenantId,
        workspaceId,
        requesterId: caUserId,
        title: 'GST Returns',
        threadId,
      });

      // Mark as uploaded first
      await communicationService.updateEvidenceStatus({
        tenantId,
        requestId: request.id,
        status: 'UPLOADED',
        userId: caUserId,
        documentId: 'doc-456',
      });

      // Verify
      const verified = await communicationService.updateEvidenceStatus({
        tenantId,
        requestId: request.id,
        status: 'VERIFIED',
        userId: caUserId,
      });

      expect(verified.status).toBe('VERIFIED');
      expect(verified.verifiedAt).toBeDefined();
      expect(verified.verifiedBy).toBe(caUserId);
    });

    it('should update status to REJECTED with reason', async () => {
      const request = await communicationService.createEvidenceRequest({
        tenantId,
        workspaceId,
        requesterId: caUserId,
        title: 'Contract',
        threadId,
      });

      const rejected = await communicationService.updateEvidenceStatus({
        tenantId,
        requestId: request.id,
        status: 'REJECTED',
        userId: caUserId,
        rejectReason: 'Document is blurry and illegible',
      });

      expect(rejected.status).toBe('REJECTED');
      expect(rejected.rejectReason).toBe('Document is blurry and illegible');
    });

    it('should list evidence requests for thread', async () => {
      await communicationService.createEvidenceRequest({
        tenantId,
        workspaceId,
        requesterId: caUserId,
        title: 'Doc 1',
        threadId,
      });

      await communicationService.createEvidenceRequest({
        tenantId,
        workspaceId,
        requesterId: caUserId,
        title: 'Doc 2',
        threadId,
      });

      const requests = await communicationService.getEvidenceRequests({
        tenantId,
        threadId,
      });

      expect(requests.length).toBe(2);
    });

    it('should filter evidence by status', async () => {
      const req1 = await communicationService.createEvidenceRequest({
        tenantId,
        workspaceId,
        requesterId: caUserId,
        title: 'Pending Doc',
        threadId,
      });

      await communicationService.updateEvidenceStatus({
        tenantId,
        requestId: req1.id,
        status: 'UPLOADED',
        userId: caUserId,
        documentId: 'doc-789',
      });

      // Get only requested
      const requested = await communicationService.getEvidenceRequests({
        tenantId,
        threadId,
        status: 'REQUESTED',
      });

      expect(requested.every(r => r.status === 'REQUESTED')).toBe(true);
    });
  });

  describe('Thread Status Management', () => {
    let threadId: string;

    beforeEach(async () => {
      const thread = await communicationService.createThread({
        tenantId,
        workspaceId,
        subject: 'Status Test',
        type: 'GENERAL',
        createdBy: adminUserId,
      });
      threadId = thread.id;
    });

    it('should update thread status', async () => {
      const updated = await communicationService.updateThreadStatus({
        tenantId,
        threadId,
        status: 'WAITING_CLIENT',
        userId: adminUserId,
      });

      expect(updated.status).toBe('WAITING_CLIENT');
    });

    it('should set resolvedAt when status is RESOLVED', async () => {
      const updated = await communicationService.updateThreadStatus({
        tenantId,
        threadId,
        status: 'RESOLVED',
        userId: adminUserId,
      });

      expect(updated.status).toBe('RESOLVED');
      expect(updated.resolvedAt).toBeDefined();
    });

    it('should add system message on status change', async () => {
      await communicationService.updateThreadStatus({
        tenantId,
        threadId,
        status: 'WAITING_INTERNAL',
        userId: caUserId,
      });

      const thread = await communicationService.getThread({
        tenantId,
        threadId,
        includeInternal: true,
      });

      const statusChangeMessages = thread.messages.filter(
        m => m.messageType === 'SYSTEM' && m.message.includes('WAITING_INTERNAL')
      );
      expect(statusChangeMessages.length).toBeGreaterThan(0);
    });
  });

  describe('Thread Assignment', () => {
    let threadId: string;

    beforeEach(async () => {
      const thread = await communicationService.createThread({
        tenantId,
        workspaceId,
        subject: 'Assignment Test',
        type: 'TASK',
        createdBy: adminUserId,
      });
      threadId = thread.id;
    });

    it('should assign thread to user', async () => {
      const updated = await communicationService.assignThread({
        tenantId,
        threadId,
        assignedTo: caUserId,
        userId: adminUserId,
      });

      expect(updated.assignedTo).toBe(caUserId);
    });

    it('should add system message on assignment', async () => {
      await communicationService.assignThread({
        tenantId,
        threadId,
        assignedTo: caUserId,
        userId: adminUserId,
      });

      const thread = await communicationService.getThread({
        tenantId,
        threadId,
        includeInternal: true,
      });

      const assignmentMessages = thread.messages.filter(
        m => m.messageType === 'SYSTEM' && m.message.includes('Assigned')
      );
      expect(assignmentMessages.length).toBeGreaterThan(0);
    });
  });

  describe('Thread Stats', () => {
    beforeEach(async () => {
      // Create threads with different statuses
      await communicationService.createThread({
        tenantId,
        workspaceId,
        subject: 'Open Thread',
        type: 'GENERAL',
        createdBy: adminUserId,
      });

      const thread2 = await communicationService.createThread({
        tenantId,
        workspaceId,
        subject: 'Waiting Client',
        type: 'NOTICE',
        createdBy: adminUserId,
      });
      await communicationService.updateThreadStatus({
        tenantId,
        threadId: thread2.id,
        status: 'WAITING_CLIENT',
        userId: adminUserId,
      });

      // Evidence request
      await communicationService.createEvidenceRequest({
        tenantId,
        workspaceId,
        requesterId: caUserId,
        title: 'Pending Evidence',
      });
    });

    it('should return correct thread statistics', async () => {
      const stats = await communicationService.getThreadStats({
        tenantId,
        workspaceId,
      });

      expect(stats.total).toBeGreaterThanOrEqual(2);
      expect(stats.open).toBeGreaterThanOrEqual(1);
      expect(stats.waitingClient).toBeGreaterThanOrEqual(1);
      expect(stats.pendingEvidence).toBeGreaterThanOrEqual(1);
    });
  });

  describe('AI Summary Integration', () => {
    it('should return thread summary data for AI processing', async () => {
      const thread = await communicationService.createThread({
        tenantId,
        workspaceId,
        subject: 'AI Summary Test',
        type: 'NOTICE',
        createdBy: adminUserId,
      });

      await communicationService.addMessage({
        tenantId,
        threadId: thread.id,
        senderId: caUserId,
        message: 'First message about the notice',
      });

      await communicationService.addMessage({
        tenantId,
        threadId: thread.id,
        senderId: clientUserId,
        message: 'Client response',
      });

      const summary = await communicationService.summarizeThread({
        tenantId,
        threadId: thread.id,
        userId: adminUserId,
      });

      expect(summary.threadId).toBe(thread.id);
      expect(summary.messageCount).toBeGreaterThanOrEqual(2);
      expect(summary.messageSummary).toContain('First message');
      expect(summary.messageSummary).toContain('Client response');
      expect(summary.subject).toBe('AI Summary Test');
      expect(summary.type).toBe('NOTICE');
    });
  });
});
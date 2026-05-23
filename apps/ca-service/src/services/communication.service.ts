import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommunicationService {
  constructor(private prisma: PrismaService) {}

  // ===== Thread Operations =====

  async createThread(params: {
    tenantId: string;
    workspaceId: string;
    subject: string;
    type: string;
    createdBy: string;
    businessId?: string;
    noticeId?: string;
    taskId?: string;
    documentId?: string;
    priority?: string;
    assignedTo?: string;
  }) {
    const { tenantId, workspaceId, subject, type, createdBy, businessId, noticeId, taskId, documentId, priority, assignedTo } = params;

    // Get creator info
    const creator = await this.prisma.user.findUnique({ where: { id: createdBy } });
    if (!creator) throw new NotFoundException('Creator not found');

    // Create thread with initial system message
    const thread = await this.prisma.communicationThread.create({
      data: {
        tenantId,
        workspaceId,
        businessId,
        subject,
        type: type as any,
        status: 'OPEN',
        priority: (priority || 'MEDIUM') as any,
        createdBy,
        assignedTo,
        noticeId,
        taskId,
        documentId,
        messages: {
          create: {
            tenantId,
            senderId: createdBy,
            senderRole: creator.role || 'ca',
            senderName: `${creator.firstName} ${creator.lastName}`.trim(),
            message: `Thread created: ${subject}`,
            messageType: 'SYSTEM',
            isInternalNote: false,
          },
        },
      },
      include: {
        workspace: true,
        creator: true,
        assignee: true,
        business: true,
        notice: true,
        task: true,
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    return thread;
  }

  async getThreads(params: {
    tenantId: string;
    workspaceId?: string;
    status?: string;
    type?: string;
    assignedTo?: string;
    limit?: number;
    offset?: number;
  }) {
    const { tenantId, workspaceId, status, type, assignedTo, limit = 50, offset = 0 } = params;

    const where: any = { tenantId };
    if (workspaceId) where.workspaceId = workspaceId;
    if (status) where.status = status;
    if (type) where.type = type;
    if (assignedTo) where.assignedTo = assignedTo;

    const [threads, total] = await Promise.all([
      this.prisma.communicationThread.findMany({
        where,
        include: {
          workspace: true,
          business: true,
          creator: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
          assignee: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
          notice: { select: { id: true, subject: true, severity: true, status: true } },
          _count: { select: { messages: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.communicationThread.count({ where }),
    ]);

    return { threads, total, limit, offset };
  }

  async getThread(params: {
    tenantId: string;
    threadId: string;
    includeInternal?: boolean;
  }) {
    const { tenantId, threadId, includeInternal = false } = params;

    const thread = await this.prisma.communicationThread.findFirst({
      where: { id: threadId, tenantId },
      include: {
        workspace: true,
        business: true,
        creator: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
        notice: true,
        task: true,
        messages: {
          where: includeInternal ? undefined : { isInternalNote: false },
          include: {
            sender: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
            document: { select: { id: true, fileName: true, fileType: true, category: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        evidenceRequests: {
          include: {
            document: { select: { id: true, fileName: true, fileType: true } },
            requester: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!thread) throw new NotFoundException('Thread not found');

    return thread;
  }

  async updateThreadStatus(params: {
    tenantId: string;
    threadId: string;
    status: string;
    userId: string;
  }) {
    const { tenantId, threadId, status, userId } = params;

    const thread = await this.prisma.communicationThread.findFirst({
      where: { id: threadId, tenantId },
    });
    if (!thread) throw new NotFoundException('Thread not found');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    const updated = await this.prisma.communicationThread.update({
      where: { id: threadId },
      data: {
        status: status as any,
        resolvedAt: status === 'RESOLVED' ? new Date() : undefined,
      },
    });

    // Add system message
    await this.prisma.communicationMessage.create({
      data: {
        tenantId,
        threadId,
        senderId: userId,
        senderRole: user?.role || 'system',
        senderName: user ? `${user.firstName} ${user.lastName}`.trim() : 'System',
        message: `Status changed to ${status.replace('_', ' ')}`,
        messageType: 'SYSTEM',
        isInternalNote: false,
      },
    });

    return updated;
  }

  async assignThread(params: {
    tenantId: string;
    threadId: string;
    assignedTo: string;
    userId: string;
  }) {
    const { tenantId, threadId, assignedTo, userId } = params;

    const assignee = await this.prisma.user.findUnique({ where: { id: assignedTo } });
    if (!assignee) throw new NotFoundException('Assignee not found');

    const updated = await this.prisma.communicationThread.update({
      where: { id: threadId },
      data: { assignedTo },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    await this.prisma.communicationMessage.create({
      data: {
        tenantId,
        threadId,
        senderId: userId,
        senderRole: user?.role || 'system',
        senderName: user ? `${user.firstName} ${user.lastName}`.trim() : 'System',
        message: `Assigned to ${assignee.firstName} ${assignee.lastName}`,
        messageType: 'SYSTEM',
        isInternalNote: false,
      },
    });

    return updated;
  }

  // ===== Message Operations =====

  async addMessage(params: {
    tenantId: string;
    threadId: string;
    senderId: string;
    message: string;
    messageType?: string;
    isInternalNote?: boolean;
    documentId?: string;
    correlationId?: string;
  }) {
    const { tenantId, threadId, senderId, message, messageType = 'TEXT', isInternalNote = false, documentId, correlationId } = params;

    // Verify thread exists and user has access
    const thread = await this.prisma.communicationThread.findFirst({
      where: { id: threadId, tenantId },
    });
    if (!thread) throw new NotFoundException('Thread not found');

    const sender = await this.prisma.user.findUnique({ where: { id: senderId } });
    if (!sender) throw new NotFoundException('Sender not found');

    const newMessage = await this.prisma.communicationMessage.create({
      data: {
        tenantId,
        threadId,
        senderId,
        senderRole: sender.role || 'ca',
        senderName: `${sender.firstName} ${sender.lastName}`.trim(),
        message,
        messageType: messageType as any,
        isInternalNote,
        documentId,
        correlationId,
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
        document: { select: { id: true, fileName: true, fileType: true, category: true } },
      },
    });

    // Update thread timestamp
    await this.prisma.communicationThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
    });

    return newMessage;
  }

  async getMessages(params: {
    tenantId: string;
    threadId: string;
    includeInternal?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const { tenantId, threadId, includeInternal = false, limit = 100, offset = 0 } = params;

    const where: any = { threadId, tenantId };
    if (!includeInternal) where.isInternalNote = false;

    const [messages, total] = await Promise.all([
      this.prisma.communicationMessage.findMany({
        where,
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
          document: { select: { id: true, fileName: true, fileType: true, category: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.communicationMessage.count({ where }),
    ]);

    return { messages, total };
  }

  // ===== Evidence Request Operations =====

  async createEvidenceRequest(params: {
    tenantId: string;
    workspaceId: string;
    requesterId: string;
    title: string;
    description?: string;
    dueDate?: Date;
    threadId?: string;
    noticeId?: string;
    taskId?: string;
  }) {
    const { tenantId, workspaceId, requesterId, title, description, dueDate, threadId, noticeId, taskId } = params;

    return this.prisma.evidenceRequest.create({
      data: {
        tenantId,
        workspaceId,
        requesterId,
        title,
        description,
        dueDate,
        threadId,
        noticeId,
        taskId,
        status: 'REQUESTED',
      },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true } },
        document: true,
        thread: { select: { id: true, subject: true } },
      },
    });
  }

  async getEvidenceRequests(params: {
    tenantId: string;
    workspaceId?: string;
    threadId?: string;
    status?: string;
  }) {
    const { tenantId, workspaceId, threadId, status } = params;

    const where: any = { tenantId };
    if (workspaceId) where.workspaceId = workspaceId;
    if (threadId) where.threadId = threadId;
    if (status) where.status = status;

    return this.prisma.evidenceRequest.findMany({
      where,
      include: {
        requester: { select: { id: true, firstName: true, lastName: true } },
        document: { select: { id: true, fileName: true, fileType: true, category: true } },
        thread: { select: { id: true, subject: true } },
        workspace: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateEvidenceStatus(params: {
    tenantId: string;
    requestId: string;
    status: string;
    userId: string;
    documentId?: string;
    rejectReason?: string;
  }) {
    const { tenantId, requestId, status, userId, documentId, rejectReason } = params;

    const data: any = { status: status as any };
    
    if (status === 'UPLOADED' && documentId) {
      data.documentId = documentId;
      data.uploadedAt = new Date();
    } else if (status === 'VERIFIED') {
      data.verifiedAt = new Date();
      data.verifiedBy = userId;
    } else if (status === 'REJECTED') {
      data.rejectReason = rejectReason;
    }

    return this.prisma.evidenceRequest.update({
      where: { id: requestId },
      data,
      include: {
        document: true,
        requester: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  // ===== AI Integration =====

  async summarizeThread(params: {
    tenantId: string;
    threadId: string;
    userId: string;
  }) {
    const { tenantId, threadId, userId } = params;

    const thread = await this.getThread({ tenantId, threadId, includeInternal: true });
    
    // Build summary prompt from messages
    const messageSummary = thread.messages
      .map(m => `[${m.senderRole}] ${m.senderName}: ${m.message}`)
      .join('\n');

    return {
      threadId,
      messageCount: thread.messages.length,
      messageSummary,
      subject: thread.subject,
      status: thread.status,
      type: thread.type,
    };
  }

  // ===== From Notice Integration =====

  async createThreadFromNotice(params: {
    tenantId: string;
    noticeId: string;
    userId: string;
    message?: string;
  }) {
    const { tenantId, noticeId, userId, message } = params;

    const notice = await this.prisma.notice.findFirst({
      where: { id: noticeId, tenantId },
      include: { workspace: true, business: true },
    });
    if (!notice) throw new NotFoundException('Notice not found');

    const subject = notice.subject || `Notice: ${notice.noticeType}`;
    const workspaceId = notice.workspaceId;

    const thread = await this.createThread({
      tenantId,
      workspaceId,
      subject,
      type: 'NOTICE',
      createdBy: userId,
      businessId: notice.businessId || undefined,
      noticeId,
      priority: notice.severity === 'CRITICAL' ? 'URGENT' : notice.severity === 'HIGH' ? 'HIGH' : 'MEDIUM',
    });

    if (message) {
      await this.addMessage({
        tenantId,
        threadId: thread.id,
        senderId: userId,
        message,
      });
    }

    // Create evidence request for required documents
    await this.createEvidenceRequest({
      tenantId,
      workspaceId,
      requesterId: userId,
      title: `Documents for Notice: ${subject.substring(0, 50)}`,
      description: 'Please upload all relevant documents as requested in the notice',
      dueDate: notice.responseDueDate,
      threadId: thread.id,
      noticeId,
    });

    return thread;
  }

  // ===== Stats =====

  async getThreadStats(params: { tenantId: string; workspaceId?: string }) {
    const { tenantId, workspaceId } = params;

    const where: any = { tenantId };
    if (workspaceId) where.workspaceId = workspaceId;

    const [total, open, waitingClient, waitingInternal, resolved] = await Promise.all([
      this.prisma.communicationThread.count({ where }),
      this.prisma.communicationThread.count({ where: { ...where, status: 'OPEN' } }),
      this.prisma.communicationThread.count({ where: { ...where, status: 'WAITING_CLIENT' } }),
      this.prisma.communicationThread.count({ where: { ...where, status: 'WAITING_INTERNAL' } }),
      this.prisma.communicationThread.count({ where: { ...where, status: 'RESOLVED' } }),
    ]);

    const pendingEvidence = await this.prisma.evidenceRequest.count({
      where: { tenantId, status: { in: ['REQUESTED', 'UPLOADED'] } },
    });

    return {
      total,
      open,
      waitingClient,
      waitingInternal,
      resolved,
      pendingEvidence,
    };
  }
}
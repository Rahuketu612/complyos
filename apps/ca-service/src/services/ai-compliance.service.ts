import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AIProviderService, AIActivityParams } from './ai-provider.service';

@Injectable()
export class AIComplianceService {
  constructor(
    private prisma: PrismaService,
    private aiProvider: AIProviderService,
  ) {}

  async logAIAction(params: AIActivityParams & {
    provider?: string;
    modelUsed?: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    executionTimeMs?: number;
    prompt?: string;
    response?: string;
    errorMessage?: string;
    success?: boolean;
  }) {
    return this.prisma.aIActionLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        workspaceId: params.workspaceId,
        promptType: params.promptType as any,
        entityType: params.entityType ? params.entityType as any : undefined,
        entityId: params.entityId,
        correlationId: params.correlationId,
        provider: params.provider || this.aiProvider.getProvider(),
        modelUsed: params.modelUsed,
        promptTokens: params.promptTokens,
        completionTokens: params.completionTokens,
        totalTokens: params.totalTokens,
        executionTimeMs: params.executionTimeMs,
        prompt: params.prompt,
        response: params.response,
        errorMessage: params.errorMessage,
        success: params.success !== undefined ? params.success : true,
      },
    });
  }

  // ===== Notice Summarization =====
  async summarizeNotice(tenantId: string, userId: string, noticeId: string) {
    const startTime = Date.now();

    // Get notice details
    const notice = await this.prisma.notice.findFirst({
      where: { id: noticeId, tenantId },
      include: { business: true, workspace: true },
    });

    if (!notice) {
      throw new NotFoundException('Notice not found');
    }

    if (!this.aiProvider.isEnabled()) {
      return this.getMockSummarizeResponse(notice);
    }

    const correlationId = `summarize-${noticeId}-${Date.now()}`;

    try {
      const prompt = this.buildSummarizePrompt(notice);

      const response = await this.aiProvider.generate({
        messages: [
          { role: 'system', content: this.getSummarizeSystemPrompt() },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        maxTokens: 1000,
      });

      const executionTime = Date.now() - startTime;

      // Log the action
      await this.logAIAction({
        tenantId,
        userId,
        workspaceId: notice.workspaceId,
        promptType: 'NOTICE_SUMMARIZE',
        entityType: 'NOTICE',
        entityId: noticeId,
        correlationId,
        promptTokens: response.usage?.promptTokens,
        completionTokens: response.usage?.completionTokens,
        totalTokens: response.usage?.totalTokens,
        executionTimeMs: executionTime,
        prompt: prompt.substring(0, 500),
        response: response.content,
        success: true,
      });

      return this.parseAIResponse(response.content, 'summarize');
    } catch (error: any) {
      await this.logAIAction({
        tenantId,
        userId,
        workspaceId: notice.workspaceId,
        promptType: 'NOTICE_SUMMARIZE',
        entityType: 'NOTICE',
        entityId: noticeId,
        correlationId,
        executionTimeMs: Date.now() - startTime,
        errorMessage: error.message,
        success: false,
      });

      throw error;
    }
  }

  // ===== Suggest Tasks from Notice =====
  async suggestTasksFromNotice(tenantId: string, userId: string, noticeId: string) {
    const startTime = Date.now();

    const notice = await this.prisma.notice.findFirst({
      where: { id: noticeId, tenantId },
      include: { business: true, workspace: true },
    });

    if (!notice) {
      throw new NotFoundException('Notice not found');
    }

    if (!this.aiProvider.isEnabled()) {
      return this.getMockTasksResponse(notice);
    }

    const correlationId = `suggest-tasks-${noticeId}-${Date.now()}`;

    try {
      const prompt = this.buildSuggestTasksPrompt(notice);

      const response = await this.aiProvider.generate({
        messages: [
          { role: 'system', content: this.getSuggestTasksSystemPrompt() },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        maxTokens: 800,
      });

      const executionTime = Date.now() - startTime;

      await this.logAIAction({
        tenantId,
        userId,
        workspaceId: notice.workspaceId,
        promptType: 'NOTICE_SUGGEST_TASKS',
        entityType: 'NOTICE',
        entityId: noticeId,
        correlationId,
        executionTimeMs: executionTime,
        prompt: prompt.substring(0, 500),
        response: response.content,
        success: true,
      });

      return this.parseAIResponse(response.content, 'tasks');
    } catch (error: any) {
      await this.logAIAction({
        tenantId,
        userId,
        workspaceId: notice.workspaceId,
        promptType: 'NOTICE_SUGGEST_TASKS',
        entityType: 'NOTICE',
        entityId: noticeId,
        correlationId,
        executionTimeMs: Date.now() - startTime,
        errorMessage: error.message,
        success: false,
      });

      throw error;
    }
  }

  // ===== Dashboard Insights =====
  async getDashboardInsights(tenantId: string, userId: string, workspaceId?: string) {
    const startTime = Date.now();

    if (!this.aiProvider.isEnabled()) {
      return this.getMockInsightsResponse(tenantId, workspaceId);
    }

    const correlationId = `insights-${workspaceId || 'all'}-${Date.now()}`;

    try {
      const context = await this.buildDashboardContext(tenantId, workspaceId);
      const prompt = this.buildDashboardInsightsPrompt(context);

      const response = await this.aiProvider.generate({
        messages: [
          { role: 'system', content: this.getInsightsSystemPrompt() },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        maxTokens: 1200,
      });

      const executionTime = Date.now() - startTime;

      await this.logAIAction({
        tenantId,
        userId,
        workspaceId,
        promptType: 'DASHBOARD_INSIGHTS',
        entityType: 'WORKSPACE',
        entityId: workspaceId,
        correlationId,
        executionTimeMs: executionTime,
        prompt: prompt.substring(0, 500),
        response: response.content,
        success: true,
      });

      return this.parseAIResponse(response.content, 'insights');
    } catch (error: any) {
      await this.logAIAction({
        tenantId,
        userId,
        workspaceId,
        promptType: 'DASHBOARD_INSIGHTS',
        entityType: 'WORKSPACE',
        entityId: workspaceId,
        correlationId,
        executionTimeMs: Date.now() - startTime,
        errorMessage: error.message,
        success: false,
      });

      throw error;
    }
  }

  // ===== Document Tagging =====
  async suggestDocumentTags(tenantId: string, userId: string, documentId: string) {
    const startTime = Date.now();

    const document = await this.prisma.documentVault.findFirst({
      where: { id: documentId, tenantId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (!this.aiProvider.isEnabled()) {
      return this.getMockDocumentTagResponse(document);
    }

    const correlationId = `doc-tag-${documentId}-${Date.now()}`;

    try {
      const prompt = this.buildDocumentTagPrompt(document);

      const response = await this.aiProvider.generate({
        messages: [
          { role: 'system', content: this.getDocumentTagSystemPrompt() },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        maxTokens: 500,
      });

      const executionTime = Date.now() - startTime;

      await this.logAIAction({
        tenantId,
        userId,
        workspaceId: document.workspaceId,
        promptType: 'DOCUMENT_TAG',
        entityType: 'DOCUMENT',
        entityId: documentId,
        correlationId,
        executionTimeMs: executionTime,
        prompt: prompt.substring(0, 500),
        response: response.content,
        success: true,
      });

      return this.parseAIResponse(response.content, 'document_tag');
    } catch (error: any) {
      await this.logAIAction({
        tenantId,
        userId,
        workspaceId: document.workspaceId,
        promptType: 'DOCUMENT_TAG',
        entityType: 'DOCUMENT',
        entityId: documentId,
        correlationId,
        executionTimeMs: Date.now() - startTime,
        errorMessage: error.message,
        success: false,
      });

      throw error;
    }
  }

  // ===== Helper Methods =====

  private redactSensitiveData(text: string): string {
    // Redact PAN numbers (10 chars, last char must be alphabet)
    let redacted = text.replace(/[A-Z]{10}[0-9]{3}[A-Z]/gi, '[PAN_REDACTED]');
    // Redact GSTIN (15 chars)
    redacted = redacted.replace(/[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9]{1}[A-Z]{1}[0-9A-Z]{1}/gi, '[GSTIN_REDACTED]');
    // Redact Aadhaar (12 digits)
    redacted = redacted.replace(/\b\d{12}\b/g, '[AADHAAR_REDACTED]');
    // Redact bank account numbers (9-18 digits)
    redacted = redacted.replace(/\b\d{9,18}\b/g, '[ACCOUNT_REDACTED]');
    // Redact mobile numbers
    redacted = redacted.replace(/\b[6-9]\d{9}\b/g, '[MOBILE_REDACTED]');
    return redacted;
  }

  private buildSummarizePrompt(notice: any): string {
    const redactedSummary = this.redactSensitiveData(notice.summary || '');
    const redactedGrounds = this.redactSensitiveData(notice.groundsOfNotice || '');

    return `
Notice Type: ${notice.noticeType}
Subject: ${notice.subject}
Notice Number: ${notice.noticeNumber || 'N/A'}
Issuing Authority: ${notice.issuingAuthority || 'N/A'}
Assessment Year: ${notice.assessmentYear || 'N/A'}
Severity: ${notice.severity}
Status: ${notice.status}
Received Date: ${notice.receivedDate}
Response Due Date: ${notice.responseDueDate || 'Not specified'}
Demand Amount: ${notice.demandAmount || 0}
Penalty Amount: ${notice.penaltyAmount || 0}
Total Liability: ${notice.totalLiability || 0}

Summary:
${redactedSummary}

Grounds of Notice:
${redactedGrounds}

Please analyze this notice and provide:
1. Concise summary (2-3 sentences)
2. Risk level assessment
3. Key deadlines
4. Required actions
5. Relevant legal references
`;
  }

  private buildSuggestTasksPrompt(notice: any): string {
    return `
Based on the following notice, suggest compliance tasks:

Notice Type: ${notice.noticeType}
Subject: ${notice.subject}
Severity: ${notice.severity}
Response Due Date: ${notice.responseDueDate || 'Not specified'}
Total Liability: ${notice.totalLiability || 0}

Please suggest 3-5 specific tasks with priority levels and due dates.
`;
  }

  private async buildDashboardContext(tenantId: string, workspaceId?: string) {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const where: any = { tenantId };
    if (workspaceId) where.workspaceId = workspaceId;

    const [overdueTasks, pendingNotices, recentNotices, missingReturns] = await Promise.all([
      this.prisma.complianceTask.findMany({
        where: { ...where, status: { in: ['PENDING', 'IN_PROGRESS'] }, dueDate: { lt: now } },
        include: { workspace: true },
        take: 10,
      }),
      this.prisma.notice.findMany({
        where: { ...where, status: { notIn: ['RESPONSE_FILED', 'CLOSED'] }, responseDueDate: { lt: now } },
        include: { business: true },
        take: 5,
      }),
      this.prisma.notice.findMany({
        where: { ...where, createdAt: { gte: weekAgo } },
        include: { business: true },
        take: 10,
      }),
      this.prisma.gstReturn.findMany({
        where: { status: 'not_filed', dueDate: { lt: now } },
        include: { business: true },
        take: 5,
      }),
    ]);

    return {
      overdueTasks: overdueTasks.map(t => ({ id: t.id, title: t.title, dueDate: t.dueDate, workspace: t.workspace.name })),
      pendingNotices: pendingNotices.map(n => ({ id: n.id, subject: n.subject, dueDate: n.responseDueDate, severity: n.severity, business: n.business?.name })),
      recentNotices: recentNotices.length,
      missingReturns: missingReturns.map(r => ({ id: r.id, formType: r.formType, period: r.taxPeriod, dueDate: r.dueDate, business: r.business?.name })),
    };
  }

  private buildDashboardInsightsPrompt(context: any): string {
    return `
Analyze the following compliance data and provide actionable insights:

Overdue Tasks: ${context.overdueTasks.length}
${context.overdueTasks.map((t: any) => `- ${t.title} (due: ${t.dueDate})`).join('\n')}

Pending Notices (overdue): ${context.pendingNotices.length}
${context.pendingNotices.map((n: any) => `- ${n.subject} (${n.severity}, due: ${n.responseDueDate})`).join('\n')}

Recent Notices (7 days): ${context.recentNotices}

Missing Returns: ${context.missingReturns.length}
${context.missingReturns.map((r: any) => `- ${r.formType} ${r.period} (due: ${r.dueDate})`).join('\n')}

Please identify:
1. Critical risks requiring immediate attention
2. Patterns suggesting systemic issues
3. Recommended actions with priority
4. Any compliance gaps
`;
  }

  private buildDocumentTagPrompt(document: any): string {
    return `
Document filename: ${document.fileName}
Original name: ${document.originalName}
File type: ${document.fileType}
Category: ${document.category || 'Unknown'}
Tags: ${document.tags?.join(', ') || 'None'}
Notes: ${document.notes || 'None'}

Suggest:
1. Most appropriate category from: GST_NOTICE, INVOICE, CHALLAN, ROC_FILING, TAX_DOCUMENT, BANK_STATEMENT, ANNUAL_RETURN, PROFIT_LOSS, BALANCE_SHEET, OTHER
2. Relevant tags (up to 5)
3. Confidence level (0-1)
`;
  }

  // System prompts
  private getSummarizeSystemPrompt(): string {
    return `You are a compliance expert analyzing GST and Income Tax notices for Indian businesses.
Your analysis should be:
- Concise and actionable
- Focused on deadlines and required documents
- Clear about legal references
- Honest about limitations

Always include:
1. Summary (2-3 sentences)
2. Risk level (LOW/MEDIUM/HIGH/CRITICAL)
3. Key deadlines
4. Required actions
5. Legal references

Format response as JSON.`;
  }

  private getSuggestTasksSystemPrompt(): string {
    return `You are a compliance task advisor for CA firms.
Suggest specific, actionable tasks with:
- Clear title
- Priority (HIGH/MEDIUM/LOW)
- Realistic due date
- Brief description

Consider:
- Response deadlines
- Document requirements
- Client action items
- CA preparation tasks

Format response as JSON array of tasks.`;
  }

  private getInsightsSystemPrompt(): string {
    return `You are a compliance risk analyst for Indian tax compliance.
Analyze dashboard data and identify:
1. Critical risks (OVERDUE_RISK, MISSING_FILING, LEGAL_ISSUE)
2. Patterns (REPEATED_NOTICES, MSME_EXPOSURE, COMPLIANCE_GAP)
3. Actionable recommendations

Be specific about amounts, dates, and required actions.
Format response as JSON with insights array.`;
  }

  private getDocumentTagSystemPrompt(): string {
    return `You are a document classification assistant for compliance documents.
Suggest the most appropriate category and relevant tags based on filename and metadata.
Format response as JSON with category, tags array, and confidence.`;
  }

  // Response parsing
  private parseAIResponse(content: string, type: string): any {
    try {
      // Try to parse as JSON
      const data = JSON.parse(content);
      return { success: true, data, raw: content };
    } catch {
      // Return as raw text if not JSON
      return { success: true, data: { message: content }, raw: content };
    }
  }

  // Mock responses
  private getMockSummarizeResponse(notice: any) {
    return {
      success: true,
      isMock: true,
      data: {
        summary: `This is a ${notice.severity} priority ${notice.noticeType} notice ${notice.noticeNumber ? `(${notice.noticeNumber})` : ''} from ${notice.issuingAuthority || 'the authority'}. ${notice.summary || 'The notice requires attention.'}`,
        severity: notice.severity,
        riskLevel: notice.severity === 'CRITICAL' ? 'HIGH' : notice.severity === 'HIGH' ? 'MEDIUM' : 'LOW',
        deadlines: notice.responseDueDate ? [`Response due: ${new Date(notice.responseDueDate).toLocaleDateString()}`] : ['No specific deadline provided'],
        authority: notice.issuingAuthority || 'Not specified',
        actionRequired: 'Review grounds of notice and prepare response with supporting documents',
        legalReferences: notice.noticeType?.startsWith('GST') ? ['Section 73/74 CGST Act'] : ['Section 143(2) Income Tax Act'],
      },
      raw: 'Mock response - configure AI provider for full functionality',
    };
  }

  private getMockTasksResponse(notice: any) {
    const daysUntilDue = notice.responseDueDate
      ? Math.max(1, Math.ceil((new Date(notice.responseDueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 7;

    return {
      success: true,
      isMock: true,
      data: [
        { title: `Gather documents for ${notice.noticeType}`, priority: 'HIGH', dueDate: `${Math.min(3, daysUntilDue)} days`, description: 'Collect all relevant invoices, returns, and reconciliation statements' },
        { title: 'Prepare written response', priority: 'HIGH', dueDate: `${Math.min(daysUntilDue - 2, 5)} days`, description: 'Draft formal response addressing all grounds of notice' },
        { title: 'Client meeting to review notice', priority: 'MEDIUM', dueDate: '2 days', description: 'Schedule meeting to explain notice implications and action plan' },
        { title: 'Calculate exact liability', priority: 'MEDIUM', dueDate: '3 days', description: 'Determine exact demand amount including interest and penalty' },
      ],
      raw: 'Mock response - configure AI provider for full functionality',
    };
  }

  private getMockInsightsResponse(tenantId: string, workspaceId?: string) {
    return {
      success: true,
      isMock: true,
      data: {
        insights: [
          { type: 'OVERDUE_RISK', message: 'Overdue tasks and notices require immediate attention', priority: 'HIGH' },
          { type: 'NOTICE_PATTERN', message: 'Review recent notice patterns for compliance gaps', priority: 'MEDIUM' },
          { type: 'MISSING_FILING', message: 'Check for missing GST returns and file immediately', priority: 'HIGH' },
        ],
        summary: '4 insights generated. Priority: Address overdue filings and response deadlines.',
      },
      raw: 'Mock response - configure AI provider for full functionality',
    };
  }

  private getMockDocumentTagResponse(document: any) {
    const suggestedCategory = document.fileName?.toLowerCase().includes('notice') ? 'GST_NOTICE' :
      document.fileName?.toLowerCase().includes('invoice') ? 'INVOICE' :
      document.fileName?.toLowerCase().includes('return') ? 'ANNUAL_RETURN' : 'OTHER';

    return {
      success: true,
      isMock: true,
      data: {
        suggestedCategory,
        suggestedTags: [suggestedCategory.toLowerCase().replace('_', '-'), document.fileType],
        confidence: 0.75,
        alternativeCategories: ['TAX_DOCUMENT', 'COMPLIANCE'],
      },
      raw: 'Mock response - configure AI provider for full functionality',
    };
  }
}
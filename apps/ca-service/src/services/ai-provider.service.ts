import { Injectable, BadRequestException } from '@nestjs/common';

export enum AIProvider {
  OPENAI = 'openai',
  LOCAL = 'local',
  MOCK = 'mock',
}

export interface AIConfig {
  provider: AIProvider;
  apiKey?: string;
  endpoint?: string; // For local models
  model?: string;
}

export interface AIRequest {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxTokens?: number;
}

export interface AIResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

export interface AIActivityParams {
  tenantId: string;
  userId: string;
  workspaceId?: string;
  promptType: string;
  entityType?: string;
  entityId?: string;
  correlationId?: string;
}

// Base interface for AI providers
export interface IAIModel {
  generate(request: AIRequest): Promise<AIResponse>;
  isConfigured(): boolean;
}

@Injectable()
export class AIProviderService {
  private provider: IAIModel;
  private config: AIConfig;
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.ENABLE_AI_FEATURES !== 'false';
    this.config = this.loadConfig();
    this.provider = this.createProvider();
  }

  private loadConfig(): AIConfig {
    const provider = (process.env.AI_PROVIDER as AIProvider) || AIProvider.MOCK;
    return {
      provider,
      apiKey: process.env.OPENAI_API_KEY || process.env.AI_API_KEY,
      endpoint: process.env.AI_LOCAL_ENDPOINT || 'http://localhost:11434',
      model: process.env.AI_MODEL || 'gpt-4-turbo-preview',
    };
  }

  private createProvider(): IAIModel {
    switch (this.config.provider) {
      case AIProvider.OPENAI:
        return new OpenAIProvider(this.config);
      case AIProvider.LOCAL:
        return new LocalModelProvider(this.config);
      case AIProvider.MOCK:
      default:
        return new MockAIProvider();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getProvider(): AIProvider {
    return this.config.provider;
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    if (!this.enabled) {
      throw new BadRequestException('AI features are disabled');
    }
    return this.provider.generate(request);
  }
}

// OpenAI Provider
class OpenAIProvider implements IAIModel {
  private apiKey: string;
  private model: string;
  private endpoint: string;

  constructor(config: AIConfig) {
    this.apiKey = config.apiKey || '';
    this.model = config.model || 'gpt-4-turbo-preview';
    this.endpoint = 'https://api.openai.com/v1/chat/completions';
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new BadRequestException('OpenAI API key not configured');
    }

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: request.messages,
          temperature: request.temperature ?? 0.3,
          max_tokens: request.maxTokens ?? 1000,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
      }

      const data = await response.json() as any;

      return {
        content: data.choices[0]?.message?.content || '',
        model: this.model,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
        } : undefined,
        finishReason: data.choices[0]?.finish_reason,
      };
    } catch (error) {
      console.error('OpenAI generation error:', error);
      throw new BadRequestException('Failed to generate AI response');
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

// Local/ollama provider
class LocalModelProvider implements IAIModel {
  private endpoint: string;
  private model: string;

  constructor(config: AIConfig) {
    this.endpoint = config.endpoint || 'http://localhost:11434';
    this.model = config.model || 'llama3';
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    try {
      const systemPrompt = request.messages.find(m => m.role === 'system')?.content || '';
      const userPrompt = request.messages.find(m => m.role === 'user')?.content || '';

      const response = await fetch(`${this.endpoint}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Local model error: ${response.status}`);
      }

      const data = await response.json() as any;

      return {
        content: data.message?.content || '',
        model: this.model,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        finishReason: data.done ? 'stop' : undefined,
      };
    } catch (error) {
      console.error('Local model error:', error);
      throw new BadRequestException('Failed to connect to local model');
    }
  }

  isConfigured(): boolean {
    return true; // Always available if using mock fallback
  }
}

// Mock provider for demo/testing
class MockAIProvider implements IAIModel {
  private responses: Map<string, string> = new Map();

  constructor() {
    // Pre-configured mock responses
    this.responses.set('notice_summarize', this.getMockSummarizeResponse());
    this.responses.set('suggest_tasks', this.getMockTasksResponse());
    this.responses.set('dashboard_insights', this.getMockInsightsResponse());
    this.responses.set('document_tag', this.getMockDocumentTagResponse());
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const content = request.messages.map(m => m.content).join(' ');
    let response = '';

    // Determine mock response based on content
    if (content.toLowerCase().includes('summarize') || content.toLowerCase().includes('notice')) {
      response = this.responses.get('notice_summarize')!;
    } else if (content.toLowerCase().includes('task') || content.toLowerCase().includes('suggest')) {
      response = this.responses.get('suggest_tasks')!;
    } else if (content.toLowerCase().includes('insight') || content.toLowerCase().includes('dashboard')) {
      response = this.responses.get('dashboard_insights')!;
    } else if (content.toLowerCase().includes('document') || content.toLowerCase().includes('tag')) {
      response = this.responses.get('document_tag')!;
    } else {
      response = this.getDefaultResponse();
    }

    return {
      content: response,
      model: 'mock-ai-provider',
      usage: { promptTokens: 50, completionTokens: 100, totalTokens: 150 },
      finishReason: 'stop',
    };
  }

  isConfigured(): boolean {
    return true;
  }

  private getMockSummarizeResponse(): string {
    return JSON.stringify({
      summary: "Notice Summary",
      severity: "HIGH",
      riskLevel: "MEDIUM",
      deadlines: ["Response due in 15 days", "Documents required within 7 days"],
      authority: "Superintendent, Ward 6, Ahmedabad",
      actionRequired: "Prepare response with reconciliation documents",
      legalReferences: ["Section 73 CGST Act", "Rule 142(1) CGST Rules"],
    });
  }

  private getMockTasksResponse(): string {
    return JSON.stringify([
      { title: "Gather GSTR-2A reconciliation", priority: "HIGH", dueDate: "3 days" },
      { title: "Prepare written response", priority: "HIGH", dueDate: "7 days" },
      { title: "Collect bank statements for period", priority: "MEDIUM", dueDate: "5 days" },
    ]);
  }

  private getMockInsightsResponse(): string {
    return JSON.stringify({
      insights: [
        { type: "OVERDUE_RISK", message: "2 tasks overdue by more than 3 days", priority: "HIGH" },
        { type: "NOTICE_PATTERN", message: "3 GST notices in last 60 days - consider compliance review", priority: "MEDIUM" },
        { type: "MISSING_FILING", message: "GSTR-1 pending for last month", priority: "HIGH" },
        { type: "MSME_EXPOSURE", message: "2 vendor payments overdue beyond 45 days", priority: "MEDIUM" },
      ],
      summary: "4 actionable insights generated. Priority: Address overdue filings and vendor payments.",
    });
  }

  private getMockDocumentTagResponse(): string {
    return JSON.stringify({
      suggestedCategory: "GST_NOTICE",
      suggestedTags: ["gst", "demand", "ward-6", "2024-25"],
      confidence: 0.85,
      alternativeCategories: ["TAX_DOCUMENT", "COMPLIANCE"],
    });
  }

  private getDefaultResponse(): string {
    return JSON.stringify({
      message: "AI insights available. Configure AI provider for full functionality.",
      hint: "Set ENABLE_AI_FEATURES=true and AI_PROVIDER=openai to enable.",
    });
  }
}
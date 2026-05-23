/**
 * Tenant Isolation Schema Validation Tests
 * 
 * Validates that all sensitive entities have tenantId field
 * and proper indexes for cross-tenant query prevention.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const SCHEMA_PATH = join(__dirname, '../../schema.prisma');
const schema = readFileSync(SCHEMA_PATH, 'utf-8');

describe('Tenant Isolation Schema Validation', () => {
  // All entities that MUST have tenantId for data isolation
  const TENANT_SCOPED_ENTITIES = [
    'CommunicationThread',
    'CommunicationMessage',
    'Notice',
    'NoticeActivity',
    'ComplianceTask',
    'DocumentVault',
    'Vendor',
    'Business',
    'User',
    'AuditLog',
    'UserNotification',
    'AIActionLog',
    'Invitation',
    'Webhook',
    'EvidenceRequest',
  ];

  test.each(TENANT_SCOPED_ENTITIES)('%s must have tenantId field', (entity) => {
    // Find the model block
    const modelRegex = new RegExp(`model\\s+${entity}\\s*\\{[^}]+\\}`, 's');
    const match = schema.match(modelRegex);
    
    expect(match).not.toBeNull();
    expect(match?.[0]).toContain('tenantId');
  });

  // WorkspaceMember inherits tenantId through workspace
  test('WorkspaceMember gets tenantId through workspace relation', () => {
    const memberRegex = /model\s+WorkspaceMember\s*\{[^}]+\}/s;
    const match = schema.match(memberRegex);
    expect(match).not.toBeNull();
    // No direct tenantId - inherits through workspace
    expect(match?.[0]).not.toContain('tenantId');
    expect(match?.[0]).toContain('workspaceId');
  });

  // Entities that should NOT be tenant-scoped (system-wide)
  const SYSTEM_ENTITIES = [
    'Tenant',
  ];

  test.each(SYSTEM_ENTITIES)('%s should NOT have tenantId (system-wide)', (entity) => {
    const modelRegex = new RegExp(`model\\s+${entity}\\s*\\{[^}]+\\}`, 's');
    const match = schema.match(modelRegex);
    
    expect(match).not.toBeNull();
    expect(match?.[0]).not.toContain('tenantId');
  });

  test('CommunicationThread has workspaceId for additional isolation', () => {
    const modelRegex = /model\s+CommunicationThread\s*\{[^}]+\}/s;
    const match = schema.match(modelRegex);
    expect(match?.[0]).toContain('workspaceId');
  });

  test('CommunicationMessage has threadId for conversation grouping', () => {
    const modelRegex = /model\s+CommunicationMessage\s*\{[^}]+\}/s;
    const match = schema.match(modelRegex);
    expect(match?.[0]).toContain('threadId');
  });

  test('DocumentVault has workspaceId for document isolation', () => {
    const modelRegex = /model\s+DocumentVault\s*\{[^}]+\}/s;
    const match = schema.match(modelRegex);
    expect(match?.[0]).toContain('workspaceId');
  });

  test('Vendor has tenantId and businessId for vendor isolation', () => {
    const modelRegex = /model\s+Vendor\s*\{[^}]+\}/s;
    const match = schema.match(modelRegex);
    expect(match?.[0]).toContain('tenantId');
    expect(match?.[0]).toContain('businessId');
  });
});

describe('Communication Entity Relationships', () => {
  test('CommunicationThread has messages relation', () => {
    expect(schema).toContain('CommunicationMessage');
    // Check that CommunicationThread has messages field (array relation)
    const threadRegex = /model\s+CommunicationThread\s*\{[^}]+\}/s;
    const match = schema.match(threadRegex);
    expect(match?.[0]).toMatch(/messages\s+CommunicationMessage/);
  });

  test('CommunicationThread has workspace relation (ClientWorkspace)', () => {
    const threadRegex = /model\s+CommunicationThread\s*\{[^}]+\}/s;
    const match = schema.match(threadRegex);
    expect(match?.[0]).toMatch(/workspace\s+ClientWorkspace/);
  });

  test('CommunicationMessage has sender relation', () => {
    const msgRegex = /model\s+CommunicationMessage\s*\{[^}]+\}/s;
    const match = schema.match(msgRegex);
    expect(match?.[0]).toMatch(/sender\s+User/);
  });

  test('CommunicationThread has status field', () => {
    const threadRegex = /model\s+CommunicationThread\s*\{[^}]+\}/s;
    const match = schema.match(threadRegex);
    expect(match?.[0]).toMatch(/status\s+ThreadStatus/);
  });
});

describe('Notice Entity Structure', () => {
  test('Notice has workspaceId for workspace-scoped notices', () => {
    const noticeRegex = /model\s+Notice\s*\{[^}]+\}/s;
    const match = schema.match(noticeRegex);
    expect(match?.[0]).toContain('workspaceId');
  });

  test('Notice has status field for workflow', () => {
    const noticeRegex = /model\s+Notice\s*\{[^}]+\}/s;
    const match = schema.match(noticeRegex);
    expect(match?.[0]).toMatch(/status\s+NoticeStatus/);
  });
});

describe('ComplianceTask Entity Structure', () => {
  test('ComplianceTask has workspaceId', () => {
    const taskRegex = /model\s+ComplianceTask\s*\{[^}]+\}/s;
    const match = schema.match(taskRegex);
    expect(match?.[0]).toContain('workspaceId');
  });

  test('ComplianceTask has linkedBusinessId', () => {
    const taskRegex = /model\s+ComplianceTask\s*\{[^}]+\}/s;
    const match = schema.match(taskRegex);
    expect(match?.[0]).toContain('linkedBusinessId');
  });

  test('ComplianceTask has dueDate for scheduling', () => {
    const taskRegex = /model\s+ComplianceTask\s*\{[^}]+\}/s;
    const match = schema.match(taskRegex);
    expect(match?.[0]).toContain('dueDate');
  });
});

describe('Database Indexes for Performance', () => {
  test('CommunicationThread has workspace+tenantId index', () => {
    expect(schema).toMatch(/@@index.*\[tenantId.*workspaceId\]/);
  });

  test('CommunicationMessage has threadId index', () => {
    // Check for index on threadId
    expect(schema).toMatch(/@@index.*\[threadId/);
  });

  test('Tenant has slug unique index', () => {
    expect(schema).toMatch(/slug\s+String.*@unique/);
  });
});

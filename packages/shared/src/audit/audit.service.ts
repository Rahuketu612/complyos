/**
 * Audit Service
 * Immutable append-only audit logging with hash chain verification
 */

import { createHash } from 'crypto';
import { AuditLogEntry, AuditAction, AuditVerificationResult, AuditIntegrityReport } from './audit-types';

/**
 * Generate hash for audit entry (hash chain)
 */
export function generateAuditHash(entry: Omit<AuditLogEntry, 'currentHash'>): string {
  const data = JSON.stringify({
    id: entry.id,
    timestamp: entry.timestamp,
    tenantId: entry.tenantId,
    userId: entry.userId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    previousHash: entry.previousHash,
    metadata: entry.metadata,
  });
  
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Verify integrity of a single audit entry
 */
export function verifyAuditEntry(entry: AuditLogEntry): { valid: boolean; error?: string } {
  const expectedHash = generateAuditHash(entry);
  if (entry.currentHash !== expectedHash) {
    return { valid: false, error: 'Hash mismatch - entry may have been tampered' };
  }
  return { valid: true };
}

/**
 * Verify hash chain continuity between entries
 */
export function verifyChainLink(previousEntry: AuditLogEntry, currentEntry: AuditLogEntry): boolean {
  return currentEntry.previousHash === previousEntry.currentHash;
}

/**
 * Create a new immutable audit entry (append-only)
 */
export function createAuditEntry(
  id: string,
  tenantId: string,
  userId: string,
  action: AuditAction,
  entityType: string,
  entityId: string,
  metadata: Record<string, any> = {},
  previousEntry: AuditLogEntry | null = null,
  options?: {
    workspaceId?: string;
    businessId?: string;
    ipAddress?: string;
    userAgent?: string;
  }
): AuditLogEntry {
  const timestamp = new Date().toISOString();
  
  const entryWithoutHash = {
    id,
    timestamp,
    tenantId,
    userId,
    action,
    entityType,
    entityId,
    previousHash: previousEntry?.currentHash || null,
    metadata,
    ...options,
  };
  
  const currentHash = generateAuditHash(entryWithoutHash);
  
  return {
    ...entryWithoutHash,
    currentHash,
  };
}

/**
 * Verify entire audit chain for a tenant (sync version)
 */
export function verifyAuditChain(entries: AuditLogEntry[]): AuditVerificationResult {
  if (entries.length === 0) {
    return {
      valid: true,
      brokenChain: false,
      lastVerifiedEntryId: null,
      errors: [],
      verifiedCount: 0,
    };
  }
  
  const sorted = [...entries].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  const errors: string[] = [];
  let lastVerifiedEntryId: string | null = null;
  
  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i];
    
    const hashCheck = verifyAuditEntry(entry);
    if (!hashCheck.valid) {
      errors.push(`Entry ${entry.id}: ${hashCheck.error}`);
      break;
    }
    
    if (i > 0) {
      const prevEntry = sorted[i - 1];
      if (!verifyChainLink(prevEntry, entry)) {
        errors.push(`Entry ${entry.id}: Chain broken - expected previousHash ${prevEntry.currentHash}`);
        break;
      }
    }
    
    lastVerifiedEntryId = entry.id;
  }
  
  return {
    valid: errors.length === 0,
    brokenChain: errors.length > 0,
    lastVerifiedEntryId,
    errors,
    verifiedCount: lastVerifiedEntryId ? sorted.findIndex(e => e.id === lastVerifiedEntryId) + 1 : 0,
  };
}

/**
 * Generate integrity report for audit system
 */
export function generateIntegrityReport(
  entries: AuditLogEntry[],
  verificationResult: AuditVerificationResult
): AuditIntegrityReport {
  const sorted = [...entries].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  const lastEntry = sorted[0];
  
  return {
    generatedAt: new Date().toISOString(),
    totalEntries: entries.length,
    chainIntact: !verificationResult.brokenChain,
    lastEntryHash: lastEntry?.currentHash || '',
    verificationResult,
  };
}

/**
 * Generate audit export for compliance (WORM storage path)
 */
export function exportAuditEntries(
  entries: AuditLogEntry[],
  includeVerification = true
): string {
  const lines = entries.map(entry => JSON.stringify(entry));
  
  if (includeVerification) {
    const verification = verifyAuditChain(entries);
    const report = generateIntegrityReport(entries, verification);
    lines.push(`\n--- INTEGRITY REPORT ---\n${JSON.stringify(report, null, 2)}\n`);
  }
  
  return lines.join('\n');
}

/**
 * Parse audit log action category
 */
export function getActionCategory(action: AuditAction): string {
  const [category] = action.split('.');
  return category;
}

/**
 * Filter audit entries by action category
 */
export function filterByCategory(entries: AuditLogEntry[], category: string): AuditLogEntry[] {
  return entries.filter(entry => getActionCategory(entry.action) === category);
}

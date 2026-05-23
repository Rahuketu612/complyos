/**
 * Document Retention Period Constants
 * Based on Indian regulatory requirements
 * 
 * GST Act: 6 years from due date of filing
 * Income Tax Act: 8 years from end of relevant assessment year
 * TDS Records: 7 years
 * Company Records: 8 years (Companies Act, 2013)
 * DPDP Act: As long as purpose exists + 3 years after last use
 */

export const RETENTION_PERIODS = {
  // GST Records: 6 years
  GST_RECORDS: 6,
  
  // Income Tax: 8 years
  INCOME_TAX: 8,
  
  // TDS Records: 7 years
  TDS_RECORDS: 7,
  
  // Company Records: 8 years
  COMPANY_RECORDS: 8,
  
  // Audit Workpapers: 8 years
  AUDIT_WORKPAPERS: 8,
  
  // Contracts: 8 years from expiry date
  CONTRACTS: 8,
  
  // Personal Data (DPDP Act): Indefinite until purpose fulfilled + 3 years
  PERSONAL_DATA: -1,
  
  // Default: 7 years
  DEFAULT: 7,
} as const;

/**
 * Get retention years from category
 */
export function getRetentionYears(category: keyof typeof RETENTION_PERIODS): number {
  return RETENTION_PERIODS[category];
}

/**
 * Calculate retention date based on upload date
 */
export function calculateRetentionDate(
  uploadedAt: Date, 
  category: keyof typeof RETENTION_PERIODS
): Date | null {
  const years = RETENTION_PERIODS[category];
  if (years === -1) {
    return null; // Indefinite retention
  }
  const date = new Date(uploadedAt);
  date.setFullYear(date.getFullYear() + years);
  return date;
}

/**
 * Check if document should be destroyed
 */
export function shouldDestroy(retentionUntil: Date | null): boolean {
  if (!retentionUntil) return false;
  return new Date() > retentionUntil;
}
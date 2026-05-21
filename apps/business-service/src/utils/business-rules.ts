/**
 * Business Compliance Rules Engine
 * 
 * Calculates compliance applicability based on:
 * - Turnover thresholds
 * - Employee counts
 * - Entity types
 * 
 * Based on Indian statutory requirements (FY 2024-25)
 * 
 * GST Registration Threshold: Rs. 40 lakh (Rs. 20 lakh for special category states)
 * EPF Applicability: 20+ employees
 * ESIC Applicability: 10+ employees
 * TDS: Based on payments made
 * Professional Tax: State-specific
 */

const GST_THRESHOLD_REGULAR = 40_00_000; // ₹40 lakhs
const GST_THRESHOLD_SPECIAL = 20_00_000; // ₹20 lakhs (Special category states)
const GST_COMPULSORY = 2_50_0000; // ₹2.5 crores for composition

const EPF_EMPLOYEE_THRESHOLD = 20;
const ESIC_EMPLOYEE_THRESHOLD = 10;

// Special category states for GST
const SPECIAL_CATEGORY_STATES = [
  'arunachal_pradesh',
  'assam',
  'manipur',
  'meghalaya',
  'mizoram',
  'nagaland',
  'tripura',
  'sikkim',
  'uttarakhand',
  'himachal_pradesh',
  'jammu_kashmir',
  'ladakh',
  'goa',
];

interface BusinessData {
  annualTurnover?: number;
  employeeCount?: number;
  registeredEmployees?: number;
  entityType?: string;
  state?: string;
  sector?: string;
}

interface ComplianceApplicability {
  gst: boolean;
  epf: boolean;
  esic: boolean;
  tds: boolean;
  pt: boolean;
}

export function calculateComplianceApplicability(data: BusinessData): ComplianceApplicability {
  const turnover = data.annualTurnover || 0;
  const employees = data.employeeCount || 0;
  const registeredEmployees = data.registeredEmployees || 0;
  const state = (data.state || '').toLowerCase().replace(/\s+/g, '_');

  const isSpecialCategory = SPECIAL_CATEGORY_STATES.includes(state);
  const gstThreshold = isSpecialCategory ? GST_THRESHOLD_SPECIAL : GST_THRESHOLD_REGULAR;

  // GST Applicability
  // 1. Mandatory if turnover exceeds threshold
  // 2. Voluntary registration is allowed below threshold
  // 3. Composition scheme available for turnover <= ₹75 lakhs
  let gstApplicable = false;
  if (turnover >= gstThreshold) {
    gstApplicable = true;
  } else if (turnover >= 0 && turnover < gstThreshold) {
    // Optional - can be true if voluntarily registered
    // For now, we don't auto-apply optional GST
    gstApplicable = false;
  }

  // EPF Applicability
  // Applicable if 20+ employees (prior to amendment, was 20)
  // Note: EPF is now universal but employer contribution rules vary
  const epfApplicable = employees >= EPF_EMPLOYEE_THRESHOLD;

  // ESIC Applicability
  // Applicable if 10+ employees
  const esicApplicable = employees >= ESIC_EMPLOYEE_THRESHOLD;

  // TDS Applicability
  // Simplified: Apply if employee count > 0 (assumes TDS payments are being made)
  // Real implementation would need more granular business logic
  const tdsApplicable = registeredEmployees > 0 || employees > 0;

  // Professional Tax
  // State-dependent - simplified mapping
  const ptApplicable = isProfessionalTaxApplicable(state);

  return {
    gst: gstApplicable,
    epf: epfApplicable,
    esic: esicApplicable,
    tds: tdsApplicable,
    pt: ptApplicable,
  };
}

/**
 * Calculate compliance health score
 */
export function calculateHealthScore(
  returns: { status: string; delayDays?: number }[],
  notices: { status: string; severity: string }[],
  vendorRisk: number,
): { score: number; status: string } {
  let score = 100;

  // Deduct for late returns (max 30 points)
  const lateReturns = returns.filter(r => r.status === 'late_filed' || (r.delayDays && r.delayDays > 0));
  score -= lateReturns.length * 5;

  // Deduct for unpaid notices (max 40 points)
  const unresolvedNotices = notices.filter(n =>
    !['resolved', 'appeal_filed'].includes(n.status)
  );
  for (const notice of unresolvedNotices) {
    const severityMap: Record<string, number> = {
      critical: 15,
      high: 10,
      medium: 5,
      low: 2,
      info: 1,
    };
    score -= severityMap[notice.severity] || 5;
  }

  // Deduct for vendor risk (max 30 points)
  score -= Math.min(vendorRisk / 10, 30);

  score = Math.max(0, Math.min(100, Math.round(score)));

  let status: string;
  if (score >= 90) status = 'excellent';
  else if (score >= 75) status = 'good';
  else if (score >= 60) status = 'fair';
  else if (score >= 40) status = 'poor';
  else status = 'critical';

  return { score, status };
}

/**
 * Get GST return due dates for a period
 */
export function getGstrDueDates(financialYear: string, isQuarterly: boolean = false): Record<string, Date> {
  const year = parseInt(financialYear.split('-')[0]);
  const baseYear = new Date(year + 1, 2, 31); // March 31 of next year

  const dueDates: Record<string, Date> = {};

  if (isQuarterly) {
    // Quarterly filing for composition dealers
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const monthEnds = [7, 10, 1, 4]; // July, October, January, April

    for (let i = 0; i < quarters.length; i++) {
      const quarter = quarters[i];
      const monthEnd = monthEnds[i];
      const targetYear = i >= 2 ? year + 1 : year;

      const dueDate = new Date(targetYear, monthEnd - 1, 20);
      if (monthEnd === 1) dueDate.setFullYear(dueDate.getFullYear() + 1); // January = next year
      if (dueDate.getDay() === 0) dueDate.setDate(dueDate.getDate() + 1); // Sunday handling

      dueDates[quarter] = dueDate;
    }
  } else {
    // Monthly filing
    for (let month = 4; month <= 15; month++) {
      const monthIndex = ((month - 1) % 12);
      const displayMonth = monthIndex === 0 ? 12 : monthIndex;
      const targetYear = month > 12 ? year + 1 : year;

      const dueDate = new Date(targetYear, displayMonth - 1, 20);
      const periodLabel = displayMonth < 10 ? `0${displayMonth}` : `${displayMonth}`;
      const period = month > 12
        ? `${year}-${periodLabel}`
        : `${year - 1}-${periodLabel}`;

      dueDates[period] = dueDate;
    }
  }

  return dueDates;
}

/**
 * Map entity type to display name
 */
export function getEntityDisplayName(entityType: string): string {
  const mapping: Record<string, string> = {
    proprietary: 'Proprietorship',
    partnership: 'Partnership Firm',
    private_limited: 'Private Limited Company',
    public_limited: 'Public Limited Company',
    huf: 'Hindu Undivided Family',
    individual: 'Individual',
    trust: 'Trust',
    society: 'Society / Club',
    nfp: 'Non-Profit Organisation',
    government: 'Government Entity',
  };
  return mapping[entityType] || entityType;
}

/**
 * Validate GSTIN format
 */
export function isValidGstin(gstin: string): boolean {
  if (!gstin || gstin.length !== 15) return false;

  const statePattern = /^(\d{2})(\d{2}[A-Z]{4}[A-Z]{1}[A-Z\d]{1}[A-Z]{1}[\d]{1})$/;
  const match = gstin.match(statePattern);

  if (!match) return false;

  const stateCode = parseInt(match[1]);
  return stateCode >= 1 && stateCode <= 37;
}

/**
 * Validate PAN format
 */
export function isValidPan(pan: string): boolean {
  if (!pan || pan.length !== 10) return false;

  const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panPattern.test(pan);
}

/**
 * Check if professional tax is applicable in state
 */
function isProfessionalTaxApplicable(state: string): boolean {
  // States with professional tax in India
  const ptStates = [
    'maharashtra',
    'karnataka',
    'kerala',
    'west_bengal',
    'gujarat',
    'telangana',
    'andhra_pradesh',
    'tamil_nadu',
    'assam',
    'odisha',
    'madhya_pradesh',
    'uttar_pradesh',
  ];
  return ptStates.includes(state.toLowerCase());
}
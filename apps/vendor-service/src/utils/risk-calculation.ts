/**
 * Vendor Risk Calculation Engine
 * 
 * Calculates vendor compliance scores and risk levels based on:
 * - GSTR-1 filing consistency
 * - Invoice matching rates
 * - Historical defaults
 * - ITC exposure
 */

/**
 * Calculate vendor compliance score (0-100)
 */
export function calculateVendorRisk(params: {
  totalInvoices: number;
  matched: number;
  missing: number;
  lastGstr1Filed?: Date;
}): number {
  let score = 100;

  // Deduct for missing invoices in GSTR-2B
  if (params.totalInvoices > 0) {
    const missingRatio = params.missing / params.totalInvoices;
    score -= missingRatio * 40; // Up to 40 points for missing invoices
  }

  // Deduct for invoices not matched
  const matchRate = params.matched / Math.max(params.totalInvoices, 1);
  score -= (1 - matchRate) * 20; // Up to 20 points for unmatched

  // Time-based penalty for not filing GSTR-1
  // This would be calculated from vendor portal data
  if (params.lastGstr1Filed) {
    const monthsSince = getMonthsSince(params.lastGstr1Filed);
    if (monthsSince >= 3) {
      score -= 30; // Critical if not filed 3+ months
    } else if (monthsSince >= 2) {
      score -= 20;
    } else if (monthsSince >= 1) {
      score -= 10;
    }
  } else {
    // Unknown filing status - assume high risk
    score -= 40;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Calculate vendor risk level
 */
export function calculateRiskLevel(
  itcClaimed: number,
  missingInvoices: number,
  complianceScore: number,
): string {
  // High ITC exposure with missing invoices = critical
  if (missingInvoices > 5 && itcClaimed > 100000 && complianceScore < 50) {
    return 'critical';
  }

  // High risk conditions
  if (complianceScore < 40 || missingInvoices > 10) {
    return 'high_risk';
  }

  // Medium risk conditions
  if (complianceScore < 60 || missingInvoices > 3) {
    return 'medium_risk';
  }

  // Low risk
  if (complianceScore >= 80) {
    return 'trusted';
  }

  return 'low_risk';
}

/**
 * Get ITC exposure amounts
 */
export function calculateItcExposure(params: {
  matchedAmount: number;
  missingAmount: number;
  mismatchAmount: number;
}): {
  eligible: number;
  atRisk: number;
  blocked: number;
} {
  // Eligible = matched in books and 2B
  const eligible = params.matchedAmount;

  // At risk = appears in 2B but not in books
  const atRisk = params.missingAmount;

  // Blocked = value mismatch
  const blocked = params.mismatchAmount;

  return { eligible, atRisk, blocked };
}

/**
 * Detect invoice mismatches
 */
export function detectMismatches(invoices: {
  invoiceNumber: string;
  gstr2bValue: number;
  bookValue: number;
}[]): {
  invoiceNumber: string;
  variance: number;
  severity: 'low' | 'medium' | 'high';
}[] {
  const thresholdLow = 100; // <100 = tolerance
  const thresholdMedium = 1000; // <1000 = minor
  const thresholdHigh = 10000; // >10000 = major

  return invoices
    .filter(inv => Math.abs(inv.gstr2bValue - inv.bookValue) > thresholdLow)
    .map(inv => {
      const variance = inv.gstr2bValue - inv.bookValue;
      let severity: 'low' | 'medium' | 'high';

      if (Math.abs(variance) > thresholdHigh) {
        severity = 'high';
      } else if (Math.abs(variance) > thresholdMedium) {
        severity = 'medium';
      } else {
        severity = 'low';
      }

      return { invoiceNumber: inv.invoiceNumber, variance, severity };
    })
    .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
}

/**
 * Check if vendor is reliable for ITC
 */
export function isVendorReliableForItc(params: {
  complianceScore: number;
  riskLevel: string;
  itcClaimed: number;
  missingInvoices: number;
}): {
  reliable: boolean;
  maxItcAllowed: number;
  message: string;
} {
  if (params.riskLevel === 'critical') {
    return {
      reliable: false,
      maxItcAllowed: 0,
      message: 'Vendor has critical compliance issues. ITC blocked.',
    };
  }

  if (params.riskLevel === 'high_risk') {
    return {
      reliable: false,
      maxItcAllowed: 10000,
      message: 'Vendor has high risk. Exercise caution with ITC.',
    };
  }

  if (params.complianceScore < 60) {
    return {
      reliable: false,
      maxItcAllowed: params.itcClaimed * 0.5,
      message: 'Limited ITC advised due to compliance concerns.',
    };
  }

  if (params.missingInvoices > 3) {
    return {
      reliable: true,
      maxItcAllowed: Math.max(params.itcClaimed * 0.9, 1),
      message: 'ITC permitted with minor gaps.',
    };
  }

  return {
    reliable: true,
    maxItcAllowed: params.itcClaimed,
    message: 'Vendor compliant. Full ITC allowed.',
  };
}

/**
 * Helper functions
 */
function getMonthsSince(date: Date): number {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  return Math.floor(days / 30);
}

/**
 * Get risk color for UI
 */
export function getRiskColor(riskLevel: string): string {
  const colors: Record<string, string> = {
    critical: '#dc2626', // red-600
    high_risk: '#ea580c', // orange-600
    medium_risk: '#ca8a04', // yellow-600
    low_risk: '#16a34a', // green-600
    trusted: '#22c55e', // green-500
  };
  return colors[riskLevel] || '#6b7280';
}

/**
 * Get risk label for display
 */
export function getRiskLabel(riskLevel: string): string {
  const labels: Record<string, string> = {
    critical: 'Critical Risk',
    high_risk: 'High Risk',
    medium_risk: 'Medium Risk',
    low_risk: 'Low Risk',
    trusted: 'Trusted',
  };
  return labels[riskLevel] || 'Unknown';
}
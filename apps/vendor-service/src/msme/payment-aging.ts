/**
 * MSME Payment Aging Utility
 * Calculates delayed payment status for MSME vendors per Micro, Small and Medium Enterprises Development Act, 2006
 * 
 * Key Rules:
 * - Micro & Small enterprises: Payment due within 15 days (amended 2019) OR 45 days (if agreed)
 * - Medium enterprises: Payment due within 30 days
 * - Interest rate: SBI MCLR + 3% (currently ~12-14% p.a.)
 * - Interest accrues from due date until actual payment
 */

export enum PaymentAgingStatus {
  CURRENT = 'CURRENT',           // Paid on time
  DAYS_1_TO_15 = 'OVERDUE_1_15', // 1-15 days overdue (interest eligible for MSME)
  DAYS_16_TO_30 = 'OVERDUE_16_30', // 16-30 days overdue
  DAYS_31_TO_45 = 'OVERDUE_31_45', // 31-45 days overdue  
  DAYS_46_PLUS = 'OVERDUE_46_PLUS', // 46+ days overdue (buyer liable for interest)
}

export interface PaymentAgingResult {
  status: PaymentAgingStatus;
  daysOverdue: number;
  interestEligible: boolean;
  interestRate: number; // Annual percentage
  estimatedInterest: number; // Calculated interest amount
}

interface InvoicePaymentInfo {
  invoiceDate: Date;
  dueDate: Date;
  amount: number;
  paidDate?: Date;
  vendorMsmeType?: 'MICRO' | 'SMALL' | 'MEDIUM';
  paymentDueDays: number; // From vendor record
}

// Default interest rate (SBI MCLR + 3%)
// This should be configurable based on current SBI MCLR rates
const DEFAULT_INTEREST_RATE = 0.12; // 12% per annum

/**
 * Calculate payment aging status and interest eligibility
 */
export function calculatePaymentAging(
  invoice: InvoicePaymentInfo,
  currentDate: Date = new Date()
): PaymentAgingResult {
  const daysOverdue = Math.floor(
    (currentDate.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // If paid before due date, it's current
  if (invoice.paidDate && invoice.paidDate <= invoice.dueDate) {
    return {
      status: PaymentAgingStatus.CURRENT,
      daysOverdue: 0,
      interestEligible: false,
      interestRate: 0,
      estimatedInterest: 0,
    };
  }

  // If not yet due
  if (daysOverdue < 0) {
    return {
      status: PaymentAgingStatus.CURRENT,
      daysOverdue: 0,
      interestEligible: false,
      interestRate: 0,
      estimatedInterest: 0,
    };
  }

  // Determine MSME type for interest calculation
  const isMsme = !!invoice.vendorMsmeType;
  
  // For Micro & Small enterprises, interest kicks in after 15/45 days
  // For Medium enterprises, interest kicks in after 30 days
  let interestThresholdDays = 30; // Default for non-MSME or medium
  
  if (invoice.vendorMsmeType === 'MICRO' || invoice.vendorMsmeType === 'SMALL') {
    // Micro and Small: 45 days if agreed, otherwise 15 days
    // Defaulting to 45 days per MSMED Act (extended in 2019)
    interestThresholdDays = invoice.paymentDueDays > 15 ? 45 : 15;
  } else if (invoice.vendorMsmeType === 'MEDIUM') {
    interestThresholdDays = 30;
  }

  // Calculate status
  let status: PaymentAgingStatus;
  if (daysOverdue <= 15) {
    status = PaymentAgingStatus.DAYS_1_TO_15;
  } else if (daysOverdue <= 30) {
    status = PaymentAgingStatus.DAYS_16_TO_30;
  } else if (daysOverdue <= 45) {
    status = PaymentAgingStatus.DAYS_31_TO_45;
  } else {
    status = PaymentAgingStatus.DAYS_46_PLUS;
  }

  // Interest is eligible after threshold days
  const interestEligible = isMsme && daysOverdue > interestThresholdDays;
  
  // Calculate estimated interest (simple interest, daily)
  let estimatedInterest = 0;
  if (interestEligible) {
    const dailyRate = DEFAULT_INTEREST_RATE / 365;
    const interestDays = daysOverdue - interestThresholdDays;
    estimatedInterest = invoice.amount * dailyRate * interestDays;
  }

  return {
    status,
    daysOverdue,
    interestEligible,
    interestRate: DEFAULT_INTEREST_RATE * 100,
    estimatedInterest: Math.round(estimatedInterest * 100) / 100, // Round to 2 decimals
  };
}

/**
 * Batch calculate aging for multiple invoices
 */
export function calculateBulkAging(
  invoices: InvoicePaymentInfo[],
  currentDate: Date = new Date()
): PaymentAgingResult[] {
  return invoices.map(invoice => calculatePaymentAging(invoice, currentDate));
}

/**
 * Get MSME payment summary for a vendor
 */
export function getMsmePaymentSummary(invoices: InvoicePaymentInfo[]) {
  const agingResults = calculateBulkAging(invoices);
  
  return {
    totalInvoices: invoices.length,
    overdueCount: agingResults.filter(r => r.status !== PaymentAgingStatus.CURRENT).length,
    interestEligibleCount: agingResults.filter(r => r.interestEligible).length,
    totalInterestExposure: agingResults.reduce((sum, r) => sum + r.estimatedInterest, 0),
    worstStatus: agingResults.reduce((worst, current) => {
      const statusOrder = [
        PaymentAgingStatus.CURRENT,
        PaymentAgingStatus.DAYS_1_TO_15,
        PaymentAgingStatus.DAYS_16_TO_30,
        PaymentAgingStatus.DAYS_31_TO_45,
        PaymentAgingStatus.DAYS_46_PLUS,
      ];
      return statusOrder.indexOf(current.status) > statusOrder.indexOf(worst) 
        ? current.status 
        : worst;
    }, PaymentAgingStatus.CURRENT),
  };
}
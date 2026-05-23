import { calculatePaymentAging, getMsmePaymentSummary, PaymentAgingStatus } from '../payment-aging';

describe('Payment Aging', () => {
  describe('calculatePaymentAging', () => {
    it('should return CURRENT status for invoice paid on time', () => {
      const invoice = {
        invoiceDate: new Date('2024-01-01'),
        dueDate: new Date('2024-01-31'),
        amount: 10000,
        paidDate: new Date('2024-01-30'),
        vendorMsmeType: 'SMALL' as const,
        paymentDueDays: 30,
      };
      
      const result = calculatePaymentAging(invoice, new Date('2024-02-01'));
      
      expect(result.status).toBe(PaymentAgingStatus.CURRENT);
      expect(result.daysOverdue).toBe(0);
      expect(result.interestEligible).toBe(false);
    });

    it('should return CURRENT status for invoice not yet due', () => {
      const invoice = {
        invoiceDate: new Date('2024-01-01'),
        dueDate: new Date('2024-02-15'),
        amount: 10000,
        vendorMsmeType: 'SMALL' as const,
        paymentDueDays: 30,
      };
      
      const result = calculatePaymentAging(invoice, new Date('2024-02-01'));
      
      expect(result.status).toBe(PaymentAgingStatus.CURRENT);
      expect(result.interestEligible).toBe(false);
    });

    it('should calculate days overdue correctly', () => {
      const invoice = {
        invoiceDate: new Date('2024-01-01'),
        dueDate: new Date('2024-01-15'),
        amount: 10000,
        vendorMsmeType: 'SMALL' as const,
        paymentDueDays: 30,
      };
      
      // 20 days overdue
      const result = calculatePaymentAging(invoice, new Date('2024-02-04'));
      
      expect(result.daysOverdue).toBe(20);
      expect(result.status).toBe(PaymentAgingStatus.DAYS_16_TO_30);
    });

    it('should mark interest eligible for MSME after threshold', () => {
      const invoice = {
        invoiceDate: new Date('2024-01-01'),
        dueDate: new Date('2024-01-15'),
        amount: 10000,
        vendorMsmeType: 'SMALL' as const,
        paymentDueDays: 45,
      };
      
      // 60 days overdue - past 45 day threshold
      const result = calculatePaymentAging(invoice, new Date('2024-03-16'));
      
      expect(result.daysOverdue).toBe(60);
      expect(result.interestEligible).toBe(true);
      expect(result.estimatedInterest).toBeGreaterThan(0);
    });

    it('should not mark interest eligible before threshold', () => {
      const invoice = {
        invoiceDate: new Date('2024-01-01'),
        dueDate: new Date('2024-01-15'),
        amount: 10000,
        vendorMsmeType: 'SMALL' as const,
        paymentDueDays: 45,
      };
      
      // 40 days overdue - before 45 day threshold
      const result = calculatePaymentAging(invoice, new Date('2024-02-24'));
      
      expect(result.daysOverdue).toBe(40);
      expect(result.status).toBe(PaymentAgingStatus.DAYS_31_TO_45);
      expect(result.interestEligible).toBe(false);
    });

    it('should handle non-MSME vendors', () => {
      const invoice = {
        invoiceDate: new Date('2024-01-01'),
        dueDate: new Date('2024-01-15'),
        amount: 10000,
        paymentDueDays: 30,
      };
      
      // 60 days overdue
      const result = calculatePaymentAging(invoice, new Date('2024-03-16'));
      
      expect(result.interestEligible).toBe(false); // No MSME type
      expect(result.status).toBe(PaymentAgingStatus.DAYS_46_PLUS);
    });

    it('should calculate interest correctly for medium enterprises', () => {
      const invoice = {
        invoiceDate: new Date('2024-01-01'),
        dueDate: new Date('2024-01-15'),
        amount: 100000, // 1 lakh
        vendorMsmeType: 'MEDIUM' as const,
        paymentDueDays: 30,
      };
      
      // 90 days overdue - past 30 day threshold for medium
      const result = calculatePaymentAging(invoice, new Date('2024-04-15'));
      
      expect(result.daysOverdue).toBe(90);
      expect(result.interestEligible).toBe(true);
      // At 12% p.a., 60 days on 100000 = 100000 * 0.12 / 365 * 60 ≈ 1972
      expect(result.estimatedInterest).toBeCloseTo(1972.6, 0);
    });
  });

  describe('getMsmePaymentSummary', () => {
    it('should aggregate multiple invoices correctly', () => {
      const invoices = [
        {
          invoiceDate: new Date('2024-01-01'),
          dueDate: new Date('2024-01-15'),
          amount: 50000,
          vendorMsmeType: 'SMALL' as const,
          paymentDueDays: 45,
        },
        {
          invoiceDate: new Date('2024-01-01'),
          dueDate: new Date('2024-01-31'),
          amount: 30000,
          vendorMsmeType: 'SMALL' as const,
          paymentDueDays: 45,
        },
        {
          invoiceDate: new Date('2024-01-01'),
          dueDate: new Date('2024-02-15'),
          amount: 25000,
          paidDate: new Date('2024-02-10'),
          vendorMsmeType: 'SMALL' as const,
          paymentDueDays: 45,
        },
      ];
      
      // All 70 days overdue from their respective due dates
      const summary = getMsmePaymentSummary(invoices, new Date('2024-04-05'));
      
      expect(summary.totalInvoices).toBe(3);
      expect(summary.overdueCount).toBe(3);
      expect(summary.interestEligibleCount).toBe(2); // 2 invoices past 45 days
      expect(summary.totalInterestExposure).toBeGreaterThan(0);
      expect(summary.worstStatus).toBe(PaymentAgingStatus.DAYS_46_PLUS);
    });
  });
});
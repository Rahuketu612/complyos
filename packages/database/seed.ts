/**
 * Database Seed Script
 * Creates initial test data for COMPLYOS development
 * Idempotent: safe to run multiple times
 * 
 * Usage: npm run db:seed
 * Requires DATABASE_URL environment variable
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create test tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'test-tenant' },
    update: {},
    create: {
      id: 'test-tenant-id',
      name: 'Test Tenant',
      slug: 'test-tenant',
      subscriptionPlan: 'professional',
      maxUsers: 10,
      maxBusinesses: 20,
    },
  });
  console.log('Created tenant:', tenant.name);

  // Create test user
  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'test@complyos.com' } },
    update: {},
    create: {
      id: 'test-user-id',
      tenantId: tenant.id,
      email: 'test@complyos.com',
      passwordHash,
      firstName: 'Test',
      lastName: 'User',
      role: 'organization_admin',
      status: 'active',
      emailVerified: true,
    },
  });
  console.log('Created user:', user.email);

  // Create test business
  const business = await prisma.business.upsert({
    where: { pan: 'ABCDE1234F' },
    update: {},
    create: {
      id: 'test-business-id',
      tenantId: tenant.id,
      name: 'Test Business Pvt Ltd',
      tradeName: 'Test Business',
      pan: 'ABCDE1234F',
      entityType: 'private_limited',
      gstApplicable: true,
      complianceScore: 85,
      status: 'active',
    },
  });
  console.log('Created business:', business.name);

  // Create test firm
  const firm = await prisma.firm.upsert({
    where: { gstin: '27AAAAA0000A1ZA' },
    update: {},
    create: {
      id: 'test-firm-id',
      tenantId: tenant.id,
      name: 'Sharma & Associates',
      email: 'contact@sharma-ca.com',
      phone: '+91-9876543210',
      gstin: '27AAAAA0000A1ZA',
      pan: 'AAFFS1234B',
      firmType: 'partnership',
      caMemberId: user.id,
    },
  });
  console.log('Created firm:', firm.name);

  // Create client workspace
  const workspace = await prisma.clientWorkspace.upsert({
    where: { firmId_businessId: { firmId: firm.id, businessId: business.id } },
    update: {},
    create: {
      id: 'test-workspace-id',
      firmId: firm.id,
      tenantId: tenant.id,
      businessId: business.id,
      name: `${business.name} - Compliance Workspace`,
      description: 'Primary compliance management workspace',
      status: 'active',
    },
  });
  console.log('Created workspace:', workspace.name);

  // Create workspace membership
  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    update: {},
    create: {
      id: 'test-member-id',
      workspaceId: workspace.id,
      userId: user.id,
      firmId: firm.id,
      role: 'ADMIN',
      status: 'active',
    },
  });

  // Create sample compliance tasks
  const taskData = [
    {
      title: 'GSTR-3B Filing - May 2026',
      description: 'Monthly return filing for May 2026',
      complianceType: 'GST',
      priority: 'HIGH',
      status: 'PENDING',
      dueDate: new Date('2026-05-20'),
    },
    {
      title: 'TDS Return - Q4 FY26',
      description: 'Quarterly TDS return for Jan-Mar 2026',
      complianceType: 'TDS',
      priority: 'MEDIUM',
      status: 'PENDING',
      dueDate: new Date('2026-05-31'),
    },
    {
      title: 'GST Annual Return GSTR-9',
      description: 'Annual return for FY 2025-26',
      complianceType: 'GST',
      priority: 'MEDIUM',
      status: 'PENDING',
      dueDate: new Date('2026-06-30'),
    },
    {
      title: 'ROC Compliance - Board Meeting',
      description: 'Schedule and file board meeting details',
      complianceType: 'ROC',
      priority: 'LOW',
      status: 'PENDING',
      dueDate: new Date('2026-06-15'),
    },
  ];

  for (const task of taskData) {
    await prisma.complianceTask.upsert({
      where: { 
        id: `task-${task.title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30)}` 
      },
      update: {},
      create: {
        id: `task-${task.title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30)}`,
        workspaceId: workspace.id,
        tenantId: tenant.id,
        title: task.title,
        description: task.description,
        complianceType: task.complianceType as any,
        priority: task.priority as any,
        status: task.status as any,
        dueDate: task.dueDate,
        createdBy: user.id,
        assignedTo: user.id,
        linkedBusinessId: business.id,
      },
    });
  }
  console.log('Created', taskData.length, 'compliance tasks');

  // Create sample notification
  await prisma.userNotification.upsert({
    where: { id: 'notif-welcome-id' },
    update: {},
    create: {
      id: 'notif-welcome-id',
      tenantId: tenant.id,
      userId: user.id,
      workspaceId: workspace.id,
      type: 'SYSTEM',
      title: 'Welcome to COMPLYOS',
      message: 'Your CA workspace has been set up. Start by reviewing pending tasks.',
      data: { workspaceId: workspace.id },
    },
  });
  console.log('Created sample notification');

  // =============================================
  // NOTICE MANAGEMENT SEED DATA
  // =============================================

  // Notice 1: GST Scrutiny Notice - HIGH severity
  const notice1 = await prisma.notice.upsert({
    where: { id: 'notice-gst-scrutiny-001' },
    update: {},
    create: {
      id: 'notice-gst-scrutiny-001',
      workspaceId: workspace.id,
      tenantId: tenant.id,
      businessId: business.id,
      noticeNumber: 'C.No.AHD-EX-006/2025-26/SCR-456',
      noticeType: 'GST_SCRUTINY',
      issuingAuthority: 'Superintendent, Ward 6, Ahmedabad',
      assessmentYear: '2024-25',
      severity: 'HIGH',
      status: 'UNDER_REVIEW',
      receivedDate: new Date('2026-04-15'),
      responseDueDate: new Date('2026-05-28'),
      demandAmount: 125000,
      subject: 'Scrutiny of Annual Return GSTR-9 for FY 2023-24',
      summary: 'Your GSTR-9 return for FY 2023-24 has been selected for scrutiny. discrepancies in ITC claimed vs GSTR-2A.',
      groundsOfNotice: 'The following discrepancies have been observed in your Annual Return GSTR-9:\n1. ITC claimed in GSTR-9: ₹15,75,000\n2. ITC available as per GSTR-2A: ₹14,50,000\n3. Difference: ₹1,25,000\n\nYou are required to submit the following documents along with your response:\n- Reconciliation statement\n- Invoices for the disputed ITC\n- Bank statements for the period',
      assignedTo: user.id,
      assignedAt: new Date('2026-04-16'),
      totalLiability: 125000,
    },
  });

  // Notice 1 Activities
  const notice1Activities = [
    { action: 'CREATED', comment: 'GST scrutiny notice received from Ward 6' },
    { action: 'ASSIGNED', comment: 'Notice assigned for review' },
    { action: 'STATUS_CHANGED', comment: 'Status changed to UNDER_REVIEW', previousValue: 'RECEIVED', newValue: 'UNDER_REVIEW' },
    { action: 'COMMENT', comment: 'Requesting client to provide GSTR-2A reconciliation for verification' },
  ];

  for (let i = 0; i < notice1Activities.length; i++) {
    await prisma.noticeActivity.upsert({
      where: { id: `notice1-activity-${i + 1}` },
      update: {},
      create: {
        id: `notice1-activity-${i + 1}`,
        noticeId: notice1.id,
        tenantId: tenant.id,
        action: notice1Activities[i].action as any,
        comment: notice1Activities[i].comment,
        previousValue: notice1Activities[i].previousValue,
        newValue: notice1Activities[i].newValue,
        createdBy: user.id,
      },
    });
  }

  // Notice 2: GST Assessment Notice - CRITICAL severity
  const notice2 = await prisma.notice.upsert({
    where: { id: 'notice-gst-assessment-001' },
    update: {},
    create: {
      id: 'notice-gst-assessment-001',
      workspaceId: workspace.id,
      tenantId: tenant.id,
      businessId: business.id,
      noticeNumber: 'C.No.AHD-EX-006/2025-26/ASC-789',
      noticeType: 'GST_ASSESSMENT',
      issuingAuthority: 'Additional Commissioner, LTU Ahmedabad',
      assessmentYear: '2022-23',
      severity: 'CRITICAL',
      status: 'CLIENT_PENDING',
      receivedDate: new Date('2026-03-20'),
      responseDueDate: new Date('2026-05-25'),
      demandAmount: 450000,
      penaltyAmount: 50000,
      interestAmount: 35000,
      subject: 'Summary Assessment under Section 73 - FY 2022-23',
      summary: 'Best judgment assessment completed due to non-filing of GSTR-3B for 6 months.',
      groundsOfNotice: 'Summary Assessment under Section 73 of CGST Act, 2017:\n\nPeriod: April 2022 to September 2022\n\nTax liability determined: ₹4,50,000\nPenalty under Section 122: ₹50,000\nInterest @ 18% p.a.: ₹35,000\nTotal demand: ₹5,35,000\n\nDefault: Failure to file GSTR-3B returns for 6 consecutive tax periods',
      assignedTo: user.id,
      assignedAt: new Date('2026-03-21'),
      totalLiability: 535000,
    },
  });

  // Notice 2 Activities
  const notice2Activities = [
    { action: 'CREATED', comment: 'Assessment notice - critical demand' },
    { action: 'ASSIGNED', comment: 'Escalated to senior CA' },
    { action: 'STATUS_CHANGED', comment: 'Pending client documents', previousValue: 'RECEIVED', newValue: 'CLIENT_PENDING' },
    { action: 'COMMENT', comment: 'Client needs to arrange ₹5.35 Lakhs for payment. Requesting extension from authority.' },
    { action: 'COMMENT', comment: 'Meeting scheduled with client on 25th May to finalize response strategy' },
  ];

  for (let i = 0; i < notice2Activities.length; i++) {
    await prisma.noticeActivity.upsert({
      where: { id: `notice2-activity-${i + 1}` },
      update: {},
      create: {
        id: `notice2-activity-${i + 1}`,
        noticeId: notice2.id,
        tenantId: tenant.id,
        action: notice2Activities[i].action as any,
        comment: notice2Activities[i].comment,
        previousValue: notice2Activities[i].previousValue,
        newValue: notice2Activities[i].newValue,
        createdBy: user.id,
      },
    });
  }

  // Notice 3: GST Penalty Notice - MEDIUM severity
  const notice3 = await prisma.notice.upsert({
    where: { id: 'notice-gst-penalty-001' },
    update: {},
    create: {
      id: 'notice-gst-penalty-001',
      workspaceId: workspace.id,
      tenantId: tenant.id,
      businessId: business.id,
      noticeNumber: 'C.No.AHD-EX-006/2025-26/PN-123',
      noticeType: 'GST_PENALTY',
      issuingAuthority: 'Deputy Commissioner, Ward 3, Ahmedabad',
      assessmentYear: '2024-25',
      severity: 'MEDIUM',
      status: 'DRAFT_PREPARED',
      receivedDate: new Date('2026-05-01'),
      responseDueDate: new Date('2026-06-15'),
      penaltyAmount: 25000,
      subject: 'Penalty under Section 125 for incorrect GST returns',
      summary: 'Penalty notice for filing returns with incorrect tax liability.',
      groundsOfNotice: 'Penalty proceedings under Section 125 of CGST Act, 2017:\n\nIncorrect return filed for period Oct 2024:\n- Tax declared: ₹75,000\n- Actual tax liability: ₹82,500\n- Short payment: ₹7,500\n\nPenalty calculated @ 10% of short payment or ₹25,000 whichever is higher: ₹25,000',
      assignedTo: user.id,
      assignedAt: new Date('2026-05-02'),
      totalLiability: 25000,
    },
  });

  // Notice 3 Activities
  const notice3Activities = [
    { action: 'CREATED', comment: 'Penalty notice received' },
    { action: 'STATUS_CHANGED', comment: 'Draft response prepared', previousValue: 'RECEIVED', newValue: 'DRAFT_PREPARED' },
    { action: 'COMMENT', comment: 'Response draft prepared citing genuine mistake and voluntary disclosure' },
  ];

  for (let i = 0; i < notice3Activities.length; i++) {
    await prisma.noticeActivity.upsert({
      where: { id: `notice3-activity-${i + 1}` },
      update: {},
      create: {
        id: `notice3-activity-${i + 1}`,
        noticeId: notice3.id,
        tenantId: tenant.id,
        action: notice3Activities[i].action as any,
        comment: notice3Activities[i].comment,
        previousValue: notice3Activities[i].previousValue,
        newValue: notice3Activities[i].newValue,
        createdBy: user.id,
      },
    });
  }

  // Notice 4: Income Tax Notice - HIGH severity
  const notice4 = await prisma.notice.upsert({
    where: { id: 'notice-it-scrutiny-001' },
    update: {},
    create: {
      id: 'notice-it-scrutiny-001',
      workspaceId: workspace.id,
      tenantId: tenant.id,
      businessId: business.id,
      noticeNumber: 'ITBA/AST/S/143(1)/2025-26/1045678',
      noticeType: 'INCOME_TAX_SCRUTINY',
      issuingAuthority: 'PCIT-8, Mumbai',
      assessmentYear: '2023-24',
      severity: 'HIGH',
      status: 'RECEIVED',
      receivedDate: new Date('2026-05-10'),
      responseDueDate: new Date('2026-06-30'),
      subject: 'Intimation under Section 143(1) - Selected for Scrutiny',
      summary: 'Income Tax Return for AY 2023-24 has been selected for scrutiny under CASS.',
      groundsOfNotice: 'Notice under Section 143(2) of the Income Tax Act, 1961:\n\nYour Income Tax Return for Assessment Year 2023-24 has been selected for scrutiny based on Computer Assisted Scrutiny Selection (CASS).\n\nReasons for selection:\n1. High value cash deposits during demonetization period\n2. Variation in GST turnover vs ITR income\n3. TDS discrepancies\n\nYou are required to appear before the Assessing Officer with:\n- Complete books of accounts\n- Bank statements for all accounts\n- GST returns and reconciliation\n- Form 16 and salary slips (if applicable)\n- Investment proofs for claim deductions',
      assignedTo: null,
      totalLiability: 0,
    },
  });

  // Notice 4 Activities
  const notice4Activities = [
    { action: 'CREATED', comment: 'IT scrutiny notice received - needs immediate attention' },
    { action: 'COMMENT', comment: 'Client needs to be informed urgently - 30 day deadline' },
  ];

  for (let i = 0; i < notice4Activities.length; i++) {
    await prisma.noticeActivity.upsert({
      where: { id: `notice4-activity-${i + 1}` },
      update: {},
      create: {
        id: `notice4-activity-${i + 1}`,
        noticeId: notice4.id,
        tenantId: tenant.id,
        action: notice4Activities[i].action as any,
        comment: notice4Activities[i].comment,
        previousValue: notice4Activities[i].previousValue,
        newValue: notice4Activities[i].newValue,
        createdBy: user.id,
      },
    });
  }

  console.log('Created 4 notices (3 GST + 1 Income Tax) with activities');

  console.log('Database seed completed successfully!');
  console.log('Test credentials: test@complyos.com / password123');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
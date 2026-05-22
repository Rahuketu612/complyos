/**
 * Database Seed Script
 * Creates initial test data for COMPLYOS development
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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
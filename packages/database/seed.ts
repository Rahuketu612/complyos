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
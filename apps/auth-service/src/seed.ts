/**
 * Demo Data Seeder
 * Creates safe demo user for development - NO real credentials committed
 * 
 * Usage: npx ts-node src/seed.ts
 */

import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

const DEMO_TENANT = {
  name: 'Demo Organization',
  slug: 'demo-org',
}

const DEMO_USER = {
  email: 'demo@complyos.dev',
  password: 'DemoPassword123!',
  firstName: 'Demo',
  lastName: 'User',
}

async function main() {
  console.log('🌱 Seeding demo data...')

  // Create demo tenant if not exists
  let tenant = await prisma.tenant.findUnique({
    where: { slug: DEMO_TENANT.slug },
  })

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: DEMO_TENANT,
    })
    console.log(`✅ Created tenant: ${tenant.name} (${tenant.slug})`)
  } else {
    console.log(`ℹ️ Using existing tenant: ${tenant.name}`)
  }

  // Create demo user if not exists
  const passwordHash = await bcrypt.hash(DEMO_USER.password, 12)
  
  let user = await prisma.user.findFirst({
    where: { email: DEMO_USER.email },
  })

  if (!user) {
    user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: DEMO_USER.email,
        passwordHash,
        firstName: DEMO_USER.firstName,
        lastName: DEMO_USER.lastName,
      },
    })
    console.log(`✅ Created user: ${user.email}`)
  } else {
    console.log(`ℹ️ Using existing user: ${user.email}`)
  }

  // Create demo business if not exists
  let business = await prisma.business.findFirst({
    where: { tenantId: tenant.id },
  })

  if (!business) {
    business = await prisma.business.create({
      data: {
        tenantId: tenant.id,
        name: 'Demo Business',
        gstin: '27AABCI1234C1Z5',
        pan: 'AABCI1234C',
        constitution: 'Private Limited',
        state: 'Maharashtra',
        address: '123 Demo Street, Mumbai',
      },
    })
    console.log(`✅ Created business: ${business.name} (${business.gstin})`)
  } else {
    console.log(`ℹ️ Using existing business: ${business.name}`)
  }

  console.log('\n🎉 Demo data seeded!')
  console.log('\n📋 Demo Credentials:')
  console.log(`   Email: ${DEMO_USER.email}`)
  console.log(`   Password: ${DEMO_USER.password}`)
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
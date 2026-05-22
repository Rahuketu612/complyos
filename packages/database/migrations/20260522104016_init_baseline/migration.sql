-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('super_admin', 'organization_admin', 'business_owner', 'ca_admin', 'ca_staff', 'auditor', 'read_only_auditor', 'compliance_manager', 'viewer');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'inactive', 'suspended', 'pending_verification');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('proprietary', 'partnership', 'private_limited', 'public_limited', 'huf', 'individual', 'trust', 'society', 'nfp', 'government', 'OTHER');

-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('active', 'dormant', 'closed', 'under_liquidation');

-- CreateEnum
CREATE TYPE "GstrFormType" AS ENUM ('GSTR_1', 'GSTR_3B', 'GSTR_4', 'GSTR_5', 'GSTR_6', 'GSTR_7', 'GSTR_8', 'GSTR_9', 'GSTR_9C', 'CMP_08', 'IFF');

-- CreateEnum
CREATE TYPE "FilingStatus" AS ENUM ('filed', 'late_filed', 'not_filed', 'processing', 'pending', 'nil', 'void');

-- CreateEnum
CREATE TYPE "NoticeType" AS ENUM ('gstr1_not_filed', 'gstr3b_not_filed', 'tax_demand', 'refund_rejection', 'ITC_mismatch', 'scrutiny', 'audit', 'inspection', 'summons', 'penalty', 'compoundable_offense', 'cancellation', 'provisional_attachment', 'OTHER');

-- CreateEnum
CREATE TYPE "NoticeSeverity" AS ENUM ('info', 'low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "NoticeStatus" AS ENUM ('received', 'viewed', 'under_review', 'response_drafting', 'response_submitted', 'hearing_scheduled', 'resolved', 'appeal_filed', 'pending_payment', 'disputed');

-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('active', 'inactive', 'blacklisted', 'blocked');

-- CreateEnum
CREATE TYPE "VendorRiskLevel" AS ENUM ('trusted', 'low_risk', 'medium_risk', 'high_risk', 'critical');

-- CreateEnum
CREATE TYPE "ReconcileStatus" AS ENUM ('pending', 'in_progress', 'completed', 'requires_action', 'disputed');

-- CreateEnum
CREATE TYPE "ReconcileType" AS ENUM ('itc_monthly', 'itc_quarterly', 'annual');

-- CreateEnum
CREATE TYPE "TimelineEventType" AS ENUM ('return_filed', 'return_latefiled', 'return_not_filed', 'notice_received', 'notice_response', 'payment_made', 'registration_granted', 'registration_cancelled', 'vendor_added', 'vendor_compliance_change', 'reconciliation_completed', 'risk_detected', 'threshold_crossed', 'user_login', 'auditor_access');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('notice', 'return', 'challan', 'acknowledgement', 'certificate', 'legal', 'contract', 'other');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('uploaded', 'processing', 'processed', 'failed', 'archived');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('in_app', 'email', 'sms', 'whatsapp');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('pending', 'sent', 'delivered', 'failed', 'clicked');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "subscriptionPlan" TEXT NOT NULL DEFAULT 'free',
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'active',
    "trialEndsAt" TIMESTAMP(3),
    "maxUsers" INTEGER NOT NULL DEFAULT 5,
    "maxBusinesses" INTEGER NOT NULL DEFAULT 10,
    "enableAi" BOOLEAN NOT NULL DEFAULT true,
    "enableAuditor" BOOLEAN NOT NULL DEFAULT false,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "ssoEnabled" BOOLEAN NOT NULL DEFAULT false,
    "ssoProvider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "profileImageUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'viewer',
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "loginCount" INTEGER NOT NULL DEFAULT 0,
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiry" TIMESTAMP(3) NOT NULL,
    "refreshTokenExpiry" TIMESTAMP(3),
    "tokenFamily" TEXT,
    "rotationCount" INTEGER NOT NULL DEFAULT 0,
    "deviceId" TEXT,
    "deviceName" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'viewer',
    "invitedBy" TEXT NOT NULL,
    "businessId" TEXT,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "acceptedIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businesses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tradeName" TEXT,
    "pan" TEXT NOT NULL,
    "panLinkedEmail" TEXT,
    "tan" TEXT,
    "cin" TEXT,
    "llpin" TEXT,
    "gstin" TEXT,
    "entityType" "EntityType" NOT NULL DEFAULT 'proprietary',
    "dateOfIncorporation" TIMESTAMP(3),
    "commencementDate" TIMESTAMP(3),
    "industry" TEXT,
    "nicCode" TEXT,
    "sector" TEXT,
    "subSector" TEXT,
    "annualTurnover" DECIMAL(65,30),
    "employeeCount" INTEGER,
    "registeredEmployees" INTEGER,
    "registeredAddress" TEXT,
    "principalPlaceAddress" TEXT,
    "additionalPlaces" JSONB,
    "contactPerson" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "gstApplicable" BOOLEAN NOT NULL DEFAULT false,
    "epfApplicable" BOOLEAN NOT NULL DEFAULT false,
    "esicApplicable" BOOLEAN NOT NULL DEFAULT false,
    "tdsApplicable" BOOLEAN NOT NULL DEFAULT false,
    "ptApplicable" BOOLEAN NOT NULL DEFAULT false,
    "complianceScore" INTEGER NOT NULL DEFAULT 75,
    "healthStatus" TEXT NOT NULL DEFAULT 'good',
    "status" "BusinessStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registrations" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "link" TEXT,
    "dateOfRegistration" TIMESTAMP(3),
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "jurisdiction" TEXT,
    "circle" TEXT,
    "ward" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_returns" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "financialYear" TEXT NOT NULL,
    "taxPeriod" TEXT NOT NULL,
    "formType" "GstrFormType" NOT NULL,
    "formNumber" TEXT,
    "status" "FilingStatus" NOT NULL DEFAULT 'not_filed',
    "dueDate" TIMESTAMP(3),
    "filedDate" TIMESTAMP(3),
    "ackNumber" TEXT,
    "ackDate" TIMESTAMP(3),
    "arn" TEXT,
    "totalLiability" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "cashLiability" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "itcAvailable" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "itcUsed" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taxPaid" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "interestPaid" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "penaltyPaid" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "lateFeePaid" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "delayDays" INTEGER,
    "summary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gst_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notices" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "noticeNumber" TEXT,
    "referenceNumber" TEXT,
    "noticeDate" TIMESTAMP(3),
    "noticeType" "NoticeType" NOT NULL,
    "noticeCategory" TEXT,
    "severity" "NoticeSeverity" NOT NULL DEFAULT 'medium',
    "status" "NoticeStatus" NOT NULL DEFAULT 'received',
    "demandedAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "penaltyAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "responseDueDate" TIMESTAMP(3),
    "hearingDate" TIMESTAMP(3),
    "resolvedDate" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'portal',
    "sourceReference" TEXT,
    "title" TEXT,
    "description" TEXT,
    "aiSummary" TEXT,
    "aiRiskLevel" TEXT,
    "aiActionItems" JSONB,
    "aiConfidence" DOUBLE PRECISION,
    "responseDate" TIMESTAMP(3),
    "responseDocUrl" TEXT,
    "events" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_ledger" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "ledgerType" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "transactionType" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "sgst" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "cgst" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "igst" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "cess" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "returnId" TEXT,
    "challengeId" TEXT,
    "paymentRef" TEXT,
    "doctype" TEXT,
    "balance" DECIMAL(65,30) NOT NULL,
    "isReversal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gst_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tradeName" TEXT,
    "gstin" TEXT NOT NULL,
    "pan" TEXT,
    "tan" TEXT,
    "address" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "entityType" "EntityType",
    "complianceScore" INTEGER NOT NULL DEFAULT 70,
    "riskLevel" "VendorRiskLevel" NOT NULL DEFAULT 'low_risk',
    "lastGstr1Filed" TIMESTAMP(3),
    "lastGstr3BFiled" TIMESTAMP(3),
    "totalInvoices" INTEGER NOT NULL DEFAULT 0,
    "matchedInvoices" INTEGER NOT NULL DEFAULT 0,
    "unmatchedInvoices" INTEGER NOT NULL DEFAULT 0,
    "missingInvoices" INTEGER NOT NULL DEFAULT 0,
    "itcClaimed" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "itcAtRisk" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "itcBlocked" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" "VendorStatus" NOT NULL DEFAULT 'active',
    "statusReason" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gstr2b_invoices" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "invoiceValue" DECIMAL(65,30) NOT NULL,
    "gstr2bInvoiceType" TEXT,
    "gstr2bFilingStatus" TEXT,
    "matchStatus" TEXT,
    "matchDifference" DECIMAL(65,30),
    "rate" DECIMAL(65,30),
    "taxableValue" DECIMAL(65,30),
    "sgst" DECIMAL(65,30),
    "cgst" DECIMAL(65,30),
    "igst" DECIMAL(65,30),
    "cess" DECIMAL(65,30),
    "reverseCharge" BOOLEAN NOT NULL DEFAULT false,
    "pos" TEXT,
    "source" TEXT,
    "itcEligible" BOOLEAN NOT NULL DEFAULT true,
    "itcClaimed" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gstr2b_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliations" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "reconcileType" "ReconcileType" NOT NULL,
    "booksTotal" DECIMAL(65,30) NOT NULL,
    "booksInvoiceCount" INTEGER NOT NULL,
    "gstr2bTotal" DECIMAL(65,30) NOT NULL,
    "gstr2bInvoiceCount" INTEGER NOT NULL,
    "varianceAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "variancePercent" DOUBLE PRECISION,
    "matchedAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "missingAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "mismatchAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "duplicateAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "blockedAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "matchedInvoices" INTEGER NOT NULL DEFAULT 0,
    "missingInvoices" INTEGER NOT NULL DEFAULT 0,
    "mismatchInvoices" INTEGER NOT NULL DEFAULT 0,
    "duplicateInvoices" INTEGER NOT NULL DEFAULT 0,
    "status" "ReconcileStatus" NOT NULL DEFAULT 'pending',
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "notes" TEXT,
    "actionItems" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "businessId" TEXT,
    "userId" TEXT,
    "eventType" "TimelineEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "severity" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "businessId" TEXT,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "storageUrl" TEXT,
    "encryptionKey" TEXT,
    "documentType" "DocumentType" NOT NULL DEFAULT 'other',
    "documentStatus" "DocumentStatus" NOT NULL DEFAULT 'uploaded',
    "ocrText" TEXT,
    "extractedData" JSONB,
    "tags" TEXT[],
    "metadata" JSONB,
    "checksum" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "businessId" TEXT,
    "type" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'in_app',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionUrl" TEXT,
    "status" "NotificationStatus" NOT NULL DEFAULT 'pending',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "scheduledFor" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestMethod" TEXT,
    "requestPath" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "events" TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" TIMESTAMP(3),
    "triggerCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_articles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "source" TEXT,
    "sourceUrl" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "embedding" BYTEA,
    "authoredBy" TEXT,
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT,
    "messages" JSONB NOT NULL,
    "mode" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "rating" INTEGER,
    "feedback" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "complianceType" TEXT NOT NULL,
    "ruleExpression" TEXT NOT NULL,
    "ruleEngine" TEXT NOT NULL DEFAULT 'static',
    "threshold" DECIMAL(65,30),
    "thresholdUnit" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "state" TEXT,
    "jurisdiction" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_schedules" (
    "id" TEXT NOT NULL,
    "complianceRuleId" TEXT,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "frequency" TEXT NOT NULL,
    "period" TEXT,
    "dueDate" TIMESTAMP(3),
    "reminderDays" INTEGER NOT NULL DEFAULT 7,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenantId_email_key" ON "users"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_accessToken_key" ON "sessions"("accessToken");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refreshToken_key" ON "sessions"("refreshToken");

-- CreateIndex
CREATE INDEX "sessions_userId_isRevoked_idx" ON "sessions"("userId", "isRevoked");

-- CreateIndex
CREATE INDEX "sessions_tokenFamily_isRevoked_idx" ON "sessions"("tokenFamily", "isRevoked");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_tenantId_email_key" ON "invitations"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "businesses_pan_key" ON "businesses"("pan");

-- CreateIndex
CREATE UNIQUE INDEX "businesses_gstin_key" ON "businesses"("gstin");

-- CreateIndex
CREATE UNIQUE INDEX "registrations_businessId_type_key" ON "registrations"("businessId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "gst_returns_businessId_formType_taxPeriod_key" ON "gst_returns"("businessId", "formType", "taxPeriod");

-- CreateIndex
CREATE INDEX "gst_ledger_businessId_date_idx" ON "gst_ledger"("businessId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_gstin_key" ON "vendors"("gstin");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_tenantId_gstin_businessId_key" ON "vendors"("tenantId", "gstin", "businessId");

-- CreateIndex
CREATE INDEX "gstr2b_invoices_businessId_period_idx" ON "gstr2b_invoices"("businessId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "gstr2b_invoices_vendorId_invoiceNumber_period_key" ON "gstr2b_invoices"("vendorId", "invoiceNumber", "period");

-- CreateIndex
CREATE UNIQUE INDEX "reconciliations_businessId_period_key" ON "reconciliations"("businessId", "period");

-- CreateIndex
CREATE INDEX "timeline_events_tenantId_timestamp_idx" ON "timeline_events"("tenantId", "timestamp");

-- CreateIndex
CREATE INDEX "timeline_events_businessId_timestamp_idx" ON "timeline_events"("businessId", "timestamp");

-- CreateIndex
CREATE INDEX "notifications_tenantId_status_idx" ON "notifications"("tenantId", "status");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_timestamp_idx" ON "audit_logs"("tenantId", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_userId_timestamp_idx" ON "audit_logs"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "knowledge_articles_category_idx" ON "knowledge_articles"("category");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_rules_slug_key" ON "compliance_rules"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_rules_slug_complianceType_key" ON "compliance_rules"("slug", "complianceType");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_schedules_businessId_complianceRuleId_period_key" ON "compliance_schedules"("businessId", "complianceRuleId", "period");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_returns" ADD CONSTRAINT "gst_returns_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gstr2b_invoices" ADD CONSTRAINT "gstr2b_invoices_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gstr2b_invoices" ADD CONSTRAINT "gstr2b_invoices_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliations" ADD CONSTRAINT "reconciliations_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

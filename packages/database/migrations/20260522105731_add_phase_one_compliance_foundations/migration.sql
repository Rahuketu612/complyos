-- CreateEnum
CREATE TYPE "MsmeType" AS ENUM ('MICRO', 'SMALL', 'MEDIUM');

-- CreateEnum
CREATE TYPE "RetentionCategory" AS ENUM ('GST_RECORDS', 'INCOME_TAX', 'TDS_RECORDS', 'COMPANY_RECORDS', 'AUDIT_WORKPAPERS', 'CONTRACTS', 'PERSONAL_DATA', 'DEFAULT');

-- CreateEnum
CREATE TYPE "AuditEventCategory" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT', 'TOKEN_REFRESH', 'GST_ACTION', 'VENDOR_ACTION', 'DATA_EXPORT', 'ADMIN_ACTION', 'SECURITY_INCIDENT', 'DATA_ACCESS', 'DATA_MODIFICATION', 'SYSTEM_CONFIG');

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "checksum" TEXT,
ADD COLUMN     "correlationId" TEXT,
ADD COLUMN     "eventCategory" "AuditEventCategory",
ADD COLUMN     "previousHash" TEXT;

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "destroyAfterRetain" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "retentionCategory" "RetentionCategory" NOT NULL DEFAULT 'GST_RECORDS',
ADD COLUMN     "retentionUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "vendors" ADD COLUMN     "msmeRegistered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "msmeType" "MsmeType",
ADD COLUMN     "paymentDueDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "udyamNumber" TEXT;

-- CreateIndex
CREATE INDEX "audit_logs_eventCategory_timestamp_idx" ON "audit_logs"("eventCategory", "timestamp");

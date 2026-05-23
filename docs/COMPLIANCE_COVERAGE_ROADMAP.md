# Indian Compliance Coverage Roadmap

> **⚠️ DISCLAIMER**: This document is for internal planning and product roadmap purposes only. It does not constitute legal advice. Always consult qualified legal professionals for compliance obligations specific to your business circumstances.

## Overview

This roadmap tracks COMPLYOS coverage for Indian regulatory compliance requirements. Each section documents current support, gaps, recommended phases, and suggested database entities.

---

## 1. Indirect Tax (GST)

### 1.1 CGST Act, 2017 ✅ **Phase 1 - Supported**

**Current Support:**
- `GstReturn` entity with form types: GSTR-1, GSTR-3B, GSTR-4, GSTR-5, GSTR-6, GSTR-7, GSTR-8, GSTR-9, GSTR-9C, CMP-08, IFF
- Filing status tracking: filed, late_filed, not_filed, processing, pending, nil, void
- Tax liability calculations (SGST, CGST, IGST, CESS)
- Due date tracking

**Missing:**
- GSTR-2/2A matching (partially implied via vendor invoices)
- Amendment/rectification support
- Annual return simplification forms

**Suggested Entities:** (existing)

```prisma
model GstReturn {
  id                String
  businessId        String
  formType          GstrFormType
  financialYear    String
  taxPeriod         String
  status            FilingStatus
  totalLiability    Decimal
  cashLiability     Decimal
  itcAvailable      Decimal
  itcUsed           Decimal
  // ...
}
```

---

### 1.2 SGST Acts ✅ **Phase 1 - Supported**

**Current Support:**
- CGST/SGST split calculations in `GstReturn`
- State-wise jurisdiction handling via registrations

**Missing:**
- State-specific exemption mappings
- UTGST vs SGST differentiation logic

**Suggested Entities:** (existing, enhance)

```prisma
model StateJurisdiction {
  stateCode       String @id
  sgstRate        Decimal
  utgstRate       Decimal
  additionalRate   Decimal?
  exemptionThreshold Decimal
}
```

---

### 1.3 IGST Act, 2017 ✅ **Phase 1 - Supported**

**Current Support:**
- IGST calculations in GST returns
- Place of Supply (POS) tracking via `Gstr2bInvoice.pos`

**Missing:**
- Interstate vs intrastate determination automation
- Bill of Supply vs Tax Invoice differentiation

---

### 1.4 UTGST Act, 2017 ⚠️ **Phase 2**

**Current Support:**
- Partial via IGST calculations

**Missing:**
- Union Territory specific rules
- Lakshadweep, Andaman, Chandigarh handling

---

### 1.5 GST Rules, 2017 ⚠️ **Phase 2**

**Current Support:**
- Basic compliance via form structures

**Missing:**
- Input Tax Credit reversal rules (Rule 37, 38, 42, 43)
- Composition scheme calculations
- HSN/SAC code validation
- Invoice numbering series

---

### 1.6 E-Invoicing 🔴 **Phase 2 - Major Gap**

**Current Support:**
- None

**Missing:**
- IRN (Invoice Reference Number) generation/validation
- QR code generation
- E-Invoice API integration (NIC/GSTN sandbox)
- Cancellation flow
- Multi-GSTIN aggregation

**Suggested Entities:**

```prisma
model EInvoice {
  id              String @id
  invoiceId       String
  irn             String @unique
  ackNo           String?
  ackDate         DateTime?
  qrCode          String?
  signedJson      String?
  status          EInvoiceStatus
  // ...
}

enum EInvoiceStatus {
  GENERATED
  ACKNOWLEDGED
  CANCELLED
  LINKED
}
```

**Service Boundary:** `einvoice-service`

---

### 1.7 E-Way Bill 🔴 **Phase 2 - Major Gap**

**Current Support:**
- None

**Missing:**
- E-Way Bill generation API integration (GSTN)
- Part-A / Part-B handling
- Transportation mode tracking
- Multi-vehicle management
- Cancellation within validity

**Suggested Entities:**

```prisma
model EWayBill {
  id              String @id
  ewbNo           String @unique
  ewbDate         DateTime
  validity        DateTime
  fromGstin       String
  toGstin         String
  vehicleNo       String?
  transporterId   String?
  documentType    EwbDocumentType
  invoiceIds      String[]
  status          EWayBillStatus
  // ...
}
```

**Service Boundary:** `ewaybill-service`

---

## 2. Direct Tax

### 2.1 Income-tax Act, 1961 🔴 **Phase 3**

**Current Support:**
- None

**Missing:**
- PAN validation
- TAN/Form 16 generation
- Tax slab calculations
- Advance tax tracking

**Suggested Entities:**

```prisma
model IncomeTaxFiling {
  id              String @id
  businessId      String
  assessmentYear  String
  itrType         ItrType
  totalIncome     Decimal
  taxPaid         Decimal
  status          FilingStatus
  // ...
}
```

**Service Boundary:** `tax-service`

---

### 2.2 TDS/TCS 🔴 **Phase 3**

**Current Support:**
- None

**Missing:**
- TDS rate master
- Form 16A/27Q generation
- TDS certificate tracking
- Challan payment tracking
- Quarterly e-TDS returns

**Suggested Entities:**

```prisma
model TdsEntry {
  id              String @id
  businessId      String
  vendorId        String
  section         String
  amount          Decimal
  tdsRate         Decimal
  tdsAmount       Decimal
  pan             String
  certificateNo   String?
  quarter         String
  dueDate         DateTime
  // ...
}
```

**Service Boundary:** `tds-service`

---

## 3. Corporate Compliance

### 3.1 Companies Act, 2013 🔴 **Phase 3**

**Current Support:**
- Basic business entity tracking

**Missing:**
- Director management
- AGM/EGM scheduling
- Board resolution tracking
- Charges registration
- Benami transaction reporting

**Suggested Entities:**

```prisma
model Director {
  id              String @id
  userId          String?
  din             String @unique
  name            String
  fatherName      String?
  pan             String
  designation     String
  appointmentDate DateTime
  cessationDate   DateTime?
  // ...
}

model CompanyEvent {
  id              String @id
  businessId      String
  eventType       CompanyEventType
  dueDate         DateTime
  filedDate       DateTime?
  status          FilingStatus
  // ...
}
```

---

### 3.2 MCA/ROC Filings 🔴 **Phase 3**

**Current Support:**
- None

**Missing:**
- e-Form filing tracking (INC-20A, MGT-7, AOC-4)
- Annual return due date management
- Event-based filing alerts
- ROC fee calculations

**Service Boundary:** `mca-service`

---

### 3.3 MSME Delayed Payment 🔴 **Phase 2**

**Current Support:**
- Vendor compliance scoring (partial)

**Missing:**
- MSME registration verification
- Payment due date tracking from invoice date
- Automatic interest calculation (SBI MCLR + 3%)
- Grievance escalation workflow
- TReDS platform integration potential

**Suggested Entities:**

```prisma
model MsmePayment {
  id              String @id
  invoiceId       String
  vendorId        String
  vendorMsmeType  MsmeType
  invoiceDate     DateTime
  dueDate         DateTime
  amount          Decimal
  interestEligible Decimal @default(0)
  status          PaymentStatus
  // ...
}

enum MsmeType {
  MICRO
  SMALL
  MEDIUM
}
```

**Service Boundary:** `vendor-service` (enhance)

---

## 4. Labour Compliance

### 4.1 EPF ⚠️ **Phase 2**

**Current Support:**
- `Business.epfApplicable` flag

**Missing:**
- EPF membership tracking
- Contribution calculations (12% of wages up to ₹15,000)
- Form 5 (joint declaration), Form 10 (exit)
- ECR generation
- UAN management

**Suggested Entities:**

```prisma
model EpfContribution {
  id              String @id
  businessId      String
  employeeId      String
  uan             String
  wages           Decimal
  epfWage         Decimal
  employeeContrib Decimal
  employerContrib Decimal
  epsContrib      Decimal
  month           String
  status          FilingStatus
  // ...
}
```

---

### 4.2 ESI ⚠️ **Phase 2**

**Current Support:**
- `Business.esicApplicable` flag

**Missing:**
- ESI membership tracking
- Contribution calculations (0.75% employee, 3.25% employer)
- IP number management
- Form 6 (temporary identity cards)
- Monthly ECR

**Suggested Entities:**

```prisma
model EsiContribution {
  id              String @id
  businessId      String
  employeeId      String
  ipNumber        String
  wages           Decimal
  employeeContrib Decimal
  employerContrib Decimal
  month           String
  status          FilingStatus
  // ...
}
```

---

### 4.3 Professional Tax ⚠️ **Phase 3**

**Current Support:**
- None

**Missing:**
- State-wise PT slabs
- Employee PT deductions
- Annual PT return

**Service Boundary:** `payroll-service`

---

### 4.4 Shops & Establishments ⚠️ **Phase 3**

**Current Support:**
- None

**Missing:**
- License number tracking
- Renewal calendar
- Working hours compliance
- State-specific rules

**Suggested Entities:**

```prisma
model ShopEstablishment {
  id              String @id
  businessId      String
  licenseNo       String
  state           String
  category        String
  employeeCount   Int
  closingHours    String?
  weeklyOff       String?
  renewalDate     DateTime
  status          LicenseStatus
}
```

---

## 5. Data Privacy & Cybersecurity

### 5.1 DPDP Act, 2023 ⚠️ **Phase 2**

**Current Support:**
- None (GDPR mentions only in config)

**Missing:**
- Consent management framework
- Data fiduciary obligations tracking
- Breach notification workflow
- Data principal rights (access, correction, deletion)
- Consent audit trail

**Suggested Entities:**

```prisma
model ConsentRecord {
  id              String @id
  userId          String
  purpose         String
  consentVersion  String
  granted         Boolean
  timestamp       DateTime
  ipAddress       String
  method          String
  // ...
}

model DataBreach {
  id              String @id
  description     String
  affectedUsers   Int
  reportedTo      String
  reportedAt      DateTime?
  status          BreachStatus
}
```

**Service Boundary:** `privacy-service`

---

### 5.2 IT Act, 2000 ⚠️ **Phase 2**

**Current Support:**
- Digital signature field in documents

**Missing:**
- Electronic contract framework
- Digital locker integration
- Acknowledgment receipts

---

### 5.3 CERT-In Logging Requirements 🔴 **Phase 2**

**Current Support:**
- `audit_logs` table exists
- Correlation ID tracking

**Missing:**
- Specified log retention (5 years)
- Incident response timeline
- Mandatory breach reporting within 6 hours
- Server/client identification
- Time synchronization (NTP)

**Suggested Configuration:**

```yaml
# .env requirements
CERTIN_LOGS_ENABLED=true
LOG_RETENTION_DAYS=1825
LOG_SERVER_ID=prod-$(hostname)
LOG_TIMEZONE=Asia/Kolkata
NTP_SERVER=time.google.com
```

**Suggested Entities:**

```prisma
model SecurityIncident {
  id              String @id
  incidentId      String @unique
  severity       Severity
  description    String
  detectedAt     DateTime
  reportedAt     DateTime?
  resolvedAt     DateTime?
  status         IncidentStatus
  affectedSystems String[]
  actionsTaken   String[]
}
```

---

## 6. Anti-Money Laundering & KYC

### 6.1 PMLA/KYC Readiness 🔴 **Phase 3**

**Current Support:**
- Basic user registration

**Missing:**
- PAN verification (via NSDL/PAN APIs)
- Aadhaar eKYC (with consent)
- CKYC compliance
- Beneficial ownership tracking
- Risk scoring based on transaction patterns
- STR filing readiness
- Cash transaction reporting (₹10L+)
- Suspicious transaction alerts

**Suggested Entities:**

```prisma
model KycRecord {
  id              String @id
  userId          String
  pan             String
  aadhaarLast4    String?
  kycStatus       KycStatus
  verifiedAt      DateTime?
  riskLevel       RiskLevel
  // ...
}

model BeneficialOwner {
  id              String @id
  businessId      String
  name            String
  pan             String?
  sharePercent    Decimal
  natureOfControl String
}

model SuspiciousTransaction {
  id              String @id
  userId          String
  amount          Decimal
  pattern         String
  flags           String[]
  status          AlertStatus
  reviewedBy      String?
  reviewedAt      DateTime?
}
```

---

## 7. Books & Audit Requirements

### 7.1 Books of Accounts Retention ⚠️ **Phase 2**

**Current Support:**
- `documents` table with archival status

**Missing:**
- Mandatory retention periods:
  - Books: 8 years (Section 128)
  - GST records: 6 years (+ pending assessments)
  - TDS records: 7 years
  - Company records: 8 years
- Destruction workflow
- Compliance certificate generation

**Suggested Entities:**

```prisma
model RetentionPolicy {
  id              String @id
  entityType      DocumentType
  retentionYears  Int
  legalBasis      String
  destructionApprovedBy String?
  nextReviewDate  DateTime
}

model DocumentLifecycle {
  id              String @id
  documentId      String
  status          LifecycleStatus
  createdAt       DateTime
  archivedAt      DateTime?
  destroyedAt     DateTime?
}
```

---

### 7.2 Audit Trail Requirements ⚠️ **Phase 2**

**Current Support:**
- `audit_logs` table
- Entity-level tracking

**Missing:**
- Immutable audit log storage
- Entry-point to exit-point tracking
- System-generated vs user-generated distinction
- Financial transaction immutability

**Suggested Enhancement:**

```prisma
model AuditLog {
  id              String @id
  // existing fields...
  checksum        String  // SHA-256 of previous entry for chain integrity
  immutable      Boolean @default(true)
}
```

---

## Priority Summary

### Phase 1 (0-3 months) - Core GST Platform
1. ✅ GST Returns (GSTR-1, GSTR-3B, GSTR-9) - **Already Supported**
2. ⚠️ GST Rules compliance - Form validation, HSN codes
3. ⚠️ CERT-In logging configuration
4. ⚠️ MSME payment tracking (enhance vendor module)

### Phase 2 (3-6 months) - Enterprise Features
1. 🔴 E-Invoicing integration
2. 🔴 E-Way Bill integration
3. ⚠️ EPF/ESI compliance
4. ⚠️ DPDP consent management
5. ⚠️ Books retention workflow

### Phase 3 (6-12 months) - Full Coverage
1. 🔴 Income-tax & TDS
2. 🔴 Companies Act filings
3. 🔴 MCA/ROC compliance
4. 🔴 PMLA/KYC readiness
5. 🔴 Professional tax

---

## Major Gaps Summary

| Area | Gap Severity | Priority |
|------|--------------|----------|
| E-Invoicing | Critical | Phase 2 |
| E-Way Bill | Critical | Phase 2 |
| CERT-In Logging | High | Phase 2 |
| TDS/TCS | High | Phase 3 |
| Income Tax | High | Phase 3 |
| PMLA/KYC | High | Phase 3 |
| EPF/ESI | Medium | Phase 2 |
| MSME Payments | Medium | Phase 2 |
| MCA Filings | Medium | Phase 3 |
| DPDP Act | Medium | Phase 2 |

---

## Service Boundary Recommendations

| Service | Responsibility |
|---------|----------------|
| `auth-service` | Authentication, Session management |
| `business-service` | Core business, registrations |
| `gst-service` | GST returns, ledger, notices |
| `vendor-service` | Vendor management, MSME tracking |
| `einvoice-service` | E-Invoice generation/validation (new) |
| `ewaybill-service` | E-Way Bill management (new) |
| `tax-service` | Income tax, TDS/TCS (new) |
| `payroll-service` | EPF, ESI, Professional tax (new) |
| `mca-service` | MCA/ROC filings (new) |
| `privacy-service` | DPDP, KYC, consent (new) |
| `compliance-service` | Retention policies, audit trail (new) |

---

*Last Updated: 2026-05-22*
*Document Owner: Product Team*
*Review Frequency: Quarterly*
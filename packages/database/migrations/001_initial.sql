-- COMPLYOS Database Schema for PostgreSQL

-- ============================================
-- MIGRATION: Initial Schema
-- Version: 1.0.0
-- ============================================

-- TENANT (Organization)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    logo_url VARCHAR(500),
    address VARCHAR(500),
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    subscription_plan VARCHAR(50) DEFAULT 'free',
    subscription_status VARCHAR(50) DEFAULT 'active',
    trial_ends_at TIMESTAMP,
    max_users INTEGER DEFAULT 5,
    max_businesses INTEGER DEFAULT 10,
    enable_ai BOOLEAN DEFAULT true,
    enable_auditor BOOLEAN DEFAULT false,
    mfa_enabled BOOLEAN DEFAULT false,
    sso_enabled BOOLEAN DEFAULT false,
    sso_provider VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenants_slug ON tenants(slug);

-- USERS
CREATE TYPE user_role AS ENUM ('super_admin', 'organization_admin', 'business_owner',
    'ca_admin', 'ca_staff', 'auditor', 'read_only_auditor',
    'compliance_manager', 'viewer');

CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending_verification');

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    phone VARCHAR(20),
    profile_image_url VARCHAR(500),
    role user_role DEFAULT 'viewer',
    status user_status DEFAULT 'active',
    email_verified BOOLEAN DEFAULT false,
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret VARCHAR(100),
    last_login_at TIMESTAMP,
    last_login_ip VARCHAR(50),
    login_count INTEGER DEFAULT 0,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, email)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant ON users(tenant_id);

-- SESSIONS
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    access_token VARCHAR(500) UNIQUE NOT NULL,
    refresh_token VARCHAR(500) UNIQUE,
    token_expiry TIMESTAMP NOT NULL,
    refresh_token_expiry TIMESTAMP,
    device_id VARCHAR(100),
    device_name VARCHAR(100),
    ip_address VARCHAR(50),
    user_agent VARCHAR(500),
    is_revoked BOOLEAN DEFAULT false,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- BUSINESS ENTITIES
CREATE TYPE entity_type AS ENUM ('proprietary', 'partnership', 'private_limited',
    'public_limited', 'huf', 'individual', 'trust', 'society', 'nfp', 'government');

CREATE TYPE business_status AS ENUM ('active', 'dormant', 'closed', 'under_liquidation');

CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    pan VARCHAR(10) UNIQUE NOT NULL,
    pan_linked_email VARCHAR(255),
    tan VARCHAR(10),
    cin VARCHAR(21),
    llpin VARCHAR(8),
    gstin VARCHAR(15) UNIQUE,
    entity_type entity_type DEFAULT 'proprietary',
    date_of_incorporation DATE,
    commencement_date DATE,
    industry VARCHAR(100),
    nic_code VARCHAR(5),
    sector VARCHAR(100),
    sub_sector VARCHAR(100),
    annual_turnover DECIMAL(15,2),
    employee_count INTEGER,
    registered_address TEXT,
    principal_place_address TEXT,
    contact_person VARCHAR(200),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    gst_applicable BOOLEAN DEFAULT false,
    epf_applicable BOOLEAN DEFAULT false,
    esic_applicable BOOLEAN DEFAULT false,
    tds_applicable BOOLEAN DEFAULT false,
    pt_applicable BOOLEAN DEFAULT false,
    compliance_score INTEGER DEFAULT 75,
    health_status VARCHAR(20) DEFAULT 'good',
    status business_status DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- REGISTRATIONS
CREATE TABLE IF NOT EXISTS registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    type VARCHAR(50) NOT NULL,
    registration_number VARCHAR(50) NOT NULL,
    link VARCHAR(500),
    date_of_registration DATE,
    valid_from DATE,
    valid_to DATE,
    status VARCHAR(50) DEFAULT 'active',
    jurisdiction VARCHAR(100),
    circle VARCHAR(50),
    ward VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(business_id, type)
);

-- GST RETURNS
CREATE TYPE gstr_form_type AS ENUM ('GSTR_1', 'GSTR_3B', 'GSTR_4', 'GSTR_5', 'GSTR_6',
    'GSTR_7', 'GSTR_8', 'GSTR_9', 'GSTR_9C', 'CMP_08');

CREATE TYPE filing_status AS ENUM ('filed', 'late_filed', 'not_filed', 'processing', 'pending', 'nil');

CREATE TABLE IF NOT EXISTS gst_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    financial_year VARCHAR(10),
    tax_period VARCHAR(10) NOT NULL,
    form_type gstr_form_type NOT NULL,
    form_number VARCHAR(50),
    status filing_status DEFAULT 'not_filed',
    due_date DATE,
    filed_date TIMESTAMP,
    ack_number VARCHAR(50),
    ack_date TIMESTAMP,
    arn VARCHAR(50),
    total_liability DECIMAL(15,2) DEFAULT 0,
    cash_liability DECIMAL(15,2) DEFAULT 0,
    itc_available DECIMAL(15,2) DEFAULT 0,
    itc_used DECIMAL(15,2) DEFAULT 0,
    tax_paid DECIMAL(15,2) DEFAULT 0,
    interest_paid DECIMAL(15,2) DEFAULT 0,
    penalty_paid DECIMAL(15,2) DEFAULT 0,
    late_fee_paid DECIMAL(15,2) DEFAULT 0,
    delay_days INTEGER,
    summary JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(business_id, form_type, tax_period)
);

-- NOTICES
CREATE TYPE notice_type AS ENUM ('gstr1_not_filed', 'gstr3b_not_filed', 'tax_demand',
    'refund_rejection', 'ITC_mismatch', 'scrutiny', 'audit', 'inspection',
    'summons', 'penalty', 'compoundable_offense', 'cancellation',
    'provisional_attachment');

CREATE TYPE notice_severity AS ENUM ('info', 'low', 'medium', 'high', 'critical');

CREATE TYPE notice_status AS ENUM ('received', 'viewed', 'under_review', 'response_drafting',
    'response_submitted', 'hearing_scheduled', 'resolved', 'appeal_filed',
    'pending_payment', 'disputed');

CREATE TABLE IF NOT EXISTS notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    notice_number VARCHAR(50),
    reference_number VARCHAR(50),
    notice_date TIMESTAMP,
    notice_type notice_type,
    notice_category VARCHAR(100),
    severity notice_severity DEFAULT 'medium',
    status notice_status DEFAULT 'received',
    demanded_amount DECIMAL(15,2) DEFAULT 0,
    penalty_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    paid_amount DECIMAL(15,2) DEFAULT 0,
    due_date TIMESTAMP,
    response_due_date TIMESTAMP,
    hearing_date TIMESTAMP,
    resolved_date TIMESTAMP,
    source VARCHAR(50) DEFAULT 'portal',
    source_reference VARCHAR(100),
    title VARCHAR(500),
    description TEXT,
    ai_summary TEXT,
    ai_risk_level VARCHAR(20),
    ai_action_items JSONB,
    ai_confidence FLOAT,
    response_date TIMESTAMP,
    response_doc_url VARCHAR(500),
    events JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- VENDORS
CREATE TYPE vendor_status AS ENUM ('active', 'inactive', 'blacklisted', 'blocked');

CREATE TYPE vendor_risk_level AS ENUM ('trusted', 'low_risk', 'medium_risk', 'high_risk', 'critical');

CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    business_id UUID NOT NULL REFERENCES businesses(id),
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    gstin VARCHAR(15) UNIQUE NOT NULL,
    pan VARCHAR(10),
    tan VARCHAR(10),
    address TEXT,
    state VARCHAR(100),
    pincode VARCHAR(10),
    entity_type entity_type,
    compliance_score INTEGER DEFAULT 70,
    risk_level vendor_risk_level DEFAULT 'low_risk',
    last_gstr1_filed TIMESTAMP,
    last_gstr3b_filed TIMESTAMP,
    total_invoices INTEGER DEFAULT 0,
    matched_invoices INTEGER DEFAULT 0,
    unmatched_invoices INTEGER DEFAULT 0,
    missing_invoices INTEGER DEFAULT 0,
    itc_claimed DECIMAL(15,2) DEFAULT 0,
    itc_at_risk DECIMAL(15,2) DEFAULT 0,
    itc_blocked DECIMAL(15,2) DEFAULT 0,
    status vendor_status DEFAULT 'active',
    status_reason VARCHAR(255),
    first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, gstin, business_id)
);

-- GSTR-2B INVOICES
CREATE TABLE IF NOT EXISTS gstr2b_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    business_id UUID NOT NULL REFERENCES businesses(id),
    period VARCHAR(10) NOT NULL,
    invoice_number VARCHAR(50) NOT NULL,
    invoice_date DATE NOT NULL,
    invoice_value DECIMAL(15,2) NOT NULL,
    gstr2b_invoice_type VARCHAR(20),
    gstr2b_filing_status VARCHAR(20),
    match_status VARCHAR(20),
    match_difference DECIMAL(15,2),
    rate DECIMAL(5,2),
    taxable_value DECIMAL(15,2),
    sgst DECIMAL(15,2),
    cgst DECIMAL(15,2),
    igst DECIMAL(15,2),
    cess DECIMAL(15,2),
    reverse_charge BOOLEAN DEFAULT false,
    pos VARCHAR(50),
    source VARCHAR(50),
    itc_eligible BOOLEAN DEFAULT true,
    itc_claimed DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(vendor_id, invoice_number, period)
);

-- RECONCILIATION
CREATE TYPE reconcile_status AS ENUM ('pending', 'in_progress', 'completed',
    'requires_action', 'disputed');

CREATE TYPE reconcile_type AS ENUM ('itc_monthly', 'itc_quarterly', 'annual');

CREATE TABLE IF NOT EXISTS reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    period VARCHAR(10) NOT NULL,
    reconcile_type reconcile_type DEFAULT 'itc_monthly',
    books_total DECIMAL(15,2) DEFAULT 0,
    books_invoice_count INTEGER DEFAULT 0,
    gstr2b_total DECIMAL(15,2) DEFAULT 0,
    gstr2b_invoice_count INTEGER DEFAULT 0,
    variance_amount DECIMAL(15,2) DEFAULT 0,
    variance_percent FLOAT,
    matched_amount DECIMAL(15,2) DEFAULT 0,
    missing_amount DECIMAL(15,2) DEFAULT 0,
    mismatch_amount DECIMAL(15,2) DEFAULT 0,
    duplicate_amount DECIMAL(15,2) DEFAULT 0,
    blocked_amount DECIMAL(15,2) DEFAULT 0,
    matched_invoices INTEGER DEFAULT 0,
    missing_invoices INTEGER DEFAULT 0,
    mismatch_invoices INTEGER DEFAULT 0,
    duplicate_invoices INTEGER DEFAULT 0,
    status reconcile_status DEFAULT 'pending',
    completed_at TIMESTAMP,
    completed_by VARCHAR(100),
    notes TEXT,
    action_items JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(business_id, period)
);

-- TIMELINE EVENTS
CREATE TYPE timeline_event_type AS ENUM ('return_filed', 'return_latefiled',
    'return_not_filed', 'notice_received', 'notice_response', 'payment_made',
    'registration_granted', 'registration_cancelled', 'vendor_added',
    'vendor_compliance_change', 'reconciliation_completed', 'risk_detected',
    'threshold_crossed', 'user_login', 'auditor_access');

CREATE TABLE IF NOT EXISTS timeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    business_id UUID REFERENCES businesses(id),
    user_id UUID REFERENCES users(id),
    event_type timeline_event_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    metadata JSONB,
    related_entity_type VARCHAR(50),
    related_entity_id VARCHAR(50),
    severity VARCHAR(20),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DOCUMENTS
CREATE TYPE document_type AS ENUM ('notice', 'return', 'challan', 'acknowledgement',
    'certificate', 'legal', 'contract', 'other');

CREATE TYPE document_status AS ENUM ('uploaded', 'processing', 'processed', 'failed', 'archived');

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    business_id UUID REFERENCES businesses(id),
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50),
    mime_type VARCHAR(100),
    size INTEGER NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    storage_url VARCHAR(500),
    document_type document_type DEFAULT 'other',
    document_status document_status DEFAULT 'uploaded',
    ocr_text TEXT,
    extracted_data JSONB,
    tags TEXT[],
    metadata JSONB,
    checksum VARCHAR(100),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

-- Notifications
CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'sms', 'whatsapp');

CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'delivered', 'failed', 'clicked');

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    business_id UUID REFERENCES businesses(id),
    type VARCHAR(100) NOT NULL,
    channel notification_channel DEFAULT 'in_app',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(500),
    status notification_status DEFAULT 'pending',
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    failure_reason VARCHAR(500),
    retry_count INTEGER DEFAULT 0,
    scheduled_for TIMESTAMP,
    clicked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(50),
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    user_agent VARCHAR(500),
    request_method VARCHAR(10),
    request_path VARCHAR(500),
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenants_updated BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_businesses_updated BEFORE UPDATE ON businesses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
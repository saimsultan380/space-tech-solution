-- ============================================
-- QUERY PERFORMANCE OPTIMIZATION INDEXES
-- Generated: May 18, 2026
-- Purpose: Fix 47 performance issues found in audit
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- SALES TABLE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_sales_created_at_desc 
ON sales(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_customer_id_not_null 
ON sales(customer_id) 
WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_status 
ON sales(status);

CREATE INDEX IF NOT EXISTS idx_sales_company_name_trgm 
ON sales USING gin(company_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_sales_type_subtype 
ON sales(sale_type, subtype);

CREATE INDEX IF NOT EXISTS idx_sales_agent_created 
ON sales(agent_id, created_at DESC);

-- ============================================
-- CUSTOMERS TABLE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_customers_source_deleted 
ON customers(source, deleted_at) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customers_name_trgm 
ON customers USING gin(name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_customers_email_trgm 
ON customers USING gin(email gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_customers_phone_trgm 
ON customers USING gin(phone gin_trgm_ops);

-- ============================================
-- NOTES TABLE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_notes_customer_created 
ON notes(customer_id, created_at DESC);

-- ============================================
-- CHARGEBACKS TABLE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_chargebacks_status 
ON chargebacks(status);

CREATE INDEX IF NOT EXISTS idx_chargebacks_assigned_to 
ON chargebacks(assigned_to);

CREATE INDEX IF NOT EXISTS idx_chargebacks_date 
ON chargebacks(date DESC);

-- ============================================
-- USERS TABLE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_full_name_trgm 
ON users USING gin(full_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_users_role_active_name 
ON users(role, is_active, full_name) 
WHERE role = 'sales_agent' AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_users_is_active 
ON users(is_active) 
WHERE is_active = true;

-- ============================================
-- LEAVES TABLE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_leaves_status 
ON leaves(status);

CREATE INDEX IF NOT EXISTS idx_leaves_user_dates 
ON leaves(user_id, start_date DESC, end_date);

-- ============================================
-- ATTENDANCE TABLE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_attendance_user_date 
ON attendance(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_date 
ON attendance(date DESC);

-- ============================================
-- CHAT TABLES INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_pinned 
ON chat_messages(channel_id, is_pinned, is_deleted) 
WHERE is_pinned = true AND is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_chat_messages_content_trgm 
ON chat_messages USING gin(content gin_trgm_ops);

-- ============================================
-- PAYSLIPS TABLE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_payslips_user_period 
ON payslips(user_id, period_start, period_end);

-- ============================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================

ANALYZE sales;
ANALYZE customers;
ANALYZE notes;
ANALYZE chargebacks;
ANALYZE users;
ANALYZE leaves;
ANALYZE attendance;
ANALYZE chat_messages;
ANALYZE payslips;
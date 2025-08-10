-- Migration Script: Convert from old schema to new parent-child structure
-- Run this AFTER creating the new schema to migrate existing data

-- Step 1: Create new tables (run the database_schema_v2.sql first)
-- This script assumes the new tables already exist

-- Step 2: Migrate existing clients (if any)
INSERT INTO clients (id, name, email, created_at, updated_at)
SELECT
    id,
    name,
    email,
    created_at,
    updated_at
FROM clients_old
ON CONFLICT (id) DO NOTHING;

-- Step 3: Migrate existing quotes to base quotes table
INSERT INTO quotes (id, quote_number, client_id, owner_id, status, expires_on, tax_rate, is_tax_enabled, payment_terms, notes, legal_terms, client_comments, is_recurring, billing_period, recurring_amount, created_at, updated_at)
SELECT
    id,
    COALESCE(quote_number, '1000'), -- Use existing quote_number or default to 1000
    client_id,
    owner_id,
    status,
    expires_on,
    tax_rate,
    is_tax_enabled,
    payment_terms,
    notes,
    legal_terms,
    client_comments,
    is_recurring,
    billing_period,
    recurring_amount,
    created_at,
    updated_at
FROM quotes_old
ON CONFLICT (id) DO NOTHING;

-- Step 4: Create version 1 for each existing quote
INSERT INTO quote_versions (quote_id, version_number, status, expires_on, tax_rate, is_tax_enabled, payment_terms, notes, legal_terms, client_comments, is_recurring, billing_period, recurring_amount, created_at, updated_at)
SELECT
    id as quote_id,
    1 as version_number,
    status,
    expires_on,
    tax_rate,
    is_tax_enabled,
    payment_terms,
    notes,
    legal_terms,
    client_comments,
    is_recurring,
    billing_period,
    recurring_amount,
    created_at,
    updated_at
FROM quotes_old;

-- Step 5: Migrate existing quote items to the new structure
INSERT INTO quote_items (quote_version_id, description, quantity, unit_price, total, sort_order, created_at)
SELECT
    qv.id as quote_version_id,
    qi.description,
    qi.quantity,
    qi.unit_price,
    qi.total,
    COALESCE(qi.sort_order, 0) as sort_order,
    qi.created_at
FROM quote_items_old qi
JOIN quote_versions qv ON qv.quote_id = qi.quote_id AND qv.version_number = 1;

-- Step 6: Migrate existing payment schedule
INSERT INTO payment_schedule (quote_version_id, percentage, description, sort_order, created_at)
SELECT
    qv.id as quote_version_id,
    ps.percentage,
    ps.description,
    COALESCE(ps.sort_order, 0) as sort_order,
    ps.created_at
FROM payment_schedule_old ps
JOIN quote_versions qv ON qv.quote_id = ps.quote_id AND qv.version_number = 1;

-- Step 7: Migrate existing recurring payments
INSERT INTO recurring_payments (quote_version_id, amount, billing_period, start_date, end_date, created_at)
SELECT
    qv.id as quote_version_id,
    rp.amount,
    rp.billing_period,
    rp.start_date,
    rp.end_date,
    rp.created_at
FROM recurring_payments_old rp
JOIN quote_versions qv ON qv.quote_id = rp.quote_id AND qv.version_number = 1;

-- Step 8: Update quote numbers to be sequential starting from 1000
-- This ensures clean numbering for the new system
WITH numbered_quotes AS (
    SELECT id, (1000 + ROW_NUMBER() OVER (ORDER BY created_at))::VARCHAR(20) as new_quote_number
    FROM quotes
)
UPDATE quotes
SET quote_number = numbered_quotes.new_quote_number
FROM numbered_quotes
WHERE quotes.id = numbered_quotes.id;

-- Step 9: Verify migration
SELECT
    'Migration Summary' as info,
    COUNT(*) as total_quotes,
    COUNT(DISTINCT quote_number) as unique_quote_numbers,
    COUNT(DISTINCT client_id) as unique_clients
FROM quotes;

SELECT
    'Version Summary' as info,
    COUNT(*) as total_versions,
    COUNT(DISTINCT quote_id) as quotes_with_versions,
    AVG(version_number) as avg_version_number
FROM quote_versions;

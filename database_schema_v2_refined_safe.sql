-- Database Schema v2 Refined: Safe Migration Script
-- This script handles existing types and tables gracefully

-- Step 1: Create enum types only if they don't exist
DO $$ BEGIN
    CREATE TYPE quote_status AS ENUM ('draft', 'sent', 'approved', 'rejected', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE billing_period AS ENUM ('monthly', 'quarterly', 'yearly', 'one-time');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Drop existing tables if they exist (for clean slate)
DROP TABLE IF EXISTS legal_terms CASCADE;
DROP TABLE IF EXISTS client_comments CASCADE;
DROP TABLE IF EXISTS payment_terms CASCADE;
DROP TABLE IF EXISTS quote_items CASCADE;
DROP TABLE IF EXISTS quote_revisions CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS clients CASCADE;

-- Step 3: Create tables
-- Clients table (stores client information)
CREATE TABLE clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Base quotes table (stores core quote information)
CREATE TABLE quotes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_number VARCHAR(20) UNIQUE NOT NULL, -- e.g., "1000", "1001"
    owner_id UUID NOT NULL, -- Will be auth.uid() when auth is implemented
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    status quote_status DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quote revisions table (stores version-specific information)
CREATE TABLE quote_revisions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    revision_number INTEGER NOT NULL, -- 1, 2, 3, etc.
    status quote_status DEFAULT 'draft',
    expires_on DATE,
    notes TEXT,
    tax_rate DECIMAL(5,4) DEFAULT 0.08,
    is_tax_enabled BOOLEAN DEFAULT false,
    is_recurring BOOLEAN DEFAULT false,
    billing_period billing_period,
    recurring_amount DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure unique revision numbers per quote
    UNIQUE(quote_id, revision_number)
);

-- Quote items table (stores line items for each revision)
CREATE TABLE quote_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_revision_id UUID NOT NULL REFERENCES quote_revisions(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment terms table (stores payment schedule for each revision)
CREATE TABLE payment_terms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_revision_id UUID NOT NULL REFERENCES quote_revisions(id) ON DELETE CASCADE,
    percentage DECIMAL(5,2) NOT NULL, -- e.g., 50.00 for 50%
    description TEXT NOT NULL, -- e.g., "with order", "on delivery"
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Client comments table (stores client feedback for each revision)
CREATE TABLE client_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    quote_revision_id UUID REFERENCES quote_revisions(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    comment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Legal terms table (stores legal terms for each revision)
CREATE TABLE legal_terms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_revision_id UUID NOT NULL REFERENCES quote_revisions(id) ON DELETE CASCADE,
    terms TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create indexes for better performance
CREATE INDEX idx_quotes_quote_number ON quotes(quote_number);
CREATE INDEX idx_quotes_client_id ON quotes(client_id);
CREATE INDEX idx_quotes_owner_id ON quotes(owner_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quote_revisions_quote_id ON quote_revisions(quote_id);
CREATE INDEX idx_quote_revisions_revision_number ON quote_revisions(revision_number);
CREATE INDEX idx_quote_items_revision_id ON quote_items(quote_revision_id);
CREATE INDEX idx_payment_terms_revision_id ON payment_terms(quote_revision_id);
CREATE INDEX idx_client_comments_quote_id ON client_comments(quote_id);
CREATE INDEX idx_client_comments_revision_id ON client_comments(quote_revision_id);
CREATE INDEX idx_legal_terms_revision_id ON legal_terms(quote_revision_id);

-- Step 5: Create a view for easy quote history access
CREATE OR REPLACE VIEW quote_history AS
SELECT
    q.id as quote_id,
    q.quote_number,
    q.client_id,
    c.name as client_name,
    c.email as client_email,
    qr.id as revision_id,
    qr.revision_number,
    qr.status,
    qr.notes,
    qr.created_at,
    qr.expires_on,
    qr.tax_rate,
    qr.is_tax_enabled,
    qr.is_recurring,
    qr.billing_period,
    qr.recurring_amount
FROM quotes q
JOIN clients c ON q.client_id = c.id
LEFT JOIN quote_revisions qr ON q.id = qr.quote_id
ORDER BY q.quote_number, qr.revision_number DESC;

-- Step 6: Enable Row Level Security (RLS)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_terms ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies (temporary - replace with proper auth.uid() when auth is implemented)
DROP POLICY IF EXISTS "Allow all operations on clients" ON clients;
DROP POLICY IF EXISTS "Allow all operations on quotes" ON quotes;
DROP POLICY IF EXISTS "Allow all operations on quote_revisions" ON quote_revisions;
DROP POLICY IF EXISTS "Allow all operations on quote_items" ON quote_items;
DROP POLICY IF EXISTS "Allow all operations on payment_terms" ON payment_terms;
DROP POLICY IF EXISTS "Allow all operations on client_comments" ON client_comments;
DROP POLICY IF EXISTS "Allow all operations on legal_terms" ON legal_terms;

CREATE POLICY "Allow all operations on clients" ON clients FOR ALL USING (true);
CREATE POLICY "Allow all operations on quotes" ON quotes FOR ALL USING (true);
CREATE POLICY "Allow all operations on quote_revisions" ON quote_revisions FOR ALL USING (true);
CREATE POLICY "Allow all operations on quote_items" ON quote_items FOR ALL USING (true);
CREATE POLICY "Allow all operations on payment_terms" ON payment_terms FOR ALL USING (true);
CREATE POLICY "Allow all operations on client_comments" ON client_comments FOR ALL USING (true);
CREATE POLICY "Allow all operations on legal_terms" ON legal_terms FOR ALL USING (true);

-- Step 8: Insert sample data for testing
INSERT INTO clients (name, email) VALUES
('Acme Corp', 'contact@acme.com'),
('Tech Solutions', 'info@techsolutions.com');

-- Insert sample base quotes
INSERT INTO quotes (quote_number, client_id, owner_id, status) VALUES
('1000', (SELECT id FROM clients WHERE name = 'Acme Corp'), '00000000-0000-0000-0000-000000000000', 'draft'),
('1001', (SELECT id FROM clients WHERE name = 'Tech Solutions'), '00000000-0000-0000-0000-000000000000', 'draft');

-- Insert sample revisions
INSERT INTO quote_revisions (quote_id, revision_number, status, notes, expires_on) VALUES
((SELECT id FROM quotes WHERE quote_number = '1000'), 1, 'draft', 'Initial quote for project', '2025-02-28'),
((SELECT id FROM quotes WHERE quote_number = '1000'), 2, 'draft', 'Updated pricing', '2025-03-15'),
((SELECT id FROM quotes WHERE quote_number = '1001'), 1, 'draft', 'First version', '2025-03-30');

-- Insert sample items
INSERT INTO quote_items (quote_revision_id, description, quantity, unit_price, total) VALUES
((SELECT id FROM quote_revisions WHERE quote_id = (SELECT id FROM quotes WHERE quote_number = '1000') AND revision_number = 1), 'Web Development', 40, 150.00, 6000.00),
((SELECT id FROM quote_revisions WHERE quote_id = (SELECT id FROM quotes WHERE quote_number = '1000') AND revision_number = 2), 'Web Development', 40, 150.00, 6000.00),
((SELECT id FROM quote_revisions WHERE quote_id = (SELECT id FROM quotes WHERE quote_number = '1000') AND revision_number = 2), 'SEO Optimization', 10, 100.00, 1000.00);

-- Insert sample payment terms
INSERT INTO payment_terms (quote_revision_id, percentage, description) VALUES
((SELECT id FROM quote_revisions WHERE quote_id = (SELECT id FROM quotes WHERE quote_number = '1000') AND revision_number = 1), 50.00, 'with order'),
((SELECT id FROM quote_revisions WHERE quote_id = (SELECT id FROM quotes WHERE quote_number = '1000') AND revision_number = 1), 50.00, 'on completion'),
((SELECT id FROM quote_revisions WHERE quote_id = (SELECT id FROM quotes WHERE quote_number = '1000') AND revision_number = 2), 30.00, 'with order'),
((SELECT id FROM quote_revisions WHERE quote_id = (SELECT id FROM quotes WHERE quote_number = '1000') AND revision_number = 2), 40.00, 'on delivery'),
((SELECT id FROM quote_revisions WHERE quote_id = (SELECT id FROM quotes WHERE quote_number = '1000') AND revision_number = 2), 30.00, 'net 30 days');

-- Insert sample client comments
INSERT INTO client_comments (quote_id, quote_revision_id, comment) VALUES
((SELECT id FROM quotes WHERE quote_number = '1000'), (SELECT id FROM quote_revisions WHERE quote_id = (SELECT id FROM quotes WHERE quote_number = '1000') AND revision_number = 1), 'Please include mobile optimization'),
((SELECT id FROM quotes WHERE quote_number = '1000'), (SELECT id FROM quote_revisions WHERE quote_id = (SELECT id FROM quotes WHERE quote_number = '1000') AND revision_number = 2), 'Can we add social media integration?');

-- Insert sample legal terms
INSERT INTO legal_terms (quote_revision_id, terms) VALUES
((SELECT id FROM quote_revisions WHERE quote_id = (SELECT id FROM quotes WHERE quote_number = '1000') AND revision_number = 1), 'Payment due within 30 days of invoice date.'),
((SELECT id FROM quote_revisions WHERE quote_id = (SELECT id FROM quotes WHERE quote_number = '1000') AND revision_number = 2), 'Payment due within 30 days of invoice date. Additional terms apply.');

-- Step 9: Verify the migration
SELECT 'Migration completed successfully!' as status;
SELECT COUNT(*) as total_clients FROM clients;
SELECT COUNT(*) as total_quotes FROM quotes;
SELECT COUNT(*) as total_revisions FROM quote_revisions;
SELECT COUNT(*) as total_items FROM quote_items;
SELECT COUNT(*) as total_payment_terms FROM payment_terms;
SELECT COUNT(*) as total_client_comments FROM client_comments;
SELECT COUNT(*) as total_legal_terms FROM legal_terms;

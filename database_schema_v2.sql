-- Database Schema v2: Base Quotes + Quote Versions
-- This design separates the original quote from its edited versions

-- Drop existing tables if they exist (for clean slate)
DROP TABLE IF EXISTS quote_versions CASCADE;
DROP TABLE IF EXISTS quote_items CASCADE;
DROP TABLE IF EXISTS payment_schedule CASCADE;
DROP TABLE IF EXISTS recurring_payments CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS clients CASCADE;

-- Create enum types
CREATE TYPE quote_status AS ENUM ('draft', 'sent', 'approved', 'rejected', 'expired');
CREATE TYPE billing_period AS ENUM ('monthly', 'quarterly', 'yearly', 'one-time');

-- Clients table (unchanged)
CREATE TABLE clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Base quotes table (stores the original quote)
CREATE TABLE quotes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_number VARCHAR(20) UNIQUE NOT NULL, -- e.g., "1000", "1001"
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL, -- Will be auth.uid() when auth is implemented
    status quote_status DEFAULT 'draft',
    expires_on DATE,
    tax_rate DECIMAL(5,4) DEFAULT 0.08, -- 8% default
    is_tax_enabled BOOLEAN DEFAULT false,
    payment_terms TEXT DEFAULT 'Net 30',
    notes TEXT,
    legal_terms TEXT,
    client_comments TEXT,
    is_recurring BOOLEAN DEFAULT false,
    billing_period billing_period,
    recurring_amount DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quote versions table (stores edited versions of base quotes)
CREATE TABLE quote_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL, -- 1, 2, 3, etc.
    status quote_status DEFAULT 'draft',
    expires_on DATE,
    tax_rate DECIMAL(5,4) DEFAULT 0.08,
    is_tax_enabled BOOLEAN DEFAULT false,
    payment_terms TEXT,
    notes TEXT,
    legal_terms TEXT,
    client_comments TEXT,
    is_recurring BOOLEAN DEFAULT false,
    billing_period billing_period,
    recurring_amount DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure unique version numbers per quote
    UNIQUE(quote_id, version_number)
);

-- Quote items table (stores line items for each version)
CREATE TABLE quote_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_version_id UUID NOT NULL REFERENCES quote_versions(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment schedule table (stores payment terms for each version)
CREATE TABLE payment_schedule (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_version_id UUID NOT NULL REFERENCES quote_versions(id) ON DELETE CASCADE,
    percentage DECIMAL(5,2) NOT NULL, -- e.g., 50.00 for 50%
    description TEXT NOT NULL, -- e.g., "with order", "on delivery"
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recurring payments table (stores recurring payment details for each version)
CREATE TABLE recurring_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_version_id UUID NOT NULL REFERENCES quote_versions(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    billing_period billing_period NOT NULL,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_quotes_quote_number ON quotes(quote_number);
CREATE INDEX idx_quotes_client_id ON quotes(client_id);
CREATE INDEX idx_quotes_owner_id ON quotes(owner_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quote_versions_quote_id ON quote_versions(quote_id);
CREATE INDEX idx_quote_versions_version_number ON quote_versions(version_number);
CREATE INDEX idx_quote_items_version_id ON quote_items(quote_version_id);
CREATE INDEX idx_payment_schedule_version_id ON payment_schedule(quote_version_id);
CREATE INDEX idx_recurring_payments_version_id ON recurring_payments(quote_version_id);

-- Create a view for easy quote history access
CREATE OR REPLACE VIEW quote_history AS
SELECT
    q.id as quote_id,
    q.quote_number,
    q.client_id,
    c.name as client_name,
    c.email as client_email,
    qv.id as version_id,
    qv.version_number,
    qv.status,
    qv.notes,
    qv.created_at,
    qv.expires_on,
    qv.tax_rate,
    qv.is_tax_enabled,
    qv.payment_terms,
    qv.legal_terms,
    qv.client_comments,
    qv.is_recurring,
    qv.billing_period,
    qv.recurring_amount
FROM quotes q
JOIN clients c ON q.client_id = c.id
LEFT JOIN quote_versions qv ON q.id = qv.quote_id
ORDER BY q.quote_number, qv.version_number DESC;

-- Row Level Security (RLS) policies
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies (temporary - replace with proper auth.uid() when auth is implemented)
CREATE POLICY "Allow all operations on clients" ON clients FOR ALL USING (true);
CREATE POLICY "Allow all operations on quotes" ON quotes FOR ALL USING (true);
CREATE POLICY "Allow all operations on quote_versions" ON quote_versions FOR ALL USING (true);
CREATE POLICY "Allow all operations on quote_items" ON quote_items FOR ALL USING (true);
CREATE POLICY "Allow all operations on payment_schedule" ON payment_schedule FOR ALL USING (true);
CREATE POLICY "Allow all operations on recurring_payments" ON recurring_payments FOR ALL USING (true);

-- Insert sample data for testing
INSERT INTO clients (name, email) VALUES
('Acme Corp', 'contact@acme.com'),
('Tech Solutions', 'info@techsolutions.com');

-- Insert sample base quotes
INSERT INTO quotes (quote_number, client_id, owner_id, status, notes) VALUES
('1000', (SELECT id FROM clients WHERE name = 'Acme Corp'), '00000000-0000-0000-0000-000000000000', 'draft', 'Initial quote for project'),
('1001', (SELECT id FROM clients WHERE name = 'Tech Solutions'), '00000000-0000-0000-0000-000000000000', 'draft', 'Software development quote');

-- Insert sample versions
INSERT INTO quote_versions (quote_id, version_number, status, notes) VALUES
((SELECT id FROM quotes WHERE quote_number = '1000'), 1, 'draft', 'Initial version'),
((SELECT id FROM quotes WHERE quote_number = '1000'), 2, 'draft', 'Updated pricing'),
((SELECT id FROM quotes WHERE quote_number = '1001'), 1, 'draft', 'First version');

-- Insert sample items
INSERT INTO quote_items (quote_version_id, description, quantity, unit_price, total) VALUES
((SELECT id FROM quote_versions WHERE quote_id = (SELECT id FROM quotes WHERE quote_number = '1000') AND version_number = 1), 'Web Development', 40, 150.00, 6000.00),
((SELECT id FROM quote_versions WHERE quote_id = (SELECT id FROM quotes WHERE quote_number = '1000') AND version_number = 2), 'Web Development', 40, 150.00, 6000.00),
((SELECT id FROM quote_versions WHERE quote_id = (SELECT id FROM quotes WHERE quote_number = '1000') AND version_number = 2), 'SEO Optimization', 10, 100.00, 1000.00);

-- Insert sample payment schedule
INSERT INTO payment_schedule (quote_version_id, percentage, description) VALUES
((SELECT id FROM quote_versions WHERE quote_id = (SELECT id FROM quotes WHERE quote_number = '1000') AND version_number = 1), 50.00, 'with order'),
((SELECT id FROM quote_versions WHERE quote_id = (SELECT id FROM quotes WHERE quote_number = '1000') AND version_number = 1), 50.00, 'on completion'),
((SELECT id FROM quote_versions WHERE quote_id = (SELECT id FROM quotes WHERE quote_number = '1000') AND version_number = 2), 30.00, 'with order'),
((SELECT id FROM quote_versions WHERE quote_id = (SELECT id FROM quotes WHERE quote_number = '1000') AND version_number = 2), 40.00, 'on delivery'),
((SELECT id FROM quote_versions WHERE quote_id = (SELECT id FROM quotes WHERE quote_number = '1000') AND version_number = 2), 30.00, 'net 30 days');

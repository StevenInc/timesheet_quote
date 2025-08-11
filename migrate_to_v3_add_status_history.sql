-- Migration script to add quote status history tracking
-- Run this on an existing database to add the new functionality

-- Create new enum type for base quote statuses
DO $$ BEGIN
    CREATE TYPE base_quote_status AS ENUM ('DRAFT', 'EMAILED', 'OPENED', 'REJECTED', 'ACCEPTED', 'PAID');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add current_status field to quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS current_status base_quote_status DEFAULT 'DRAFT';

-- Create quote status history table
CREATE TABLE IF NOT EXISTS quote_status_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    status base_quote_status NOT NULL,
    changed_by UUID,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quote_status_history_quote_id ON quote_status_history(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_status_history_status ON quote_status_history(status);
CREATE INDEX IF NOT EXISTS idx_quote_status_history_changed_at ON quote_status_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_quotes_current_status ON quotes(current_status);

-- Create a function to automatically update current_status when status changes
CREATE OR REPLACE FUNCTION update_quote_current_status()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE quotes
    SET current_status = NEW.status,
        updated_at = NOW()
    WHERE id = NEW.quote_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update current_status
DROP TRIGGER IF EXISTS trigger_update_quote_current_status ON quote_status_history;
CREATE TRIGGER trigger_update_quote_current_status
    AFTER INSERT ON quote_status_history
    FOR EACH ROW
    EXECUTE FUNCTION update_quote_current_status();

-- Insert initial status history records for existing quotes
INSERT INTO quote_status_history (quote_id, status, notes)
SELECT id, 'DRAFT', 'Initial status from migration'
FROM quotes
WHERE id NOT IN (SELECT DISTINCT quote_id FROM quote_status_history);

-- Update existing quotes to have current_status = 'DRAFT' if not set
UPDATE quotes SET current_status = 'DRAFT' WHERE current_status IS NULL;

-- Create or replace view for quote status summary
CREATE OR REPLACE VIEW quote_status_summary AS
SELECT
    q.id as quote_id,
    q.quote_number,
    q.client_id,
    c.name as client_name,
    c.email as client_email,
    q.current_status,
    qsh.status as latest_status,
    qsh.changed_at as status_changed_at,
    qsh.notes as status_notes,
    q.created_at,
    q.updated_at
FROM quotes q
JOIN clients c ON q.client_id = c.id
LEFT JOIN LATERAL (
    SELECT status, changed_at, notes
    FROM quote_status_history qsh2
    WHERE qsh2.quote_id = q.id
    ORDER BY qsh2.changed_at DESC
    LIMIT 1
) qsh ON true
ORDER BY q.quote_number;

-- Enable RLS on the new table
ALTER TABLE quote_status_history ENABLE ROW LEVEL SECURITY;

-- RLS policy (temporary - replace with proper auth.uid() when auth is implemented)
DROP POLICY IF EXISTS "Allow all operations on quote_status_history" ON quote_status_history;
CREATE POLICY "Allow all operations on quote_status_history" ON quote_status_history FOR ALL USING (true);

-- Migration Script: Create client_comments table for storing client feedback
-- This script creates a table to store client feedback on quotes including accept/decline/revision requests

-- Create client_comments table
CREATE TABLE IF NOT EXISTS client_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  quote_revision_id UUID NOT NULL REFERENCES quote_revisions(id) ON DELETE CASCADE,
  client_email TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('ACCEPT', 'DECLINE', 'REQUEST_REVISION')),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_client_comments_quote_id ON client_comments(quote_id);
CREATE INDEX IF NOT EXISTS idx_client_comments_revision_id ON client_comments(quote_revision_id);
CREATE INDEX IF NOT EXISTS idx_client_comments_client_email ON client_comments(client_email);
CREATE INDEX IF NOT EXISTS idx_client_comments_action ON client_comments(action);

-- Add comments for documentation
COMMENT ON TABLE client_comments IS 'Stores client feedback and actions on quotes';
COMMENT ON COLUMN client_comments.quote_id IS 'Reference to the base quote';
COMMENT ON COLUMN client_comments.quote_revision_id IS 'Reference to the specific quote revision';
COMMENT ON COLUMN client_comments.client_email IS 'Email of the client providing feedback';
COMMENT ON COLUMN client_comments.action IS 'Action taken by client: ACCEPT, DECLINE, or REQUEST_REVISION';
COMMENT ON COLUMN client_comments.comment IS 'Optional comment from the client';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_client_comments_updated_at
    BEFORE UPDATE ON client_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verify the table was created
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'client_comments'
ORDER BY ordinal_position;

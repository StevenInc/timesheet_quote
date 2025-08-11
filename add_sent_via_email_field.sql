-- Migration script to add sent_via_email field to quote_revisions table
-- This will track which specific revision was sent via email

-- Add sent_via_email field to quote_revisions table
ALTER TABLE quote_revisions ADD COLUMN IF NOT EXISTS sent_via_email BOOLEAN DEFAULT FALSE;

-- Add sent_at field to track when the email was sent
ALTER TABLE quote_revisions ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_quote_revisions_sent_via_email ON quote_revisions(sent_via_email);

-- Add comment to document the new field
COMMENT ON COLUMN quote_revisions.sent_via_email IS 'Indicates if this specific revision was sent via email';
COMMENT ON COLUMN quote_revisions.sent_at IS 'Timestamp when this revision was sent via email';

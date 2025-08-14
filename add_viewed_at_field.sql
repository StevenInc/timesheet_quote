-- Migration script to add viewed_at field to quote_revisions table
-- This field tracks when a client actually viewed/opened the quote

-- Add viewed_at field to quote_revisions table
ALTER TABLE quote_revisions ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMP WITH TIME ZONE;

-- Create index for better performance when querying viewed quotes
CREATE INDEX IF NOT EXISTS idx_quote_revisions_viewed_at ON quote_revisions(viewed_at);

-- Add comment for documentation
COMMENT ON COLUMN quote_revisions.viewed_at IS 'Timestamp when the client viewed/opened this quote revision';

-- Create a function to mark a quote revision as viewed
CREATE OR REPLACE FUNCTION mark_quote_revision_as_viewed(revision_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE quote_revisions
    SET viewed_at = NOW()
    WHERE id = revision_id
    AND viewed_at IS NULL; -- Only update if not already viewed

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION mark_quote_revision_as_viewed(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_quote_revision_as_viewed(UUID) TO anon;

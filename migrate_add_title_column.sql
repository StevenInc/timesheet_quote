-- Migration script to add title column to quote_revisions table
-- Run this to separate titles from notes for better data organization

-- Add title column to quote_revisions table
ALTER TABLE quote_revisions ADD COLUMN IF NOT EXISTS title VARCHAR(255);

-- Migrate existing data: copy notes to title where notes might contain titles
-- This assumes that existing notes that are short (likely titles) should be moved to title
UPDATE quote_revisions
SET title = notes
WHERE LENGTH(notes) <= 100
  AND notes IS NOT NULL
  AND notes != '';

-- Clear notes field for entries where we moved the content to title
-- This prevents duplication, but you may want to review this approach
UPDATE quote_revisions
SET notes = ''
WHERE title IS NOT NULL
  AND title != ''
  AND notes = title;

-- Create index on title for better performance
CREATE INDEX IF NOT EXISTS idx_quote_revisions_title ON quote_revisions(title);

-- Add comment to document the new column
COMMENT ON COLUMN quote_revisions.title IS 'Title/name of this quote revision version';
COMMENT ON COLUMN quote_revisions.notes IS 'General notes about this revision (separate from title)';

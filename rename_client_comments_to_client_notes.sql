-- Migration Script: Rename client_comments column to client_notes in clients table
-- This script renames the client_comments column to client_notes for better clarity

-- Rename the column from client_comments to client_notes
ALTER TABLE clients
RENAME COLUMN client_comments TO client_notes;

-- Update the comment to reflect the new column name
COMMENT ON COLUMN clients.client_notes IS 'Internal notes about the client, not included in quotes';

-- Verify the migration
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default,
    col_description((table_schema||'.'||table_name)::regclass, ordinal_position) as comment
FROM information_schema.columns
WHERE table_name = 'clients'
AND column_name = 'client_notes';

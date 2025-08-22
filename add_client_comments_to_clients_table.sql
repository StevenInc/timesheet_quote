-- Migration Script: Add client_comments column to clients table
-- This script adds a client_comments column to store internal notes about clients
-- that are not included in quotes but are useful for internal reference

-- Add client_comments column to clients table
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS client_comments TEXT DEFAULT '';

-- Add comment to describe the column purpose
COMMENT ON COLUMN clients.client_comments IS 'Internal notes about the client, not included in quotes';

-- Update existing clients to have empty client_comments if they don't have any
UPDATE clients
SET client_comments = ''
WHERE client_comments IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE clients
ALTER COLUMN client_comments SET NOT NULL;

-- Verify the migration
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default,
    col_description((table_schema||'.'||table_name)::regclass, ordinal_position) as comment
FROM information_schema.columns
WHERE table_name = 'clients'
AND column_name = 'client_comments';

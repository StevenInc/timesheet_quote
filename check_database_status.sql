-- Diagnostic script to check database status
-- Run this first to understand what's happening

-- Check if client_comments table exists
SELECT
    table_name,
    table_type
FROM information_schema.tables
WHERE table_name = 'client_comments';

-- Check if there are any tables with similar names
SELECT
    table_name,
    table_type
FROM information_schema.tables
WHERE table_name LIKE '%client%' OR table_name LIKE '%comment%';

-- Check if the quotes table exists (required for foreign key)
SELECT
    table_name,
    table_type
FROM information_schema.tables
WHERE table_name = 'quotes';

-- Check if the quote_revisions table exists (required for foreign key)
SELECT
    table_name,
    table_type
FROM information_schema.tables
WHERE table_name = 'quote_revisions';

-- Check current schema version or any existing client feedback structure
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE tablename LIKE '%client%' OR tablename LIKE '%comment%' OR tablename LIKE '%feedback%';

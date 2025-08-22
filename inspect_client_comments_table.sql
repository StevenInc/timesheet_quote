-- Inspect the existing client_comments table structure
-- This will show us exactly what columns exist and what's missing

-- Show all columns in the client_comments table
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_name = 'client_comments'
ORDER BY ordinal_position;

-- Check if specific columns exist
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_comments' AND column_name = 'client_email')
        THEN 'client_email column EXISTS'
        ELSE 'client_email column MISSING'
    END as client_email_status;

SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_comments' AND column_name = 'quote_id')
        THEN 'quote_id column EXISTS'
        ELSE 'quote_id column MISSING'
    END as quote_id_status;

SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_comments' AND column_name = 'quote_revision_id')
        THEN 'quote_revision_id column EXISTS'
        ELSE 'quote_revision_id column MISSING'
    END as quote_revision_id_status;

-- Show table constraints
SELECT
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints
WHERE table_name = 'client_comments';

-- Show foreign key constraints
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'client_comments';

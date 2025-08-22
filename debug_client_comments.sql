-- Debug script to test client_comments functionality

-- 1. Check if the column exists and its properties
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default,
    col_description((table_schema||'.'||table_name)::regclass, ordinal_position) as comment
FROM information_schema.columns
WHERE table_name = 'clients'
AND column_name = 'client_comments';

-- 2. Check current data in clients table
SELECT id, name, email, client_comments, created_at, updated_at
FROM clients
LIMIT 5;

-- 3. Test inserting a client with comments
INSERT INTO clients (name, email, client_comments)
VALUES ('Test Client Debug', 'debug@test.com', 'This is a test comment for debugging')
ON CONFLICT (name) DO UPDATE SET
    client_comments = EXCLUDED.client_comments,
    updated_at = NOW()
RETURNING id, name, email, client_comments;

-- 4. Test updating an existing client's comments
UPDATE clients
SET client_comments = 'Updated comment for debugging', updated_at = NOW()
WHERE name = 'Test Client Debug'
RETURNING id, name, email, client_comments;

-- 5. Verify the update worked
SELECT id, name, email, client_comments, updated_at
FROM clients
WHERE name = 'Test Client Debug';

-- 6. Clean up test data
DELETE FROM clients WHERE name = 'Test Client Debug';

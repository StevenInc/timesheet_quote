-- Simple check to see what columns exist in client_comments table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'client_comments'
ORDER BY ordinal_position;

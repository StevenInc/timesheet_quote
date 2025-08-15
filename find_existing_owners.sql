-- Find existing owner IDs in the quotes table
-- Run this to see what owner IDs actually exist in your database

SELECT DISTINCT owner_id, COUNT(*) as quote_count
FROM public.quotes
WHERE owner_id IS NOT NULL
GROUP BY owner_id
ORDER BY quote_count DESC;

-- This will show you the actual owner IDs that exist
-- Use one of these IDs instead of the hardcoded test UUID

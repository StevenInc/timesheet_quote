-- Check what status values are available in the database
-- This will help us understand what statuses we can use

-- Check the quote_status enum values
SELECT
  t.typname as enum_name,
  e.enumlabel as enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'quote_status'
ORDER BY e.enumsortorder;

-- Check what statuses are currently in quote_revisions
SELECT
  'quote_revisions statuses' as table_name,
  status,
  COUNT(*) as count
FROM quote_revisions
GROUP BY status
ORDER BY count DESC;

-- Check what statuses are currently in quote_status_history
SELECT
  'quote_status_history statuses' as table_name,
  status,
  COUNT(*) as count
FROM quote_status_history
GROUP BY status
ORDER BY count DESC;

-- Check if there are any quotes that were sent via email (look for clues)
SELECT
  q.quote_number,
  qr.revision_number,
  qr.status,
  qr.notes,
  qsh.status as history_status,
  qsh.notes as history_notes
FROM quotes q
JOIN quote_revisions qr ON q.id = qr.quote_id
LEFT JOIN quote_status_history qsh ON q.id = qsh.quote_id
WHERE qr.notes ILIKE '%email%'
   OR qr.notes ILIKE '%sent%'
   OR qsh.notes ILIKE '%email%'
   OR qsh.notes ILIKE '%sent%'
ORDER BY q.quote_number, qr.revision_number
LIMIT 10;

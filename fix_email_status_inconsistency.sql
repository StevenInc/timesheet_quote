-- Fix existing quotes that have SENT status in quote_status_history but no revision with SENT status
-- This script identifies and fixes the inconsistency between quote-level and revision-level email status

-- First, let's see what we have
SELECT
  'Current Status' as info,
  COUNT(*) as total_quotes,
  COUNT(CASE WHEN status = 'SENT' THEN 1 END) as sent_quotes
FROM quote_status_history
WHERE status = 'SENT';

-- Find quotes that have SENT status in history but no revision with SENT status
WITH sent_quotes AS (
  SELECT DISTINCT quote_id
  FROM quote_status_history
  WHERE status = 'SENT'
),
revision_statuses AS (
  SELECT DISTINCT quote_id
  FROM quote_revisions
  WHERE status = 'SENT'
)
SELECT
  sq.quote_id,
  q.quote_number,
  'Has SENT in history but no revision with SENT status' as issue
FROM sent_quotes sq
LEFT JOIN revision_statuses rs ON sq.quote_id = rs.quote_id
JOIN quotes q ON sq.quote_id = q.id
WHERE rs.quote_id IS NULL;

-- Fix the inconsistency by updating the most recent revision to SENT status
-- for quotes that have SENT in history but not in revisions
WITH sent_quotes AS (
  SELECT DISTINCT quote_id
  FROM quote_status_history
  WHERE status = 'SENT'
),
revision_statuses AS (
  SELECT DISTINCT quote_id
  FROM quote_revisions
  WHERE status = 'SENT'
),
quotes_to_fix AS (
  SELECT sq.quote_id
  FROM sent_quotes sq
  LEFT JOIN revision_statuses rs ON sq.quote_id = rs.quote_id
  WHERE rs.quote_id IS NULL
)
UPDATE quote_revisions
SET status = 'SENT'
WHERE quote_id IN (SELECT quote_id FROM quotes_to_fix)
  AND revision_number = (
    SELECT MAX(revision_number)
    FROM quote_revisions r2
    WHERE r2.quote_id = quote_revisions.quote_id
  );

-- Verify the fix
SELECT
  'After Fix' as info,
  COUNT(*) as total_quotes,
  COUNT(CASE WHEN status = 'SENT' THEN 1 END) as sent_quotes
FROM quote_status_history
WHERE status = 'SENT';

-- Show a sample of the fixed data
SELECT
  q.quote_number,
  qr.revision_number,
  qr.status,
  qr.sent_via_email,
  qsh.status as history_status
FROM quotes q
JOIN quote_revisions qr ON q.id = qr.quote_id
JOIN quote_status_history qsh ON q.id = qsh.quote_id
WHERE qsh.status = 'SENT'
ORDER BY q.quote_number, qr.revision_number
LIMIT 10;

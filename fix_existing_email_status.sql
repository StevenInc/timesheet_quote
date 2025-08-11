-- Fix existing quotes that have EMAILED status in quote_status_history but DRAFT status in revisions
-- This will resolve the inconsistency between Company Quote History and Quote Versions Table

-- First, let's see what we have
SELECT
  'Current Status' as info,
  COUNT(*) as total_quotes,
  COUNT(CASE WHEN status = 'EMAILED' THEN 1 END) as emailed_quotes
FROM quote_status_history
WHERE status = 'EMAILED';

-- Find quotes that have EMAILED status in history but DRAFT status in revisions
WITH emailed_quotes AS (
  SELECT DISTINCT quote_id
  FROM quote_status_history
  WHERE status = 'EMAILED'
),
revision_statuses AS (
  SELECT DISTINCT quote_id
  FROM quote_revisions
  WHERE status = 'EMAILED'
)
SELECT
  eq.quote_id,
  q.quote_number,
  'Has EMAILED in history but no revision with EMAILED status' as issue
FROM emailed_quotes eq
LEFT JOIN revision_statuses rs ON eq.quote_id = rs.quote_id
JOIN quotes q ON eq.quote_id = q.id
WHERE rs.quote_id IS NULL;

-- Fix the inconsistency by updating the most recent revision to EMAILED status
-- for quotes that have EMAILED in history but not in revisions
WITH emailed_quotes AS (
  SELECT DISTINCT quote_id
  FROM quote_status_history
  WHERE status = 'EMAILED'
),
revision_statuses AS (
  SELECT DISTINCT quote_id
  FROM quote_revisions
  WHERE status = 'EMAILED'
),
quotes_to_fix AS (
  SELECT eq.quote_id
  FROM emailed_quotes eq
  LEFT JOIN revision_statuses rs ON eq.quote_id = rs.quote_id
  WHERE rs.quote_id IS NULL
)
UPDATE quote_revisions
SET status = 'EMAILED'
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
  COUNT(CASE WHEN status = 'EMAILED' THEN 1 END) as emailed_quotes
FROM quote_status_history
WHERE status = 'EMAILED';

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
WHERE qsh.status = 'EMAILED'
ORDER BY q.quote_number, qr.revision_number
LIMIT 10;

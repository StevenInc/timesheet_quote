-- Fix existing quotes by setting sent_via_email: true for revisions that were sent
-- This script looks for quotes with EMAILED status in quote_status_history and sets
-- the corresponding revisions to have sent_via_email: true

-- First, let's see what we have
SELECT
  'Current Status' as info,
  COUNT(*) as total_quotes,
  COUNT(CASE WHEN status = 'EMAILED' THEN 1 END) as emailed_quotes
FROM quote_status_history
WHERE status = 'EMAILED';

-- Find quotes that have EMAILED status in history
SELECT
  q.quote_number,
  qr.revision_number,
  qr.status,
  qr.sent_via_email,
  qsh.status as history_status,
  qsh.notes as history_notes
FROM quotes q
JOIN quote_revisions qr ON q.id = qr.quote_id
JOIN quote_status_history qsh ON q.id = qsh.quote_id
WHERE qsh.status = 'EMAILED'
ORDER BY q.quote_number, qr.revision_number;

-- Update the most recent revision for each EMAILED quote to have sent_via_email: true
WITH emailed_quotes AS (
  SELECT DISTINCT quote_id
  FROM quote_status_history
  WHERE status = 'EMAILED'
)
UPDATE quote_revisions
SET sent_via_email = true
WHERE quote_id IN (SELECT quote_id FROM emailed_quotes)
  AND revision_number = (
    SELECT MAX(revision_number)
    FROM quote_revisions r2
    WHERE r2.quote_id = quote_revisions.quote_id
  )
  AND (sent_via_email IS NULL OR sent_via_email = false);

-- Verify the fix
SELECT
  'After Fix' as info,
  q.quote_number,
  qr.revision_number,
  qr.status,
  qr.sent_via_email,
  qsh.status as history_status
FROM quotes q
JOIN quote_revisions qr ON q.id = qr.quote_id
JOIN quote_status_history qsh ON q.id = qsh.quote_id
WHERE qsh.status = 'EMAILED'
ORDER BY q.quote_number, qr.revision_number;

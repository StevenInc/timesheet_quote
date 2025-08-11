-- Fix Quote 1021 specifically
-- First, let's see what the current status is

SELECT
  'Quote 1021 Current Status' as info,
  q.quote_number,
  qr.revision_number,
  qr.status,
  qr.sent_via_email,
  qsh.status as history_status,
  qsh.notes as history_notes
FROM quotes q
JOIN quote_revisions qr ON q.id = qr.quote_id
LEFT JOIN quote_status_history qsh ON q.id = qsh.quote_id
WHERE q.quote_number = '1021'
ORDER BY qr.revision_number;

-- Check if there are any quotes with SENT status in history
SELECT
  'Quotes with SENT status in history' as info,
  COUNT(*) as count
FROM quote_status_history
WHERE status = 'SENT';

-- Check if there are any quotes with SENT status in revisions
SELECT
  'Quotes with SENT status in revisions' as info,
  COUNT(*) as count
FROM quote_revisions
WHERE status = 'SENT';

-- If Quote 1021 has SENT in history but not in revisions, fix it
UPDATE quote_revisions
SET status = 'SENT'
WHERE quote_id = (SELECT id FROM quotes WHERE quote_number = '1021')
  AND revision_number = (
    SELECT MAX(revision_number)
    FROM quote_revisions r2
    WHERE r2.quote_id = (SELECT id FROM quotes WHERE quote_number = '1021')
  )
  AND status != 'SENT';

-- Verify the fix
SELECT
  'Quote 1021 After Fix' as info,
  q.quote_number,
  qr.revision_number,
  qr.status,
  qr.sent_via_email,
  qsh.status as history_status
FROM quotes q
JOIN quote_revisions qr ON q.id = qr.quote_id
LEFT JOIN quote_status_history qsh ON q.id = qsh.quote_id
WHERE q.quote_number = '1021'
ORDER BY qr.revision_number;

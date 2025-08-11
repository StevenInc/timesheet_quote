-- Check Quote 1021's current status without assuming any specific enum values
-- This will help us understand what we're working with

-- Check Quote 1021's current data
SELECT
  'Quote 1021 Current Data' as info,
  q.quote_number,
  qr.revision_number,
  qr.status,
  qr.notes,
  qr.sent_via_email,
  qr.sent_at
FROM quotes q
JOIN quote_revisions qr ON q.id = qr.quote_id
WHERE q.quote_number = '1021'
ORDER BY qr.revision_number;

-- Check if there's any status history for Quote 1021
SELECT
  'Quote 1021 Status History' as info,
  q.quote_number,
  qsh.status,
  qsh.notes,
  qsh.created_at
FROM quotes q
JOIN quote_status_history qsh ON q.id = qsh.quote_id
WHERE q.quote_number = '1021'
ORDER BY qsh.created_at DESC;

-- Check what the actual status values are in the database (without filtering by specific values)
SELECT
  'All statuses in quote_revisions' as info,
  status,
  COUNT(*) as count
FROM quote_revisions
GROUP BY status
ORDER BY count DESC;

-- Check what the actual status values are in quote_status_history
SELECT
  'All statuses in quote_status_history' as info,
  status,
  COUNT(*) as count
FROM quote_status_history
GROUP BY status
ORDER BY count DESC;

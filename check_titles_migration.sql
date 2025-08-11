-- Check the current state of the title migration
-- Run this to see what data exists in the title and notes fields

-- Check a few sample quotes and their revisions
SELECT
  q.id as quote_id,
  q.quote_number,
  qr.id as revision_id,
  qr.revision_number,
  qr.title,
  qr.notes,
  qr.created_at,
  qr.updated_at
FROM quotes q
LEFT JOIN quote_revisions qr ON q.id = qr.quote_id
WHERE q.quote_number IN ('1000', '1016', '1020', '1021', '1022', '1023')
ORDER BY q.quote_number, qr.revision_number;

-- Check if titles are populated
SELECT
  COUNT(*) as total_revisions,
  COUNT(title) as revisions_with_title,
  COUNT(CASE WHEN title != '' THEN 1 END) as revisions_with_non_empty_title,
  COUNT(notes) as revisions_with_notes,
  COUNT(CASE WHEN notes != '' THEN 1 END) as revisions_with_non_empty_notes
FROM quote_revisions;

-- Check the most recent revisions for each quote
SELECT
  q.quote_number,
  qr.revision_number,
  qr.title,
  qr.notes,
  qr.updated_at
FROM quotes q
JOIN (
  SELECT DISTINCT ON (quote_id)
    quote_id,
    revision_number,
    title,
    notes,
    updated_at
  FROM quote_revisions
  ORDER BY quote_id, revision_number DESC
) qr ON q.id = qr.quote_id
ORDER BY q.quote_number;

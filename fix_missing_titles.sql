-- Fix missing titles for existing quote revisions
-- This script will populate titles for revisions that don't have them

-- First, let's see what we have
SELECT
  COUNT(*) as total_revisions,
  COUNT(title) as revisions_with_title,
  COUNT(CASE WHEN title != '' THEN 1 END) as revisions_with_non_empty_title
FROM quote_revisions;

-- Update revisions that have no title but have notes
UPDATE quote_revisions
SET title = CASE
  WHEN notes IS NOT NULL AND notes != '' THEN
    CASE
      WHEN LENGTH(notes) <= 50 THEN notes
      ELSE LEFT(notes, 50) || '...'
    END
  ELSE 'Quote v' || revision_number
END
WHERE (title IS NULL OR title = '')
  AND revision_number > 0;

-- Update revisions that have no title and no notes
UPDATE quote_revisions
SET title = 'Quote v' || revision_number
WHERE (title IS NULL OR title = '')
  AND (notes IS NULL OR notes = '')
  AND revision_number > 0;

-- Check the results
SELECT
  COUNT(*) as total_revisions,
  COUNT(title) as revisions_with_title,
  COUNT(CASE WHEN title != '' THEN 1 END) as revisions_with_non_empty_title
FROM quote_revisions;

-- Show a sample of the updated data
SELECT
  q.quote_number,
  qr.revision_number,
  qr.title,
  qr.notes
FROM quotes q
JOIN quote_revisions qr ON q.id = qr.quote_id
ORDER BY q.quote_number, qr.revision_number
LIMIT 10;

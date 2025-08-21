-- Add recurring column to quote_items table
-- This migration adds a recurring boolean field to track which items are recurring

-- Add the recurring column with a default value of 'none'
ALTER TABLE quote_items
ADD COLUMN recurring VARCHAR(20) NOT NULL DEFAULT 'none';

-- Add a comment to document the column
COMMENT ON COLUMN quote_items.recurring IS 'Billing period for recurring items: none, weekly, bi-weekly, semi-monthly, monthly, quarterly, semi-annually, annually';

-- Update existing items to have recurring = 'none' (one-time items)
UPDATE quote_items
SET recurring = 'none'
WHERE recurring IS NULL;

-- Verify the migration
SELECT
    'Migration completed successfully' as status,
    COUNT(*) as total_items,
    COUNT(CASE WHEN recurring != 'none' THEN 1 END) as recurring_items,
    COUNT(CASE WHEN recurring = 'none' THEN 1 END) as one_time_items
FROM quote_items;

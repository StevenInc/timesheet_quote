-- Add SENT status to the base_quote_status enum if it exists
-- This will allow us to properly track quotes that have been sent via email

-- First, check if the enum exists and what values it currently has
SELECT
  t.typname as enum_name,
  e.enumlabel as enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'base_quote_status'
ORDER BY e.enumsortorder;

-- If the enum exists and doesn't have SENT, add it
DO $$
BEGIN
  -- Check if base_quote_status enum exists
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'base_quote_status'
  ) THEN
    -- Check if SENT value already exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'base_quote_status' AND e.enumlabel = 'SENT'
    ) THEN
      -- Add SENT value to the enum
      ALTER TYPE base_quote_status ADD VALUE 'SENT';
      RAISE NOTICE 'Added SENT to base_quote_status enum';
    ELSE
      RAISE NOTICE 'SENT already exists in base_quote_status enum';
    END IF;
  ELSE
    RAISE NOTICE 'base_quote_status enum does not exist';
  END IF;
END $$;

-- Verify the enum now has SENT
SELECT
  t.typname as enum_name,
  e.enumlabel as enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'base_quote_status'
ORDER BY e.enumsortorder;

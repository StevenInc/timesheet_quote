-- Check and fix owner_id field in quotes table
-- This script will ensure the quotes table has the necessary fields for creator tracking

-- First, check if owner_id column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'quotes'
        AND column_name = 'owner_id'
    ) THEN
        -- Add owner_id column if it doesn't exist
        ALTER TABLE quotes ADD COLUMN owner_id UUID;
        RAISE NOTICE 'Added owner_id column to quotes table';
    ELSE
        RAISE NOTICE 'owner_id column already exists in quotes table';
    END IF;
END $$;

-- Check if created_at column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'quotes'
        AND column_name = 'created_at'
    ) THEN
        -- Add created_at column if it doesn't exist
        ALTER TABLE quotes ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added created_at column to quotes table';
    ELSE
        RAISE NOTICE 'created_at column already exists in quotes table';
    END IF;
END $$;

-- Update existing quotes to have default owner_id if they don't have one
UPDATE quotes
SET owner_id = '11111111-1111-1111-1111-111111111111'
WHERE owner_id IS NULL;

-- Update existing quotes to have created_at if they don't have one
UPDATE quotes
SET created_at = NOW()
WHERE created_at IS NULL;

-- Show current table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'quotes'
ORDER BY ordinal_position;

-- Show sample data to verify
SELECT
    id,
    quote_number,
    owner_id,
    created_at,
    updated_at
FROM quotes
LIMIT 5;

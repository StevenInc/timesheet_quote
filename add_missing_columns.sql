-- Add missing columns to existing client_comments table
-- This script only adds columns that don't exist

-- Add client_email column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'client_comments' AND column_name = 'client_email'
    ) THEN
        ALTER TABLE client_comments ADD COLUMN client_email TEXT;
        RAISE NOTICE 'Added client_email column';
    ELSE
        RAISE NOTICE 'client_email column already exists';
    END IF;
END $$;

-- Add action column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'client_comments' AND column_name = 'action'
    ) THEN
        ALTER TABLE client_comments ADD COLUMN action TEXT;
        RAISE NOTICE 'Added action column';
    ELSE
        RAISE NOTICE 'action column already exists';
    END IF;
END $$;

-- Add comment column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'client_comments' AND column_name = 'comment'
    ) THEN
        ALTER TABLE client_comments ADD COLUMN comment TEXT;
        RAISE NOTICE 'Added comment column';
    ELSE
        RAISE NOTICE 'comment column already exists';
    END IF;
END $$;

-- Add created_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'client_comments' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE client_comments ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added created_at column';
    ELSE
        RAISE NOTICE 'created_at column already exists';
    END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'client_comments' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE client_comments ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column';
    ELSE
        RAISE NOTICE 'updated_at column already exists';
    END IF;
END $$;

-- Show final table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'client_comments'
ORDER BY ordinal_position;

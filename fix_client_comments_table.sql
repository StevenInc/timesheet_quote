-- Fix the existing client_comments table
-- This script adds missing columns and constraints to the existing table

-- First, let's see what we're working with
DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    -- Check if client_email column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'client_comments' AND column_name = 'client_email'
    ) INTO col_exists;

    IF NOT col_exists THEN
        RAISE NOTICE 'Adding client_email column...';
        ALTER TABLE client_comments ADD COLUMN client_email TEXT;
    ELSE
        RAISE NOTICE 'client_email column already exists';
    END IF;

    -- Check if quote_id column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'client_comments' AND column_name = 'quote_id'
    ) INTO col_exists;

    IF NOT col_exists THEN
        RAISE NOTICE 'Adding quote_id column...';
        ALTER TABLE client_comments ADD COLUMN quote_id UUID;
    ELSE
        RAISE NOTICE 'quote_id column already exists';
    END IF;

    -- Check if quote_revision_id column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'client_comments' AND column_name = 'quote_revision_id'
    ) INTO col_exists;

    IF NOT col_exists THEN
        RAISE NOTICE 'Adding quote_revision_id column...';
        ALTER TABLE client_comments ADD COLUMN quote_revision_id UUID;
    ELSE
        RAISE NOTICE 'quote_revision_id column already exists';
    END IF;

    -- Check if action column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'client_comments' AND column_name = 'action'
    ) INTO col_exists;

    IF NOT col_exists THEN
        RAISE NOTICE 'Adding action column...';
        ALTER TABLE client_comments ADD COLUMN action TEXT;
    ELSE
        RAISE NOTICE 'action column already exists';
    END IF;

    -- Check if comment column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'client_comments' AND column_name = 'comment'
    ) INTO col_exists;

    IF NOT col_exists THEN
        RAISE NOTICE 'Adding comment column...';
        ALTER TABLE client_comments ADD COLUMN comment TEXT;
    ELSE
        RAISE NOTICE 'comment column already exists';
    END IF;

    -- Check if created_at column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'client_comments' AND column_name = 'created_at'
    ) INTO col_exists;

    IF NOT col_exists THEN
        RAISE NOTICE 'Adding created_at column...';
        ALTER TABLE client_comments ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    ELSE
        RAISE NOTICE 'created_at column already exists';
    END IF;

    -- Check if updated_at column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'client_comments' AND column_name = 'updated_at'
    ) INTO col_exists;

    IF NOT col_exists THEN
        RAISE NOTICE 'Adding updated_at column...';
        ALTER TABLE client_comments ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    ELSE
        RAISE NOTICE 'updated_at column already exists';
    END IF;

    RAISE NOTICE 'Column check complete';
END $$;

-- Make required columns NOT NULL if they aren't already
DO $$
BEGIN
    -- Make client_email NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'client_comments'
        AND column_name = 'client_email'
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE client_comments ALTER COLUMN client_email SET NOT NULL;
        RAISE NOTICE 'Made client_email NOT NULL';
    END IF;

    -- Make action NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'client_comments'
        AND column_name = 'action'
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE client_comments ALTER COLUMN action SET NOT NULL;
        RAISE NOTICE 'Made action NOT NULL';
    END IF;
END $$;

-- Add check constraint for action if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_name = 'check_action_values'
    ) THEN
        ALTER TABLE client_comments
        ADD CONSTRAINT check_action_values
        CHECK (action IN ('ACCEPT', 'DECLINE', 'REQUEST_REVISION'));
        RAISE NOTICE 'Added action check constraint';
    ELSE
        RAISE NOTICE 'Action check constraint already exists';
    END IF;
END $$;

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
    -- Add quote_id foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'client_comments'
        AND constraint_name = 'fk_client_comments_quote_id'
    ) THEN
        ALTER TABLE client_comments
        ADD CONSTRAINT fk_client_comments_quote_id
        FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added quote_id foreign key constraint';
    ELSE
        RAISE NOTICE 'quote_id foreign key constraint already exists';
    END IF;

    -- Add quote_revision_id foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'client_comments'
        AND constraint_name = 'fk_client_comments_revision_id'
    ) THEN
        ALTER TABLE client_comments
        ADD CONSTRAINT fk_client_comments_revision_id
        FOREIGN KEY (quote_revision_id) REFERENCES quote_revisions(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added quote_revision_id foreign key constraint';
    ELSE
        RAISE NOTICE 'quote_revision_id foreign key constraint already exists';
    END IF;
END $$;

-- Create indexes if they don't exist
DO $$
BEGIN
    -- Create index on quote_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'client_comments'
        AND indexname = 'idx_client_comments_quote_id'
    ) THEN
        CREATE INDEX idx_client_comments_quote_id ON client_comments(quote_id);
        RAISE NOTICE 'Created index on quote_id';
    ELSE
        RAISE NOTICE 'Index on quote_id already exists';
    END IF;

    -- Create index on quote_revision_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'client_comments'
        AND indexname = 'idx_client_comments_revision_id'
    ) THEN
        CREATE INDEX idx_client_comments_revision_id ON client_comments(quote_revision_id);
        RAISE NOTICE 'Created index on quote_revision_id';
    ELSE
        RAISE NOTICE 'Index on quote_revision_id already exists';
    END IF;

    -- Create index on client_email
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'client_comments'
        AND indexname = 'idx_client_comments_client_email'
    ) THEN
        CREATE INDEX idx_client_comments_client_email ON client_comments(client_email);
        RAISE NOTICE 'Created index on client_email';
    ELSE
        RAISE NOTICE 'Index on client_email already exists';
    END IF;

    -- Create index on action
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'client_comments'
        AND indexname = 'idx_client_comments_action'
    ) THEN
        CREATE INDEX idx_client_comments_action ON client_comments(action);
        RAISE NOTICE 'Created index on action';
    ELSE
        RAISE NOTICE 'Index on action already exists';
    END IF;
END $$;

-- Show the final table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_name = 'client_comments'
ORDER BY ordinal_position;

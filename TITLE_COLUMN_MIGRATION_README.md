# Adding Title Column to Quote Revisions

## Overview
This migration adds a dedicated `title` column to the `quote_revisions` table to separate quote version titles from general notes, improving data organization and clarity.

## What Changed

### 1. Database Schema
- **New Column**: Added `title VARCHAR(255)` to `quote_revisions` table
- **Index**: Created index on `title` for better performance
- **Comments**: Added documentation for both `title` and `notes` columns

### 2. TypeScript Types
- **QuoteFormData**: Added `title: string` field
- **QuoteRevision**: Added `title: string` field
- **DatabaseQuoteRevision**: Added `title: string` field

### 3. Application Logic
- **Title Saving**: Now saves to `title` field instead of `notes`
- **Title Display**: Shows `title` field first, falls back to `notes` if no title
- **Form Loading**: Loads `title` field when loading quote revisions

## Migration Steps

### Step 1: Run Database Migration
Execute the SQL migration script in your Supabase SQL editor:
```sql
-- Run migrate_add_title_column.sql
```

This will:
- Add the new `title` column
- Migrate existing data (copy short notes to title)
- Create performance indexes
- Add column documentation

### Step 2: Deploy Code Changes
The following files have been updated:
- `src/components/quote-form/types.ts` - Added title field to interfaces
- `src/components/quote-form/useQuoteForm.ts` - Updated save/load logic
- `src/components/quote-form/QuoteFormView.tsx` - Updated display logic

### Step 3: Test the Changes
1. **Create a new quote** - Verify title is saved to new column
2. **Load existing quotes** - Verify titles display correctly
3. **Edit quote titles** - Verify updates work with new field

## Data Migration Details

The migration script automatically:
- Copies existing `notes` content to `title` where the note is ≤100 characters (likely a title)
- Clears the `notes` field for entries where content was moved to prevent duplication
- Preserves longer notes in the `notes` field

**Note**: Review the migration results to ensure data was moved correctly. You may want to manually adjust some entries.

## Benefits

1. **Clear Separation**: Titles and notes now have distinct purposes
2. **Better UX**: Users can clearly distinguish between version names and descriptions
3. **Improved Queries**: Can search/filter by titles specifically
4. **Data Integrity**: Prevents accidental overwrites of titles vs notes

## Rollback Plan

If issues occur, you can rollback by:
```sql
-- Remove the title column
ALTER TABLE quote_revisions DROP COLUMN title;

-- Drop the index
DROP INDEX IF EXISTS idx_quote_revisions_title;
```

## Next Steps

After successful migration:
1. **Update any remaining code** that might reference the old structure
2. **Consider adding validation** to ensure titles are not empty
3. **Add title editing UI** if not already present
4. **Update documentation** to reflect the new field structure

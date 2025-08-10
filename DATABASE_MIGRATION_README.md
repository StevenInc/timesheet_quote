# Database Migration to v2 Schema

## Overview

We're migrating from a flat quote structure to a **parent-child relationship** where:
- **`quotes`** table stores the base/original quote
- **`quote_versions`** table stores all edited versions as children

## Why This Change?

1. **Better Version Control**: Each edit creates a new version while preserving the original
2. **Cleaner Quote Numbers**: Base quotes get sequential numbers (1000, 1001, 1002...)
3. **Proper History**: Versions are numbered v1, v2, v3... for each base quote
4. **Data Integrity**: Prevents accidental overwrites of important quote data

## New Schema Structure

```
quotes (base quotes)
├── id (UUID)
├── quote_number (VARCHAR) - e.g., "1000", "1001"
├── client_id (UUID) - references clients
├── owner_id (UUID) - will be auth.uid()
├── status (enum) - draft, sent, approved, rejected, expired
└── ... other base fields

quote_versions (quote versions)
├── id (UUID)
├── quote_id (UUID) - references quotes
├── version_number (INTEGER) - 1, 2, 3...
├── status (enum)
└── ... all editable fields

quote_items (line items per version)
├── id (UUID)
├── quote_version_id (UUID) - references quote_versions
├── description, quantity, unit_price, total
└── sort_order

payment_schedule (payment terms per version)
├── id (UUID)
├── quote_version_id (UUID) - references quote_versions
├── percentage, description
└── sort_order
```

## Migration Steps

### Step 1: Backup Current Data
```sql
-- Create backup tables
CREATE TABLE quotes_backup AS SELECT * FROM quotes;
CREATE TABLE quote_items_backup AS SELECT * FROM quote_items;
CREATE TABLE payment_schedule_backup AS SELECT * FROM payment_schedule;
```

### Step 2: Run New Schema
```sql
-- Execute database_schema_v2.sql
-- This creates all new tables with proper structure
```

### Step 3: Migrate Data
```sql
-- Execute migrate_to_v2_schema.sql
-- This moves data from old structure to new structure
```

### Step 4: Verify Migration
```sql
-- Check the quote_history view
SELECT * FROM quote_history ORDER BY quote_number, version_number;
```

## Benefits After Migration

1. **Clean Quote Numbers**: 1000, 1001, 1002... (no more URL-based numbers)
2. **Proper Versions**: 1000-v1, 1000-v2, 1000-v3 for each quote
3. **Better History**: Clear separation between base quotes and versions
4. **Easier Editing**: Create new versions without losing original data
5. **Improved Performance**: Better indexing and query optimization

## What Changes in the App

1. **Quote History**: Now shows `1000-v1`, `1000-v2` instead of full URLs
2. **Save Logic**: Creates base quote + version 1, then new versions for edits
3. **Data Loading**: Uses new `quote_history` view for cleaner data access
4. **Version Management**: Each edit creates a new version number

## Rollback Plan

If issues occur during migration:

```sql
-- Restore from backup
DROP TABLE quotes, quote_versions, quote_items, payment_schedule;
RENAME TABLE quotes_backup TO quotes;
RENAME TABLE quote_items_backup TO quote_items;
RENAME TABLE payment_schedule_backup TO payment_schedule;
```

## Testing

After migration, verify:
- [ ] Quote numbers display correctly (1000, 1001, 1002...)
- [ ] Versions show properly (1000-v1, 1000-v2...)
- [ ] History table loads without errors
- [ ] New quotes can be saved
- [ ] Existing data is preserved

## Next Steps

1. **Run the migration** in Supabase SQL editor
2. **Test the app** to ensure everything works
3. **Update any remaining code** that references old field names
4. **Implement version editing** functionality (create new versions on edit)

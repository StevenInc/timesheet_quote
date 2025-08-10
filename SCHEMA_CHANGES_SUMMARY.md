# Database Schema Changes Summary

## Key Improvements Made

### 1. Cleaner Table Separation
- **`quotes`** table now only stores:
  - `quote_number` (e.g., "1000", "1001")
  - `owner_id` (who owns the quote)
  - `client_id` (references clients table)
  - `status` (draft, sent, approved, etc.)
  - `created_at`, `updated_at`

- **`quote_revisions`** table stores:
  - `expires_on` date
  - `notes`
  - `tax_rate` and `is_tax_enabled`
  - `is_recurring` and `billing_period`
  - All version-specific information

### 2. Dedicated Tables for Specific Data
- **`payment_terms`** - separate table for payment schedule
- **`client_comments`** - separate table for client feedback (references both quote and revision)
- **`legal_terms`** - separate table for legal terms
- **`quote_items`** - line items for each revision

### 3. Better Normalization
- No more duplicate fields between quotes and revisions
- Each table has a single responsibility
- Easier to maintain and extend

## Table Structure Overview

```
quotes (core quote info)
├── id, quote_number, owner_id, client_id, status
└── created_at, updated_at

quote_revisions (version-specific info)
├── id, quote_id, revision_number, status
├── expires_on, notes, tax_rate, is_tax_enabled
├── is_recurring, billing_period, recurring_amount
└── created_at, updated_at

quote_items (line items per revision)
├── id, quote_revision_id, description
├── quantity, unit_price, total, sort_order
└── created_at

payment_terms (payment schedule per revision)
├── id, quote_revision_id, percentage, description
├── sort_order, created_at

client_comments (client feedback per revision)
├── id, quote_id, quote_revision_id, comment
├── comment_date, created_at

legal_terms (legal terms per revision)
├── id, quote_revision_id, terms
└── created_at
```

## Benefits of This Structure

1. **Cleaner Data Model**: Each table has a single purpose
2. **Better Performance**: More focused indexes and queries
3. **Easier Maintenance**: Changes to one aspect don't affect others
4. **Better Scalability**: Can add new features without modifying core tables
5. **Cleaner Code**: Frontend can work with specific data types

## Important Design Decisions

### Client Comments Dual Reference
The `client_comments` table references both:
- **`quote_id`** - Links to the base quote (required)
- **`quote_revision_id`** - Links to specific revision (optional)

This allows you to:
- Query all comments for a base quote across all revisions
- Query comments for a specific revision
- Query comments that aren't tied to a specific revision
- Maintain comment history even if revisions are deleted

## Migration Steps

1. **Backup current data** (if any exists)
2. **Run the new schema** (`database_schema_v2_refined.sql`)
3. **Update frontend code** to work with new table names
4. **Test the new structure**

## Frontend Changes Needed

- Update table names from `quote_versions` to `quote_revisions`
- Update field references to match new structure
- Modify queries to join the appropriate tables
- Update the `quote_history` view usage

## Next Steps

1. Review this schema design
2. Make any adjustments needed
3. Run the migration in Supabase
4. Update the React app to work with the new structure

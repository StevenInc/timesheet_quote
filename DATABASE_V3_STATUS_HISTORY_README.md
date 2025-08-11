# Database Schema v3: Quote Status History Tracking

## Overview
This update adds comprehensive status tracking for base quotes (from the `quotes` table) with the ability to track status changes over time and maintain a complete audit trail.

## New Status Values
Base quotes can now have these status badges:
- **DRAFT** - Initial state, quote is being prepared
- **EMAILED** - Quote has been sent to the client
- **OPENED** - Client has opened/viewed the quote
- **REJECTED** - Client has rejected the quote
- **ACCEPTED** - Client has accepted the quote
- **PAID** - Quote has been paid in full

## New Database Structure

### 1. New Enum Type
```sql
CREATE TYPE base_quote_status AS ENUM ('DRAFT', 'EMAILED', 'OPENED', 'REJECTED', 'ACCEPTED', 'PAID');
```

### 2. New Table: `quote_status_history`
This table tracks every status change for base quotes:
```sql
CREATE TABLE quote_status_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    status base_quote_status NOT NULL,
    changed_by UUID, -- Will be auth.uid() when auth is implemented
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT, -- Optional notes about the status change
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Enhanced `quotes` Table
Added a new field to track the current status:
```sql
ALTER TABLE quotes ADD COLUMN current_status base_quote_status DEFAULT 'DRAFT';
```

### 4. Automatic Status Updates
A PostgreSQL trigger automatically updates the `current_status` field whenever a new status is inserted into `quote_status_history`.

## Key Features

### Status History Tracking
- Every status change is recorded with timestamp and optional notes
- Complete audit trail of quote lifecycle
- Support for user attribution (when auth is implemented)

### Automatic Status Management
- `current_status` is automatically updated via database trigger
- No manual synchronization required
- Maintains data consistency

### Performance Optimized
- Indexes on frequently queried fields
- Efficient views for common queries
- Minimal impact on existing operations

## Database Views

### `quote_status_summary`
Provides a comprehensive view of quote status information:
- Current status of each quote
- Latest status change details
- Client information
- Timestamps for tracking

### `quote_history` (Enhanced)
Updated to include base quote status alongside revision information.

## Implementation Options

### Option 1: Full Schema Replacement
Use `database_schema_v3_with_status_history.sql` for a complete fresh start.

### Option 2: Migration Script
Use `migrate_to_v3_add_status_history.sql` to add the new functionality to an existing database.

### Option 3: Manual Migration
Run the individual SQL commands from the migration script as needed.

## Usage Examples

### Insert a Status Change
```sql
INSERT INTO quote_status_history (quote_id, status, notes)
VALUES ('quote-uuid-here', 'EMAILED', 'Quote sent to client via email');
```

### Query Current Status
```sql
SELECT quote_number, current_status, updated_at
FROM quotes
WHERE client_id = 'client-uuid-here';
```

### Get Status History
```sql
SELECT status, changed_at, notes
FROM quote_status_history
WHERE quote_id = 'quote-uuid-here'
ORDER BY changed_at DESC;
```

## Backward Compatibility
- Existing `quotes.status` field remains for backward compatibility
- New `current_status` field provides the enhanced status tracking
- All existing functionality continues to work unchanged

## Security
- Row Level Security (RLS) enabled on new table
- Temporary policies allow all operations (replace with proper auth when implemented)
- Foreign key constraints ensure data integrity

## Next Steps
1. Run the migration script on your database
2. Update your application code to use the new status values
3. Implement status change functionality in your UI
4. Add status change tracking to your business logic

## Notes
- The `changed_by` field is prepared for future authentication implementation
- All timestamps use timezone-aware data types
- The system is designed to handle high-volume quote management
- Consider implementing status change validation rules based on business requirements

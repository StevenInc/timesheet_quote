# Client Comments Migration

## Overview
This migration moves client comments from the quote system to the clients table, ensuring that client comments are stored centrally and persist across all quotes for the same client.

## Changes Made

### 1. Database Schema Changes
- **File**: `add_client_comments_to_clients_table.sql`
- **Action**: Adds `client_comments` column to the `clients` table
- **Type**: TEXT field with default empty string
- **Purpose**: Store internal notes about clients that are not included in quotes

### 2. Code Changes

#### Updated Functions
- **`saveQuote`**: Now saves client comments to the clients table
- **`saveQuoteForEmail`**: Now saves client comments to the clients table
- **`loadQuote`**: Now reads client comments from the clients table instead of quote revisions

#### Key Changes
1. **Client Updates**: When saving quotes, if client comments have changed, they are now updated in the clients table
2. **Client Creation**: New clients are created with their initial comments
3. **Quote Loading**: All quotes now read client comments from the clients table
4. **Data Persistence**: Client comments persist across all quotes for the same client

### 3. Benefits
- **Centralized Storage**: Client comments are stored in one place (clients table)
- **Data Consistency**: All quotes for the same client show the same comments
- **Better Organization**: Internal notes about clients are separated from quote-specific data
- **Easier Maintenance**: Client information can be updated independently of quotes

## Migration Steps

### 1. Run Database Migration
```sql
-- Execute the migration script
\i add_client_comments_to_clients_table.sql
```

### 2. Verify Migration
- Check that the `client_comments` column exists in the `clients` table
- Verify existing clients have empty client_comments (default value)
- Test saving and loading quotes to ensure client comments work correctly

## Usage

### Saving Client Comments
- Client comments are automatically saved when saving quotes
- Comments are stored in the clients table, not in individual quotes
- Updates to client comments affect all future quotes for that client

### Loading Client Comments
- When loading any quote, client comments are read from the clients table
- All quotes for the same client will show the same client comments
- Comments are loaded regardless of which quote revision is being viewed

## Data Flow

```
Form Input → Quote Save → Client Table Update → Client Comments Stored
     ↓
Quote Load → Client Table Read → Client Comments Displayed
```

## Notes
- Client comments are internal notes and are NOT included in quotes sent to clients
- The field label has been updated to "Client Comments (not included in the quote)" for clarity
- Existing quotes will continue to work, but client comments will now be read from the clients table
- This change improves data organization and makes client information more maintainable

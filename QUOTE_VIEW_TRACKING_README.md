# Quote View Tracking Feature

## Overview
This feature automatically tracks when clients view/access quote URLs, updating the "Sent/Viewed" column in the Quote Versions UI to show the current status.

## How It Works

### 1. Database Schema Changes
- Added `viewed_at` timestamp field to `quote_revisions` table
- Created `mark_quote_revision_as_viewed()` database function
- Added index on `viewed_at` for performance

### 2. View Tracking
- When a client accesses a quote URL, the system calls the tracking endpoint
- The `viewed_at` timestamp is automatically set
- Only updates if not already viewed (prevents duplicate tracking)

### 3. UI Display Logic
The "Sent/Viewed" column now shows:
- **VIEWED** (highest priority) - Client has accessed the quote URL
- **SENT** - Quote was emailed but not yet viewed
- **Blank** - Quote was never emailed

## Implementation Details

### Database Migration
Run the migration script to add the new field:
```sql
-- Run add_viewed_at_field.sql
```

### Supabase Edge Function
The `track-quote-view` function handles view tracking:
- Endpoint: `/functions/track-quote-view`
- Accepts: `{ revisionId: string }`
- Returns: `{ success: boolean, message: string, viewed: boolean }`

### Frontend Service
`QuoteViewService` provides methods to track views:
- `trackQuoteView(revisionId)` - Uses Edge Function
- `trackQuoteViewDirect(revisionId)` - Direct RPC call fallback

## Usage

### Tracking a Quote View
```typescript
import { QuoteViewService } from '@/lib/quoteViewService'

// When client accesses quote URL
await QuoteViewService.trackQuoteView(revisionId)
```

### Displaying Status
The UI automatically shows the correct status based on:
1. `viewed_at` timestamp (VIEWED)
2. `sent_via_email` field (SENT)
3. Neither present (blank)

## CSS Styling
Added new status badge style:
```css
.status-badge.viewed {
  background-color: #fef3c7;
  color: #92400e;
}
```

## Benefits
- **Real-time tracking** of client engagement
- **Clear status visibility** in Quote Versions table
- **Automatic updates** when clients view quotes
- **Performance optimized** with proper database indexing

## Future Enhancements
- Email notifications when quotes are viewed
- Analytics dashboard for quote engagement
- Integration with client communication tracking

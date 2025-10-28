# Activity Logging System

This document describes the comprehensive activity logging system implemented in the Kalari Seat Booking System.

## Overview

The activity logging system tracks all major operations in the application including:
- Show creation, updates, and deletions
- Booking creation and cancellations
- Ticket generation
- Layout management
- System status updates

## Database Schema

### Activity Logs Table

```sql
CREATE TABLE activity_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    action VARCHAR(50) NOT NULL,           -- CREATE, UPDATE, DELETE, BOOKING, CANCELLATION
    entity_type VARCHAR(50) NOT NULL,      -- SHOW, BOOKING, TICKET, LAYOUT
    entity_id UUID,                        -- ID of the affected entity
    entity_name VARCHAR(255),              -- Name/title for display
    details JSONB,                         -- Additional structured data
    performed_by VARCHAR(255) NOT NULL,    -- Who performed the action
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,                       -- Optional: IP tracking
    user_agent TEXT                        -- Optional: Browser tracking
);
```

## Setup Instructions

1. **Create the logs table:**
   ```bash
   psql -d your_database -f add-logs-table.sql
   ```

2. **Populate sample data (optional):**
   ```bash
   psql -d your_database -f populate-sample-logs.sql
   ```

## Usage

### Import the Logger

```typescript
import { logActivity, logBookingCreation, logShowCreation } from '../utils/activityLogger'
```

### Basic Logging

```typescript
// Generic logging
await logActivity({
  action: 'CREATE',
  entityType: 'SHOW',
  entityId: show.id,
  entityName: show.title,
  details: { date: show.date, time: show.time, price: show.price },
  performedBy: 'admin'
})
```

### Convenience Functions

```typescript
// Show operations
await logShowCreation(showId, showTitle, performedBy, details)
await logShowUpdate(showId, showTitle, performedBy, details)
await logShowDeletion(showId, showTitle, performedBy, details)

// Booking operations
await logBookingCreation(bookingId, showTitle, performedBy, details)
await logBookingCancellation(bookingId, showTitle, performedBy, details)

// Ticket operations
await logTicketGeneration(ticketId, ticketCode, performedBy, details)

// Layout operations
await logLayoutCreation(layoutId, layoutName, performedBy, details)
await logLayoutUpdate(layoutId, layoutName, performedBy, details)
await logLayoutDeletion(layoutId, layoutName, performedBy, details)
```

## Dashboard Integration

The dashboard now includes a comprehensive activity logs section that displays:

- **Real-time activity feed** - Shows the 50 most recent activities
- **Action icons** - Visual indicators for different types of actions
- **Color coding** - Green for creation/booking, blue for updates, red for deletions/cancellations
- **Detailed information** - Expandable details section with full JSON data
- **Timestamps** - When each action occurred
- **User tracking** - Who performed each action
- **Refresh functionality** - Manual refresh button for real-time updates

### Features

- **Responsive design** - Works on mobile and desktop
- **Dark mode support** - Follows the application's theme
- **Scrollable list** - Handles large numbers of logs efficiently
- **Expandable details** - Click "Details" to see full JSON data
- **Auto-refresh** - Loads fresh data when dashboard loads

## Action Types

| Action | Description | Entity Types |
|--------|-------------|--------------|
| CREATE | Entity creation | SHOW, TICKET, LAYOUT, BOOKING |
| UPDATE | Entity modification | SHOW, LAYOUT |
| DELETE | Entity removal | SHOW, LAYOUT |
| BOOKING | Seat booking | BOOKING |
| CANCELLATION | Booking cancellation | BOOKING |

## Entity Types

| Entity Type | Description |
|-------------|-------------|
| SHOW | Performance shows |
| BOOKING | Seat reservations |
| TICKET | Generated tickets |
| LAYOUT | Seating layouts |

## Details Structure

The `details` field stores structured JSON data specific to each action:

### Booking Details
```json
{
  "seat_codes": ["NA1", "NA2"],
  "seat_count": 2,
  "total_price": 300,
  "show_date": "2024-11-15",
  "show_time": "19:00",
  "ticket_codes": ["TKT-001", "TKT-002"]
}
```

### Show Creation Details
```json
{
  "date": "2024-11-15",
  "time": "19:00",
  "price": 150,
  "layout": "Main Hall 360°"
}
```

### Cancellation Details
```json
{
  "seat_codes": ["WA1"],
  "seat_count": 1,
  "refund_amount": 200,
  "reason": "Customer request"
}
```

## Current Implementation Status

### ✅ Completed
- Database schema and table creation
- Utility functions for logging
- Dashboard integration with logs display
- Booking creation logging
- Show deletion logging
- Sample data population

### 🔄 Partially Implemented
- Show creation/update logging (needs form integration)
- Layout management logging (needs form integration)

### 📋 Future Enhancements
- User authentication integration
- IP address and user agent tracking
- Log retention policies
- Export functionality
- Advanced filtering and search
- Real-time notifications
- Audit trail reports

## Performance Considerations

- Logs table includes indexes on frequently queried columns
- Dashboard limits to 50 most recent logs
- JSON details field allows flexible data storage without schema changes
- Async logging doesn't block main operations

## Security Notes

- All logging is performed server-side
- Sensitive data should not be stored in details field
- Consider implementing log retention policies
- User permissions should control log access

## Troubleshooting

### Common Issues

1. **Logs not appearing**: Check if the activity_logs table exists and has proper permissions
2. **Performance issues**: Ensure indexes are created as specified in the schema
3. **Missing details**: Verify the logging function is called after successful operations
4. **Timestamp issues**: Ensure database timezone is properly configured

### Debug Mode

Enable debug logging by checking browser console for any errors in the logging functions.
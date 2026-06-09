# Barangay Restriction Feature - Setup Instructions

## Overview
This feature allows events to be restricted to specific barangays only. Members from other barangays will be prevented from scanning at restricted events.

## Database Migration Required

The `scan_events` table needs a new column to store the selected barangays.

### Step 1: Run the Migration in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the following SQL:

```sql
ALTER TABLE scan_events
ADD COLUMN IF NOT EXISTS selected_barangays text[] DEFAULT NULL;

COMMENT ON COLUMN scan_events.selected_barangays IS 'Array of barangays this event is restricted to. NULL or empty array means all barangays are allowed.';
```

5. Click **Run** to execute the migration

### Step 2: Verify the Column

After running the migration, verify the column was created:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'scan_events' 
AND column_name = 'selected_barangays';
```

You should see:
- Column Name: `selected_barangays`
- Data Type: `text[]` (text array)

## Features

### Event Creation
- When creating a new event, admins can optionally restrict it to specific barangays
- Click "Select All" to quickly select all barangays
- Click "Deselect All" to clear all selections
- Leave empty to allow all barangays (default behavior)

### Event Scanning
- During scanning, the system checks if the member's barangay is in the allowed list
- If not allowed, shows "NOT ELIGIBLE — BARANGAY RESTRICTED" error
- Displays the member's barangay and allowed barangays for clarity

### Data Storage
- `selected_barangays` is stored as a PostgreSQL text array
- Example: `{"BOROL 1ST", "BOROL 2ND", "DALIG"}`
- NULL or empty array means no restrictions (all barangays allowed)

## UI Components

### Event Creation Form
- **Restrict to Barangays (Optional)** section
- Multi-select checkbox grid with all available barangays
- "Select All" / "Deselect All" button for quick selection
- Shows selected count and list of selected barangays

### Event Card Badges
- Shows "HH Mode" badge for household mode events
- Shows "X Brgy" badge for barangay-restricted events (e.g., "5 Brgy")

### Scan Result Display
- Shows "NOT ELIGIBLE — BARANGAY RESTRICTED" badge (orange)
- Displays member's barangay
- Shows allowed barangays for the event
- Clear error message explaining the restriction

## Testing

### Test Case 1: Create Unrestricted Event
1. Click "+ Create New Event"
2. Enter event name, date, location
3. Leave barangay selection empty
4. Click "Create Event"
5. Event should allow scanning from all barangays

### Test Case 2: Create Restricted Event
1. Click "+ Create New Event"
2. Enter event name, date, location
3. Click "Select All" to select all barangays
4. Uncheck some barangays to restrict
5. Click "Create Event"
6. Event should only allow scanning from selected barangays

### Test Case 3: Scan with Restriction
1. Select a barangay-restricted event
2. Scan a member from an allowed barangay → Should succeed
3. Scan a member from a non-allowed barangay → Should show restriction error

## Troubleshooting

### Error: "Could not find the 'selected_barangays' column"
- The migration hasn't been run yet
- Go to Supabase SQL Editor and run the migration SQL above
- Wait a few seconds for the schema cache to update

### Error: "selected_barangays is not an array"
- Ensure the column data type is `text[]` (text array)
- Check the migration was run correctly

### Members from all barangays can scan
- Check if the event has `selected_barangays` set to NULL or empty array
- If intentional, this means no restrictions (all barangays allowed)

## API Integration

The feature integrates with:
- **Supabase RPC**: `get_voters_by_barangay()` - Fetches all available barangays
- **Supabase Table**: `scan_events` - Stores event data with barangay restrictions
- **Supabase Table**: `registrations` - Contains member barangay information

## Notes

- The feature is optional: events without barangay restrictions work as before
- Barangay names are case-sensitive and must match exactly
- The system uses the member's barangay from the `registrations` table
- Household mode and barangay restrictions can be used together

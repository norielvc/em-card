-- Add barangay restriction column to scan_events table
ALTER TABLE scan_events
ADD COLUMN IF NOT EXISTS selected_barangays text[] DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN scan_events.selected_barangays IS 'Array of barangays this event is restricted to. NULL or empty array means all barangays are allowed.';

-- Add printed_at tracking for ID card printing
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS printed_at TIMESTAMPTZ DEFAULT NULL;

-- Add index for quick filtering
CREATE INDEX IF NOT EXISTS idx_registrations_printed_at ON registrations(printed_at);

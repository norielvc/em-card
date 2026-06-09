-- Alter registrations table to support non-valid resident registration
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS middle_name TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS is_valid_resident BOOLEAN DEFAULT TRUE;

-- Add index on is_valid_resident for filtering
CREATE INDEX IF NOT EXISTS idx_registrations_is_valid_resident ON registrations(is_valid_resident);

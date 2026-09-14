-- ============================================================
-- EM CARD - ADD RELIGION COLUMN TO REGISTRATIONS
-- Run this in your Supabase SQL Editor.
-- ============================================================

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS religion TEXT;

-- Optional: add an index if you plan to filter by religion
CREATE INDEX IF NOT EXISTS idx_registrations_religion ON registrations (religion);

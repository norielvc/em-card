-- ============================================================
-- EM CARD - ADD NETWORK_ROLE COLUMN TO REGISTRATIONS
-- Run this in your Supabase SQL Editor.
-- ============================================================

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS network_role TEXT DEFAULT 'member';

-- Optional index for faster role queries
CREATE INDEX IF NOT EXISTS idx_registrations_network_role ON registrations (network_role);

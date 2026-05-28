-- ============================================================
-- EM CARD - MIGRATION: Add new columns to registrations table
-- Run this in your Supabase SQL Editor (safe to re-run)
-- ============================================================

-- Add new columns to registrations table if they don't exist
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS house_no TEXT,
  ADD COLUMN IF NOT EXISTS purok TEXT,
  ADD COLUMN IF NOT EXISTS barangay TEXT,
  ADD COLUMN IF NOT EXISTS contact TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES registrations(id);

-- Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'registrations'
ORDER BY ordinal_position;

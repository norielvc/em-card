-- ============================================================
-- MIGRATION: Add gender and civil_status to registrations table
-- Date: 2025-06-03
-- ============================================================

-- Add gender column
ALTER TABLE registrations
ADD COLUMN IF NOT EXISTS gender TEXT;

-- Add civil_status column
ALTER TABLE registrations
ADD COLUMN IF NOT EXISTS civil_status TEXT;

-- Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'registrations'
AND column_name IN ('gender', 'civil_status');

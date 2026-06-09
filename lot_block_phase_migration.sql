-- ============================================================
-- MIGRATION: Add lot, block, phase to registrations table
-- Date: 2025-06-03
-- ============================================================

ALTER TABLE registrations
ADD COLUMN IF NOT EXISTS lot TEXT;

ALTER TABLE registrations
ADD COLUMN IF NOT EXISTS block TEXT;

ALTER TABLE registrations
ADD COLUMN IF NOT EXISTS phase TEXT;

-- Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'registrations'
AND column_name IN ('lot', 'block', 'phase');

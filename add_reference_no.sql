-- Add reference_no column to registrations table for short tracking codes
-- Run this in your Supabase SQL Editor

-- 1. Add the column
ALTER TABLE registrations
ADD COLUMN IF NOT EXISTS reference_no TEXT;

-- 2. Add unique constraint to prevent duplicate reference numbers
ALTER TABLE registrations
ADD CONSTRAINT unique_reference_no UNIQUE (reference_no);

-- 3. Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_registrations_reference_no
ON registrations (reference_no);

-- 4. (Optional) Backfill existing rows with generated short codes
-- Uncomment if you have existing registrations that need reference numbers:
/*
UPDATE registrations
SET reference_no = 'EM-' || upper(substring(md5(random()::text) from 1 for 6))
WHERE reference_no IS NULL;
*/

-- ============================================================
-- MIGRATION: Add photo_url column to registrations table
-- ============================================================

-- Add photo_url column for Supabase Storage public URL
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Create index for faster photo_url lookups
CREATE INDEX IF NOT EXISTS idx_registrations_photo_url ON registrations (photo_url);

-- ============================================================
-- OPTIONAL: Create member-photos bucket via SQL (if supported)
-- Otherwise create manually in Supabase Dashboard → Storage
-- Bucket name: member-photos
-- Public: true
-- ============================================================

-- Note: If using Supabase Pro, also run this in your dashboard:
-- 1. Go to Storage → New bucket → name: "member-photos"
-- 2. Check "Public bucket"
-- 3. Add RLS policy: Allow authenticated and anon users to INSERT
--    (or use the service role key from the API route for uploads)

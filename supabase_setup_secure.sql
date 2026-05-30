-- ============================================================
-- EM CARD - SECURE SUPABASE SETUP
-- Run this entire script in your Supabase SQL Editor.
-- ============================================================

-- ============================================================
-- 1. VALIDRESIDENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS "ValidResidents" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  barangay TEXT NOT NULL DEFAULT 'Borol 1st',
  precinct TEXT,
  status TEXT DEFAULT 'Verified',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE "ValidResidents" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select residents"
  ON "ValidResidents"
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert residents"
  ON "ValidResidents"
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update residents"
  ON "ValidResidents"
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public update resident status"
  ON "ValidResidents"
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 2. REGISTRATIONS TABLE (with new fields)
-- ============================================================
CREATE TABLE IF NOT EXISTS registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID REFERENCES "ValidResidents"(id),
  referral_name TEXT,
  sector_category TEXT,
  birthday TEXT,
  photo_base64 TEXT,
  house_no TEXT,
  purok TEXT,
  barangay TEXT,
  contact TEXT,
  status TEXT DEFAULT 'Pending',
  parent_id UUID REFERENCES registrations(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated select registrations"
  ON registrations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow public insert registrations"
  ON registrations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update registrations"
  ON registrations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow anonymous users to view Approved registrations (QR scan / citizen dashboard)
CREATE POLICY "Allow public select approved registrations"
  ON registrations
  FOR SELECT
  TO anon
  USING (status = 'Approved');

-- ============================================================
-- 3. PERFORMANCE INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_validresidents_last_name ON "ValidResidents" (last_name);
CREATE INDEX IF NOT EXISTS idx_validresidents_first_name ON "ValidResidents" (first_name);
CREATE INDEX IF NOT EXISTS idx_registrations_resident_id ON registrations (resident_id);
CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON registrations (created_at DESC);

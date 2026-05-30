-- ============================================================
-- EM CARD - MIGRATION: QR System + Grievances
-- Run this in your Supabase SQL Editor (safe to re-run)
-- ============================================================

-- Add QR token + scan tracking + EM Card Number columns to registrations
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS qr_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS em_card_no TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scan_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scan_event TEXT;

-- Create grievances / suggestions table
CREATE TABLE IF NOT EXISTS grievances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID REFERENCES registrations(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  type TEXT CHECK (type IN ('Suggestion','Grievance','Complaint','Feedback')),
  message TEXT NOT NULL,
  status TEXT DEFAULT 'Open' CHECK (status IN ('Open','Resolved','Escalated')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create scan_events table for event tracking
CREATE TABLE IF NOT EXISTS scan_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  event_date DATE,
  location TEXT,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Closed')),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create event_scans table for per-event scan tracking (duplicate prevention)
CREATE TABLE IF NOT EXISTS event_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES scan_events(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES registrations(id) ON DELETE CASCADE,
  scanned_at TIMESTAMPTZ DEFAULT now(),
  scanned_by TEXT,
  UNIQUE(event_id, registration_id)
);

-- Prevent duplicate active registrations (race condition fix)
-- One resident can only have ONE Pending or Approved registration
CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_unique_active
ON registrations(resident_id)
WHERE status IN ('Pending', 'Approved');

-- Allow anonymous QR scan / citizen dashboard to read Approved registrations
-- (Fixes "Card Not Found" when scanning QR code while not logged in)
CREATE POLICY IF NOT EXISTS "Allow public select approved registrations"
  ON registrations
  FOR SELECT
  TO anon
  USING (status = 'Approved');

-- RLS Policies for event tables
ALTER TABLE scan_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow authenticated select scan_events"
  ON scan_events FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "Allow authenticated insert scan_events"
  ON scan_events FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow authenticated update scan_events"
  ON scan_events FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow authenticated select event_scans"
  ON event_scans FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "Allow authenticated insert event_scans"
  ON event_scans FOR INSERT TO authenticated WITH CHECK (true);

-- Verify columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'registrations'
ORDER BY ordinal_position;

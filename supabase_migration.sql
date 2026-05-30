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
  ADD COLUMN IF NOT EXISTS scan_event TEXT,
  ADD COLUMN IF NOT EXISTS sector_category TEXT;

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

-- Performance indexes for event_scans (prevents sequential scans at 1000+ rows)
CREATE INDEX IF NOT EXISTS idx_event_scans_event_id ON event_scans(event_id);
CREATE INDEX IF NOT EXISTS idx_event_scans_scanned_at ON event_scans(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_scans_event_registration ON event_scans(event_id, registration_id);

-- Performance indexes for registrations QR lookups
CREATE INDEX IF NOT EXISTS idx_registrations_qr_token ON registrations(qr_token);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);

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

-- ─── SMS MESSAGING TABLES ───

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'broadcast' CHECK (type IN ('broadcast', 'announcement', 'event_reminder', 'emergency')),
  status TEXT DEFAULT 'sending' CHECK (status IN ('sending', 'sent', 'failed', 'draft')),
  target_type TEXT DEFAULT 'all',
  target_value TEXT,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS message_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES registrations(id) ON DELETE SET NULL,
  resident_id UUID,
  phone_number TEXT NOT NULL,
  resident_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  provider_response JSONB,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Performance indexes for SMS tables
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_message_recipients_message_id ON message_recipients(message_id);
CREATE INDEX IF NOT EXISTS idx_message_recipients_status ON message_recipients(status);

-- RLS Policies for SMS tables
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow authenticated select messages"
  ON messages FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "Allow authenticated insert messages"
  ON messages FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow authenticated update messages"
  ON messages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow authenticated select message_recipients"
  ON message_recipients FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "Allow authenticated insert message_recipients"
  ON message_recipients FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow authenticated update message_recipients"
  ON message_recipients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Verify columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'registrations'
ORDER BY ordinal_position;

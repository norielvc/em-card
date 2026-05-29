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
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Verify columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'registrations'
ORDER BY ordinal_position;

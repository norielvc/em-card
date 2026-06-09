-- Enable Row Level Security on all tables
-- Run this in Supabase SQL Editor after deployment

-- Core tables
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ValidResidents" ENABLE ROW LEVEL SECURITY;

-- Supporting tables
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE upcoming_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_recipients ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES: registrations
-- ============================================

-- Allow public to track by reference_no (no auth needed)
CREATE POLICY "Public track by reference"
ON registrations FOR SELECT
TO anon
USING (reference_no IS NOT NULL);

-- Allow authenticated users (admins) full access via API routes
CREATE POLICY "Admin full access via service role"
ON registrations FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- POLICIES: ValidResidents
-- ============================================

-- Public search (used in registration lookup) - limited fields only
-- This policy is intentionally permissive for search; actual data exposure
-- is controlled by the API route which limits returned fields
CREATE POLICY "Public search residents"
ON "ValidResidents" FOR SELECT
TO anon
USING (true);

-- Service role full access
CREATE POLICY "Service role full access"
ON "ValidResidents" FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- POLICIES: contact_messages
-- ============================================

-- Public: anyone can submit (POST)
CREATE POLICY "Public submit contact"
ON contact_messages FOR INSERT
TO anon
WITH CHECK (true);

-- Admin read only (via service role / authenticated)
CREATE POLICY "Admin read contact"
ON contact_messages FOR SELECT
TO service_role
USING (true);

-- ============================================
-- POLICIES: upcoming_events
-- ============================================

-- Public read (homepage display)
CREATE POLICY "Public read events"
ON upcoming_events FOR SELECT
TO anon
USING (status = 'Active');

-- Admin write (via service role)
CREATE POLICY "Admin manage events"
ON upcoming_events FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- POLICIES: messages / message_recipients
-- ============================================

CREATE POLICY "Service role messages"
ON messages FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role recipients"
ON message_recipients FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- POLICIES: admin_logs
-- ============================================

CREATE POLICY "Service role admin_logs"
ON admin_logs FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

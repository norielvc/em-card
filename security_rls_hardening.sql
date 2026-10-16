-- ============================================================
-- EM CARD - RLS HARDENING (run in Supabase SQL Editor)
-- Safe with current app code that uses:
--   - /api/registration/helpers for duplicate/parent/mark-registered
--   - /api/search-residents (service role)
--   - /api/event-scan + /api/distribution-scan (service role)
--   - /api/residents/delete (service role, admin only)
-- ============================================================
-- Event Scanner & Aid Scanner: NOT affected (they use service role APIs).
-- Admin UI (logged in): still can SELECT/INSERT/UPDATE ValidResidents
--   and registrations via authenticated policies below.
-- ============================================================

-- 1) ValidResidents: remove public (anon) access
DROP POLICY IF EXISTS "Allow public select residents" ON "ValidResidents";
DROP POLICY IF EXISTS "Allow public update resident status" ON "ValidResidents";

DROP POLICY IF EXISTS "Allow authenticated select residents" ON "ValidResidents";
CREATE POLICY "Allow authenticated select residents"
  ON "ValidResidents"
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert residents" ON "ValidResidents";
CREATE POLICY "Allow authenticated insert residents"
  ON "ValidResidents"
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update residents" ON "ValidResidents";
CREATE POLICY "Allow authenticated update residents"
  ON "ValidResidents"
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Deletes go through /api/residents/delete (service role)
DROP POLICY IF EXISTS "Allow authenticated delete residents" ON "ValidResidents";
DROP POLICY IF EXISTS "Authenticated users can delete ValidResidents" ON "ValidResidents";

-- 2) registrations
DROP POLICY IF EXISTS "Allow public update registrations" ON registrations;
DROP POLICY IF EXISTS "Allow anon update registrations" ON registrations;
DROP POLICY IF EXISTS "Allow public delete registrations" ON registrations;

-- Anon may only read Approved cards (public card pages / limited client reads)
DROP POLICY IF EXISTS "Allow public select approved registrations" ON registrations;
CREATE POLICY "Allow public select approved registrations"
  ON registrations
  FOR SELECT
  TO anon
  USING (status = 'Approved');

-- Citizen signup insert
DROP POLICY IF EXISTS "Allow public insert registrations" ON registrations;
CREATE POLICY "Allow public insert registrations"
  ON registrations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated select registrations" ON registrations;
CREATE POLICY "Allow authenticated select registrations"
  ON registrations
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated update registrations" ON registrations;
CREATE POLICY "Allow authenticated update registrations"
  ON registrations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Member deletes go through /api/registrations/delete (service role)
DROP POLICY IF EXISTS "Allow authenticated delete registrations" ON registrations;
DROP POLICY IF EXISTS "Authenticated users can delete registrations" ON registrations;

-- 3) Revoke dangerous helpers from anon if present
DO $$
BEGIN
  REVOKE ALL ON FUNCTION public.get_table_sizes() FROM anon;
  REVOKE ALL ON FUNCTION public.get_table_sizes() FROM PUBLIC;
EXCEPTION
  WHEN undefined_function THEN NULL;
END $$;

-- After running: ensure app_metadata.role is set for admin/staff users,
-- then have them log out and log in again.

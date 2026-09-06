-- Fix: Admin cannot delete events in Event Scanner
-- Root cause: scan_events and event_scans tables had RLS enabled with
-- SELECT/INSERT/UPDATE policies but NO DELETE policy, so delete requests
-- were silently blocked by Postgres RLS (no error, 0 rows affected).
-- Run this in your Supabase SQL Editor.

DROP POLICY IF EXISTS "Allow authenticated delete scan_events" ON scan_events;
CREATE POLICY "Allow authenticated delete scan_events"
  ON scan_events FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated delete event_scans" ON event_scans;
CREATE POLICY "Allow authenticated delete event_scans"
  ON event_scans FOR DELETE TO authenticated USING (true);

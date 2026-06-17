-- Optimization migration for 40,000+ scan events
-- Run this in Supabase SQL Editor before high-volume events

-- 1. Composite covering index for exact QR token + status lookups
-- This replaces the need for BitmapAnd between idx_registrations_qr_token and idx_registrations_status
CREATE INDEX IF NOT EXISTS idx_registrations_qr_status ON registrations(qr_token, status);

-- 2. Composite index for event traffic monitor queries (event_id + time DESC)
-- Speeds up the live attendance feed that polls every 3 seconds
CREATE INDEX IF NOT EXISTS idx_event_scans_event_scanned ON event_scans(event_id, scanned_at DESC);

-- 3. Index to speed up household duplicate checks by address
CREATE INDEX IF NOT EXISTS idx_registrations_address ON registrations(barangay, house_no, purok)
WHERE house_no IS NOT NULL OR purok IS NOT NULL;

-- 4. Ensure event_scans has optimal index for high-volume insert+select
-- (The UNIQUE(event_id, registration_id) constraint already creates this, but we verify)
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_scans_unique_event_reg
ON event_scans(event_id, registration_id);

-- 5. BRIN index for time-series scan data (much smaller than B-tree, ideal for 40k+ rows)
-- Only useful if scanned_at is strictly monotonic (always increasing)
CREATE INDEX IF NOT EXISTS idx_event_scans_scanned_at_brin
ON event_scans USING BRIN(scanned_at);

-- 6. Add helpful comments
COMMENT ON INDEX idx_registrations_qr_status IS 'Covering index for exact QR lookups during event scanning';
COMMENT ON INDEX idx_event_scans_event_scanned IS 'Composite index for live traffic monitor polling';

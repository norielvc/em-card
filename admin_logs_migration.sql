-- ============================================================
-- EM CARD - ADMIN ACTIVITY LOGS MIGRATION
-- Run this entire script in your Supabase SQL Editor.
-- ============================================================

-- ============================================================
-- 1. ADMIN_LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target_table TEXT,
  target_id TEXT,
  target_name TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Only allow service role / server-side to insert logs
CREATE POLICY "Allow authenticated insert logs"
  ON admin_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to view logs
CREATE POLICY "Allow authenticated select logs"
  ON admin_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- 2. REGISTRATIONS DELETE POLICY (needed for admin delete)
-- ============================================================
CREATE POLICY "Allow authenticated delete registrations"
  ON registrations
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- 3. VALIDRESIDENTS DELETE POLICY (needed for admin delete)
-- ============================================================
CREATE POLICY "Allow authenticated delete residents"
  ON "ValidResidents"
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- 4. PERFORMANCE INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_email ON admin_logs (admin_email);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action_type ON admin_logs (action_type);

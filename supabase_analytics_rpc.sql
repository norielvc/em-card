-- ============================================================
-- EM CARD - Analytics RPC Functions
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Function: Get voter counts grouped by barangay
CREATE OR REPLACE FUNCTION get_voters_by_barangay()
RETURNS TABLE (barangay TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(NULLIF(TRIM(v.barangay), ''), 'Unknown')::TEXT AS barangay,
    COUNT(*)::BIGINT AS count
  FROM "ValidResidents" v
  GROUP BY TRIM(v.barangay)
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get registration counts grouped by barangay
CREATE OR REPLACE FUNCTION get_regs_by_barangay()
RETURNS TABLE (barangay TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(NULLIF(TRIM(r.barangay), ''), 'Unknown')::TEXT AS barangay,
    COUNT(*)::BIGINT AS count
  FROM registrations r
  GROUP BY TRIM(r.barangay)
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

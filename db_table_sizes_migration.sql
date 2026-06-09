-- ============================================================
-- MIGRATION: Add get_table_sizes() RPC function for System Monitoring
-- Run this in your Supabase SQL Editor (SQL tab in dashboard)
-- ============================================================

CREATE OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE (
  table_name text,
  size_bytes bigint,
  size_pretty text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.relname::text AS table_name,
    pg_total_relation_size(c.oid)::bigint AS size_bytes,
    pg_size_pretty(pg_total_relation_size(c.oid))::text AS size_pretty
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
  ORDER BY pg_total_relation_size(c.oid) DESC;
END;
$$;

-- Grant execute to all roles so the API can call it
GRANT EXECUTE ON FUNCTION get_table_sizes() TO anon;
GRANT EXECUTE ON FUNCTION get_table_sizes() TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_sizes() TO service_role;

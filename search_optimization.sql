-- Full-Text Search Optimization for ValidResidents
-- Run this in your Supabase SQL Editor

-- 1. Add search_vector column (generated full-text index)
ALTER TABLE "ValidResidents" ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_validresidents_search_vector ON "ValidResidents" USING GIN (search_vector);

-- 3. Create function to auto-update search_vector on insert/update
CREATE OR REPLACE FUNCTION update_validresidents_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('simple', COALESCE(NEW.first_name, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.last_name, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.middle_name, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.suffix, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach trigger
DROP TRIGGER IF EXISTS trg_validresidents_search_vector ON "ValidResidents";
CREATE TRIGGER trg_validresidents_search_vector
BEFORE INSERT OR UPDATE ON "ValidResidents"
FOR EACH ROW
EXECUTE FUNCTION update_validresidents_search_vector();

-- 5. Backfill existing rows (run once)
UPDATE "ValidResidents" SET search_vector = 
  setweight(to_tsvector('simple', COALESCE(first_name, '')), 'A') ||
  setweight(to_tsvector('simple', COALESCE(last_name, '')), 'A') ||
  setweight(to_tsvector('simple', COALESCE(middle_name, '')), 'B') ||
  setweight(to_tsvector('simple', COALESCE(suffix, '')), 'C')
WHERE search_vector IS NULL;

-- 6. Create RPC search function
DROP FUNCTION IF EXISTS search_residents(TEXT, TEXT, UUID, INT);

CREATE OR REPLACE FUNCTION search_residents(
  ts_query_text TEXT,
  ilike_pattern TEXT,
  exclude_uuid UUID DEFAULT NULL,
  result_limit INT DEFAULT 50
)
RETURNS TABLE(
  id UUID,
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  suffix TEXT,
  barangay TEXT,
  rank REAL
) AS $$
BEGIN
  -- Primary: Full-text search with prefix matching
  RETURN QUERY
  SELECT 
    vr.id,
    vr.first_name,
    vr.middle_name,
    vr.last_name,
    vr.suffix,
    vr.barangay,
    ts_rank_cd(vr.search_vector, to_tsquery('simple', ts_query_text))::REAL as rank
  FROM "ValidResidents" vr
  WHERE vr.search_vector @@ to_tsquery('simple', ts_query_text)
    AND (exclude_uuid IS NULL OR vr.id != exclude_uuid)
  ORDER BY rank DESC
  LIMIT result_limit;

  -- Fallback: ILIKE pattern match if FTS returns nothing
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      vr.id,
      vr.first_name,
      vr.middle_name,
      vr.last_name,
      vr.suffix,
      vr.barangay,
      0.0::REAL as rank
    FROM "ValidResidents" vr
    WHERE (
      vr.first_name ILIKE ilike_pattern OR
      vr.last_name ILIKE ilike_pattern OR
      vr.middle_name ILIKE ilike_pattern OR
      (COALESCE(vr.first_name, '') || ' ' || COALESCE(vr.middle_name, '') || ' ' || COALESCE(vr.last_name, '')) ILIKE ilike_pattern
    )
    AND (exclude_uuid IS NULL OR vr.id != exclude_uuid)
    LIMIT result_limit;
  END IF;
END;
$$ LANGUAGE plpgsql;

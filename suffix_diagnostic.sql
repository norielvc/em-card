-- ============================================================
-- SUFFIX DIAGNOSTIC & FIX
-- Run each block separately to diagnose and fix suffix issues
-- ============================================================

-- ============================================================
-- STEP 1: DIAGNOSTIC - See what middle_name values exist
-- ============================================================
SELECT DISTINCT middle_name, COUNT(*) as count
FROM "ValidResidents"
WHERE middle_name IS NOT NULL
GROUP BY middle_name
ORDER BY count DESC
LIMIT 50;

-- ============================================================
-- STEP 2: DIAGNOSTIC - Preview what would be extracted as suffix
-- ============================================================
SELECT 
  first_name,
  last_name,
  middle_name,
  TRIM(UPPER(REPLACE(middle_name, '.', ''))) as normalized_for_matching,
  CASE 
    WHEN TRIM(UPPER(REPLACE(middle_name, '.', ''))) IN ('JR','SR','III','IV','V','II','2ND','3RD','1ST')
    THEN 'YES - will be extracted as suffix'
    ELSE 'NO - stays as middle_name'
  END as would_extract
FROM "ValidResidents"
WHERE middle_name IS NOT NULL
ORDER BY last_name, first_name
LIMIT 100;

-- ============================================================
-- STEP 3: FIX - Extract suffixes from middle_name
-- (Run this ONLY if Step 2 shows matching rows)
-- ============================================================
UPDATE "ValidResidents"
SET suffix = TRIM(middle_name),
    middle_name = NULL
WHERE middle_name IS NOT NULL
  AND TRIM(UPPER(REPLACE(middle_name, '.', ''))) IN ('JR', 'SR', 'III', 'IV', 'V', 'II', '2ND', '3RD', '1ST');

-- ============================================================
-- STEP 4: VERIFY - Check extracted suffixes
-- ============================================================
SELECT first_name, last_name, middle_name, suffix
FROM "ValidResidents"
WHERE suffix IS NOT NULL
ORDER BY last_name
LIMIT 50;

-- ============================================================
-- STEP 5: SYNC - Copy suffix from ValidResidents to registrations
-- ============================================================
UPDATE registrations
SET suffix = (
  SELECT vr.suffix
  FROM "ValidResidents" vr
  WHERE vr.id = registrations.resident_id
)
WHERE suffix IS NULL OR suffix = '';

-- ============================================================
-- STEP 6: FINAL CHECK
-- ============================================================
SELECT 
  (SELECT COUNT(*) FROM "ValidResidents" WHERE suffix IS NOT NULL) as validresidents_with_suffix,
  (SELECT COUNT(*) FROM registrations WHERE suffix IS NOT NULL) as registrations_with_suffix,
  (SELECT COUNT(*) FROM "ValidResidents" WHERE middle_name IS NOT NULL) as remaining_middle_names;

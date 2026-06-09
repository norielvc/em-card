-- ============================================================
-- SUFFIX EXTRACTION FIX
-- Handles suffixes embedded INSIDE middle_name (e.g. "CHIAPOCO JR.")
-- ============================================================

-- STEP 1: Extract suffix when it's space-separated at the END of middle_name
-- Example: "CHIAPOCO JR." → middle_name="CHIAPOCO", suffix="JR."
UPDATE "ValidResidents"
SET 
  suffix = TRIM(REGEXP_REPLACE(middle_name, '^.*\s', '')),
  middle_name = NULLIF(TRIM(REGEXP_REPLACE(middle_name, '\s\S+$', '')), '')
WHERE middle_name ~ '\s(JR\.?|SR\.?|III\.?|IV\.?|V\.?|II\.?)$'
  AND suffix IS NULL;

-- STEP 2: Also catch standalone suffix values (middle_name IS just "JR" or "III")
UPDATE "ValidResidents"
SET suffix = TRIM(middle_name),
    middle_name = NULL
WHERE middle_name IS NOT NULL
  AND TRIM(UPPER(REPLACE(middle_name, '.', ''))) IN ('JR', 'SR', 'III', 'IV', 'V', 'II', '2ND', '3RD', '1ST')
  AND suffix IS NULL;

-- STEP 3: Sync registrations.suffix from ValidResidents
UPDATE registrations
SET suffix = (
  SELECT vr.suffix
  FROM "ValidResidents" vr
  WHERE vr.id = registrations.resident_id
)
WHERE suffix IS NULL OR suffix = '';

-- STEP 4: VERIFY - Check the specific account and overall stats
SELECT 
  first_name, last_name, middle_name, suffix
FROM "ValidResidents"
WHERE first_name = 'GLENIE' AND last_name = 'A JOSE';

-- Overall stats
SELECT 
  (SELECT COUNT(*) FROM "ValidResidents" WHERE suffix IS NOT NULL) as residents_with_suffix,
  (SELECT COUNT(*) FROM "ValidResidents" WHERE middle_name IS NOT NULL) as residents_with_middle_name,
  (SELECT COUNT(*) FROM registrations WHERE suffix IS NOT NULL) as registrations_with_suffix;

--- ============================================================
--- NAME PARSING FIX v2
--- Simpler approach: preview first, then update
--- ============================================================

-- STEP 1: Create temp table with preview of all changes
DROP TABLE IF EXISTS _name_fix_preview;
CREATE TEMP TABLE _name_fix_preview AS
SELECT
  id,
  first_name AS old_first_name,
  middle_name AS old_middle_name,
  SPLIT_PART(first_name, ' ', 1) AS new_first_name,
  CASE
    WHEN POSITION(' ' IN first_name) > 0 THEN TRIM(SUBSTRING(first_name FROM POSITION(' ' IN first_name)))
    ELSE ''
  END AS extracted_middle,
  last_name,
  suffix
FROM "ValidResidents"
WHERE LENGTH(REGEXP_REPLACE(first_name, '[^\s]', '', 'g')) >= 2;

-- STEP 2: Apply fixes to ValidResidents
UPDATE "ValidResidents" vr
SET
  first_name = p.new_first_name,
  middle_name = CASE
    WHEN vr.middle_name IS NULL OR TRIM(vr.middle_name) = '' THEN p.extracted_middle
    ELSE p.extracted_middle || ' ' || vr.middle_name
  END
FROM _name_fix_preview p
WHERE vr.id = p.id;

-- STEP 3: Sync registrations table
UPDATE registrations r
SET
  first_name = vr.first_name,
  middle_name = vr.middle_name,
  last_name = vr.last_name,
  suffix = vr.suffix
FROM "ValidResidents" vr
WHERE r.valid_resident_id = vr.id
  AND vr.id IN (SELECT id FROM _name_fix_preview);

-- STEP 4: Show what was changed
SELECT
  id,
  old_first_name AS "Before: first_name",
  old_middle_name AS "Before: middle_name",
  new_first_name AS "After: first_name",
  CASE
    WHEN old_middle_name IS NULL OR TRIM(old_middle_name) = '' THEN extracted_middle
    ELSE extracted_middle || ' ' || old_middle_name
  END AS "After: middle_name"
FROM _name_fix_preview
ORDER BY old_first_name;

-- STEP 5: Show records needing manual review
SELECT
  id,
  first_name,
  middle_name,
  last_name,
  suffix,
  'REVIEW: 2-word first_name with empty middle_name' AS action_needed
FROM "ValidResidents"
WHERE first_name ~ '^[^\s]+\s+[^\s]+$'
  AND (middle_name IS NULL OR TRIM(middle_name) = '')
ORDER BY first_name;

-- STEP 6: Cleanup
DROP TABLE IF EXISTS _name_fix_preview;

--- ============================================================
--- NAME PARSING FIX
--- Fixes records where first_name contains middle_name parts
--- due to PDF->Excel conversion issues
--- ============================================================
--- 
--- SAFETY: Run name_diagnostic.sql first to review.
--- This script ONLY auto-fixes records where first_name has 3+ words.
--- Records with 2 words in first_name and empty middle_name
--- are flagged but NOT auto-fixed (could be compound first names).
---

-- ============================================================
-- STEP 1: Create a temp table to track changes
-- ============================================================
DROP TABLE IF EXISTS _name_fix_log;
CREATE TEMP TABLE _name_fix_log (
  id UUID,
  table_name TEXT,
  old_first_name TEXT,
  old_middle_name TEXT,
  new_first_name TEXT,
  new_middle_name TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STEP 2: Fix ValidResidents where first_name has 3+ words
-- Move all words except the first into middle_name
-- ============================================================
WITH to_fix AS (
  SELECT
    id,
    first_name AS old_first,
    middle_name AS old_middle,
    last_name,
    SPLIT_PART(first_name, ' ', 1) AS new_first,
    CASE
      WHEN POSITION(' ' IN first_name) > 0 THEN TRIM(SUBSTRING(first_name FROM POSITION(' ' IN first_name)))
      ELSE ''
    END AS new_middle,
    suffix
  FROM "ValidResidents"
  WHERE LENGTH(REGEXP_REPLACE(first_name, '[^\s]', '', 'g')) >= 2
),
updated AS (
  UPDATE "ValidResidents" vr
  SET
    first_name = tf.new_first,
    middle_name = CASE
      WHEN tf.old_middle IS NULL OR TRIM(tf.old_middle) = '' THEN tf.new_middle
      ELSE tf.new_middle || ' ' || tf.old_middle
    END
  FROM to_fix tf
  WHERE vr.id = tf.id
  RETURNING vr.id, tf.old_first, tf.old_middle, tf.new_first,
    CASE WHEN tf.old_middle IS NULL OR TRIM(tf.old_middle) = '' THEN tf.new_middle ELSE tf.new_middle || ' ' || tf.old_middle END AS new_middle_combined
)
INSERT INTO _name_fix_log (id, table_name, old_first_name, old_middle_name, new_first_name, new_middle_name)
SELECT id, 'ValidResidents', old_first, old_middle, new_first, new_middle_combined FROM updated;

-- ============================================================
-- STEP 3: Sync registrations table for records we just fixed
-- (registrations stores copies of name fields)
-- ============================================================
WITH vr_fixed AS (
  SELECT id, first_name, middle_name, last_name, suffix
  FROM "ValidResidents"
  WHERE id IN (SELECT id FROM _name_fix_log WHERE table_name = 'ValidResidents')
)
UPDATE registrations r
SET
  first_name = vf.first_name,
  middle_name = vf.middle_name,
  last_name = vf.last_name,
  suffix = vf.suffix
FROM vr_fixed vf
WHERE r.valid_resident_id = vf.id;

-- ============================================================
-- STEP 4: Show what was changed
-- ============================================================
SELECT
  id,
  old_first_name AS "Before: first_name",
  old_middle_name AS "Before: middle_name",
  new_first_name AS "After: first_name",
  new_middle_name AS "After: middle_name"
FROM _name_fix_log
ORDER BY old_first_name;

-- ============================================================
-- STEP 5: Show records that need MANUAL review
-- (2-word first_name with empty middle_name - could be compound names)
-- ============================================================
SELECT
  id,
  first_name,
  middle_name,
  last_name,
  suffix,
  'REVIEW: 2-word first_name with empty middle_name. Could be compound first name (e.g., MA CRISTINA, MARY GRACE) OR a parsing error.' AS action_needed
FROM "ValidResidents"
WHERE first_name ~ '^[^\s]+\s+[^\s]+$'
  AND (middle_name IS NULL OR TRIM(middle_name) = '')
ORDER BY first_name;

-- ============================================================
-- STEP 6: Cleanup
-- ============================================================
DROP TABLE IF EXISTS _name_fix_log;

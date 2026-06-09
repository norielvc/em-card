--- ============================================================
--- NAME PARSING DIAGNOSTIC
--- Identifies records where first_name likely contains
--- middle_name parts due to PDF->Excel conversion issues
--- ============================================================

-- 1. OVERVIEW COUNTS
SELECT
  COUNT(*) AS total_records,
  COUNT(*) FILTER (WHERE first_name ~ '\s') AS first_name_has_space,
  COUNT(*) FILTER (WHERE LENGTH(REGEXP_REPLACE(first_name, '[^\s]', '', 'g')) >= 2) AS first_name_3plus_words,
  COUNT(*) FILTER (WHERE first_name ~ '\s' AND (middle_name IS NULL OR TRIM(middle_name) = '')) AS first_multi_middle_empty,
  COUNT(*) FILTER (WHERE LENGTH(REGEXP_REPLACE(first_name, '[^\s]', '', 'g')) >= 2 AND (middle_name IS NULL OR TRIM(middle_name) = '')) AS likely_broken
FROM "ValidResidents";

-- 2. SHOW RECORDS WHERE first_name HAS 3+ WORDS (most likely wrong)
SELECT
  id,
  first_name,
  middle_name,
  last_name,
  suffix,
  barangay,
  precinct,
  '3+ words in first_name' AS issue
FROM "ValidResidents"
WHERE LENGTH(REGEXP_REPLACE(first_name, '[^\s]', '', 'g')) >= 2
ORDER BY first_name;

-- 3. SHOW RECORDS WHERE first_name HAS 2 WORDS AND middle_name IS EMPTY
SELECT
  id,
  first_name,
  middle_name,
  last_name,
  suffix,
  barangay,
  precinct,
  '2 words in first_name, middle_name empty' AS issue
FROM "ValidResidents"
WHERE first_name ~ '^[^\s]+\s+[^\s]+$'
  AND (middle_name IS NULL OR TRIM(middle_name) = '')
ORDER BY first_name;

-- 4. SHOW RECORDS WHERE first_name HAS 2+ WORDS AND middle_name STARTS WITH SAME 2ND WORD
-- (indicates the middle name was split between first_name and middle_name)
SELECT
  id,
  first_name,
  middle_name,
  last_name,
  suffix,
  'Possible split: second word of first_name matches start of middle_name' AS issue
FROM "ValidResidents"
WHERE first_name ~ '\s'
  AND middle_name IS NOT NULL
  AND TRIM(middle_name) <> ''
  AND SPLIT_PART(first_name, ' ', 2) = SPLIT_PART(middle_name, ' ', 1)
ORDER BY first_name;

-- 5. PROPOSED FIX PREVIEW (3+ words in first_name -> move words 2+ to middle_name)
SELECT
  id,
  first_name AS current_first,
  middle_name AS current_middle,
  SPLIT_PART(first_name, ' ', 1) AS proposed_first,
  TRIM(SUBSTRING(first_name FROM POSITION(' ' IN first_name))) AS proposed_middle,
  last_name,
  suffix
FROM "ValidResidents"
WHERE LENGTH(REGEXP_REPLACE(first_name, '[^\s]', '', 'g')) >= 2
ORDER BY first_name;

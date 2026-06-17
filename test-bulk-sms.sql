-- Create test data for bulk SMS testing (8,000 test members)
-- Run this in Supabase SQL Editor

-- Step 1: Create test residents in ValidResidents table
INSERT INTO "ValidResidents" (
  id, 
  first_name, 
  last_name, 
  barangay, 
  precinct,
  created_at
)
SELECT 
  gen_random_uuid(),
  'Test' || i,
  'User' || i,
  'TEST BARANGAY',
  'TEST-' || i,
  NOW()
FROM generate_series(1, 100) AS i
ON CONFLICT DO NOTHING;

-- Step 2: Create registrations for these test residents
INSERT INTO registrations (
  resident_id,
  first_name,
  last_name,
  barangay,
  contact,
  status,
  sector_category,
  created_at
)
SELECT 
  vr.id,
  vr.first_name,
  vr.last_name,
  'TEST BARANGAY',
  '0917123' || LPAD(row_number() OVER ()::text, 4, '0'),
  'Approved',
  'Youth',
  NOW()
FROM "ValidResidents" vr
WHERE vr.barangay = 'TEST BARANGAY'
AND NOT EXISTS (
  SELECT 1 FROM registrations r WHERE r.resident_id = vr.id
);

-- Verify test data created
SELECT 'Test residents created:' as info, COUNT(*) as count 
FROM "ValidResidents" WHERE barangay = 'TEST BARANGAY'
UNION ALL
SELECT 'Test registrations created:' as info, COUNT(*) as count 
FROM registrations WHERE barangay = 'TEST BARANGAY';

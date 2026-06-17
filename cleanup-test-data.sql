-- Cleanup test data after bulk SMS testing
-- Run this after testing to remove fake members
-- Order matters due to foreign key constraints

-- Step 1: Delete test message recipients (child table)
DELETE FROM message_recipients 
WHERE registration_id IN (
  SELECT id FROM registrations WHERE barangay = 'TEST BARANGAY'
);

-- Step 2: Delete test registrations (child of ValidResidents)
DELETE FROM registrations 
WHERE barangay = 'TEST BARANGAY';

-- Step 3: Delete test messages
DELETE FROM messages 
WHERE target_value = 'TEST BARANGAY' 
OR target_type = 'test';

-- Step 4: Delete test residents from ValidResidents (parent table)
DELETE FROM "ValidResidents" 
WHERE barangay = 'TEST BARANGAY';

-- Verify cleanup
SELECT 'Test data cleaned up' as status, 
       (SELECT COUNT(*) FROM registrations WHERE barangay = 'TEST BARANGAY') as remaining_regs,
       (SELECT COUNT(*) FROM "ValidResidents" WHERE barangay = 'TEST BARANGAY') as remaining_residents;

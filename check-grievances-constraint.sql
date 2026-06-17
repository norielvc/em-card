-- Check what CHECK constraint exists on grievances.status
SELECT conname, pg_get_constraintdef(oid) as constraint_def
FROM pg_constraint
WHERE conrelid = 'grievances'::regclass
AND contype = 'c';

-- If you want to drop the constraint and allow any status:
-- ALTER TABLE grievances DROP CONSTRAINT grievances_status_check;

-- Or recreate with allowed values:
-- ALTER TABLE grievances DROP CONSTRAINT IF EXISTS grievances_status_check;
-- ALTER TABLE grievances ADD CONSTRAINT grievances_status_check 
--   CHECK (status IN ('pending', 'open', 'resolved', 'closed', 'new'));

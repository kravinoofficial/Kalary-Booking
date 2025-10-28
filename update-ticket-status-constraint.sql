-- Update tickets table to allow COMPLETED status
-- First drop the existing constraint
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;

-- Add new constraint that includes COMPLETED status
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check 
CHECK (status IN ('ACTIVE', 'COMPLETED', 'REVOKED'));

-- Update any existing tickets that might need the new status
-- (This is safe to run even if no tickets need updating)
UPDATE tickets SET status = 'COMPLETED' 
WHERE status = 'ACTIVE' 
AND show_id IN (
  SELECT id FROM shows 
  WHERE status = 'SHOW_DONE'
);
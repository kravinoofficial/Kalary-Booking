-- Add SHOW_STARTED status to shows table
-- Update the constraint to include the new status

-- Drop existing constraint
ALTER TABLE shows DROP CONSTRAINT IF EXISTS check_show_status;

-- Add new constraint with SHOW_STARTED status
ALTER TABLE shows ADD CONSTRAINT check_show_status 
CHECK (status IN ('ACTIVE', 'HOUSE_FULL', 'SHOW_STARTED', 'SHOW_DONE'));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_shows_status_date_time ON shows(status, date, time);
-- Add status field to shows table
-- Status values: 'ACTIVE', 'HOUSE_FULL', 'SHOW_DONE'

ALTER TABLE shows ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE';

-- Update existing shows to have ACTIVE status
UPDATE shows SET status = 'ACTIVE' WHERE status IS NULL;

-- Add constraint to ensure valid status values
ALTER TABLE shows ADD CONSTRAINT check_show_status 
CHECK (status IN ('ACTIVE', 'HOUSE_FULL', 'SHOW_DONE'));

-- Create index for better performance when filtering by status
CREATE INDEX IF NOT EXISTS idx_shows_status ON shows(status);
CREATE INDEX IF NOT EXISTS idx_shows_date_time ON shows(date, time);
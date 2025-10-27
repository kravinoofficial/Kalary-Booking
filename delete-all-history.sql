-- Script to delete all booking and ticket history
-- WARNING: This will permanently delete ALL bookings and tickets data
-- Run this in your Supabase SQL editor with caution

-- Step 1: Delete all tickets (this will cascade and clean up related data)
DELETE FROM tickets;

-- Step 2: Delete all bookings (in case there are any orphaned bookings)
DELETE FROM bookings;

-- Step 3: Reset any auto-increment sequences (if using serial columns)
-- Note: Since we're using UUIDs, this step is not needed, but included for completeness
-- ALTER SEQUENCE IF EXISTS tickets_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS bookings_id_seq RESTART WITH 1;

-- Step 4: Verify deletion - these should return 0 rows
SELECT COUNT(*) as remaining_tickets FROM tickets;
SELECT COUNT(*) as remaining_bookings FROM bookings;

-- Optional: Show summary of what was deleted
SELECT 
    'All booking and ticket history has been deleted' as status,
    NOW() as deleted_at;

-- Note: This script does NOT delete:
-- - Shows (your show configurations remain intact)
-- - Layouts (your seating layouts remain intact)
-- - User accounts and authentication data
-- Only booking transactions and generated tickets are removed
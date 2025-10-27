-- Script to backup booking and ticket data before deletion
-- Run this BEFORE running any delete scripts to create a backup

-- Create backup tables with current timestamp
CREATE TABLE bookings_backup_20241028 AS 
SELECT 
    b.*,
    s.title as show_title,
    s.date as show_date,
    s.time as show_time
FROM bookings b
LEFT JOIN shows s ON b.show_id = s.id;

CREATE TABLE tickets_backup_20241028 AS 
SELECT 
    t.*,
    s.title as show_title,
    s.date as show_date,
    s.time as show_time,
    b.booked_by
FROM tickets t
LEFT JOIN shows s ON t.show_id = s.id
LEFT JOIN bookings b ON t.booking_id = b.id;

-- Verify backup was created successfully
SELECT 
    'Bookings backed up: ' || COUNT(*) as backup_status 
FROM bookings_backup_20241028;

SELECT 
    'Tickets backed up: ' || COUNT(*) as backup_status 
FROM tickets_backup_20241028;

-- Show backup table structures
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name IN ('bookings_backup_20241028', 'tickets_backup_20241028')
ORDER BY table_name, ordinal_position;

-- Export backup data to CSV (copy these results and save as CSV files)
-- Bookings backup:
SELECT * FROM bookings_backup_20241028 ORDER BY booking_time;

-- Tickets backup:
SELECT * FROM tickets_backup_20241028 ORDER BY generated_at;

-- Summary report before deletion:
SELECT 
    'BACKUP SUMMARY' as report_type,
    (SELECT COUNT(*) FROM bookings) as total_bookings,
    (SELECT COUNT(*) FROM tickets) as total_tickets,
    (SELECT SUM(price) FROM tickets) as total_revenue,
    NOW() as backup_created_at;
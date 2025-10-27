-- Script for selective deletion of booking and ticket history
-- Choose one of the options below based on your needs

-- OPTION 1: Delete all history for a specific show
-- Replace 'SHOW_ID_HERE' with the actual show ID
/*
DELETE FROM tickets WHERE show_id = 'SHOW_ID_HERE';
DELETE FROM bookings WHERE show_id = 'SHOW_ID_HERE';
*/

-- OPTION 2: Delete all history before a specific date
-- Replace '2024-01-01' with your desired cutoff date
/*
DELETE FROM tickets 
WHERE generated_at < '2024-01-01'::timestamp;

DELETE FROM bookings 
WHERE booking_time < '2024-01-01'::timestamp;
*/

-- OPTION 3: Delete all history for shows on a specific date
-- Replace '2024-10-28' with the show date you want to clear
/*
DELETE FROM tickets 
WHERE show_id IN (
    SELECT id FROM shows WHERE date = '2024-10-28'
);

DELETE FROM bookings 
WHERE show_id IN (
    SELECT id FROM shows WHERE date = '2024-10-28'
);
*/

-- OPTION 4: Delete only cancelled/revoked tickets and their bookings
/*
DELETE FROM tickets WHERE status = 'REVOKED';
DELETE FROM bookings WHERE status = 'CANCELLED';
*/

-- OPTION 5: Delete bookings by a specific user
-- Replace 'admin' with the username you want to clear
/*
DELETE FROM tickets 
WHERE booking_id IN (
    SELECT id FROM bookings WHERE booked_by = 'admin'
);

DELETE FROM bookings WHERE booked_by = 'admin';
*/

-- Verification queries - run these to check what will be deleted BEFORE running the delete commands
-- Uncomment the section you want to verify:

-- For specific show:
-- SELECT COUNT(*) as tickets_to_delete FROM tickets WHERE show_id = 'SHOW_ID_HERE';
-- SELECT COUNT(*) as bookings_to_delete FROM bookings WHERE show_id = 'SHOW_ID_HERE';

-- For date range:
-- SELECT COUNT(*) as tickets_to_delete FROM tickets WHERE generated_at < '2024-01-01'::timestamp;
-- SELECT COUNT(*) as bookings_to_delete FROM bookings WHERE booking_time < '2024-01-01'::timestamp;

-- For specific show date:
-- SELECT COUNT(*) as tickets_to_delete FROM tickets WHERE show_id IN (SELECT id FROM shows WHERE date = '2024-10-28');
-- SELECT COUNT(*) as bookings_to_delete FROM bookings WHERE show_id IN (SELECT id FROM shows WHERE date = '2024-10-28');

-- Show all shows with their booking counts (helpful for decision making):
SELECT 
    s.title,
    s.date,
    s.time,
    COUNT(DISTINCT b.id) as total_bookings,
    COUNT(t.id) as total_tickets,
    SUM(t.price) as total_revenue
FROM shows s
LEFT JOIN bookings b ON s.id = b.show_id
LEFT JOIN tickets t ON b.id = t.booking_id
GROUP BY s.id, s.title, s.date, s.time
ORDER BY s.date DESC;
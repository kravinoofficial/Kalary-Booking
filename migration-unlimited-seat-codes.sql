-- Migration to change seat_code from VARCHAR(50) to TEXT for unlimited characters
-- Run this in your Supabase SQL editor

-- Update bookings table
ALTER TABLE bookings ALTER COLUMN seat_code TYPE TEXT;

-- Update tickets table  
ALTER TABLE tickets ALTER COLUMN seat_code TYPE TEXT;

-- Verify the changes
SELECT 
    table_name, 
    column_name, 
    data_type, 
    character_maximum_length
FROM information_schema.columns 
WHERE table_name IN ('bookings', 'tickets') 
AND column_name = 'seat_code';
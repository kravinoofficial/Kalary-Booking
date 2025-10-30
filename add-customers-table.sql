-- Add customers table to the Kalari Seat Booking System

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add customer_id to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);

-- Update the book_seats_atomic function to include customer_id
CREATE OR REPLACE FUNCTION book_seats_atomic(
    p_show_id UUID,
    p_seat_codes TEXT[],
    p_booked_by TEXT,
    p_customer_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_booking_id UUID;
    v_seat_code TEXT;
    v_ticket_code TEXT;
    v_seq INTEGER;
    v_date TEXT;
    v_show_price DECIMAL(10,2);
    v_tickets JSON[] := '{}';
    v_ticket JSON;
    v_conflicts TEXT[] := '{}';
BEGIN
    -- Lock the show to prevent concurrent bookings
    PERFORM pg_advisory_xact_lock(hashtext(p_show_id::text));
    
    -- Get show details
    SELECT price, date INTO v_show_price, v_date
    FROM shows 
    WHERE id = p_show_id AND active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Show not found or not active';
    END IF;
    
    -- Check for conflicts
    FOR v_seat_code IN SELECT unnest(p_seat_codes)
    LOOP
        IF EXISTS (
            SELECT 1 FROM bookings 
            WHERE show_id = p_show_id 
            AND seat_code = v_seat_code 
            AND status = 'CONFIRMED'
        ) THEN
            v_conflicts := array_append(v_conflicts, v_seat_code);
        END IF;
    END LOOP;
    
    -- If there are conflicts, return them
    IF array_length(v_conflicts, 1) > 0 THEN
        RETURN json_build_object(
            'success', false,
            'conflicts', v_conflicts
        );
    END IF;
    
    -- Get next sequence number for ticket codes
    SELECT COALESCE(MAX(
        CAST(
            split_part(
                split_part(ticket_code, '-', 4), 
                '-', 1
            ) AS INTEGER
        )
    ), 0) + 1
    INTO v_seq
    FROM tickets 
    WHERE ticket_code LIKE 'TKT-' || replace(v_date::text, '-', '') || '-%';
    
    -- Create ONE booking for all seats with customer_id
    INSERT INTO bookings (show_id, seat_code, booked_by, customer_id)
    VALUES (p_show_id, array_to_string(p_seat_codes, ','), p_booked_by, p_customer_id)
    RETURNING id INTO v_booking_id;
    
    -- Create tickets for each seat under the same booking
    FOR v_seat_code IN SELECT unnest(p_seat_codes)
    LOOP
        -- Generate ticket code
        v_ticket_code := 'TKT-' || replace(v_date::text, '-', '') || '-' || 
                        lpad(v_seq::text, 4, '0') || '-' || v_seat_code;
        
        -- Create ticket
        INSERT INTO tickets (
            booking_id, show_id, seat_code, ticket_code, 
            price, generated_by
        )
        VALUES (
            v_booking_id, p_show_id, v_seat_code, v_ticket_code,
            v_show_price, p_booked_by
        );
        
        -- Add to tickets array
        v_ticket := json_build_object(
            'booking_id', v_booking_id,
            'seat_code', v_seat_code,
            'ticket_code', v_ticket_code,
            'price', v_show_price
        );
        v_tickets := array_append(v_tickets, v_ticket);
        
        v_seq := v_seq + 1;
    END LOOP;
    
    -- Return success with tickets
    RETURN json_build_object(
        'success', true,
        'tickets', array_to_json(v_tickets),
        'booking_count', array_length(p_seat_codes, 1)
    );
END;
$$;

-- Insert some sample customers (optional)
INSERT INTO customers (name, email, phone, address) 
SELECT 'John Doe', 'john.doe@example.com', '+91-9876543210', '123 Main Street, City'
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE email = 'john.doe@example.com');

INSERT INTO customers (name, email, phone, address) 
SELECT 'Jane Smith', 'jane.smith@example.com', '+91-9876543211', '456 Oak Avenue, City'
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE email = 'jane.smith@example.com');

INSERT INTO customers (name, email, phone, address) 
SELECT 'Mike Johnson', 'mike.johnson@example.com', '+91-9876543212', '789 Pine Road, City'
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE email = 'mike.johnson@example.com');
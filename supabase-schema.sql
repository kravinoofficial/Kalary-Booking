-- Kalary Seat Booking System Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Layouts table
CREATE TABLE IF NOT EXISTS layouts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    structure JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shows table
CREATE TABLE IF NOT EXISTS shows (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    layout_id UUID REFERENCES layouts(id) ON DELETE SET NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seats table (generated dynamically from layout structure)
CREATE TABLE IF NOT EXISTS seats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    layout_id UUID REFERENCES layouts(id) ON DELETE CASCADE,
    section VARCHAR(50) NOT NULL,
    row VARCHAR(10) NOT NULL,
    seat_number VARCHAR(10) NOT NULL,
    position JSONB,
    price DECIMAL(10,2) NOT NULL,
    UNIQUE(layout_id, section, row, seat_number)
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    show_id UUID REFERENCES shows(id) ON DELETE CASCADE,
    seat_id UUID REFERENCES seats(id) ON DELETE CASCADE,
    seat_code TEXT NOT NULL,
    booked_by VARCHAR(255) NOT NULL,
    booking_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'CANCELLED'))
);

-- Tickets table
CREATE TABLE IF NOT EXISTS tickets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    show_id UUID REFERENCES shows(id) ON DELETE CASCADE,
    seat_id UUID REFERENCES seats(id) ON DELETE CASCADE,
    seat_code TEXT NOT NULL,
    ticket_code VARCHAR(100) UNIQUE NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    generated_by VARCHAR(255) NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED'))
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shows_date ON shows(date);
CREATE INDEX IF NOT EXISTS idx_shows_active ON shows(active);
CREATE INDEX IF NOT EXISTS idx_bookings_show_id ON bookings(show_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_tickets_show_id ON tickets(show_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_code ON tickets(ticket_code);

-- RPC function for atomic seat booking
CREATE OR REPLACE FUNCTION book_seats_atomic(
    p_show_id UUID,
    p_seat_codes TEXT[],
    p_booked_by TEXT
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
    
    -- Create ONE booking for all seats
    INSERT INTO bookings (show_id, seat_code, booked_by)
    VALUES (p_show_id, array_to_string(p_seat_codes, ','), p_booked_by)
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

-- Sample data (optional) - Insert only if not exists
INSERT INTO layouts (name, structure) 
SELECT 'Main Hall 360°', '{
    "sections": [
        {"name": "North", "rows": 5, "seatsPerRow": 10, "price": 100},
        {"name": "South", "rows": 5, "seatsPerRow": 10, "price": 100},
        {"name": "East", "rows": 3, "seatsPerRow": 8, "price": 150},
        {"name": "West", "rows": 3, "seatsPerRow": 8, "price": 150}
    ]
}'
WHERE NOT EXISTS (SELECT 1 FROM layouts WHERE name = 'Main Hall 360°');

-- Row Level Security (RLS) - Enable if needed
-- ALTER TABLE layouts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (admin only)
-- CREATE POLICY "Admin can do everything on layouts" ON layouts FOR ALL USING (auth.role() = 'authenticated');
-- CREATE POLICY "Admin can do everything on shows" ON shows FOR ALL USING (auth.role() = 'authenticated');
-- CREATE POLICY "Admin can do everything on bookings" ON bookings FOR ALL USING (auth.role() = 'authenticated');
-- CREATE POLICY "Admin can do everything on tickets" ON tickets FOR ALL USING (auth.role() = 'authenticated');
-- Sample activity logs to demonstrate the logging functionality
-- Run this after creating the activity_logs table

INSERT INTO activity_logs (action, entity_type, entity_id, entity_name, details, performed_by, performed_at) VALUES
-- Show creation logs
('CREATE', 'SHOW', uuid_generate_v4(), 'Kalari Performance - Evening Show', 
 '{"date": "2024-11-15", "time": "19:00", "price": 150, "layout": "Main Hall 360°"}', 
 'admin', NOW() - INTERVAL '2 days'),

('CREATE', 'SHOW', uuid_generate_v4(), 'Traditional Kalari Workshop', 
 '{"date": "2024-11-20", "time": "10:00", "price": 200, "layout": "Main Hall 360°"}', 
 'admin', NOW() - INTERVAL '1 day'),

-- Booking logs
('BOOKING', 'BOOKING', uuid_generate_v4(), 'Kalari Performance - Evening Show', 
 '{"seat_codes": ["NA1", "NA2"], "seat_count": 2, "total_price": 300, "show_date": "2024-11-15", "show_time": "19:00"}', 
 'admin', NOW() - INTERVAL '6 hours'),

('BOOKING', 'BOOKING', uuid_generate_v4(), 'Traditional Kalari Workshop', 
 '{"seat_codes": ["EA1", "EA2", "EA3"], "seat_count": 3, "total_price": 600, "show_date": "2024-11-20", "show_time": "10:00"}', 
 'admin', NOW() - INTERVAL '4 hours'),

('BOOKING', 'BOOKING', uuid_generate_v4(), 'Kalari Performance - Evening Show', 
 '{"seat_codes": ["SB5"], "seat_count": 1, "total_price": 150, "show_date": "2024-11-15", "show_time": "19:00"}', 
 'customer', NOW() - INTERVAL '3 hours'),

-- Ticket generation logs
('CREATE', 'TICKET', uuid_generate_v4(), 'TKT-20241115-0001-NA1', 
 '{"show_title": "Kalari Performance - Evening Show", "seat_code": "NA1", "price": 150}', 
 'admin', NOW() - INTERVAL '6 hours'),

('CREATE', 'TICKET', uuid_generate_v4(), 'TKT-20241115-0002-NA2', 
 '{"show_title": "Kalari Performance - Evening Show", "seat_code": "NA2", "price": 150}', 
 'admin', NOW() - INTERVAL '6 hours'),

-- Show updates
('UPDATE', 'SHOW', uuid_generate_v4(), 'Kalari Performance - Evening Show', 
 '{"field_updated": "status", "old_value": "ACTIVE", "new_value": "HOUSE_FULL"}', 
 'system', NOW() - INTERVAL '2 hours'),

-- Cancellation logs
('CANCELLATION', 'BOOKING', uuid_generate_v4(), 'Traditional Kalari Workshop', 
 '{"seat_codes": ["WA1"], "seat_count": 1, "refund_amount": 200, "reason": "Customer request"}', 
 'admin', NOW() - INTERVAL '1 hour'),

-- Layout management logs
('CREATE', 'LAYOUT', uuid_generate_v4(), 'Outdoor Arena Layout', 
 '{"sections": 4, "total_capacity": 200, "sections_config": [{"name": "North", "rows": 5, "seatsPerRow": 10}]}', 
 'admin', NOW() - INTERVAL '3 days'),

('UPDATE', 'LAYOUT', uuid_generate_v4(), 'Main Hall 360°', 
 '{"field_updated": "structure", "sections_modified": ["East", "West"], "capacity_change": "+20"}', 
 'admin', NOW() - INTERVAL '1 day'),

-- System logs
('UPDATE', 'SHOW', uuid_generate_v4(), 'Kalari Performance - Evening Show', 
 '{"field_updated": "status", "old_value": "HOUSE_FULL", "new_value": "SHOW_STARTED", "auto_update": true}', 
 'system', NOW() - INTERVAL '30 minutes'),

('UPDATE', 'SHOW', uuid_generate_v4(), 'Traditional Kalari Workshop', 
 '{"field_updated": "status", "old_value": "ACTIVE", "new_value": "SHOW_DONE", "auto_update": true}', 
 'system', NOW() - INTERVAL '15 minutes'),

-- Recent activity
('BOOKING', 'BOOKING', uuid_generate_v4(), 'Weekend Special Performance', 
 '{"seat_codes": ["NB1", "NB2", "NB3", "NB4"], "seat_count": 4, "total_price": 800, "show_date": "2024-11-25", "show_time": "18:00"}', 
 'admin', NOW() - INTERVAL '10 minutes'),

('CREATE', 'TICKET', uuid_generate_v4(), 'TKT-20241125-0010-NB1', 
 '{"show_title": "Weekend Special Performance", "seat_code": "NB1", "price": 200}', 
 'admin', NOW() - INTERVAL '10 minutes');
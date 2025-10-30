-- Bulk create multiple admin users
-- Useful for initial system setup

DO $$
DECLARE
    admin_users RECORD;
BEGIN
    -- Define admin users to create
    FOR admin_users IN 
        SELECT * FROM (VALUES
            ('admin@kalari.com', 'admin123', 'System Administrator'),
            ('manager@kalari.com', 'manager456', 'Operations Manager'),
            ('supervisor@kalari.com', 'super789', 'Booking Supervisor'),
            ('director@kalari.com', 'director101', 'Theater Director')
        ) AS t(email, password, full_name)
    LOOP
        -- Create each admin user
        PERFORM create_user(
            admin_users.email,
            admin_users.password,
            'admin',
            admin_users.full_name
        );
        
        RAISE NOTICE 'Created admin user: %', admin_users.email;
    END LOOP;
END $$;

-- Verify all admin users
SELECT email, role, full_name, active, created_at 
FROM users 
WHERE role = 'admin' 
ORDER BY created_at DESC;
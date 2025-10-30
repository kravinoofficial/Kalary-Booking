-- Add a new admin user directly to the database
-- Replace the values with actual admin details

SELECT create_user(
    'newadmin@kalari.com',  -- Email
    'securepassword123',    -- Password
    'admin',                -- Role (admin or staff)
    'New Admin Name'        -- Full Name (optional)
);

-- Example: Add multiple admin users
SELECT create_user('admin1@kalari.com', 'admin123', 'admin', 'Primary Administrator');
SELECT create_user('admin2@kalari.com', 'admin456', 'admin', 'Secondary Administrator');
SELECT create_user('manager@kalari.com', 'manager789', 'admin', 'System Manager');

-- Verify the users were created
SELECT id, email, role, full_name, active, created_at 
FROM users 
WHERE role = 'admin' 
ORDER BY created_at DESC;
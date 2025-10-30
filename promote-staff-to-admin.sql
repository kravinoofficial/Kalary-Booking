-- Promote existing staff users to admin role

-- Promote a specific user by email
UPDATE users 
SET role = 'admin', updated_at = NOW() 
WHERE email = 'staff@kalari.com' AND active = true;

-- Promote multiple users at once
UPDATE users 
SET role = 'admin', updated_at = NOW() 
WHERE email IN ('staff1@kalari.com', 'staff2@kalari.com') 
AND active = true;

-- Verify the promotion
SELECT email, role, full_name, updated_at 
FROM users 
WHERE role = 'admin' 
ORDER BY updated_at DESC;
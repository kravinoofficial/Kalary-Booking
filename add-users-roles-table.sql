-- Add users table for role-based authentication
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
    full_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    active BOOLEAN DEFAULT true
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);

-- Insert default admin user (password: admin123)
-- Note: In production, use proper password hashing
INSERT INTO users (email, password_hash, role, full_name) 
VALUES ('admin@kalari.com', '$2b$10$rOzJqQZJqQZJqQZJqQZJqO', 'admin', 'System Administrator')
ON CONFLICT (email) DO NOTHING;

-- Add function to create user
CREATE OR REPLACE FUNCTION create_user(
    p_email TEXT,
    p_password TEXT,
    p_role TEXT DEFAULT 'staff',
    p_full_name TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id UUID;
    v_password_hash TEXT;
BEGIN
    -- Simple password hashing (in production, use proper bcrypt)
    v_password_hash := encode(digest(p_password, 'sha256'), 'hex');
    
    -- Insert user
    INSERT INTO users (email, password_hash, role, full_name)
    VALUES (p_email, v_password_hash, p_role, p_full_name)
    RETURNING id INTO v_user_id;
    
    RETURN json_build_object(
        'success', true,
        'user_id', v_user_id,
        'email', p_email,
        'role', p_role
    );
EXCEPTION
    WHEN unique_violation THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User with this email already exists'
        );
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Add function to authenticate user
CREATE OR REPLACE FUNCTION authenticate_user(
    p_email TEXT,
    p_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_user RECORD;
    v_password_hash TEXT;
BEGIN
    -- Hash the provided password
    v_password_hash := encode(digest(p_password, 'sha256'), 'hex');
    
    -- Find user with matching email and password
    SELECT id, email, role, full_name, active
    INTO v_user
    FROM users
    WHERE email = p_email 
    AND password_hash = v_password_hash
    AND active = true;
    
    IF FOUND THEN
        RETURN json_build_object(
            'success', true,
            'user', json_build_object(
                'id', v_user.id,
                'email', v_user.email,
                'role', v_user.role,
                'full_name', v_user.full_name
            )
        );
    ELSE
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid email or password'
        );
    END IF;
END;
$$;
-- Add logs table to track all system activities
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    action VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, BOOKING, CANCELLATION, etc.
    entity_type VARCHAR(50) NOT NULL, -- SHOW, BOOKING, TICKET, LAYOUT, etc.
    entity_id UUID, -- ID of the affected entity
    entity_name VARCHAR(255), -- Name/title of the affected entity for display
    details JSONB, -- Additional details about the action
    performed_by VARCHAR(255) NOT NULL, -- Who performed the action
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET, -- Optional: track IP address
    user_agent TEXT -- Optional: track user agent
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_performed_at ON activity_logs(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_performed_by ON activity_logs(performed_by);

-- Function to log activities
CREATE OR REPLACE FUNCTION log_activity(
    p_action VARCHAR(50),
    p_entity_type VARCHAR(50),
    p_entity_id UUID DEFAULT NULL,
    p_entity_name VARCHAR(255) DEFAULT NULL,
    p_details JSONB DEFAULT NULL,
    p_performed_by VARCHAR(255) DEFAULT 'system',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO activity_logs (
        action, entity_type, entity_id, entity_name, 
        details, performed_by, ip_address, user_agent
    )
    VALUES (
        p_action, p_entity_type, p_entity_id, p_entity_name,
        p_details, p_performed_by, p_ip_address, p_user_agent
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;
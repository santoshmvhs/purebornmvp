-- Customer Management Database Schema Updates
-- Add customer management related tables to the existing database

-- Customer Segment Members Table
CREATE TABLE IF NOT EXISTS customer_segment_members (
    id SERIAL PRIMARY KEY,
    segment_id INTEGER REFERENCES customer_segments(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(segment_id, user_id)
);

-- Customer Communications Table
CREATE TABLE IF NOT EXISTS customer_communications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message_type VARCHAR(50) NOT NULL, -- 'email', 'sms', 'call', 'note'
    subject VARCHAR(255),
    content TEXT NOT NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'email', -- 'email', 'sms', 'phone', 'in_person'
    sent_by INTEGER REFERENCES users(id),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Notes Table
CREATE TABLE IF NOT EXISTS customer_notes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    note_type VARCHAR(50) DEFAULT 'general', -- 'general', 'support', 'sales', 'follow_up'
    is_private BOOLEAN DEFAULT false,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Tags Table
CREATE TABLE IF NOT EXISTS customer_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    color VARCHAR(7) DEFAULT '#3b82f6', -- Hex color code
    description TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Tag Assignments Table
CREATE TABLE IF NOT EXISTS customer_tag_assignments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES customer_tags(id) ON DELETE CASCADE,
    assigned_by INTEGER REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, tag_id)
);

-- Customer Activity Log Table
CREATE TABLE IF NOT EXISTS customer_activity_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'login', 'order', 'subscription', 'review', 'wishlist', 'profile_update'
    activity_description TEXT NOT NULL,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Preferences Table
CREATE TABLE IF NOT EXISTS customer_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    marketing_emails BOOLEAN DEFAULT true,
    order_updates BOOLEAN DEFAULT true,
    subscription_reminders BOOLEAN DEFAULT true,
    birthday_offers BOOLEAN DEFAULT true,
    newsletter BOOLEAN DEFAULT true,
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    currency VARCHAR(3) DEFAULT 'INR',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Support Tickets Table
CREATE TABLE IF NOT EXISTS customer_support_tickets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    ticket_number VARCHAR(20) UNIQUE NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    status VARCHAR(20) DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
    category VARCHAR(50) DEFAULT 'general', -- 'general', 'order', 'product', 'subscription', 'technical', 'billing'
    assigned_to INTEGER REFERENCES users(id),
    resolution TEXT,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Support Messages Table
CREATE TABLE IF NOT EXISTS customer_support_messages (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES customer_support_tickets(id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES users(id),
    sender_type VARCHAR(20) NOT NULL, -- 'customer', 'admin', 'system'
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    attachments JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Feedback Table
CREATE TABLE IF NOT EXISTS customer_feedback (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    feedback_type VARCHAR(50) NOT NULL, -- 'general', 'product', 'service', 'website', 'delivery'
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    feedback TEXT NOT NULL,
    is_public BOOLEAN DEFAULT true,
    is_anonymous BOOLEAN DEFAULT false,
    order_id INTEGER REFERENCES orders(id),
    product_id INTEGER REFERENCES products(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Loyalty Tiers Table
CREATE TABLE IF NOT EXISTS customer_loyalty_tiers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    min_points INTEGER NOT NULL,
    max_points INTEGER,
    benefits JSONB, -- Array of benefits
    color VARCHAR(7) DEFAULT '#3b82f6',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Tier Assignments Table
CREATE TABLE IF NOT EXISTS customer_tier_assignments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    tier_id INTEGER REFERENCES customer_loyalty_tiers(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, tier_id)
);

-- Update existing customer_segments table to add auto_update column
ALTER TABLE customer_segments ADD COLUMN IF NOT EXISTS auto_update BOOLEAN DEFAULT true;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_segment_members_segment_id ON customer_segment_members(segment_id);
CREATE INDEX IF NOT EXISTS idx_customer_segment_members_user_id ON customer_segment_members(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_segment_members_joined_at ON customer_segment_members(joined_at);

CREATE INDEX IF NOT EXISTS idx_customer_communications_user_id ON customer_communications(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_communications_sent_at ON customer_communications(sent_at);
CREATE INDEX IF NOT EXISTS idx_customer_communications_message_type ON customer_communications(message_type);

CREATE INDEX IF NOT EXISTS idx_customer_notes_user_id ON customer_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_created_at ON customer_notes(created_at);
CREATE INDEX IF NOT EXISTS idx_customer_notes_note_type ON customer_notes(note_type);

CREATE INDEX IF NOT EXISTS idx_customer_tag_assignments_user_id ON customer_tag_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_tag_assignments_tag_id ON customer_tag_assignments(tag_id);

CREATE INDEX IF NOT EXISTS idx_customer_activity_log_user_id ON customer_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_activity_log_activity_type ON customer_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_customer_activity_log_created_at ON customer_activity_log(created_at);

CREATE INDEX IF NOT EXISTS idx_customer_preferences_user_id ON customer_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_customer_support_tickets_user_id ON customer_support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_support_tickets_status ON customer_support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_customer_support_tickets_priority ON customer_support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_customer_support_tickets_created_at ON customer_support_tickets(created_at);

CREATE INDEX IF NOT EXISTS idx_customer_support_messages_ticket_id ON customer_support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_customer_support_messages_created_at ON customer_support_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_customer_feedback_user_id ON customer_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_feedback_type ON customer_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_rating ON customer_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_created_at ON customer_feedback(created_at);

CREATE INDEX IF NOT EXISTS idx_customer_tier_assignments_user_id ON customer_tier_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_tier_assignments_tier_id ON customer_tier_assignments(tier_id);
CREATE INDEX IF NOT EXISTS idx_customer_tier_assignments_is_active ON customer_tier_assignments(is_active);

-- Create views for customer analytics
CREATE OR REPLACE VIEW customer_overview AS
SELECT 
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    u.phone,
    u.is_active,
    u.created_at,
    u.last_login,
    cp.current_balance as loyalty_points,
    cp.points_earned as total_points_earned,
    COUNT(DISTINCT o.id) as total_orders,
    COALESCE(SUM(o.total_amount), 0) as total_spent,
    MAX(o.created_at) as last_order_date,
    COUNT(DISTINCT s.id) as total_subscriptions,
    COUNT(DISTINCT w.id) as wishlist_items,
    COUNT(DISTINCT r.id) as total_reviews,
    COUNT(DISTINCT csm.segment_id) as segment_count
FROM users u
LEFT JOIN customer_points cp ON u.id = cp.user_id
LEFT JOIN orders o ON u.id = o.user_id
LEFT JOIN subscriptions s ON u.id = s.user_id
LEFT JOIN wishlists w ON u.id = w.user_id
LEFT JOIN reviews r ON u.id = r.user_id
LEFT JOIN customer_segment_members csm ON u.id = csm.user_id
WHERE u.role = 'customer'
GROUP BY u.id, cp.current_balance, cp.points_earned;

CREATE OR REPLACE VIEW customer_value_segments AS
SELECT 
    CASE 
        WHEN total_spent >= 50000 THEN 'VIP'
        WHEN total_spent >= 25000 THEN 'Gold'
        WHEN total_spent >= 10000 THEN 'Silver'
        WHEN total_spent >= 5000 THEN 'Bronze'
        WHEN total_spent >= 1000 THEN 'Basic'
        ELSE 'New'
    END as value_tier,
    COUNT(*) as customer_count,
    AVG(total_spent) as avg_spent,
    AVG(total_orders) as avg_orders,
    AVG(loyalty_points) as avg_points
FROM customer_overview
GROUP BY value_tier
ORDER BY avg_spent DESC;

-- Insert sample customer tags
INSERT INTO customer_tags (name, color, description) VALUES
    ('VIP Customer', '#ffd700', 'High-value customers'),
    ('Frequent Buyer', '#4ade80', 'Customers who purchase regularly'),
    ('New Customer', '#3b82f6', 'Recently registered customers'),
    ('Subscriber', '#8b5cf6', 'Active subscription customers'),
    ('Reviewer', '#f59e0b', 'Customers who leave reviews'),
    ('Support Case', '#ef4444', 'Customers with support tickets')
ON CONFLICT (name) DO NOTHING;

-- Insert sample loyalty tiers
INSERT INTO customer_loyalty_tiers (name, description, min_points, max_points, benefits, color) VALUES
    ('Bronze', 'Entry level tier', 0, 999, '["Basic support", "Newsletter access"]', '#cd7f32'),
    ('Silver', 'Mid-level tier', 1000, 4999, '["Priority support", "Exclusive offers", "Free shipping"]', '#c0c0c0'),
    ('Gold', 'High-level tier', 5000, 9999, '["VIP support", "Early access", "Personal shopper", "Free shipping"]', '#ffd700'),
    ('Platinum', 'Premium tier', 10000, NULL, '["Concierge service", "Exclusive products", "Personal shopper", "Free shipping", "Birthday gifts"]', '#e5e4e2')
ON CONFLICT DO NOTHING;

-- Insert sample customer segments
INSERT INTO customer_segments (name, description, criteria, auto_update, customer_count) VALUES
    ('High Value Customers', 'Customers who have spent more than ₹25,000', '{"min_spent": 25000}', true, 0),
    ('Frequent Buyers', 'Customers with more than 10 orders', '{"min_orders": 10}', true, 0),
    ('Recent Customers', 'Customers who registered in the last 30 days', '{"registration_days": 30}', true, 0),
    ('Subscribers', 'Active subscription customers', '{"has_subscription": true}', true, 0),
    ('Reviewers', 'Customers who have left reviews', '{"has_reviews": true}', true, 0),
    ('Inactive Customers', 'Customers with no orders in the last 90 days', '{"last_order_days": 90, "has_orders": true}', true, 0)
ON CONFLICT DO NOTHING;





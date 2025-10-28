-- Marketing Database Schema Updates
-- Add marketing-related tables to the existing database

-- Email Campaigns Table
CREATE TABLE IF NOT EXISTS email_campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    campaign_type VARCHAR(50) NOT NULL DEFAULT 'promotional',
    target_audience JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    total_recipients INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SMS Campaigns Table
CREATE TABLE IF NOT EXISTS sms_campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    campaign_type VARCHAR(50) NOT NULL DEFAULT 'promotional',
    target_audience JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    total_recipients INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Promotional Codes Table
CREATE TABLE IF NOT EXISTS promotional_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage',
    discount_value DECIMAL(10,2) NOT NULL,
    min_order_amount DECIMAL(10,2),
    max_discount_amount DECIMAL(10,2),
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    applicable_products INTEGER[],
    applicable_categories INTEGER[],
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Segments Table
CREATE TABLE IF NOT EXISTS customer_segments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    criteria JSONB NOT NULL,
    customer_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loyalty Programs Table
CREATE TABLE IF NOT EXISTS loyalty_programs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    points_per_rupee DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    redemption_rate DECIMAL(5,2) NOT NULL DEFAULT 0.01,
    min_redemption_points INTEGER NOT NULL DEFAULT 100,
    max_redemption_percentage INTEGER NOT NULL DEFAULT 50,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Points Table
CREATE TABLE IF NOT EXISTS customer_points (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) UNIQUE NOT NULL,
    points_earned INTEGER DEFAULT 0,
    points_redeemed INTEGER DEFAULT 0,
    current_balance INTEGER DEFAULT 0,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Points Transactions Table
CREATE TABLE IF NOT EXISTS points_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    points INTEGER NOT NULL,
    transaction_type VARCHAR(20) NOT NULL, -- 'earned', 'redeemed', 'expired', 'adjusted'
    reason VARCHAR(255),
    order_id INTEGER REFERENCES orders(id),
    loyalty_program_id INTEGER REFERENCES loyalty_programs(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email Campaign Recipients Table
CREATE TABLE IF NOT EXISTS email_campaign_recipients (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES email_campaigns(id) NOT NULL,
    user_id INTEGER REFERENCES users(id),
    email VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced'
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    bounced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SMS Campaign Recipients Table
CREATE TABLE IF NOT EXISTS sms_campaign_recipients (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES sms_campaigns(id) NOT NULL,
    user_id INTEGER REFERENCES users(id),
    phone VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    failed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Promotional Code Usage Table
CREATE TABLE IF NOT EXISTS promotional_code_usage (
    id SERIAL PRIMARY KEY,
    code_id INTEGER REFERENCES promotional_codes(id) NOT NULL,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    order_id INTEGER REFERENCES orders(id) NOT NULL,
    discount_amount DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Marketing Analytics Views
CREATE OR REPLACE VIEW email_campaign_analytics AS
SELECT 
    ec.id,
    ec.name,
    ec.campaign_type,
    ec.status,
    ec.total_recipients,
    ec.delivered_count,
    ec.opened_count,
    ec.clicked_count,
    CASE 
        WHEN ec.total_recipients > 0 THEN ROUND((ec.delivered_count::DECIMAL / ec.total_recipients) * 100, 2)
        ELSE 0 
    END as delivery_rate,
    CASE 
        WHEN ec.delivered_count > 0 THEN ROUND((ec.opened_count::DECIMAL / ec.delivered_count) * 100, 2)
        ELSE 0 
    END as open_rate,
    CASE 
        WHEN ec.opened_count > 0 THEN ROUND((ec.clicked_count::DECIMAL / ec.opened_count) * 100, 2)
        ELSE 0 
    END as click_rate,
    ec.created_at
FROM email_campaigns ec;

CREATE OR REPLACE VIEW sms_campaign_analytics AS
SELECT 
    sc.id,
    sc.name,
    sc.campaign_type,
    sc.status,
    sc.total_recipients,
    sc.delivered_count,
    CASE 
        WHEN sc.total_recipients > 0 THEN ROUND((sc.delivered_count::DECIMAL / sc.total_recipients) * 100, 2)
        ELSE 0 
    END as delivery_rate,
    sc.created_at
FROM sms_campaigns sc;

CREATE OR REPLACE VIEW promotional_code_analytics AS
SELECT 
    pc.id,
    pc.code,
    pc.name,
    pc.discount_type,
    pc.discount_value,
    pc.used_count,
    pc.usage_limit,
    pc.is_active,
    CASE 
        WHEN pc.usage_limit IS NOT NULL THEN ROUND((pc.used_count::DECIMAL / pc.usage_limit) * 100, 2)
        ELSE 0 
    END as usage_percentage,
    COALESCE(SUM(pcu.discount_amount), 0) as total_discount_given,
    pc.created_at
FROM promotional_codes pc
LEFT JOIN promotional_code_usage pcu ON pc.id = pcu.code_id
GROUP BY pc.id, pc.code, pc.name, pc.discount_type, pc.discount_value, pc.used_count, pc.usage_limit, pc.is_active, pc.created_at;

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_type ON email_campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_at ON email_campaigns(created_at);

CREATE INDEX IF NOT EXISTS idx_sms_campaigns_status ON sms_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_type ON sms_campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_created_at ON sms_campaigns(created_at);

CREATE INDEX IF NOT EXISTS idx_promotional_codes_code ON promotional_codes(code);
CREATE INDEX IF NOT EXISTS idx_promotional_codes_active ON promotional_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_promotional_codes_valid_dates ON promotional_codes(valid_from, valid_until);

CREATE INDEX IF NOT EXISTS idx_customer_segments_active ON customer_segments(is_active);
CREATE INDEX IF NOT EXISTS idx_customer_segments_created_at ON customer_segments(created_at);

CREATE INDEX IF NOT EXISTS idx_loyalty_programs_active ON loyalty_programs(is_active);

CREATE INDEX IF NOT EXISTS idx_customer_points_user_id ON customer_points(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_points_balance ON customer_points(current_balance);

CREATE INDEX IF NOT EXISTS idx_points_transactions_user_id ON points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_type ON points_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_points_transactions_created_at ON points_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_email_campaign_recipients_campaign_id ON email_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_campaign_recipients_user_id ON email_campaign_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_email_campaign_recipients_status ON email_campaign_recipients(status);

CREATE INDEX IF NOT EXISTS idx_sms_campaign_recipients_campaign_id ON sms_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sms_campaign_recipients_user_id ON sms_campaign_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_campaign_recipients_status ON sms_campaign_recipients(status);

CREATE INDEX IF NOT EXISTS idx_promotional_code_usage_code_id ON promotional_code_usage(code_id);
CREATE INDEX IF NOT EXISTS idx_promotional_code_usage_user_id ON promotional_code_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_promotional_code_usage_order_id ON promotional_code_usage(order_id);
CREATE INDEX IF NOT EXISTS idx_promotional_code_usage_used_at ON promotional_code_usage(used_at);

-- Insert default loyalty program
INSERT INTO loyalty_programs (name, description, points_per_rupee, redemption_rate, min_redemption_points, max_redemption_percentage)
VALUES ('Pureborn Rewards', 'Earn points on every purchase and redeem for discounts', 1.00, 0.01, 100, 50)
ON CONFLICT DO NOTHING;

-- Insert sample promotional codes
INSERT INTO promotional_codes (code, name, description, discount_type, discount_value, min_order_amount, usage_limit, valid_from, valid_until, is_active)
VALUES 
    ('WELCOME10', 'Welcome Discount', '10% off for new customers', 'percentage', 10.00, 500.00, 1000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 year', true),
    ('SAVE50', 'Flat Discount', '₹50 off on orders above ₹1000', 'fixed', 50.00, 1000.00, 500, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '6 months', true),
    ('FREESHIP', 'Free Shipping', 'Free shipping on all orders', 'free_shipping', 0.00, 0.00, 2000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '3 months', true)
ON CONFLICT (code) DO NOTHING;

-- Insert sample customer segments
INSERT INTO customer_segments (name, description, criteria, customer_count, is_active)
VALUES 
    ('High Value Customers', 'Customers who have spent more than ₹10,000', '{"min_spent": 10000}', 0, true),
    ('Frequent Buyers', 'Customers with more than 5 orders', '{"min_orders": 5}', 0, true),
    ('Recent Customers', 'Customers who registered in the last 30 days', '{"registration_days": 30}', 0, true),
    ('Subscribers', 'Active subscription customers', '{"segment_type": "subscribers"}', 0, true)
ON CONFLICT DO NOTHING;






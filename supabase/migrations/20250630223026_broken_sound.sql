-- Initialize the analytics database schema

-- Create database if not exists (this might not work in all PostgreSQL setups)
-- CREATE DATABASE IF NOT EXISTS analytics_db;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Users table for authentication and user management
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit records table (enhanced version)
CREATE TABLE IF NOT EXISTS audit_records (
    id SERIAL PRIMARY KEY,
    event_id UUID DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    action TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    transaction_hash VARCHAR(66),
    block_number BIGINT,
    ipfs_hash VARCHAR(100),
    verified BOOLEAN DEFAULT false,
    gas_used INTEGER,
    metadata JSONB,
    risk_score DECIMAL(3,2),
    is_anomaly BOOLEAN DEFAULT false,
    anomaly_score DECIMAL(3,2),
    geolocation JSONB,
    source_ip INET,
    session_id VARCHAR(255),
    user_agent TEXT
);

-- Event aggregations table for analytics
CREATE TABLE IF NOT EXISTS event_aggregations (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    time_bucket TIMESTAMP WITH TIME ZONE NOT NULL,
    count INTEGER NOT NULL,
    avg_risk_score DECIMAL(5,4),
    anomaly_count INTEGER DEFAULT 0,
    unique_users INTEGER,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- System metrics table
CREATE TABLE IF NOT EXISTS system_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,4) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tags JSONB,
    source VARCHAR(100)
);

-- Alert rules table
CREATE TABLE IF NOT EXISTS alert_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    condition JSONB NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium',
    is_active BOOLEAN DEFAULT true,
    notification_channels JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    rule_id INTEGER REFERENCES alert_rules(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'open',
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB
);

-- Blockchain synchronization state
CREATE TABLE IF NOT EXISTS blockchain_sync_state (
    id SERIAL PRIMARY KEY,
    network VARCHAR(100) NOT NULL,
    last_synced_block BIGINT NOT NULL,
    contract_address VARCHAR(42),
    sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_healthy BOOLEAN DEFAULT true
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_records_timestamp ON audit_records(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_records_event_type ON audit_records(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_records_user_id ON audit_records(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_records_transaction_hash ON audit_records(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_audit_records_verified ON audit_records(verified);
CREATE INDEX IF NOT EXISTS idx_audit_records_is_anomaly ON audit_records(is_anomaly);

-- GIN index for JSONB metadata
CREATE INDEX IF NOT EXISTS idx_audit_records_metadata ON audit_records USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_audit_records_geolocation ON audit_records USING GIN(geolocation);

-- Indexes for event aggregations
CREATE INDEX IF NOT EXISTS idx_event_aggregations_type_time ON event_aggregations(event_type, time_bucket DESC);

-- Indexes for system metrics
CREATE INDEX IF NOT EXISTS idx_system_metrics_name_time ON system_metrics(metric_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_metrics_tags ON system_metrics USING GIN(tags);

-- Indexes for alerts
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_triggered_at ON alerts(triggered_at DESC);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_audit_records_action_fulltext ON audit_records USING GIN(to_tsvector('english', action));

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_rules_updated_at BEFORE UPDATE ON alert_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create time-buckets for aggregations
CREATE OR REPLACE FUNCTION time_bucket_1min(ts TIMESTAMP WITH TIME ZONE)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
    RETURN date_trunc('minute', ts);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION time_bucket_1hour(ts TIMESTAMP WITH TIME ZONE)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
    RETURN date_trunc('hour', ts);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Insert some sample data for testing
INSERT INTO users (username, email, password_hash, is_admin) VALUES
('admin', 'admin@analytics.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj65x7eeZjHG', true),
('analyst', 'analyst@analytics.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj65x7eeZjHG', false)
ON CONFLICT (email) DO NOTHING;

-- Insert sample alert rules
INSERT INTO alert_rules (name, description, condition, severity) VALUES
('High Risk Score Events', 'Alert when events have high risk scores', '{"risk_score": {"gt": 0.8}}', 'high'),
('Anomaly Detection', 'Alert when anomalies are detected', '{"is_anomaly": true}', 'medium'),
('Failed Authentication Attempts', 'Alert on multiple failed login attempts', '{"event_type": "USER_AUTHENTICATION", "metadata.status": "failed"}', 'high')
ON CONFLICT DO NOTHING;

-- Insert initial blockchain sync state
INSERT INTO blockchain_sync_state (network, last_synced_block, contract_address) VALUES
('localhost', 0, NULL)
ON CONFLICT DO NOTHING;

-- Create materialized view for dashboard metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_metrics AS
SELECT 
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '1 hour') as events_last_hour,
    COUNT(*) FILTER (WHERE is_anomaly = true) as total_anomalies,
    COUNT(*) FILTER (WHERE is_anomaly = true AND timestamp > CURRENT_TIMESTAMP - INTERVAL '1 hour') as anomalies_last_hour,
    AVG(risk_score) as avg_risk_score,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) FILTER (WHERE verified = true) as verified_events,
    COUNT(*) FILTER (WHERE transaction_hash IS NOT NULL) as blockchain_events
FROM audit_records;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS dashboard_metrics_idx ON dashboard_metrics ((1));

-- Function to refresh dashboard metrics
CREATE OR REPLACE FUNCTION refresh_dashboard_metrics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_metrics;
END;
$$ LANGUAGE plpgsql;

-- Create a function to clean up old audit records (optional, for data retention)
CREATE OR REPLACE FUNCTION cleanup_old_audit_records(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_records 
    WHERE timestamp < CURRENT_TIMESTAMP - (retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO analytics_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO analytics_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO analytics_user;

-- Create partitioning for audit_records by timestamp (optional, for large datasets)
-- This is commented out but can be enabled for high-volume environments
/*
CREATE TABLE audit_records_y2024m01 PARTITION OF audit_records
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE audit_records_y2024m02 PARTITION OF audit_records
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
*/

COMMIT;
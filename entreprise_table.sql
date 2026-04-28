-- SQL for enterprise_settings table
CREATE TABLE enterprise_settings (
    id SERIAL PRIMARY KEY,
    created_by_id UUID NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    address VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (created_by_id)
);

-- Optional trigger to keep updated_at current on update
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enterprise_settings_updated_at
BEFORE UPDATE ON enterprise_settings
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Index for quick lookup
CREATE INDEX idx_enterprise_settings_created_by_id ON enterprise_settings(created_by_id);
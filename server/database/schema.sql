-- Agreement Signing System - PostgreSQL Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agreements table
CREATE TABLE IF NOT EXISTS agreements (
    id UUID PRIMARY KEY,
    type VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    created_by UUID,
    created_by_name VARCHAR(255),
    company_name VARCHAR(255),
    company_id VARCHAR(50),
    contact_name VARCHAR(255),
    contact_id VARCHAR(50),
    monthly_amount DECIMAL(12,2),
    payment_day INTEGER,
    effective_date DATE,
    duration INTEGER,
    agreement_date DATE,
    selected_services JSONB DEFAULT '{}',
    notes TEXT,
    company_template JSONB,
    client_signature TEXT,
    company_stamp VARCHAR(50),
    sent_at TIMESTAMP,
    sent_via VARCHAR(20),
    sent_to VARCHAR(255),
    signed_at TIMESTAMP,
    pdf_url TEXT,
    drive_backup JSONB,
    printed BOOLEAN DEFAULT FALSE,
    printed_at TIMESTAMP DEFAULT NULL,
    printed_by UUID DEFAULT NULL,
    printed_by_name VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL
);

-- Add deleted_at column if it doesn't exist (for existing databases)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'agreements' AND column_name = 'deleted_at') THEN
        ALTER TABLE agreements ADD COLUMN deleted_at TIMESTAMP DEFAULT NULL;
    END IF;
END $$;

-- Add print tracking columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'agreements' AND column_name = 'printed') THEN
        ALTER TABLE agreements ADD COLUMN printed BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'agreements' AND column_name = 'printed_at') THEN
        ALTER TABLE agreements ADD COLUMN printed_at TIMESTAMP DEFAULT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'agreements' AND column_name = 'printed_by') THEN
        ALTER TABLE agreements ADD COLUMN printed_by UUID DEFAULT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'agreements' AND column_name = 'printed_by_name') THEN
        ALTER TABLE agreements ADD COLUMN printed_by_name VARCHAR(255) DEFAULT NULL;
    END IF;
END $$;

-- Logs table
CREATE TABLE IF NOT EXISTS logs (
    id UUID PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    type VARCHAR(20),
    user_id UUID,
    action VARCHAR(255),
    details JSONB DEFAULT '{}',
    platform TEXT,
    ip VARCHAR(50)
);

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
    type VARCHAR(20) PRIMARY KEY,
    company_name VARCHAR(255),
    parent_company VARCHAR(255),
    company_id VARCHAR(50),
    address TEXT,
    phone VARCHAR(20),
    fax VARCHAR(20)
);

-- Insert default templates
INSERT INTO templates (type, company_name, parent_company, company_id, address, phone, fax)
VALUES
    ('bmatek', 'Reshet Times', 'במטק בע"מ', '514074442', 'דרך חיפה 19, קריית אתא', '04-8427272', '04-8409410'),
    ('bagda', 'RESHET TIMES – AIweon', 'בגדא בע"מ', '515100352', 'דרך חיפה 19, קריית אתא', '04-8427272', '04-8409410')
ON CONFLICT (type) DO NOTHING;

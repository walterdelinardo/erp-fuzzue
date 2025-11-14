-- db/migrations/create_customers.sql

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,

    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255),
    phone       VARCHAR(50),
    tax_id      VARCHAR(50), -- CPF/CNPJ/ID fiscal
    notes       TEXT,

    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP,
    active      BOOLEAN  NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_tax_id ON customers (tax_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers (name);

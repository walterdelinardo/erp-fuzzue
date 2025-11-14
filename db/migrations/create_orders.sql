-- db/migrations/create_orders.sql

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,

    customer_id     INTEGER      NOT NULL,
    order_date      TIMESTAMP    NOT NULL DEFAULT NOW(),
    delivery_date   DATE,
    status          VARCHAR(20)  NOT NULL DEFAULT 'open',

    subtotal_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_amount    NUMERIC(10,2) NOT NULL DEFAULT 0,

    notes           TEXT,

    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP,
    active          BOOLEAN      NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_orders_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers (id)
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders (order_date);

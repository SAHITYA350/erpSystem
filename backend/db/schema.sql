-- ============================================================
-- schema.sql — Database blueprint for erp_case_study
-- Run once in pgAdmin Query Tool or via node to create all tables
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id               SERIAL PRIMARY KEY,
    name             VARCHAR(100) NOT NULL,
    email            VARCHAR(150) UNIQUE NOT NULL,
    password_hash    TEXT NOT NULL,
    role             VARCHAR(20) NOT NULL DEFAULT 'SALES_USER'
                         CHECK (role IN ('ADMIN', 'SALES_USER')),
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
    id               SERIAL PRIMARY KEY,
    company_name     VARCHAR(150) NOT NULL,
    contact_person   VARCHAR(100) NOT NULL,
    mobile           VARCHAR(20) NOT NULL,
    email            VARCHAR(150),
    city             VARCHAR(100),
    created_by       INTEGER REFERENCES users(id),
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id               SERIAL PRIMARY KEY,
    product_code     VARCHAR(50) UNIQUE NOT NULL,
    product_name     VARCHAR(150) NOT NULL,
    category         VARCHAR(100) NOT NULL,
    unit             VARCHAR(30) NOT NULL,
    base_price       NUMERIC(12,2) NOT NULL CHECK (base_price >= 0),
    reorder_level    INTEGER DEFAULT 10,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- One inventory row per product — tracks physical and reserved stock
CREATE TABLE IF NOT EXISTS inventory (
    id                 SERIAL PRIMARY KEY,
    product_id         INTEGER UNIQUE NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    physical_quantity  INTEGER NOT NULL CHECK (physical_quantity >= 0),
    reserved_quantity  INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0)
);

CREATE TABLE IF NOT EXISTS enquiries (
    id               SERIAL PRIMARY KEY,
    enquiry_number   VARCHAR(50) UNIQUE NOT NULL,
    customer_id      INTEGER NOT NULL REFERENCES customers(id),
    enquiry_date     DATE DEFAULT CURRENT_DATE,
    required_date    DATE,
    notes            TEXT,
    status           VARCHAR(30) DEFAULT 'NEW'
                         CHECK (status IN ('NEW', 'QUOTED', 'WON', 'LOST')),
    created_by       INTEGER REFERENCES users(id),
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS enquiry_items (
    id           SERIAL PRIMARY KEY,
    enquiry_id   INTEGER NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
    product_id   INTEGER NOT NULL REFERENCES products(id),
    quantity     INTEGER NOT NULL CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS quotations (
    id                 SERIAL PRIMARY KEY,
    quotation_number   VARCHAR(50) UNIQUE NOT NULL,
    enquiry_id         INTEGER REFERENCES enquiries(id),
    customer_id        INTEGER NOT NULL REFERENCES customers(id),
    valid_until        DATE,
    status             VARCHAR(30) DEFAULT 'DRAFT'
                           CHECK (status IN ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED')),
    total_amount       NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quotation_items (
    id                 SERIAL PRIMARY KEY,
    quotation_id       INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    product_id         INTEGER NOT NULL REFERENCES products(id),
    quantity           INTEGER NOT NULL CHECK (quantity > 0),
    unit_price         NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    discount_percent   NUMERIC(5,2) DEFAULT 0.00
                           CHECK (discount_percent >= 0 AND discount_percent <= 100),
    gst_percent        NUMERIC(5,2) DEFAULT 18.00,
    line_amount        NUMERIC(12,2) NOT NULL
);

-- quotation_id UNIQUE: one accepted quotation creates exactly one sales order
CREATE TABLE IF NOT EXISTS sales_orders (
    id               SERIAL PRIMARY KEY,
    order_number     VARCHAR(50) UNIQUE NOT NULL,
    quotation_id     INTEGER UNIQUE REFERENCES quotations(id),
    customer_id      INTEGER NOT NULL REFERENCES customers(id),
    order_date       DATE DEFAULT CURRENT_DATE,
    total_amount     NUMERIC(12,2) NOT NULL,
    status           VARCHAR(30) DEFAULT 'PENDING'
                         CHECK (status IN ('PENDING', 'CONFIRMED', 'DISPATCHED', 'CANCELLED')),
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales_order_items (
    id               SERIAL PRIMARY KEY,
    sales_order_id   INTEGER NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    product_id       INTEGER NOT NULL REFERENCES products(id),
    quantity         INTEGER NOT NULL CHECK (quantity > 0),
    unit_price       NUMERIC(12,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS dispatches (
    id               SERIAL PRIMARY KEY,
    dispatch_number  VARCHAR(50) UNIQUE NOT NULL,
    sales_order_id   INTEGER NOT NULL REFERENCES sales_orders(id),
    dispatch_date    DATE DEFAULT CURRENT_DATE,
    vehicle_number   VARCHAR(50),
    driver_name      VARCHAR(100),
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dispatch_items (
    id           SERIAL PRIMARY KEY,
    dispatch_id  INTEGER NOT NULL REFERENCES dispatches(id) ON DELETE CASCADE,
    product_id   INTEGER NOT NULL REFERENCES products(id),
    quantity     INTEGER NOT NULL CHECK (quantity > 0)
);

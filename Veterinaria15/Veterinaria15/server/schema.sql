-- This script defines the database schema for VetSys Pro

-- Drop existing tables if they exist
DROP TABLE IF EXISTS internal_consumptions CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS expense_categories CASCADE;
DROP TABLE IF EXISTS cashier_shifts CASCADE;
DROP TABLE IF EXISTS points_of_sale CASCADE;
DROP TABLE IF EXISTS hospitalizations CASCADE;
DROP TABLE IF EXISTS medical_records CASCADE;
DROP TABLE IF EXISTS prescriptions CASCADE;
DROP TABLE IF EXISTS reminders CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS pets CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS vets CASCADE;

-- Enables UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table of veterinary users
CREATE TABLE IF NOT EXISTS vets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    specialty TEXT,
    is_super_admin BOOLEAN DEFAULT FALSE,
    company_roles JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roles that can be assigned to vets within a company
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Companies using the system
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    tax_rate NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients of a company
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    identification_number TEXT,
    billing_address TEXT,
    member_since TIMESTAMPTZ,
    pets JSONB DEFAULT '[]'::jsonb,
    balance NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pets that belong to clients
CREATE TABLE IF NOT EXISTS pets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    species TEXT,
    breed TEXT,
    sex TEXT,
    age INTEGER,
    weight_history JSONB DEFAULT '[]'::jsonb,
    medical_records JSONB DEFAULT '[]'::jsonb,
    prescriptions JSONB DEFAULT '[]'::jsonb,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduled appointments
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    pet_id UUID REFERENCES pets(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    reason TEXT,
    notes TEXT,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products sold by a company
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    purchase_price NUMERIC(10,2),
    sale_price NUMERIC(10,2),
    uses_lot_tracking BOOLEAN DEFAULT FALSE,
    lots JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suppliers of products
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_info TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product purchase history
CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    product_name TEXT,
    supplier_name TEXT,
    lot_number TEXT,
    quantity NUMERIC(10,2),
    purchase_price NUMERIC(10,2),
    expiration_date DATE,
    date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    invoice_number TEXT,
    client_id UUID REFERENCES clients(id),
    pet_id UUID REFERENCES pets(id),
    date TIMESTAMPTZ,
    items JSONB DEFAULT '[]'::jsonb,
    status TEXT,
    subtotal NUMERIC(10,2) DEFAULT 0,
    total_discount NUMERIC(10,2) DEFAULT 0,
    tax NUMERIC(10,2) DEFAULT 0,
    total NUMERIC(10,2) DEFAULT 0,
    amount_paid NUMERIC(10,2) DEFAULT 0,
    balance_due NUMERIC(10,2) DEFAULT 0,
    tax_rate NUMERIC(10,2) DEFAULT 0,
    payment_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reminders for follow-up actions
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    pet_id UUID REFERENCES pets(id),
    client_id UUID REFERENCES clients(id),
    pet_name TEXT,
    client_name TEXT,
    due_date DATE,
    message TEXT,
    category TEXT,
    related_record_id UUID,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prescriptions issued for pets
CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    pet_id UUID REFERENCES pets(id),
    date TIMESTAMPTZ,
    medication TEXT,
    dosage TEXT,
    instructions TEXT,
    vet_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Detailed medical records
CREATE TABLE IF NOT EXISTS medical_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    pet_id UUID REFERENCES pets(id),
    date DATE,
    category TEXT,
    reason TEXT,
    diagnosis TEXT,
    treatment TEXT,
    notes TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    invoice_items JSONB DEFAULT '[]'::jsonb,
    invoice_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hospitalization tracking
CREATE TABLE IF NOT EXISTS hospitalizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    pet_id UUID REFERENCES pets(id),
    client_id UUID REFERENCES clients(id),
    reason TEXT,
    admission_date TIMESTAMPTZ,
    discharge_date TIMESTAMPTZ,
    status TEXT,
    treatment_plan TEXT,
    vital_signs_log JSONB DEFAULT '[]'::jsonb,
    medication_log JSONB DEFAULT '[]'::jsonb,
    progress_notes JSONB DEFAULT '[]'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
    invoice_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Points of sale
CREATE TABLE IF NOT EXISTS points_of_sale (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cashier shifts for handling daily sales
CREATE TABLE IF NOT EXISTS cashier_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    point_of_sale_id UUID REFERENCES points_of_sale(id),
    point_of_sale_name TEXT,
    opened_by UUID,
    opening_balance NUMERIC(10,2),
    closing_balance NUMERIC(10,2),
    opening_time TIMESTAMPTZ,
    closing_time TIMESTAMPTZ,
    status TEXT,
    payments JSONB DEFAULT '[]'::jsonb,
    expenses JSONB DEFAULT '[]'::jsonb,
    calculated_cash_total NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories of expenses
CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses made by a company
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    expense_category_id UUID REFERENCES expense_categories(id),
    expense_category_name TEXT,
    amount NUMERIC(10,2),
    description TEXT,
    date TIMESTAMPTZ,
    cashier_shift_id UUID REFERENCES cashier_shifts(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Internal consumption of products
CREATE TABLE IF NOT EXISTS internal_consumptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name TEXT,
    quantity NUMERIC(10,2),
    lot_id UUID,
    lot_number TEXT,
    reason TEXT,
    date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

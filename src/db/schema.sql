-- ==========================================
-- SCRIPT DE BASE DE DATOS: BARBERÍA PRO
-- OPTIMIZADO PARA POSTGRESQL / SUPABASE DB
-- MULTI-TENANCY CON FILTRADO RLS
-- ==========================================

-- Habilitar extensiones de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA: TENANTS (Organizaciones)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    subdomain VARCHAR(50) UNIQUE NOT NULL,
    logo_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. TABLA: BRANCHES (Sucursales)
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    opening_hours JSONB NOT NULL, -- Horarios detallados por día
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Crear índice para mejorar consultas de Tenant -> Branches
CREATE INDEX idx_branches_tenant ON branches(tenant_id);

-- 3. TABLA: USERS (Usuarios con credenciales)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(150) UNIQUE NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin', 'recep', 'barber', 'client')) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    avatar_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. TABLA: EMPLOYEES (Empleados y Barberos)
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(150) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin', 'recep', 'barber')) NOT NULL,
    specialties TEXT[] NOT NULL, -- Especialidades (categorías)
    commission_rate DECIMAL(5,2) DEFAULT 0.00 CHECK (commission_rate >= 0.00 AND commission_rate <= 100.00) NOT NULL,
    schedule JSONB NOT NULL, -- Horarios personales, almuerzo, descansos
    vacations JSONB DEFAULT '[]'::jsonb NOT NULL,
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_employees_branch ON employees(branch_id);

-- 5. TABLA: SERVICES (Catálogo de Servicios)
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) CHECK (price >= 0.00) NOT NULL,
    duration INT CHECK (duration > 0) NOT NULL, -- En minutos
    cleanup_time INT DEFAULT 0 CHECK (cleanup_time >= 0) NOT NULL, -- En minutos
    category VARCHAR(50) NOT NULL,
    color VARCHAR(10) NOT NULL, -- Hex o color-code para agenda
    image_url VARCHAR(255),
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_services_tenant ON services(tenant_id);

-- 6. TABLA: CLIENTS (Clientes unificados)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(150) NOT NULL,
    is_registered BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    -- Previene duplicados del mismo cliente en un mismo tenant por correo o teléfono
    CONSTRAINT uq_client_email_tenant UNIQUE (tenant_id, email),
    CONSTRAINT uq_client_phone_tenant UNIQUE (tenant_id, phone)
);

CREATE INDEX idx_clients_tenant ON clients(tenant_id);

-- 7. TABLA: APPOINTMENTS (Agenda y Reservas)
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE RESTRICT NOT NULL,
    employee_id UUID REFERENCES employees(id) ON DELETE RESTRICT NOT NULL,
    service_id UUID REFERENCES services(id) ON DELETE RESTRICT NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(20) CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no-show')) DEFAULT 'pending' NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    notes TEXT,
    is_walk_in BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    -- Validaciones: hora fin posterior a inicio
    CONSTRAINT chk_appointment_time CHECK (end_time > start_time)
);

CREATE INDEX idx_appointments_branch_date ON appointments(branch_id, date);
CREATE INDEX idx_appointments_employee_date ON appointments(employee_id, date);

-- 8. TABLA: QUEUE_ITEMS (Clientes Walk-In en lista de espera)
CREATE TABLE queue_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(150),
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL, -- Asignado o primer disponible
    service_id UUID REFERENCES services(id) ON DELETE RESTRICT NOT NULL,
    status VARCHAR(20) CHECK (status IN ('waiting', 'serving', 'completed', 'cancelled')) DEFAULT 'waiting' NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    served_at TIMESTAMP WITH TIME ZONE,
    estimated_wait_time INT DEFAULT 0 NOT NULL, -- En minutos
    priority VARCHAR(10) CHECK (priority IN ('normal', 'high')) DEFAULT 'normal' NOT NULL
);

CREATE INDEX idx_queue_branch ON queue_items(branch_id, status);

-- 9. TABLA: PROVIDERS (Proveedores)
CREATE TABLE providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(150) NOT NULL,
    contact_name VARCHAR(150),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(150) NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 10. TABLA: PRODUCTS (Inventario de Productos)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(150) NOT NULL,
    sku VARCHAR(50) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) CHECK (price >= 0.00) NOT NULL, -- Venta
    cost DECIMAL(10,2) CHECK (cost >= 0.00) NOT NULL, -- Costo de compra
    stock INT DEFAULT 0 CHECK (stock >= 0) NOT NULL,
    min_stock INT DEFAULT 0 CHECK (min_stock >= 0) NOT NULL,
    category VARCHAR(50) NOT NULL,
    provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_product_sku_branch UNIQUE (branch_id, sku)
);

CREATE INDEX idx_products_branch ON products(branch_id);

-- 11. TABLA: INVENTORY_TRANSACTIONS (Movimientos de Inventario)
CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(20) CHECK (type IN ('in', 'out', 'adjustment', 'sale', 'purchase')) NOT NULL,
    quantity INT NOT NULL, -- positivo para entradas, negativo para salidas
    reason VARCHAR(255) NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    employee_id UUID REFERENCES employees(id) ON DELETE RESTRICT NOT NULL
);

-- 12. TABLA: PURCHASES (Compras de Abastecimiento)
CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    provider_id UUID REFERENCES providers(id) ON DELETE RESTRICT NOT NULL,
    invoice_number VARCHAR(100),
    status VARCHAR(20) CHECK (status IN ('pending', 'completed', 'cancelled')) DEFAULT 'pending' NOT NULL,
    total DECIMAL(10,2) DEFAULT 0.00 CHECK (total >= 0.00) NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 13. TABLA: PURCHASE_ITEMS (Líneas de Compra)
CREATE TABLE purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT NOT NULL,
    quantity INT CHECK (quantity > 0) NOT NULL,
    cost DECIMAL(10,2) CHECK (cost >= 0.00) NOT NULL
);

-- 14. TABLA: CASH_SESSIONS (Apertura y Cierre de Caja)
CREATE TABLE cash_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    employee_id UUID REFERENCES employees(id) ON DELETE RESTRICT NOT NULL,
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE,
    opening_balance DECIMAL(10,2) CHECK (opening_balance >= 0.00) NOT NULL,
    closing_balance DECIMAL(10,2) CHECK (closing_balance >= 0.00),
    expected_balance DECIMAL(10,2) CHECK (expected_balance >= 0.00),
    status VARCHAR(20) CHECK (status IN ('open', 'closed')) DEFAULT 'open' NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 15. TABLA: CASH_MOVEMENTS (Movimientos de Efectivo)
CREATE TABLE cash_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES cash_sessions(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(10) CHECK (type IN ('income', 'expense')) NOT NULL,
    amount DECIMAL(10,2) CHECK (amount > 0.00) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 16. TABLA: SALES (Ventas rápidas / POS)
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    cashier_id UUID REFERENCES employees(id) ON DELETE RESTRICT NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    tax DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    tip DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'card', 'transfer', 'mixed')) NOT NULL,
    payment_details JSONB,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 17. TABLA: SALE_ITEMS (Detalles de Venta y comisiones)
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(10) CHECK (type IN ('service', 'product')) NOT NULL,
    item_id UUID NOT NULL, -- ID de servicio o producto (según tipo)
    quantity INT CHECK (quantity > 0) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL, -- Barbero que lo realizó (comisión)
    commission_amount DECIMAL(10,2) DEFAULT 0.00 NOT NULL
);

-- ==========================================
-- TRIGGERS Y FUNCIONES DE AUTOMATIZACIÓN
-- ==========================================

-- Función para actualizar el stock cuando se vende un producto
CREATE OR REPLACE FUNCTION function_adjust_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type = 'product' THEN
        UPDATE products
        SET stock = stock - NEW.quantity
        WHERE id = NEW.item_id;
        
        -- Insertar registro automático de transacción de inventario
        INSERT INTO inventory_transactions (branch_id, product_id, type, quantity, reason, employee_id)
        SELECT s.branch_id, NEW.item_id, 'sale', -NEW.quantity, 'Venta rápida POS #' || NEW.sale_id, s.cashier_id
        FROM sales s WHERE s.id = NEW.sale_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sale_adjust_stock
AFTER INSERT ON sale_items
FOR EACH ROW
EXECUTE FUNCTION function_adjust_stock_on_sale();

-- ==========================================
-- SEGURIDAD: ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Habilitar RLS en tablas principales
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Ejemplo de política de seguridad para el aislamiento multi-tenant:
-- "Los empleados de una sucursal solo pueden ver los datos de esa sucursal"
CREATE POLICY branch_isolation_policy ON appointments
    FOR ALL
    USING (branch_id = (SELECT branch_id FROM employees WHERE user_id = auth.uid()));

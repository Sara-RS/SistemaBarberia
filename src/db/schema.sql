-- ==========================================
-- SCRIPT DE BASE DE DATOS: BARBERÍA PRO
-- OPTIMIZADO PARA POSTGRESQL / SUPABASE DB
-- MULTI-TENANCY EN ESPAÑOL CON FILTRADO RLS
-- ==========================================

-- Habilitar extensiones de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA: EMPRESAS (Organizaciones / Tenants)
CREATE TABLE empresas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(150) NOT NULL,
    subdominio VARCHAR(50) UNIQUE NOT NULL,
    url_logo VARCHAR(255),
    eslogan TEXT,
    nit_ruc VARCHAR(50),
    direccion TEXT,
    telefono VARCHAR(20),
    correo VARCHAR(150),
    mensaje_pie_recibo TEXT,
    simbolo_moneda VARCHAR(10) DEFAULT 'Bs.',
    porcentaje_comision_defecto DECIMAL(5,2) DEFAULT 35.00,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. TABLA: SUCURSALES
CREATE TABLE sucursales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    direccion TEXT NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    horario_atencion JSONB NOT NULL, -- Horarios detallados por día
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Crear índice para consultas Empresa -> Sucursales
CREATE INDEX idx_sucursales_empresa ON sucursales(empresa_id);

-- 3. TABLA: USUARIOS (Usuarios con credenciales de acceso)
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    correo VARCHAR(150) UNIQUE NOT NULL,
    rol VARCHAR(20) CHECK (rol IN ('admin', 'recep', 'barber', 'client')) NOT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    telefono VARCHAR(20),
    url_avatar VARCHAR(255),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. TABLA: EMPLEADOS (Empleados y Barberos)
CREATE TABLE empleados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sucursal_id UUID REFERENCES sucursales(id) ON DELETE CASCADE NOT NULL,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    correo VARCHAR(150) NOT NULL,
    rol VARCHAR(20) CHECK (rol IN ('admin', 'recep', 'barber')) NOT NULL,
    especialidades TEXT[] NOT NULL, -- Especialidades (categorías)
    porcentaje_comision DECIMAL(5,2) DEFAULT 35.00 CHECK (porcentaje_comision >= 0.00 AND porcentaje_comision <= 100.00) NOT NULL,
    horario_trabajo JSONB NOT NULL, -- Horarios personales, turnos, descansos
    vacaciones JSONB DEFAULT '[]'::jsonb NOT NULL,
    activo BOOLEAN DEFAULT TRUE NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_empleados_sucursal ON empleados(sucursal_id);

-- 5. TABLA: SERVICIOS (Catálogo de Servicios de la Empresa)
CREATE TABLE servicios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) CHECK (precio >= 0.00) NOT NULL,
    duracion INT CHECK (duracion > 0) NOT NULL, -- En minutos
    tiempo_limpieza INT DEFAULT 0 CHECK (tiempo_limpieza >= 0) NOT NULL, -- En minutos
    categoria VARCHAR(50) NOT NULL,
    color VARCHAR(10) NOT NULL, -- Hex o color-code para la agenda
    url_imagen VARCHAR(255),
    activo BOOLEAN DEFAULT TRUE NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_servicios_empresa ON servicios(empresa_id);

-- 6. TABLA: CLIENTES (Base de datos de Clientes)
CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    correo VARCHAR(150) NOT NULL,
    esta_registrado BOOLEAN DEFAULT FALSE NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_cliente_correo_empresa UNIQUE (empresa_id, correo),
    CONSTRAINT uq_cliente_telefono_empresa UNIQUE (empresa_id, telefono)
);

CREATE INDEX idx_clientes_empresa ON clientes(empresa_id);

-- 7. TABLA: CITAS (Agenda y Reservas)
CREATE TABLE citas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sucursal_id UUID REFERENCES sucursales(id) ON DELETE CASCADE NOT NULL,
    cliente_id UUID REFERENCES clientes(id) ON DELETE RESTRICT NOT NULL,
    empleado_id UUID REFERENCES empleados(id) ON DELETE RESTRICT NOT NULL,
    servicio_id UUID REFERENCES servicios(id) ON DELETE RESTRICT NOT NULL,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    estado VARCHAR(20) CHECK (estado IN ('pending', 'confirmed', 'completed', 'cancelled', 'no-show')) DEFAULT 'pending' NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    notas TEXT,
    es_sin_cita BOOLEAN DEFAULT FALSE NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_cita_horario CHECK (hora_fin > hora_inicio)
);

CREATE INDEX idx_citas_sucursal_fecha ON citas(sucursal_id, fecha);
CREATE INDEX idx_citas_empleado_fecha ON citas(empleado_id, fecha);

-- 8. TABLA: TURNOS_ESPERA (Lista de espera de clientes presenciales)
CREATE TABLE turnos_espera (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sucursal_id UUID REFERENCES sucursales(id) ON DELETE CASCADE NOT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    correo VARCHAR(150),
    empleado_id UUID REFERENCES empleados(id) ON DELETE SET NULL, -- Asignado o primer disponible
    servicio_id UUID REFERENCES servicios(id) ON DELETE RESTRICT NOT NULL,
    estado VARCHAR(20) CHECK (estado IN ('waiting', 'serving', 'completed', 'cancelled')) DEFAULT 'waiting' NOT NULL,
    fecha_llegada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_atencion TIMESTAMP WITH TIME ZONE,
    tiempo_espera_estimado INT DEFAULT 0 NOT NULL, -- En minutos
    prioridad VARCHAR(10) CHECK (prioridad IN ('normal', 'high')) DEFAULT 'normal' NOT NULL
);

CREATE INDEX idx_turnos_sucursal_estado ON turnos_espera(sucursal_id, estado);

-- 9. TABLA: PROVEEDORES
CREATE TABLE proveedores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    nombre_contacto VARCHAR(150),
    telefono VARCHAR(20) NOT NULL,
    correo VARCHAR(150) NOT NULL,
    direccion TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 10. TABLA: PRODUCTOS (Inventario por Sucursal)
CREATE TABLE productos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sucursal_id UUID REFERENCES sucursales(id) ON DELETE CASCADE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    sku VARCHAR(50) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) CHECK (precio >= 0.00) NOT NULL, -- Venta
    costo DECIMAL(10,2) CHECK (costo >= 0.00) NOT NULL, -- Costo de compra
    existencia INT DEFAULT 0 CHECK (existencia >= 0) NOT NULL,
    existencia_minima INT DEFAULT 0 CHECK (existencia_minima >= 0) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    proveedor_id UUID REFERENCES proveedores(id) ON DELETE SET NULL,
    activo BOOLEAN DEFAULT TRUE NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_producto_sku_sucursal UNIQUE (sucursal_id, sku)
);

CREATE INDEX idx_productos_sucursal ON productos(sucursal_id);

-- 11. TABLA: MOVIMIENTOS_INVENTARIO (Auditoría de Entradas / Salidas)
CREATE TABLE movimientos_inventario (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sucursal_id UUID REFERENCES sucursales(id) ON DELETE CASCADE NOT NULL,
    producto_id UUID REFERENCES productos(id) ON DELETE CASCADE NOT NULL,
    tipo VARCHAR(20) CHECK (tipo IN ('in', 'out', 'adjustment', 'sale', 'purchase')) NOT NULL,
    cantidad INT NOT NULL, -- Positivo para entradas, negativo para salidas
    motivo VARCHAR(255) NOT NULL,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    empleado_id UUID REFERENCES empleados(id) ON DELETE RESTRICT NOT NULL
);

-- 12. TABLA: COMPRAS (Abastecimiento de Inventario)
CREATE TABLE compras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sucursal_id UUID REFERENCES sucursales(id) ON DELETE CASCADE NOT NULL,
    proveedor_id UUID REFERENCES proveedores(id) ON DELETE RESTRICT NOT NULL,
    numero_factura VARCHAR(100),
    estado VARCHAR(20) CHECK (estado IN ('pending', 'completed', 'cancelled')) DEFAULT 'pending' NOT NULL,
    total DECIMAL(10,2) DEFAULT 0.00 CHECK (total >= 0.00) NOT NULL,
    fecha DATE NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 13. TABLA: DETALLES_COMPRA
CREATE TABLE detalles_compra (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    compra_id UUID REFERENCES compras(id) ON DELETE CASCADE NOT NULL,
    producto_id UUID REFERENCES productos(id) ON DELETE RESTRICT NOT NULL,
    cantidad INT CHECK (cantidad > 0) NOT NULL,
    costo DECIMAL(10,2) CHECK (costo >= 0.00) NOT NULL
);

-- 14. TABLA: SESIONES_CAJA (Apertura y Cierre de Caja Chica / POS)
CREATE TABLE sesiones_caja (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sucursal_id UUID REFERENCES sucursales(id) ON DELETE CASCADE NOT NULL,
    empleado_id UUID REFERENCES empleados(id) ON DELETE RESTRICT NOT NULL,
    fecha_apertura TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_cierre TIMESTAMP WITH TIME ZONE,
    saldo_inicial DECIMAL(10,2) CHECK (saldo_inicial >= 0.00) NOT NULL,
    saldo_final DECIMAL(10,2) CHECK (saldo_final >= 0.00),
    saldo_esperado DECIMAL(10,2) CHECK (saldo_esperado >= 0.00),
    estado VARCHAR(20) CHECK (estado IN ('open', 'closed')) DEFAULT 'open' NOT NULL,
    notas TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 15. TABLA: MOVIMIENTOS_CAJA (Entradas y Salidas de Efectivo)
CREATE TABLE movimientos_caja (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sesion_id UUID REFERENCES sesiones_caja(id) ON DELETE CASCADE NOT NULL,
    tipo VARCHAR(10) CHECK (tipo IN ('income', 'expense')) NOT NULL,
    monto DECIMAL(10,2) CHECK (monto > 0.00) NOT NULL,
    motivo VARCHAR(255) NOT NULL,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 16. TABLA: VENTAS (Ventas POS / Facturación)
CREATE TABLE ventas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sucursal_id UUID REFERENCES sucursales(id) ON DELETE CASCADE NOT NULL,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    cajero_id UUID REFERENCES empleados(id) ON DELETE RESTRICT NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    descuento DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    impuesto DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    propina DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    metodo_pago VARCHAR(20) CHECK (metodo_pago IN ('cash', 'card', 'transfer', 'mixed')) NOT NULL,
    detalles_pago JSONB,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 17. TABLA: DETALLES_VENTA (Líneas de Venta y Comisiones)
CREATE TABLE detalles_venta (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venta_id UUID REFERENCES ventas(id) ON DELETE CASCADE NOT NULL,
    tipo VARCHAR(10) CHECK (tipo IN ('service', 'product')) NOT NULL,
    item_id UUID NOT NULL, -- ID de servicio o producto (según tipo)
    cantidad INT CHECK (cantidad > 0) NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    empleado_id UUID REFERENCES empleados(id) ON DELETE SET NULL, -- Barbero atendió
    monto_comision DECIMAL(10,2) DEFAULT 0.00 NOT NULL
);

-- ==========================================
-- TRIGGERS Y FUNCIONES DE AUTOMATIZACIÓN
-- ==========================================

-- Función para actualizar existencias cuando se vende un producto
CREATE OR REPLACE FUNCTION funcion_ajustar_existencias_al_vender()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tipo = 'product' THEN
        UPDATE productos
        SET existencia = existencia - NEW.cantidad
        WHERE id = NEW.item_id;
        
        -- Registro automático en movimientos de inventario
        INSERT INTO movimientos_inventario (sucursal_id, producto_id, tipo, cantidad, motivo, empleado_id)
        SELECT v.sucursal_id, NEW.item_id, 'sale', -NEW.cantidad, 'Venta rápida POS #' || NEW.venta_id, v.cajero_id
        FROM ventas v WHERE v.id = NEW.venta_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_venta_ajustar_existencias
AFTER INSERT ON detalles_venta
FOR EACH ROW
EXECUTE FUNCTION funcion_ajustar_existencias_al_vender();

-- ==========================================
-- SEGURIDAD: ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Habilitar RLS en tablas principales
ALTER TABLE sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;

-- Política de seguridad multi-tenant (Aislamiento por Sucursal)
CREATE POLICY politica_aislamiento_sucursal ON citas
    FOR ALL
    USING (sucursal_id = (SELECT sucursal_id FROM empleados WHERE usuario_id = auth.uid()));

-- ==========================================================
-- INTEGRACIÓN CON SEGUNDA BASE DE DATOS: db_barberia_logs
-- TRIGGERS EN db_barberia QUE REGISTRAN LOGS EN db_barberia_logs
-- ==========================================================

CREATE EXTENSION IF NOT EXISTS dblink;

-- Tabla auxiliar para registrar eventos de navegación, login/logout y consultas IA
CREATE TABLE IF NOT EXISTS eventos_pagina (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo_evento VARCHAR(40) NOT NULL,
    modulo VARCHAR(80) NOT NULL,
    sucursal_id UUID,
    resumen TEXT NOT NULL,
    detalles_json JSONB,
    nivel VARCHAR(20) DEFAULT 'INFO' NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Función genérica invocada por los triggers de db_barberia para insertar en db_barberia_logs
CREATE OR REPLACE FUNCTION fn_auditar_hacia_db_barberia_logs()
RETURNS TRIGGER AS $$
DECLARE
    v_usuario TEXT := COALESCE(NULLIF(current_setting('app.current_user', true), ''), current_user);
    v_rol TEXT := COALESCE(NULLIF(current_setting('app.current_role', true), ''), 'system');
    v_ip TEXT := COALESCE(NULLIF(current_setting('app.client_ip', true), ''), '127.0.0.1');
    v_modulo TEXT := COALESCE(TG_ARGV[0], TG_TABLE_NAME);
    v_registro_id TEXT;
    v_datos_old JSONB := NULL;
    v_datos_new JSONB := NULL;
    v_sql TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_datos_new := to_jsonb(NEW);
        v_registro_id := COALESCE(v_datos_new->>'id', '');
    ELSIF TG_OP = 'UPDATE' THEN
        v_datos_old := to_jsonb(OLD);
        v_datos_new := to_jsonb(NEW);
        v_registro_id := COALESCE(v_datos_new->>'id', '');
    ELSIF TG_OP = 'DELETE' THEN
        v_datos_old := to_jsonb(OLD);
        v_registro_id := COALESCE(v_datos_old->>'id', '');
    END IF;

    v_sql := format(
        'INSERT INTO audit_logs (fecha_hora_local, usuario, rol_usuario, origen, base_datos_origen, base_datos_destino, tabla_afectada, operacion, registro_id, modulo, resumen, datos_anteriores, datos_nuevos, trigger_nombre, ip_origen, nivel)
         VALUES (%L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L::jsonb, %L::jsonb, %L, %L, %L)',
        to_char(CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz', 'DD/MM/YYYY HH24:MI:SS'),
        v_usuario,
        v_rol,
        'TRIGGER_DB',
        'db_barberia',
        'db_barberia_logs',
        TG_TABLE_NAME,
        TG_OP,
        v_registro_id,
        v_modulo,
        format('Operación %s en %s (ID: %s)', TG_OP, TG_TABLE_NAME, v_registro_id),
        COALESCE(v_datos_old::text, 'null'),
        COALESCE(v_datos_new::text, 'null'),
        TG_NAME,
        v_ip,
        CASE WHEN TG_OP = 'DELETE' THEN 'WARNING' ELSE 'INFO' END
    );

    PERFORM dblink_exec('dbname=db_barberia_logs', v_sql);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers de auditoría automática sobre todas las tablas operativas
CREATE TRIGGER trg_empresas_audit AFTER INSERT OR UPDATE ON empresas FOR EACH ROW EXECUTE FUNCTION fn_auditar_hacia_db_barberia_logs('Parametrización');
CREATE TRIGGER trg_empleados_audit AFTER INSERT OR UPDATE OR DELETE ON empleados FOR EACH ROW EXECUTE FUNCTION fn_auditar_hacia_db_barberia_logs('Barberos');
CREATE TRIGGER trg_servicios_audit AFTER INSERT OR UPDATE ON servicios FOR EACH ROW EXECUTE FUNCTION fn_auditar_hacia_db_barberia_logs('Servicios');
CREATE TRIGGER trg_clientes_audit AFTER INSERT OR UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION fn_auditar_hacia_db_barberia_logs('Clientes');
CREATE TRIGGER trg_citas_audit AFTER INSERT OR UPDATE ON citas FOR EACH ROW EXECUTE FUNCTION fn_auditar_hacia_db_barberia_logs('Agenda');
CREATE TRIGGER trg_turnos_espera_audit AFTER INSERT OR UPDATE ON turnos_espera FOR EACH ROW EXECUTE FUNCTION fn_auditar_hacia_db_barberia_logs('Agenda');
CREATE TRIGGER trg_proveedores_audit AFTER INSERT OR UPDATE OR DELETE ON proveedores FOR EACH ROW EXECUTE FUNCTION fn_auditar_hacia_db_barberia_logs('Proveedores');
CREATE TRIGGER trg_productos_audit AFTER INSERT OR UPDATE OR DELETE ON productos FOR EACH ROW EXECUTE FUNCTION fn_auditar_hacia_db_barberia_logs('Inventario');
CREATE TRIGGER trg_compras_audit AFTER INSERT OR DELETE ON compras FOR EACH ROW EXECUTE FUNCTION fn_auditar_hacia_db_barberia_logs('Compras');
CREATE TRIGGER trg_ventas_audit AFTER INSERT ON ventas FOR EACH ROW EXECUTE FUNCTION fn_auditar_hacia_db_barberia_logs('Caja / POS');
CREATE TRIGGER trg_sesiones_caja_audit AFTER INSERT OR UPDATE ON sesiones_caja FOR EACH ROW EXECUTE FUNCTION fn_auditar_hacia_db_barberia_logs('Caja / POS');
CREATE TRIGGER trg_movimientos_caja_audit AFTER INSERT ON movimientos_caja FOR EACH ROW EXECUTE FUNCTION fn_auditar_hacia_db_barberia_logs('Caja / POS');
CREATE TRIGGER trg_eventos_pagina_audit AFTER INSERT ON eventos_pagina FOR EACH ROW EXECUTE FUNCTION fn_auditar_hacia_db_barberia_logs('Eventos Web');


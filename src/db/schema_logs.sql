-- ==========================================
-- SEGUNDA BASE DE DATOS SEPARADA: db_barberia_logs
-- AUDITORÍA INMUTABLE DE OPERACIONES Y EVENTOS
-- OPTIMIZADO PARA POSTGRESQL
-- ==========================================

-- Ejecutar conectado a la base de datos: db_barberia_logs
-- CREATE DATABASE db_barberia_logs;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    log_uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_hora_local VARCHAR(40) NOT NULL,
    usuario VARCHAR(150) NOT NULL,
    rol_usuario VARCHAR(30) NOT NULL,
    origen VARCHAR(30) DEFAULT 'TRIGGER_DB' NOT NULL,
    base_datos_origen VARCHAR(80) DEFAULT 'db_barberia' NOT NULL,
    base_datos_destino VARCHAR(80) DEFAULT 'db_barberia_logs' NOT NULL,
    tabla_afectada VARCHAR(80) NOT NULL,
    operacion VARCHAR(30) NOT NULL,
    registro_id VARCHAR(120),
    modulo VARCHAR(80) NOT NULL,
    sucursal_id VARCHAR(80),
    resumen TEXT NOT NULL,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    trigger_nombre VARCHAR(100),
    ip_origen VARCHAR(64),
    user_agent TEXT,
    nivel VARCHAR(20) CHECK (nivel IN ('INFO', 'WARNING', 'CRITICAL')) DEFAULT 'INFO' NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_fecha ON audit_logs(fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_usuario ON audit_logs(usuario);
CREATE INDEX IF NOT EXISTS idx_audit_logs_modulo ON audit_logs(modulo);
CREATE INDEX IF NOT EXISTS idx_audit_logs_operacion ON audit_logs(operacion);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tabla ON audit_logs(tabla_afectada);

-- Regla de inmutabilidad: impedir UPDATE o DELETE sobre los logs de auditoría
CREATE OR REPLACE FUNCTION fn_proteger_inmutabilidad_logs()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Los registros de auditoría en db_barberia_logs son inmutables y no pueden modificarse ni eliminarse.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_proteger_audit_logs
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION fn_proteger_inmutabilidad_logs();

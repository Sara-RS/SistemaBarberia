/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DatabaseSync } from 'node:sqlite';

export interface ActorContext {
  usuario: string;
  rolUsuario: 'admin' | 'recep' | 'barber' | 'client' | 'system';
  ipOrigen: string;
  userAgent: string;
}

export interface VerifiedSession {
  username: string;
  role: 'admin';
  issuedAt: number;
  expiresAt: number;
}

export interface AuditLogRecord {
  id: number;
  logUuid: string;
  fechaHora: string;
  fechaHoraLocal: string;
  usuario: string;
  rolUsuario: string;
  origen: 'TRIGGER_DB' | 'APLICACION_WEB';
  baseDatosOrigen: string;
  baseDatosDestino: string;
  tablaAfectada: string;
  operacion: string;
  registroId: string | null;
  modulo: string;
  sucursalId: string | null;
  resumen: string;
  datosAnteriores: string | null;
  datosNuevos: string | null;
  triggerNombre: string | null;
  ipOrigen: string | null;
  userAgent: string | null;
  nivel: 'INFO' | 'WARNING' | 'CRITICAL';
  creadoEn: string;
}

export interface AuditQueryFilters {
  search?: string;
  modulo?: string;
  operacion?: string;
  nivel?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

/**
 * Servicio OOP para autenticación administrativa en servidor con tokens HMAC-SHA256
 * y verificación de contraseña mediante scrypt + timingSafeEqual.
 */
export class AdminAuthService {
  private static readonly DEFAULT_ADMIN_USERNAME = 'adminbarber';
  private static readonly DEFAULT_ADMIN_SCRYPT_HASH =
    '51d403f5fd19a744d376ea3cc5f56ab2:64d79353d704b55dd101fc4030550dab39d78bb6a490ebd740797651f30669d2876fc03746d39f05c2d077dc229b0ee761a149b762f885b19037c181a7df67e2';
  private static readonly TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas
  private readonly sessionSecret: string;

  constructor() {
    this.sessionSecret =
      (process.env.SESSION_SECRET || '').trim() || crypto.randomBytes(32).toString('hex');
  }

  private getExpectedUsername(): string {
    return (process.env.ADMIN_USERNAME || '').trim() || AdminAuthService.DEFAULT_ADMIN_USERNAME;
  }

  private verifyPassword(inputPassword: string): boolean {
    const envPassword = (process.env.ADMIN_PASSWORD || '').trim();
    if (envPassword) {
      const a = Buffer.from(inputPassword, 'utf8');
      const b = Buffer.from(envPassword, 'utf8');
      if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);
    }

    const [saltHex, expectedHashHex] = AdminAuthService.DEFAULT_ADMIN_SCRYPT_HASH.split(':');
    if (!saltHex || !expectedHashHex) return false;
    const derived = crypto.scryptSync(inputPassword, saltHex, 64);
    const expected = Buffer.from(expectedHashHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  }

  public authenticate(username: string, password: string): {
    success: boolean;
    token?: string;
    username?: string;
    error?: string;
  } {
    const cleanUsername = (username || '').trim();
    const expectedUsername = this.getExpectedUsername();

    if (!cleanUsername || !password) {
      return {
        success: false,
        error: 'Ingresa el nombre de usuario y la contraseña.',
      };
    }

    const userBuf = Buffer.from(cleanUsername, 'utf8');
    const expectedUserBuf = Buffer.from(expectedUsername, 'utf8');
    const userMatches =
      userBuf.length === expectedUserBuf.length && crypto.timingSafeEqual(userBuf, expectedUserBuf);

    if (userMatches && this.verifyPassword(password)) {
      const token = this.issueToken(cleanUsername);
      return {
        success: true,
        token,
        username: cleanUsername,
      };
    }

    return {
      success: false,
      error: 'Credenciales incorrectas. Verifica tu usuario y contraseña.',
    };
  }

  private issueToken(username: string): string {
    const now = Date.now();
    const payload: VerifiedSession = {
      username,
      role: 'admin',
      issuedAt: now,
      expiresAt: now + AdminAuthService.TOKEN_TTL_MS,
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.sessionSecret)
      .update(encodedPayload)
      .digest('base64url');
    return `${encodedPayload}.${signature}`;
  }

  public verifyBearerHeader(authHeader?: string): VerifiedSession | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    const token = authHeader.slice('Bearer '.length).trim();
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [encodedPayload, providedSig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', this.sessionSecret)
      .update(encodedPayload)
      .digest('base64url');

    const a = Buffer.from(providedSig, 'utf8');
    const b = Buffer.from(expectedSig, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }

    try {
      const decoded = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8')
      ) as VerifiedSession;
      if (!decoded || decoded.role !== 'admin' || decoded.expiresAt < Date.now()) {
        return null;
      }
      return decoded;
    } catch {
      return null;
    }
  }
}

/**
 * Gestor OOP de doble base de datos separada:
 * 1) db_barberia.sqlite (Operaciones del negocio + Triggers SQL)
 * 2) db_barberia_logs.sqlite ("db_barberia_logs", Auditoría inmutable alimentada por triggers)
 */
export class DualDatabaseAuditManager {
  private static readonly PRIMARY_DB_NAME = 'db_barberia';
  private static readonly LOGS_DB_NAME = 'db_barberia_logs';

  private readonly dataDir: string;
  private readonly primaryDb: DatabaseSync;
  private readonly logsDb: DatabaseSync;

  private activeActor: ActorContext = {
    usuario: 'Sistema',
    rolUsuario: 'system',
    ipOrigen: '127.0.0.1',
    userAgent: 'ServerRuntime',
  };

  constructor(baseDir: string = process.cwd()) {
    this.dataDir = path.join(baseDir, 'data');
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    const primaryPath = path.join(this.dataDir, `${DualDatabaseAuditManager.PRIMARY_DB_NAME}.sqlite`);
    const logsPath = path.join(this.dataDir, `${DualDatabaseAuditManager.LOGS_DB_NAME}.sqlite`);

    this.logsDb = new DatabaseSync(logsPath);
    this.primaryDb = new DatabaseSync(primaryPath);

    this.initializeLogsDatabase();
    this.registerAuditBridgeFunction();
    this.initializePrimaryDatabaseAndTriggers();
    this.seedInitialOperationalContext();
  }

  private formatBoliviaDateTime(isoDate: Date = new Date()): string {
    try {
      return new Intl.DateTimeFormat('es-BO', {
        timeZone: 'America/La_Paz',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(isoDate);
    } catch {
      return isoDate.toISOString();
    }
  }

  private initializeLogsDatabase(): void {
    this.logsDb.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;

      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        log_uuid TEXT UNIQUE NOT NULL,
        fecha_hora TEXT NOT NULL,
        fecha_hora_local TEXT NOT NULL,
        usuario TEXT NOT NULL,
        rol_usuario TEXT NOT NULL,
        origen TEXT NOT NULL DEFAULT 'TRIGGER_DB',
        base_datos_origen TEXT NOT NULL DEFAULT 'db_barberia',
        base_datos_destino TEXT NOT NULL DEFAULT 'db_barberia_logs',
        tabla_afectada TEXT NOT NULL,
        operacion TEXT NOT NULL,
        registro_id TEXT,
        modulo TEXT NOT NULL,
        sucursal_id TEXT,
        resumen TEXT NOT NULL,
        datos_anteriores TEXT,
        datos_nuevos TEXT,
        trigger_nombre TEXT,
        ip_origen TEXT,
        user_agent TEXT,
        nivel TEXT NOT NULL DEFAULT 'INFO',
        creado_en TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_audit_fecha ON audit_logs(fecha_hora DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_usuario ON audit_logs(usuario);
      CREATE INDEX IF NOT EXISTS idx_audit_modulo ON audit_logs(modulo);
      CREATE INDEX IF NOT EXISTS idx_audit_operacion ON audit_logs(operacion);
      CREATE INDEX IF NOT EXISTS idx_audit_tabla ON audit_logs(tabla_afectada);
    `);
  }

  /**
   * Registra la función SQL puente dentro de `db_barberia` que es invocada directamente
   * por los TRIGGERS SQL (AFTER INSERT / UPDATE / DELETE) para insertar en `db_barberia_logs`.
   */
  private registerAuditBridgeFunction(): void {
    const insertLogStmt = this.logsDb.prepare(`
      INSERT INTO audit_logs (
        log_uuid,
        fecha_hora,
        fecha_hora_local,
        usuario,
        rol_usuario,
        origen,
        base_datos_origen,
        base_datos_destino,
        tabla_afectada,
        operacion,
        registro_id,
        modulo,
        sucursal_id,
        resumen,
        datos_anteriores,
        datos_nuevos,
        trigger_nombre,
        ip_origen,
        user_agent,
        nivel,
        creado_en
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.primaryDb.function(
      'fn_registrar_log_auditoria',
      (
        tablaAfectada: unknown,
        operacion: unknown,
        registroId: unknown,
        modulo: unknown,
        sucursalId: unknown,
        resumen: unknown,
        datosAnteriores: unknown,
        datosNuevos: unknown,
        triggerNombre: unknown,
        nivel: unknown,
        usuarioOverride: unknown,
        rolOverride: unknown
      ) => {
        const now = new Date();
        const nowIso = now.toISOString();
        const localStr = this.formatBoliviaDateTime(now);
        const logUuid = `log-${crypto.randomUUID()}`;

        const usuario =
          typeof usuarioOverride === 'string' && usuarioOverride.trim().length > 0
            ? usuarioOverride.trim()
            : this.activeActor.usuario;
        const rolUsuario =
          typeof rolOverride === 'string' && rolOverride.trim().length > 0
            ? rolOverride.trim()
            : this.activeActor.rolUsuario;

        insertLogStmt.run(
          logUuid,
          nowIso,
          localStr,
          usuario,
          rolUsuario,
          'TRIGGER_DB',
          DualDatabaseAuditManager.PRIMARY_DB_NAME,
          DualDatabaseAuditManager.LOGS_DB_NAME,
          String(tablaAfectada || 'desconocida'),
          String(operacion || 'SYSTEM'),
          registroId !== null && registroId !== undefined ? String(registroId) : null,
          String(modulo || 'Sistema'),
          sucursalId !== null && sucursalId !== undefined && String(sucursalId) !== ''
            ? String(sucursalId)
            : null,
          String(resumen || 'Operación registrada por trigger'),
          datosAnteriores !== null && datosAnteriores !== undefined && String(datosAnteriores) !== ''
            ? String(datosAnteriores)
            : null,
          datosNuevos !== null && datosNuevos !== undefined && String(datosNuevos) !== ''
            ? String(datosNuevos)
            : null,
          triggerNombre !== null && triggerNombre !== undefined ? String(triggerNombre) : null,
          this.activeActor.ipOrigen,
          this.activeActor.userAgent,
          String(nivel || 'INFO'),
          nowIso
        );

        return 1;
      }
    );
  }

  private initializePrimaryDatabaseAndTriggers(): void {
    this.primaryDb.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;

      CREATE TABLE IF NOT EXISTS empresas (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        eslogan TEXT,
        nit_ruc TEXT,
        direccion TEXT,
        telefono TEXT,
        correo TEXT,
        simbolo_moneda TEXT,
        porcentaje_comision REAL,
        actualizado_en TEXT
      );

      CREATE TABLE IF NOT EXISTS empleados (
        id TEXT PRIMARY KEY,
        sucursal_id TEXT,
        nombre_completo TEXT NOT NULL,
        telefono TEXT,
        correo TEXT,
        rol TEXT,
        porcentaje_comision REAL,
        activo INTEGER DEFAULT 1,
        creado_en TEXT
      );

      CREATE TABLE IF NOT EXISTS servicios (
        id TEXT PRIMARY KEY,
        codigo TEXT,
        nombre TEXT NOT NULL,
        categoria TEXT,
        precio REAL NOT NULL,
        duracion INTEGER NOT NULL,
        activo INTEGER DEFAULT 1,
        creado_en TEXT
      );

      CREATE TABLE IF NOT EXISTS clientes (
        id TEXT PRIMARY KEY,
        empresa_id TEXT,
        nombre_completo TEXT NOT NULL,
        telefono TEXT,
        correo TEXT,
        creado_en TEXT
      );

      CREATE TABLE IF NOT EXISTS citas (
        id TEXT PRIMARY KEY,
        sucursal_id TEXT,
        cliente_id TEXT,
        empleado_id TEXT,
        servicio_id TEXT,
        fecha TEXT,
        hora_inicio TEXT,
        hora_fin TEXT,
        estado TEXT,
        precio REAL,
        es_sin_cita INTEGER DEFAULT 0,
        notas TEXT,
        creado_en TEXT
      );

      CREATE TABLE IF NOT EXISTS turnos_espera (
        id TEXT PRIMARY KEY,
        sucursal_id TEXT,
        nombre_completo TEXT,
        telefono TEXT,
        empleado_id TEXT,
        servicio_id TEXT,
        estado TEXT,
        prioridad TEXT,
        fecha_llegada TEXT
      );

      CREATE TABLE IF NOT EXISTS proveedores (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        nombre_contacto TEXT,
        telefono TEXT,
        correo TEXT,
        direccion TEXT,
        creado_en TEXT
      );

      CREATE TABLE IF NOT EXISTS productos (
        id TEXT PRIMARY KEY,
        sucursal_id TEXT,
        nombre TEXT NOT NULL,
        sku TEXT,
        precio REAL NOT NULL,
        costo REAL NOT NULL,
        existencia INTEGER NOT NULL,
        existencia_minima INTEGER,
        categoria TEXT,
        proveedor_id TEXT,
        creado_en TEXT
      );

      CREATE TABLE IF NOT EXISTS compras (
        id TEXT PRIMARY KEY,
        sucursal_id TEXT,
        proveedor_id TEXT,
        numero_factura TEXT,
        estado TEXT,
        metodo_pago TEXT,
        total REAL,
        fecha TEXT,
        cantidad_items INTEGER,
        creado_en TEXT
      );

      CREATE TABLE IF NOT EXISTS ventas (
        id TEXT PRIMARY KEY,
        sucursal_id TEXT,
        cliente_id TEXT,
        cajero_id TEXT,
        subtotal REAL,
        descuento REAL,
        propina REAL,
        total REAL,
        metodo_pago TEXT,
        cantidad_items INTEGER,
        fecha TEXT
      );

      CREATE TABLE IF NOT EXISTS sesiones_caja (
        id TEXT PRIMARY KEY,
        sucursal_id TEXT,
        empleado_id TEXT,
        estado TEXT,
        saldo_inicial REAL,
        saldo_final REAL,
        saldo_esperado REAL,
        notas TEXT,
        fecha_apertura TEXT,
        fecha_cierre TEXT
      );

      CREATE TABLE IF NOT EXISTS movimientos_caja (
        id TEXT PRIMARY KEY,
        sesion_id TEXT,
        sucursal_id TEXT,
        tipo TEXT,
        monto REAL,
        motivo TEXT,
        fecha TEXT
      );

      CREATE TABLE IF NOT EXISTS eventos_pagina (
        id TEXT PRIMARY KEY,
        tipo_evento TEXT NOT NULL,
        modulo TEXT NOT NULL,
        sucursal_id TEXT,
        resumen TEXT NOT NULL,
        detalles_json TEXT,
        nivel TEXT NOT NULL DEFAULT 'INFO',
        creado_en TEXT NOT NULL
      );

      -- ==========================================================
      -- TRIGGERS EN db_barberia -> ESCRIBEN EN db_barberia_logs
      -- ==========================================================

      CREATE TRIGGER IF NOT EXISTS trg_empresas_au
      AFTER UPDATE ON empresas
      BEGIN
        SELECT fn_registrar_log_auditoria(
          'empresas',
          'UPDATE',
          NEW.id,
          'Parametrización',
          NULL,
          'Actualización de configuración institucional: ' || NEW.nombre,
          json_object('nombre', OLD.nombre, 'nit_ruc', OLD.nit_ruc, 'telefono', OLD.telefono, 'simbolo_moneda', OLD.simbolo_moneda, 'porcentaje_comision', OLD.porcentaje_comision),
          json_object('nombre', NEW.nombre, 'nit_ruc', NEW.nit_ruc, 'telefono', NEW.telefono, 'simbolo_moneda', NEW.simbolo_moneda, 'porcentaje_comision', NEW.porcentaje_comision),
          'trg_empresas_au',
          'INFO',
          NULL,
          NULL
        );
      END;

      CREATE TRIGGER IF NOT EXISTS trg_empleados_ai
      AFTER INSERT ON empleados
      BEGIN
        SELECT fn_registrar_log_auditoria(
          'empleados',
          'INSERT',
          NEW.id,
          'Barberos',
          NEW.sucursal_id,
          'Nuevo barbero/personal registrado: ' || NEW.nombre_completo || ' (' || COALESCE(NEW.rol, 'barber') || ')',
          NULL,
          json_object('id', NEW.id, 'nombre_completo', NEW.nombre_completo, 'rol', NEW.rol, 'telefono', NEW.telefono, 'porcentaje_comision', NEW.porcentaje_comision),
          'trg_empleados_ai',
          'INFO',
          NULL,
          NULL
        );
      END;

      CREATE TRIGGER IF NOT EXISTS trg_empleados_au
      AFTER UPDATE ON empleados
      BEGIN
        SELECT fn_registrar_log_auditoria(
          'empleados',
          'UPDATE',
          NEW.id,
          'Barberos',
          NEW.sucursal_id,
          'Actualización de barbero/personal: ' || NEW.nombre_completo,
          json_object('nombre_completo', OLD.nombre_completo, 'rol', OLD.rol, 'porcentaje_comision', OLD.porcentaje_comision, 'activo', OLD.activo),
          json_object('nombre_completo', NEW.nombre_completo, 'rol', NEW.rol, 'porcentaje_comision', NEW.porcentaje_comision, 'activo', NEW.activo),
          'trg_empleados_au',
          'INFO',
          NULL,
          NULL
        );
      END;

      CREATE TRIGGER IF NOT EXISTS trg_empleados_ad
      AFTER DELETE ON empleados
      BEGIN
        SELECT fn_registrar_log_auditoria(
          'empleados',
          'DELETE',
          OLD.id,
          'Barberos',
          OLD.sucursal_id,
          'Eliminación de barbero/personal: ' || OLD.nombre_completo,
          json_object('id', OLD.id, 'nombre_completo', OLD.nombre_completo, 'rol', OLD.rol),
          NULL,
          'trg_empleados_ad',
          'WARNING',
          NULL,
          NULL
        );
      END;

      CREATE TRIGGER IF NOT EXISTS trg_servicios_ai
      AFTER INSERT ON servicios
      BEGIN
        SELECT fn_registrar_log_auditoria(
          'servicios',
          'INSERT',
          NEW.id,
          'Servicios',
          NULL,
          'Nuevo servicio creado: [' || COALESCE(NEW.codigo, 'S/C') || '] ' || NEW.nombre || ' (' || NEW.precio || ')',
          NULL,
          json_object('id', NEW.id, 'codigo', NEW.codigo, 'nombre', NEW.nombre, 'categoria', NEW.categoria, 'precio', NEW.precio, 'duracion', NEW.duracion),
          'trg_servicios_ai',
          'INFO',
          NULL,
          NULL
        );
      END;

      CREATE TRIGGER IF NOT EXISTS trg_servicios_au
      AFTER UPDATE ON servicios
      BEGIN
        SELECT fn_registrar_log_auditoria(
          'servicios',
          'UPDATE',
          NEW.id,
          'Servicios',
          NULL,
          'Servicio actualizado: [' || COALESCE(NEW.codigo, 'S/C') || '] ' || NEW.nombre,
          json_object('nombre', OLD.nombre, 'precio', OLD.precio, 'duracion', OLD.duracion, 'activo', OLD.activo),
          json_object('nombre', NEW.nombre, 'precio', NEW.precio, 'duracion', NEW.duracion, 'activo', NEW.activo),
          'trg_servicios_au',
          'INFO',
          NULL,
          NULL
        );
      END;

      CREATE TRIGGER IF NOT EXISTS trg_clientes_ai
      AFTER INSERT ON clientes
      BEGIN
        SELECT fn_registrar_log_auditoria(
          'clientes',
          'INSERT',
          NEW.id,
          'Clientes',
          NULL,
          'Nuevo cliente registrado: ' || NEW.nombre_completo || ' (' || COALESCE(NEW.telefono, 'Sin tel.') || ')',
          NULL,
          json_object('id', NEW.id, 'nombre_completo', NEW.nombre_completo, 'telefono', NEW.telefono, 'correo', NEW.correo),
          'trg_clientes_ai',
          'INFO',
          NULL,
          NULL
        );
      END;

      CREATE TRIGGER IF NOT EXISTS trg_citas_ai
      AFTER INSERT ON citas
      BEGIN
        SELECT fn_registrar_log_auditoria(
          'citas',
          'INSERT',
          NEW.id,
          'Agenda',
          NEW.sucursal_id,
          'Nueva cita agendada para el ' || COALESCE(NEW.fecha, '') || ' a las ' || COALESCE(NEW.hora_inicio, '') || ' (Bs. ' || COALESCE(NEW.precio, 0) || ')',
          NULL,
          json_object('id', NEW.id, 'cliente_id', NEW.cliente_id, 'empleado_id', NEW.empleado_id, 'servicio_id', NEW.servicio_id, 'fecha', NEW.fecha, 'hora_inicio', NEW.hora_inicio, 'estado', NEW.estado, 'precio', NEW.precio),
          'trg_citas_ai',
          'INFO',
          NULL,
          NULL
        );
      END;

      CREATE TRIGGER IF NOT EXISTS trg_citas_au
      AFTER UPDATE ON citas
      BEGIN
        SELECT fn_registrar_log_auditoria(
          'citas',
          'UPDATE',
          NEW.id,
          'Agenda',
          NEW.sucursal_id,
          'Cita actualizada (' || COALESCE(OLD.estado, '-') || ' -> ' || COALESCE(NEW.estado, '-') || ') el ' || COALESCE(NEW.fecha, '') || ' ' || COALESCE(NEW.hora_inicio, ''),
          json_object('estado', OLD.estado, 'fecha', OLD.fecha, 'hora_inicio', OLD.hora_inicio, 'empleado_id', OLD.empleado_id),
          json_object('estado', NEW.estado, 'fecha', NEW.fecha, 'hora_inicio', NEW.hora_inicio, 'empleado_id', NEW.empleado_id),
          'trg_citas_au',
          CASE WHEN NEW.estado = 'cancelled' OR NEW.estado = 'no-show' THEN 'WARNING' ELSE 'INFO' END,
          NULL,
          NULL
        );
      END;

      CREATE TRIGGER IF NOT EXISTS trg_turnos_espera_ai
      AFTER INSERT ON turnos_espera
      BEGIN
        SELECT fn_registrar_log_auditoria(
          'turnos_espera',
          'INSERT',
          NEW.id,
          'Agenda',
          NEW.sucursal_id,
          'Cliente agregado a fila de espera (Walk-In): ' || COALESCE(NEW.nombre_completo, 'Cliente'),
          NULL,
          json_object('id', NEW.id, 'nombre_completo', NEW.nombre_completo, 'servicio_id', NEW.servicio_id, 'estado', NEW.estado),
          'trg_turnos_espera_ai',
          'INFO',
          NULL,
          NULL
        );
      END;

      CREATE TRIGGER IF NOT EXISTS trg_turnos_espera_au
      AFTER UPDATE ON turnos_espera
      BEGIN
        SELECT fn_registrar_log_auditoria(
          'turnos_espera',
          'UPDATE',
          NEW.id,
          'Agenda',
          NEW.sucursal_id,
          'Cambio de estado en turno de espera: ' || COALESCE(NEW.nombre_completo, '') || ' -> ' || COALESCE(NEW.estado, ''),
          json_object('estado', OLD.estado, 'empleado_id', OLD.empleado_id),
          json_object('estado', NEW.estado, 'empleado_id', NEW.empleado_id),
          'trg_turnos_espera_au',
          'INFO',
          NULL,
          NULL
        );
      END;

      CREATE TRIGGER IF NOT EXISTS trg_proveedores_ai
      AFTER INSERT ON proveedores
      BEGIN
        SELECT fn_registrar_log_auditoria(
          'proveedores',
          'INSERT',
          NEW.id,
          'Proveedores',
          NULL,
          'Nuevo proveedor registrado: ' || NEW.nombre,
          NULL,
          json_object('id', NEW.id, 'nombre', NEW.nombre, 'nombre_contacto', NEW.nombre_contacto, 'telefono', NEW.telefono, 'correo', NEW.correo),
          'trg_proveedores_ai',
          'INFO',
          NULL,
          NULL
        );
      END;

      CREATE TRIGGER IF NOT EXISTS trg_proveedores_au
      AFTER UPDATE ON proveedores
      BEGIN
        SELECT fn_registrar_log_auditoria(
          'proveedores',
          'UPDATE',
          NEW.id,
          'Proveedores',
          NULL,
          'Proveedor actualizado: ' || NEW.nombre,
          json_object('nombre', OLD.nombre, 'nombre_contacto', OLD.nombre_contacto, 'telefono', OLD.telefono),
          json_object('nombre', NEW.nombre, 'nombre_contacto', NEW.nombre_contacto, 'telefono', NEW.telefono),
          'trg_proveedores_au',
          'INFO',
          NULL,
          NULL
        );
      END;

      CREATE TRIGGER IF NOT EXISTS trg_proveedores_ad
      AFTER DELETE ON proveedores
      BEGIN
        SELECT fn_registrar_log_auditoria(
          'proveedores',
          'DELETE',
          OLD.id,
          'Proveedores',
          NULL,
          'Proveedor eliminado: ' || OLD.nombre,
          json_object('id', OLD.id, 'nombre', OLD.nombre),
          NULL,
          'trg_proveedores_ad',
          'WARNING',
          NULL,
          NULL
        );
      END;

      CREATE TRIGGER IF NOT EXISTS trg_productos_ai
      AFTER INSERT ON productos
      BEGIN
        SELECT fn_registrar_log_auditoria(
          'productos',
          'INSERT',
          NEW.id,
          'Inventario',
          NEW.sucursal_id,
          'Nuevo producto agregado al inventario: ' || NEW.nombre || ' (Stock: ' || NEW.existencia || ', Precio: ' || NEW.precio || ')',
          NULL,
          json_object('id', NEW.id, 'nombre', NEW.nombre, 'sku', NEW.sku, 'precio', NEW.precio, 'costo', NEW.costo, 'existencia', NEW.existencia),
          'trg_productos_ai',
          'INFO',
          NULL,
          NULL
        );
      END;

      CREATE TRIGGER IF NOT EXISTS trg_productos_au
      AFTER UPDATE ON productos
      BEGIN
        SELECT fn_registrar_log_auditoria(
          'productos',
          'UPDATE',
          NEW.id,
          'Inventario',
          NEW.sucursal_id,
          'Producto/stock actualizado: ' || NEW.nombre || ' (Stock: ' || OLD.existencia || ' -> ' || NEW.existencia || ', Precio: ' || NEW.precio || ')',
          json_object('nombre', OLD.nombre, 'precio', OLD.precio, 'costo', OLD.costo, 'existencia', OLD.existencia),
          json_object('nombre', NEW.nombre, 'precio', NEW.precio, 'costo', NEW.costo, 'existencia', NEW.existencia),
          'trg_productos_au',
          CASE WHEN NEW.existencia <= COALESCE(NEW.existencia_minima, 5) THEN 'WARNING' ELSE 'INFO' END,
          NULL,
          NULL
        );
      END;

      CREATE TRIGGER IF NOT EXISTS trg_productos_ad
      AFTER DELETE ON productos
      BEGIN
        SELECT fn_registrar_log_auditoria(
          'productos',
          'DELETE',
          OLD.id,
          'Inventario',
          OLD.sucursal_id,
          'Producto eliminado del inventario: ' || OLD.nombre,
          json_object('id', OLD.id, 'nombre', OLD.nombre, 'sku', OLD.sku, 'existencia', OLD.existencia),
          NULL,
          'trg_productos_ad',
          'WARNING',
          NULL,
          NULL
        );
      END;

      CREATE TRIGGER IF NOT EXISTS trg_compras_ai
      AFTER INSERT ON compras
      BEGIN
        SELECT fn_registrar_log_auditoria(
          'compras',
          'INSERT',
          NEW.id,
          'Compras',
          NEW.sucursal_id,
          'Compra registrada #' || COALESCE(NEW.numero_factura, NEW.id) || ' por total de Bs. ' || COALESCE(NEW.total, 0),
          NULL,
          json_object('id', NEW.id, 'proveedor_id', NEW.proveedor_id, 'numero_factura', NEW.numero_factura, 'total', NEW.total, 'metodo_pago', NEW.metodo_pago, 'cantidad_items', NEW.cantidad_items),
          'trg_compras_ai',
          'INFO',
          NULL,
          NULL
        );
      END;

      CREATE TRIGGER IF NOT EXISTS trg_compras_ad
      AFTER DELETE ON compras
      BEGIN
        SELECT fn_registrar_log_auditoria(
          'compras',
          'DELETE',
          OLD.id,
          'Compras',
          OLD.sucursal_id,
          'Compra eliminada #' || COALESCE(OLD.numero_factura, OLD.id) || ' (Total: Bs. ' || COALESCE(OLD.total, 0) || ')',
          json_object('id', OLD.id, 'numero_factura', OLD.numero_factura, 'total', OLD.total),
          NULL,
          'trg_compras_ad',
          'WARNING',
          NULL,
          NULL
        );
      END;

      CREATE TRIGGER IF NOT EXISTS trg_ventas_ai
      AFTER INSERT ON ventas
      BEGIN
        SELECT fn_registrar_log_auditoria(
          'ventas',
          'INSERT',
          NEW.id,
          'Caja / POS',
          NEW.sucursal_id,
          'Venta POS registrada #' || NEW.id || ' · Total: Bs. ' || COALESCE(NEW.total, 0) || ' (' || COALESCE(NEW.metodo_pago, 'cash') || ')',
          NULL,
          json_object('id', NEW.id, 'cliente_id', NEW.cliente_id, 'subtotal', NEW.subtotal, 'descuento', NEW.descuento, 'propina', NEW.propina, 'total', NEW.total, 'metodo_pago', NEW.metodo_pago, 'cantidad_items', NEW.cantidad_items),
          'trg_ventas_ai',
          'INFO',
          NULL,
          NULL
        );
      END;

      CREATE TRIGGER IF NOT EXISTS trg_sesiones_caja_ai
      AFTER INSERT ON sesiones_caja
      BEGIN
        SELECT fn_registrar_log_auditoria(
          'sesiones_caja',
          'INSERT',
          NEW.id,
          'Caja / POS',
          NEW.sucursal_id,
          'Apertura de caja registrada con saldo inicial de Bs. ' || COALESCE(NEW.saldo_inicial, 0),
          NULL,
          json_object('id', NEW.id, 'saldo_inicial', NEW.saldo_inicial, 'estado', NEW.estado),
          'trg_sesiones_caja_ai',
          'INFO',
          NULL,
          NULL
        );
      END;

      CREATE TRIGGER IF NOT EXISTS trg_sesiones_caja_au
      AFTER UPDATE ON sesiones_caja
      BEGIN
        SELECT fn_registrar_log_auditoria(
          'sesiones_caja',
          'UPDATE',
          NEW.id,
          'Caja / POS',
          NEW.sucursal_id,
          'Cierre de caja registrado · Saldo declarado: Bs. ' || COALESCE(NEW.saldo_final, 0) || ' (Esperado: Bs. ' || COALESCE(NEW.saldo_esperado, 0) || ')',
          json_object('estado', OLD.estado, 'saldo_inicial', OLD.saldo_inicial),
          json_object('estado', NEW.estado, 'saldo_final', NEW.saldo_final, 'saldo_esperado', NEW.saldo_esperado, 'notas', NEW.notas),
          'trg_sesiones_caja_au',
          CASE WHEN ABS(COALESCE(NEW.saldo_final, 0) - COALESCE(NEW.saldo_esperado, 0)) > 0.01 THEN 'WARNING' ELSE 'INFO' END,
          NULL,
          NULL
        );
      END;

      CREATE TRIGGER IF NOT EXISTS trg_movimientos_caja_ai
      AFTER INSERT ON movimientos_caja
      BEGIN
        SELECT fn_registrar_log_auditoria(
          'movimientos_caja',
          'INSERT',
          NEW.id,
          'Caja / POS',
          NEW.sucursal_id,
          'Movimiento de caja (' || NEW.tipo || '): Bs. ' || NEW.monto || ' · ' || NEW.motivo,
          NULL,
          json_object('id', NEW.id, 'sesion_id', NEW.sesion_id, 'tipo', NEW.tipo, 'monto', NEW.monto, 'motivo', NEW.motivo),
          'trg_movimientos_caja_ai',
          CASE WHEN NEW.tipo = 'expense' THEN 'WARNING' ELSE 'INFO' END,
          NULL,
          NULL
        );
      END;

      CREATE TRIGGER IF NOT EXISTS trg_eventos_pagina_ai
      AFTER INSERT ON eventos_pagina
      BEGIN
        SELECT fn_registrar_log_auditoria(
          'eventos_pagina',
          NEW.tipo_evento,
          NEW.id,
          NEW.modulo,
          NEW.sucursal_id,
          NEW.resumen,
          NULL,
          NEW.detalles_json,
          'trg_eventos_pagina_ai',
          NEW.nivel,
          NULL,
          NULL
        );
      END;
    `);
  }

  private seedInitialOperationalContext(): void {
    const existingEmpresa = this.primaryDb
      .prepare('SELECT id FROM empresas WHERE id = ?')
      .get('tenant-1');

    if (!existingEmpresa) {
      this.runWithActor(
        {
          usuario: 'Sistema',
          rolUsuario: 'system',
          ipOrigen: '127.0.0.1',
          userAgent: 'DatabaseBootstrap',
        },
        () => {
          this.primaryDb
            .prepare(
              `INSERT INTO empresas (id, nombre, eslogan, nit_ruc, direccion, telefono, correo, simbolo_moneda, porcentaje_comision, actualizado_en)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
              'tenant-1',
              'Barbería "Josué"',
              'Estilo, Corte & Tradición de Caballero',
              '1029384029',
              'Av. 16 de Julio #1420, El Prado, La Paz, Bolivia',
              '71523456',
              'contacto@barberiajosue.bo',
              'Bs.',
              35,
              new Date().toISOString()
            );

          this.primaryDb
            .prepare(
              `INSERT INTO eventos_pagina (id, tipo_evento, modulo, sucursal_id, resumen, detalles_json, nivel, creado_en)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
              `evt-${crypto.randomUUID()}`,
              'SYSTEM',
              'Auditoría y Triggers',
              'branch-coyoacan',
              'Inicialización de base de datos dual (db_barberia -> db_barberia_logs) con triggers SQL activos.',
              JSON.stringify({
                primaryDb: DualDatabaseAuditManager.PRIMARY_DB_NAME,
                logsDb: DualDatabaseAuditManager.LOGS_DB_NAME,
              }),
              'INFO',
              new Date().toISOString()
            );
        }
      );
    }
  }

  private runWithActor<T>(actor: ActorContext, work: () => T): T {
    const previousActor = this.activeActor;
    this.activeActor = actor;
    try {
      return work();
    } finally {
      this.activeActor = previousActor;
    }
  }

  /**
   * Ejecuta la mutación SQL real dentro de `db_barberia.sqlite`, disparando
   * automáticamente los TRIGGERS SQL que insertan el log en `db_barberia_logs.sqlite`.
   */
  public syncDatabaseMutation(
    actor: ActorContext,
    action: string,
    payload: Record<string, any>
  ): { triggered: boolean; action: string } {
    return this.runWithActor(actor, () => {
      const nowIso = new Date().toISOString();

      switch (action) {
        case 'updateCompanyInfo': {
          const current = this.primaryDb
            .prepare('SELECT * FROM empresas WHERE id = ?')
            .get('tenant-1') as Record<string, any> | undefined;

          if (!current) {
            this.primaryDb
              .prepare(
                `INSERT INTO empresas (id, nombre, eslogan, nit_ruc, direccion, telefono, correo, simbolo_moneda, porcentaje_comision, actualizado_en)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .run(
                'tenant-1',
                String(payload.name || 'Barbería "Josué"'),
                String(payload.slogan || ''),
                String(payload.nitRuc || ''),
                String(payload.address || ''),
                String(payload.phone || ''),
                String(payload.email || ''),
                String(payload.currencySymbol || 'Bs.'),
                Number(payload.defaultCommission ?? 35),
                nowIso
              );
          }

          this.primaryDb
            .prepare(
              `UPDATE empresas
               SET nombre = ?, eslogan = ?, nit_ruc = ?, direccion = ?, telefono = ?, correo = ?, simbolo_moneda = ?, porcentaje_comision = ?, actualizado_en = ?
               WHERE id = ?`
            )
            .run(
              String(payload.name ?? current?.nombre ?? 'Barbería "Josué"'),
              String(payload.slogan ?? current?.eslogan ?? ''),
              String(payload.nitRuc ?? current?.nit_ruc ?? ''),
              String(payload.address ?? current?.direccion ?? ''),
              String(payload.phone ?? current?.telefono ?? ''),
              String(payload.email ?? current?.correo ?? ''),
              String(payload.currencySymbol ?? current?.simbolo_moneda ?? 'Bs.'),
              Number(payload.defaultCommission ?? current?.porcentaje_comision ?? 35),
              nowIso,
              'tenant-1'
            );
          break;
        }

        case 'createClient': {
          this.primaryDb
            .prepare(
              `INSERT INTO clientes (id, empresa_id, nombre_completo, telefono, correo, creado_en)
               VALUES (?, ?, ?, ?, ?, ?)
               ON CONFLICT(id) DO NOTHING`
            )
            .run(
              String(payload.id || `cli-${crypto.randomUUID().slice(0, 8)}`),
              String(payload.tenantId || 'tenant-1'),
              String(payload.fullName || 'Cliente'),
              String(payload.phone || ''),
              String(payload.email || ''),
              String(payload.createdAt || nowIso)
            );
          break;
        }

        case 'createAppointment': {
          this.primaryDb
            .prepare(
              `INSERT OR REPLACE INTO citas (id, sucursal_id, cliente_id, empleado_id, servicio_id, fecha, hora_inicio, hora_fin, estado, precio, es_sin_cita, notas, creado_en)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
              String(payload.id),
              String(payload.branchId || 'branch-coyoacan'),
              String(payload.clientId || ''),
              String(payload.employeeId || ''),
              String(payload.serviceId || ''),
              String(payload.date || ''),
              String(payload.startTime || ''),
              String(payload.endTime || ''),
              String(payload.status || 'pending'),
              Number(payload.price || 0),
              payload.isWalkIn ? 1 : 0,
              payload.notes ? String(payload.notes) : null,
              String(payload.createdAt || nowIso)
            );
          break;
        }

        case 'updateAppointmentStatus':
        case 'updateAppointment': {
          const existing = this.primaryDb
            .prepare('SELECT * FROM citas WHERE id = ?')
            .get(String(payload.id)) as Record<string, any> | undefined;

          if (!existing) {
            this.primaryDb
              .prepare(
                `INSERT INTO citas (id, sucursal_id, cliente_id, empleado_id, servicio_id, fecha, hora_inicio, hora_fin, estado, precio, es_sin_cita, notas, creado_en)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .run(
                String(payload.id),
                String(payload.branchId || 'branch-coyoacan'),
                String(payload.clientId || ''),
                String(payload.employeeId || ''),
                String(payload.serviceId || ''),
                String(payload.date || ''),
                String(payload.startTime || ''),
                String(payload.endTime || ''),
                String(payload.status || 'confirmed'),
                Number(payload.price || 0),
                0,
                payload.notes ? String(payload.notes) : null,
                nowIso
              );
          }

          this.primaryDb
            .prepare(
              `UPDATE citas
               SET estado = ?, fecha = ?, hora_inicio = ?, hora_fin = ?, empleado_id = ?, notas = ?
               WHERE id = ?`
            )
            .run(
              String(payload.status ?? existing?.estado ?? 'confirmed'),
              String(payload.date ?? existing?.fecha ?? ''),
              String(payload.startTime ?? existing?.hora_inicio ?? ''),
              String(payload.endTime ?? existing?.hora_fin ?? ''),
              String(payload.employeeId ?? existing?.empleado_id ?? ''),
              payload.notes !== undefined ? String(payload.notes) : existing?.notas ?? null,
              String(payload.id)
            );
          break;
        }

        case 'addToQueue': {
          this.primaryDb
            .prepare(
              `INSERT OR REPLACE INTO turnos_espera (id, sucursal_id, nombre_completo, telefono, empleado_id, servicio_id, estado, prioridad, fecha_llegada)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
              String(payload.id || `q-${crypto.randomUUID().slice(0, 8)}`),
              String(payload.branchId || 'branch-coyoacan'),
              String(payload.fullName || 'Walk-In'),
              String(payload.phone || ''),
              payload.employeeId ? String(payload.employeeId) : null,
              String(payload.serviceId || ''),
              String(payload.status || 'waiting'),
              String(payload.priority || 'normal'),
              nowIso
            );
          break;
        }

        case 'updateQueueStatus': {
          const existing = this.primaryDb
            .prepare('SELECT * FROM turnos_espera WHERE id = ?')
            .get(String(payload.id)) as Record<string, any> | undefined;

          if (!existing) {
            this.primaryDb
              .prepare(
                `INSERT INTO turnos_espera (id, sucursal_id, nombre_completo, telefono, empleado_id, servicio_id, estado, prioridad, fecha_llegada)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .run(
                String(payload.id),
                String(payload.branchId || 'branch-coyoacan'),
                String(payload.fullName || 'Cliente en Fila'),
                '',
                payload.employeeId ? String(payload.employeeId) : null,
                '',
                'waiting',
                'normal',
                nowIso
              );
          }

          this.primaryDb
            .prepare(`UPDATE turnos_espera SET estado = ?, empleado_id = COALESCE(?, empleado_id) WHERE id = ?`)
            .run(
              String(payload.status || 'serving'),
              payload.employeeId ? String(payload.employeeId) : null,
              String(payload.id)
            );
          break;
        }

        case 'createSale': {
          this.primaryDb
            .prepare(
              `INSERT OR REPLACE INTO ventas (id, sucursal_id, cliente_id, cajero_id, subtotal, descuento, propina, total, metodo_pago, cantidad_items, fecha)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
              String(payload.id),
              String(payload.branchId || 'branch-coyoacan'),
              payload.clientId ? String(payload.clientId) : null,
              String(payload.cashierId || 'emp-sofia'),
              Number(payload.subtotal || 0),
              Number(payload.discount || 0),
              Number(payload.tip || 0),
              Number(payload.total || 0),
              String(payload.paymentMethod || 'cash'),
              Number(payload.itemsCount || 1),
              String(payload.date || nowIso)
            );
          break;
        }

        case 'openCashSession': {
          this.primaryDb
            .prepare(
              `INSERT OR REPLACE INTO sesiones_caja (id, sucursal_id, empleado_id, estado, saldo_inicial, fecha_apertura)
               VALUES (?, ?, ?, ?, ?, ?)`
            )
            .run(
              String(payload.id || `sess-${crypto.randomUUID().slice(0, 8)}`),
              String(payload.branchId || 'branch-coyoacan'),
              String(payload.employeeId || 'emp-sofia'),
              'open',
              Number(payload.openingBalance || 0),
              nowIso
            );
          break;
        }

        case 'closeCashSession': {
          const existing = this.primaryDb
            .prepare('SELECT * FROM sesiones_caja WHERE id = ?')
            .get(String(payload.id)) as Record<string, any> | undefined;

          if (!existing) {
            this.primaryDb
              .prepare(
                `INSERT INTO sesiones_caja (id, sucursal_id, empleado_id, estado, saldo_inicial, fecha_apertura)
                 VALUES (?, ?, ?, ?, ?, ?)`
              )
              .run(
                String(payload.id),
                String(payload.branchId || 'branch-coyoacan'),
                'emp-sofia',
                'open',
                Number(payload.openingBalance || 0),
                nowIso
              );
          }

          this.primaryDb
            .prepare(
              `UPDATE sesiones_caja
               SET estado = 'closed', saldo_final = ?, saldo_esperado = ?, notas = ?, fecha_cierre = ?
               WHERE id = ?`
            )
            .run(
              Number(payload.closingBalance || 0),
              Number(payload.expectedBalance ?? payload.closingBalance ?? 0),
              payload.notes ? String(payload.notes) : null,
              nowIso,
              String(payload.id)
            );
          break;
        }

        case 'createCashMovement': {
          this.primaryDb
            .prepare(
              `INSERT OR REPLACE INTO movimientos_caja (id, sesion_id, sucursal_id, tipo, monto, motivo, fecha)
               VALUES (?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
              String(payload.id || `mov-${crypto.randomUUID().slice(0, 8)}`),
              String(payload.sessionId || ''),
              String(payload.branchId || 'branch-coyoacan'),
              String(payload.type || 'income'),
              Number(payload.amount || 0),
              String(payload.reason || 'Movimiento de caja'),
              nowIso
            );
          break;
        }

        case 'createProduct': {
          this.primaryDb
            .prepare(
              `INSERT OR REPLACE INTO productos (id, sucursal_id, nombre, sku, precio, costo, existencia, existencia_minima, categoria, proveedor_id, creado_en)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
              String(payload.id),
              String(payload.branchId || 'branch-coyoacan'),
              String(payload.name || 'Producto'),
              String(payload.sku || ''),
              Number(payload.price || 0),
              Number(payload.cost || 0),
              Number(payload.stock || 0),
              Number(payload.minStock || 5),
              String(payload.category || 'General'),
              payload.providerId ? String(payload.providerId) : null,
              nowIso
            );
          break;
        }

        case 'updateProduct':
        case 'adjustStock': {
          const existing = this.primaryDb
            .prepare('SELECT * FROM productos WHERE id = ?')
            .get(String(payload.id)) as Record<string, any> | undefined;

          if (!existing) {
            this.primaryDb
              .prepare(
                `INSERT INTO productos (id, sucursal_id, nombre, sku, precio, costo, existencia, existencia_minima, categoria, proveedor_id, creado_en)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .run(
                String(payload.id),
                String(payload.branchId || 'branch-coyoacan'),
                String(payload.name || 'Producto'),
                String(payload.sku || ''),
                Number(payload.price || 0),
                Number(payload.cost || 0),
                Number(payload.previousStock ?? payload.stock ?? 0),
                Number(payload.minStock || 5),
                String(payload.category || 'General'),
                payload.providerId ? String(payload.providerId) : null,
                nowIso
              );
          }

          this.primaryDb
            .prepare(
              `UPDATE productos
               SET nombre = ?, sku = ?, precio = ?, costo = ?, existencia = ?, existencia_minima = ?, categoria = ?, proveedor_id = ?
               WHERE id = ?`
            )
            .run(
              String(payload.name ?? existing?.nombre ?? 'Producto'),
              String(payload.sku ?? existing?.sku ?? ''),
              Number(payload.price ?? existing?.precio ?? 0),
              Number(payload.cost ?? existing?.costo ?? 0),
              Number(payload.stock ?? existing?.existencia ?? 0),
              Number(payload.minStock ?? existing?.existencia_minima ?? 5),
              String(payload.category ?? existing?.categoria ?? 'General'),
              payload.providerId !== undefined
                ? payload.providerId
                  ? String(payload.providerId)
                  : null
                : existing?.proveedor_id ?? null,
              String(payload.id)
            );
          break;
        }

        case 'deleteProduct': {
          const existing = this.primaryDb
            .prepare('SELECT id FROM productos WHERE id = ?')
            .get(String(payload.id));
          if (!existing) {
            this.primaryDb
              .prepare(
                `INSERT INTO productos (id, sucursal_id, nombre, sku, precio, costo, existencia, existencia_minima, categoria, creado_en)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .run(
                String(payload.id),
                String(payload.branchId || 'branch-coyoacan'),
                String(payload.name || 'Producto eliminado'),
                String(payload.sku || ''),
                Number(payload.price || 0),
                Number(payload.cost || 0),
                Number(payload.stock || 0),
                5,
                'General',
                nowIso
              );
          }
          this.primaryDb.prepare('DELETE FROM productos WHERE id = ?').run(String(payload.id));
          break;
        }

        case 'createService': {
          this.primaryDb
            .prepare(
              `INSERT OR REPLACE INTO servicios (id, codigo, nombre, categoria, precio, duracion, activo, creado_en)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
              String(payload.id || `ser-${crypto.randomUUID().slice(0, 8)}`),
              String(payload.code || payload.codigo || 'SRV-000'),
              String(payload.name || 'Servicio'),
              String(payload.category || 'Corte'),
              Number(payload.price || 0),
              Number(payload.duration || 30),
              payload.active === false ? 0 : 1,
              nowIso
            );
          break;
        }

        case 'updateService': {
          const existing = this.primaryDb
            .prepare('SELECT * FROM servicios WHERE id = ?')
            .get(String(payload.id)) as Record<string, any> | undefined;

          if (!existing) {
            this.primaryDb
              .prepare(
                `INSERT INTO servicios (id, codigo, nombre, categoria, precio, duracion, activo, creado_en)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .run(
                String(payload.id),
                String(payload.code || payload.codigo || 'SRV-000'),
                String(payload.name || 'Servicio'),
                String(payload.category || 'Corte'),
                Number(payload.price || 0),
                Number(payload.duration || 30),
                1,
                nowIso
              );
          }

          this.primaryDb
            .prepare(
              `UPDATE servicios
               SET codigo = ?, nombre = ?, categoria = ?, precio = ?, duracion = ?, activo = ?
               WHERE id = ?`
            )
            .run(
              String(payload.code ?? payload.codigo ?? existing?.codigo ?? 'SRV-000'),
              String(payload.name ?? existing?.nombre ?? 'Servicio'),
              String(payload.category ?? existing?.categoria ?? 'Corte'),
              Number(payload.price ?? existing?.precio ?? 0),
              Number(payload.duration ?? existing?.duracion ?? 30),
              payload.active === false ? 0 : 1,
              String(payload.id)
            );
          break;
        }

        case 'createEmployee': {
          this.primaryDb
            .prepare(
              `INSERT OR REPLACE INTO empleados (id, sucursal_id, nombre_completo, telefono, correo, rol, porcentaje_comision, activo, creado_en)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
              String(payload.id || `emp-${crypto.randomUUID().slice(0, 8)}`),
              String(payload.branchId || 'branch-coyoacan'),
              String(payload.fullName || 'Barbero'),
              String(payload.phone || ''),
              String(payload.email || ''),
              String(payload.role || 'barber'),
              Number(payload.commissionRate ?? 0.35),
              payload.active === false ? 0 : 1,
              nowIso
            );
          break;
        }

        case 'updateEmployee': {
          const existing = this.primaryDb
            .prepare('SELECT * FROM empleados WHERE id = ?')
            .get(String(payload.id)) as Record<string, any> | undefined;

          if (!existing) {
            this.primaryDb
              .prepare(
                `INSERT INTO empleados (id, sucursal_id, nombre_completo, telefono, correo, rol, porcentaje_comision, activo, creado_en)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .run(
                String(payload.id),
                String(payload.branchId || 'branch-coyoacan'),
                String(payload.fullName || 'Barbero'),
                String(payload.phone || ''),
                String(payload.email || ''),
                String(payload.role || 'barber'),
                Number(payload.commissionRate ?? 0.35),
                1,
                nowIso
              );
          }

          this.primaryDb
            .prepare(
              `UPDATE empleados
               SET nombre_completo = ?, telefono = ?, correo = ?, rol = ?, porcentaje_comision = ?, activo = ?
               WHERE id = ?`
            )
            .run(
              String(payload.fullName ?? existing?.nombre_completo ?? 'Barbero'),
              String(payload.phone ?? existing?.telefono ?? ''),
              String(payload.email ?? existing?.correo ?? ''),
              String(payload.role ?? existing?.rol ?? 'barber'),
              Number(payload.commissionRate ?? existing?.porcentaje_comision ?? 0.35),
              payload.active === false ? 0 : 1,
              String(payload.id)
            );
          break;
        }

        case 'deleteEmployee': {
          const existing = this.primaryDb
            .prepare('SELECT id FROM empleados WHERE id = ?')
            .get(String(payload.id));
          if (!existing) {
            this.primaryDb
              .prepare(
                `INSERT INTO empleados (id, sucursal_id, nombre_completo, rol, creado_en)
                 VALUES (?, ?, ?, ?, ?)`
              )
              .run(
                String(payload.id),
                String(payload.branchId || 'branch-coyoacan'),
                String(payload.fullName || 'Empleado eliminado'),
                'barber',
                nowIso
              );
          }
          this.primaryDb.prepare('DELETE FROM empleados WHERE id = ?').run(String(payload.id));
          break;
        }

        case 'createProvider': {
          this.primaryDb
            .prepare(
              `INSERT OR REPLACE INTO proveedores (id, nombre, nombre_contacto, telefono, correo, direccion, creado_en)
               VALUES (?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
              String(payload.id || `prov-${crypto.randomUUID().slice(0, 8)}`),
              String(payload.name || 'Proveedor'),
              String(payload.contactName || ''),
              String(payload.phone || ''),
              String(payload.email || ''),
              String(payload.address || ''),
              nowIso
            );
          break;
        }

        case 'updateProvider': {
          const existing = this.primaryDb
            .prepare('SELECT * FROM proveedores WHERE id = ?')
            .get(String(payload.id)) as Record<string, any> | undefined;

          if (!existing) {
            this.primaryDb
              .prepare(
                `INSERT INTO proveedores (id, nombre, nombre_contacto, telefono, correo, direccion, creado_en)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`
              )
              .run(
                String(payload.id),
                String(payload.name || 'Proveedor'),
                String(payload.contactName || ''),
                String(payload.phone || ''),
                String(payload.email || ''),
                String(payload.address || ''),
                nowIso
              );
          }

          this.primaryDb
            .prepare(
              `UPDATE proveedores
               SET nombre = ?, nombre_contacto = ?, telefono = ?, correo = ?, direccion = ?
               WHERE id = ?`
            )
            .run(
              String(payload.name ?? existing?.nombre ?? 'Proveedor'),
              String(payload.contactName ?? existing?.nombre_contacto ?? ''),
              String(payload.phone ?? existing?.telefono ?? ''),
              String(payload.email ?? existing?.correo ?? ''),
              String(payload.address ?? existing?.direccion ?? ''),
              String(payload.id)
            );
          break;
        }

        case 'deleteProvider': {
          const existing = this.primaryDb
            .prepare('SELECT id FROM proveedores WHERE id = ?')
            .get(String(payload.id));
          if (!existing) {
            this.primaryDb
              .prepare(`INSERT INTO proveedores (id, nombre, creado_en) VALUES (?, ?, ?)`)
              .run(String(payload.id), String(payload.name || 'Proveedor eliminado'), nowIso);
          }
          this.primaryDb.prepare('DELETE FROM proveedores WHERE id = ?').run(String(payload.id));
          break;
        }

        case 'createPurchase': {
          this.primaryDb
            .prepare(
              `INSERT OR REPLACE INTO compras (id, sucursal_id, proveedor_id, numero_factura, estado, metodo_pago, total, fecha, cantidad_items, creado_en)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
              String(payload.id),
              String(payload.branchId || 'branch-coyoacan'),
              String(payload.providerId || ''),
              String(payload.invoiceNumber || ''),
              String(payload.status || 'completed'),
              String(payload.paymentMethod || 'cash'),
              Number(payload.total || 0),
              String(payload.date || nowIso.split('T')[0]),
              Number(payload.itemsCount || 1),
              nowIso
            );
          break;
        }

        case 'deletePurchase': {
          const existing = this.primaryDb
            .prepare('SELECT id FROM compras WHERE id = ?')
            .get(String(payload.id));
          if (!existing) {
            this.primaryDb
              .prepare(
                `INSERT INTO compras (id, sucursal_id, numero_factura, total, creado_en)
                 VALUES (?, ?, ?, ?, ?)`
              )
              .run(
                String(payload.id),
                String(payload.branchId || 'branch-coyoacan'),
                String(payload.invoiceNumber || String(payload.id)),
                Number(payload.total || 0),
                nowIso
              );
          }
          this.primaryDb.prepare('DELETE FROM compras WHERE id = ?').run(String(payload.id));
          break;
        }

        default: {
          this.primaryDb
            .prepare(
              `INSERT INTO eventos_pagina (id, tipo_evento, modulo, sucursal_id, resumen, detalles_json, nivel, creado_en)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
              `evt-${crypto.randomUUID()}`,
              'SYSTEM',
              'Sistema',
              payload.branchId ? String(payload.branchId) : null,
              `Operación sincronizada: ${action}`,
              JSON.stringify(payload),
              'INFO',
              nowIso
            );
        }
      }

      return { triggered: true, action };
    });
  }

  public logPageEvent(
    actor: ActorContext,
    event: {
      tipoEvento: string;
      modulo: string;
      sucursalId?: string | null;
      resumen: string;
      detalles?: Record<string, any> | null;
      nivel?: 'INFO' | 'WARNING' | 'CRITICAL';
    }
  ): { triggered: boolean } {
    return this.runWithActor(actor, () => {
      const sanitizedDetails = event.detalles ? { ...event.detalles } : null;
      if (sanitizedDetails && 'password' in sanitizedDetails) {
        delete sanitizedDetails.password;
      }

      this.primaryDb
        .prepare(
          `INSERT INTO eventos_pagina (id, tipo_evento, modulo, sucursal_id, resumen, detalles_json, nivel, creado_en)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          `evt-${crypto.randomUUID()}`,
          String(event.tipoEvento || 'PAGE_VIEW'),
          String(event.modulo || 'Navegación'),
          event.sucursalId ? String(event.sucursalId) : null,
          String(event.resumen || 'Evento en aplicación'),
          sanitizedDetails ? JSON.stringify(sanitizedDetails) : null,
          event.nivel || 'INFO',
          new Date().toISOString()
        );

      return { triggered: true };
    });
  }

  private mapRowToEntry(row: Record<string, any>): AuditLogRecord {
    return {
      id: Number(row.id),
      logUuid: String(row.log_uuid),
      fechaHora: String(row.fecha_hora),
      fechaHoraLocal: String(row.fecha_hora_local),
      usuario: String(row.usuario),
      rolUsuario: String(row.rol_usuario),
      origen: row.origen === 'APLICACION_WEB' ? 'APLICACION_WEB' : 'TRIGGER_DB',
      baseDatosOrigen: String(row.base_datos_origen),
      baseDatosDestino: String(row.base_datos_destino),
      tablaAfectada: String(row.tabla_afectada),
      operacion: String(row.operacion),
      registroId: row.registro_id !== null ? String(row.registro_id) : null,
      modulo: String(row.modulo),
      sucursalId: row.sucursal_id !== null ? String(row.sucursal_id) : null,
      resumen: String(row.resumen),
      datosAnteriores: row.datos_anteriores !== null ? String(row.datos_anteriores) : null,
      datosNuevos: row.datos_nuevos !== null ? String(row.datos_nuevos) : null,
      triggerNombre: row.trigger_nombre !== null ? String(row.trigger_nombre) : null,
      ipOrigen: row.ip_origen !== null ? String(row.ip_origen) : null,
      userAgent: row.user_agent !== null ? String(row.user_agent) : null,
      nivel:
        row.nivel === 'CRITICAL' ? 'CRITICAL' : row.nivel === 'WARNING' ? 'WARNING' : 'INFO',
      creadoEn: String(row.creado_en),
    };
  }

  public queryLogs(filters: AuditQueryFilters = {}): {
    logs: AuditLogRecord[];
    total: number;
  } {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filters.modulo && filters.modulo !== 'ALL') {
      conditions.push('modulo = ?');
      params.push(filters.modulo);
    }

    if (filters.operacion && filters.operacion !== 'ALL') {
      conditions.push('operacion = ?');
      params.push(filters.operacion);
    }

    if (filters.nivel && filters.nivel !== 'ALL') {
      conditions.push('nivel = ?');
      params.push(filters.nivel);
    }

    if (filters.dateFrom) {
      conditions.push('substr(fecha_hora, 1, 10) >= ?');
      params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      conditions.push('substr(fecha_hora, 1, 10) <= ?');
      params.push(filters.dateTo);
    }

    if (filters.search && filters.search.trim().length > 0) {
      const term = `%${filters.search.trim()}%`;
      conditions.push(
        '(usuario LIKE ? OR resumen LIKE ? OR tabla_afectada LIKE ? OR trigger_nombre LIKE ? OR COALESCE(registro_id, \'\') LIKE ?)'
      );
      params.push(term, term, term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = Math.min(Math.max(Number(filters.limit || 150), 1), 500);
    const offset = Math.max(Number(filters.offset || 0), 0);

    const countRow = this.logsDb
      .prepare(`SELECT COUNT(*) AS total FROM audit_logs ${whereClause}`)
      .get(...params) as { total: number };

    const rows = this.logsDb
      .prepare(`SELECT * FROM audit_logs ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset) as Record<string, any>[];

    return {
      logs: rows.map(row => this.mapRowToEntry(row)),
      total: Number(countRow?.total || 0),
    };
  }

  public getAuditSummary(): {
    totalLogs: number;
    todayLogs: number;
    triggerLogs: number;
    criticalOrWarningLogs: number;
    activeTriggersCount: number;
    primaryDbName: string;
    logsDbName: string;
    activeTriggers: Array<{ name: string; tableName: string; sql: string }>;
    modulesBreakdown: Array<{ modulo: string; total: number }>;
    operationsBreakdown: Array<{ operacion: string; total: number }>;
  } {
    const todayPrefix = new Date().toISOString().slice(0, 10);

    const totalRow = this.logsDb
      .prepare('SELECT COUNT(*) AS total FROM audit_logs')
      .get() as { total: number };
    const todayRow = this.logsDb
      .prepare('SELECT COUNT(*) AS total FROM audit_logs WHERE substr(fecha_hora, 1, 10) = ?')
      .get(todayPrefix) as { total: number };
    const triggerRow = this.logsDb
      .prepare("SELECT COUNT(*) AS total FROM audit_logs WHERE origen = 'TRIGGER_DB'")
      .get() as { total: number };
    const alertRow = this.logsDb
      .prepare("SELECT COUNT(*) AS total FROM audit_logs WHERE nivel IN ('WARNING', 'CRITICAL')")
      .get() as { total: number };

    const modulesRows = this.logsDb
      .prepare('SELECT modulo, COUNT(*) AS total FROM audit_logs GROUP BY modulo ORDER BY total DESC LIMIT 12')
      .all() as Array<{ modulo: string; total: number }>;

    const opsRows = this.logsDb
      .prepare('SELECT operacion, COUNT(*) AS total FROM audit_logs GROUP BY operacion ORDER BY total DESC LIMIT 12')
      .all() as Array<{ operacion: string; total: number }>;

    const triggerRows = this.primaryDb
      .prepare("SELECT name, tbl_name, sql FROM sqlite_master WHERE type = 'trigger' ORDER BY tbl_name, name")
      .all() as Array<{ name: string; tbl_name: string; sql: string }>;

    return {
      totalLogs: Number(totalRow?.total || 0),
      todayLogs: Number(todayRow?.total || 0),
      triggerLogs: Number(triggerRow?.total || 0),
      criticalOrWarningLogs: Number(alertRow?.total || 0),
      activeTriggersCount: triggerRows.length,
      primaryDbName: DualDatabaseAuditManager.PRIMARY_DB_NAME,
      logsDbName: DualDatabaseAuditManager.LOGS_DB_NAME,
      activeTriggers: triggerRows.map(t => ({
        name: String(t.name),
        tableName: String(t.tbl_name),
        sql: String(t.sql),
      })),
      modulesBreakdown: modulesRows.map(r => ({ modulo: String(r.modulo), total: Number(r.total) })),
      operationsBreakdown: opsRows.map(r => ({
        operacion: String(r.operacion),
        total: Number(r.total),
      })),
    };
  }

  private escapeCsvCell(value: string | number | null | undefined): string {
    const raw = value === null || value === undefined ? '' : String(value);
    const neutralized = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
    return `"${neutralized.replace(/"/g, '""')}"`;
  }

  public exportLogsCsv(filters: AuditQueryFilters = {}): string {
    const { logs } = this.queryLogs({ ...filters, limit: 500, offset: 0 });
    const headers = [
      'ID',
      'UUID',
      'Fecha Hora UTC',
      'Fecha Hora Bolivia',
      'Usuario',
      'Rol',
      'BD Origen',
      'BD Destino',
      'Tabla Afectada',
      'Operacion',
      'Trigger SQL',
      'Modulo',
      'Registro ID',
      'Sucursal ID',
      'Nivel',
      'Resumen',
      'Datos Anteriores',
      'Datos Nuevos',
      'IP Origen',
    ];

    const lines = [headers.map(h => this.escapeCsvCell(h)).join(',')];
    for (const log of logs) {
      lines.push(
        [
          log.id,
          log.logUuid,
          log.fechaHora,
          log.fechaHoraLocal,
          log.usuario,
          log.rolUsuario,
          log.baseDatosOrigen,
          log.baseDatosDestino,
          log.tablaAfectada,
          log.operacion,
          log.triggerNombre,
          log.modulo,
          log.registroId,
          log.sucursalId,
          log.nivel,
          log.resumen,
          log.datosAnteriores,
          log.datosNuevos,
          log.ipOrigen,
        ]
          .map(cell => this.escapeCsvCell(cell))
          .join(',')
      );
    }
    return '\uFEFF' + lines.join('\n');
  }
}

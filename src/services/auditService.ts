/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AuditLogEntry,
  AuditLogFilter,
  AuditLogLevel,
  AuditOperationType,
  AuditSummaryData,
} from '../types';
import { authManager } from './authManager';

/**
 * Servicio OOP cliente encargado de sincronizar las operaciones de `db_barberia`
 * hacia el servidor para disparar los triggers hacia `db_barberia_logs`,
 * consultar logs de auditoría y exportar reportes CSV.
 */
export class AuditClientService {
  private static readonly LOCAL_LOGS_MIRROR_KEY = 'db_barberia_logs_mirror_v1';
  private static readonly MAX_LOCAL_MIRROR_ENTRIES = 250;

  private buildMirrorEntry(params: {
    tablaAfectada: string;
    operacion: AuditOperationType;
    registroId?: string | null;
    modulo: string;
    sucursalId?: string | null;
    resumen: string;
    datosNuevos?: Record<string, any> | null;
    triggerNombre?: string;
    nivel?: AuditLogLevel;
    actorHint?: string;
  }): AuditLogEntry {
    const now = new Date();
    const usuario = authManager.isAuthenticated()
      ? authManager.getAdminUsername()
      : params.actorHint
      ? `Cliente (${params.actorHint})`
      : 'Cliente Público';

    return {
      id: Date.now(),
      logUuid: `local-${Math.random().toString(36).slice(2, 10)}`,
      fechaHora: now.toISOString(),
      fechaHoraLocal: now.toLocaleString('es-BO', { hour12: false }),
      usuario,
      rolUsuario: authManager.isAuthenticated() ? 'admin' : 'client',
      origen: 'TRIGGER_DB',
      baseDatosOrigen: 'db_barberia',
      baseDatosDestino: 'db_barberia_logs',
      tablaAfectada: params.tablaAfectada,
      operacion: params.operacion,
      registroId: params.registroId || null,
      modulo: params.modulo,
      sucursalId: params.sucursalId || null,
      resumen: params.resumen,
      datosAnteriores: null,
      datosNuevos: params.datosNuevos ? JSON.stringify(params.datosNuevos) : null,
      triggerNombre: params.triggerNombre || null,
      ipOrigen: 'client-session',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 120) : null,
      nivel: params.nivel || 'INFO',
      creadoEn: now.toISOString(),
    };
  }

  private appendLocalMirror(entry: AuditLogEntry): void {
    try {
      const raw = localStorage.getItem(AuditClientService.LOCAL_LOGS_MIRROR_KEY);
      const existing: AuditLogEntry[] = raw ? JSON.parse(raw) : [];
      const updated = [entry, ...existing].slice(0, AuditClientService.MAX_LOCAL_MIRROR_ENTRIES);
      localStorage.setItem(AuditClientService.LOCAL_LOGS_MIRROR_KEY, JSON.stringify(updated));
    } catch {
      // Ignorar errores de almacenamiento local
    }
  }

  public recordDatabaseMutation(params: {
    action: string;
    tablaAfectada: string;
    operacion: AuditOperationType;
    modulo: string;
    resumen: string;
    payload: Record<string, any>;
    triggerNombre?: string;
    actorHint?: string;
    nivel?: AuditLogLevel;
  }): void {
    const mirror = this.buildMirrorEntry({
      tablaAfectada: params.tablaAfectada,
      operacion: params.operacion,
      registroId: params.payload?.id ? String(params.payload.id) : null,
      modulo: params.modulo,
      sucursalId: params.payload?.branchId ? String(params.payload.branchId) : null,
      resumen: params.resumen,
      datosNuevos: params.payload,
      triggerNombre: params.triggerNombre,
      actorHint: params.actorHint,
      nivel: params.nivel,
    });
    this.appendLocalMirror(mirror);

    void fetch('/api/audit/sync-mutation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authManager.getAuthHeaders(),
      },
      body: JSON.stringify({
        action: params.action,
        payload: params.payload,
        actorHint: params.actorHint,
      }),
    }).catch(() => {
      // Fallo silencioso para no bloquear la operación local de UI
    });
  }

  public recordPageEvent(params: {
    tipoEvento: AuditOperationType;
    modulo: string;
    sucursalId?: string | null;
    resumen: string;
    detalles?: Record<string, any> | null;
    nivel?: AuditLogLevel;
    actorHint?: string;
  }): void {
    const mirror = this.buildMirrorEntry({
      tablaAfectada: 'eventos_pagina',
      operacion: params.tipoEvento,
      modulo: params.modulo,
      sucursalId: params.sucursalId,
      resumen: params.resumen,
      datosNuevos: params.detalles,
      triggerNombre: 'trg_eventos_pagina_ai',
      actorHint: params.actorHint,
      nivel: params.nivel,
    });
    this.appendLocalMirror(mirror);

    void fetch('/api/audit/event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authManager.getAuthHeaders(),
      },
      body: JSON.stringify({
        tipoEvento: params.tipoEvento,
        modulo: params.modulo,
        sucursalId: params.sucursalId || null,
        resumen: params.resumen,
        detalles: params.detalles || null,
        nivel: params.nivel || 'INFO',
        actorHint: params.actorHint,
      }),
    }).catch(() => {
      // Fallo silencioso de telemetría
    });
  }

  public async fetchLogs(
    filters: AuditLogFilter = {}
  ): Promise<{ logs: AuditLogEntry[]; total: number }> {
    const query = new URLSearchParams();
    if (filters.search) query.set('search', filters.search);
    if (filters.modulo && filters.modulo !== 'ALL') query.set('modulo', filters.modulo);
    if (filters.operacion && filters.operacion !== 'ALL') query.set('operacion', filters.operacion);
    if (filters.nivel && filters.nivel !== 'ALL') query.set('nivel', filters.nivel);
    if (filters.dateFrom) query.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) query.set('dateTo', filters.dateTo);
    if (filters.limit) query.set('limit', String(filters.limit));
    if (filters.offset) query.set('offset', String(filters.offset));

    const response = await fetch(`/api/audit/logs?${query.toString()}`, {
      headers: {
        ...authManager.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error || 'No se pudieron consultar los registros de db_barberia_logs.');
    }

    return response.json();
  }

  public async fetchSummary(): Promise<AuditSummaryData> {
    const response = await fetch('/api/audit/summary', {
      headers: {
        ...authManager.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error || 'No se pudo obtener el resumen de auditoría.');
    }

    return response.json();
  }

  public async downloadCsvReport(filters: AuditLogFilter = {}): Promise<void> {
    const query = new URLSearchParams();
    if (filters.search) query.set('search', filters.search);
    if (filters.modulo && filters.modulo !== 'ALL') query.set('modulo', filters.modulo);
    if (filters.operacion && filters.operacion !== 'ALL') query.set('operacion', filters.operacion);
    if (filters.nivel && filters.nivel !== 'ALL') query.set('nivel', filters.nivel);
    if (filters.dateFrom) query.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) query.set('dateTo', filters.dateTo);

    const response = await fetch(`/api/audit/export?${query.toString()}`, {
      headers: {
        ...authManager.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error || 'No se pudo exportar el reporte CSV.');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `db_barberia_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
}

export const auditService = new AuditClientService();

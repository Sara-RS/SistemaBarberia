/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BaseAppComponent } from '../../context/AppContext';
import { auditService } from '../../services/auditService';
import {
  AuditLogEntry,
  AuditLogFilter,
  AuditSummaryData,
  AuditTriggerDefinition,
} from '../../types';
import {
  Database,
  RefreshCw,
  Download,
  Search,
  Eye,
  X,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Clock,
  GitBranch,
  Filter,
} from 'lucide-react';

interface AuditLogsAdminState {
  logs: AuditLogEntry[];
  totalCount: number;
  summary: AuditSummaryData | null;
  isLoading: boolean;
  isExporting: boolean;
  errorMsg: string;
  filters: AuditLogFilter;
  selectedLog: AuditLogEntry | null;
  triggersModalOpen: boolean;
}

/**
 * Módulo OOP (Clase React) de Auditoría y Registro de Eventos.
 * Consulta la base de datos separada `db_barberia_logs` alimentada por los triggers
 * instalados en `db_barberia`.
 */
export class AuditLogsAdmin extends BaseAppComponent<{}, AuditLogsAdminState> {
  private static readonly MODULE_OPTIONS = [
    'ALL',
    'Agenda',
    'Caja / POS',
    'Compras',
    'Inventario',
    'Proveedores',
    'Servicios',
    'Barberos',
    'Clientes',
    'Parametrización',
    'Autenticación',
    'Navegación',
    'Reservas Cliente',
    'Chatbot IA',
    'Interfaz',
    'Sucursales',
    'Auditoría y Logs',
  ];

  private static readonly OPERATION_OPTIONS = [
    'ALL',
    'INSERT',
    'UPDATE',
    'DELETE',
    'LOGIN',
    'LOGIN_FAILED',
    'LOGOUT',
    'PAGE_VIEW',
    'CHATBOT_QUERY',
    'THEME_CHANGE',
    'BRANCH_CHANGE',
    'ROLE_SWITCH',
    'EXPORT',
    'SYSTEM',
  ];

  constructor(props: {}) {
    super(props);
    this.state = {
      logs: [],
      totalCount: 0,
      summary: null,
      isLoading: true,
      isExporting: false,
      errorMsg: '',
      filters: {
        search: '',
        modulo: 'ALL',
        operacion: 'ALL',
        nivel: 'ALL',
        dateFrom: '',
        dateTo: '',
        limit: 150,
        offset: 0,
      },
      selectedLog: null,
      triggersModalOpen: false,
    };
  }

  public componentDidMount(): void {
    void this.loadAuditData();
  }

  private loadAuditData = async (customFilters?: AuditLogFilter): Promise<void> => {
    const activeFilters = customFilters || this.state.filters;
    this.setState({ isLoading: true, errorMsg: '' });

    try {
      const [logsResponse, summaryResponse] = await Promise.all([
        auditService.fetchLogs(activeFilters),
        auditService.fetchSummary(),
      ]);
      this.setState({
        logs: logsResponse.logs,
        totalCount: logsResponse.total,
        summary: summaryResponse,
        isLoading: false,
      });
    } catch (err: any) {
      this.setState({
        isLoading: false,
        errorMsg: err?.message || 'Error al cargar la auditoría desde db_barberia_logs.',
      });
    }
  };

  private handleFilterChange = (partial: Partial<AuditLogFilter>): void => {
    const nextFilters = { ...this.state.filters, ...partial, offset: 0 };
    this.setState({ filters: nextFilters });
    void this.loadAuditData(nextFilters);
  };

  private handleResetFilters = (): void => {
    const reset: AuditLogFilter = {
      search: '',
      modulo: 'ALL',
      operacion: 'ALL',
      nivel: 'ALL',
      dateFrom: '',
      dateTo: '',
      limit: 150,
      offset: 0,
    };
    this.setState({ filters: reset });
    void this.loadAuditData(reset);
  };

  private handleExportCsv = async (): Promise<void> => {
    this.setState({ isExporting: true, errorMsg: '' });
    try {
      await auditService.downloadCsvReport(this.state.filters);
      await this.loadAuditData();
    } catch (err: any) {
      this.setState({
        errorMsg: err?.message || 'No se pudo generar la exportación CSV.',
      });
    } finally {
      this.setState({ isExporting: false });
    }
  };

  private formatJsonPreview(rawJson: string | null): string {
    if (!rawJson) return 'Sin datos';
    try {
      const parsed = JSON.parse(rawJson);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return rawJson;
    }
  }

  private getLevelVisual(level: AuditLogEntry['nivel']): {
    textClass: string;
    label: string;
    icon: React.ReactNode;
  } {
    if (level === 'CRITICAL') {
      return {
        textClass: 'text-rose-700 dark:text-rose-400',
        label: 'Crítico',
        icon: <ShieldAlert className="w-3.5 h-3.5 shrink-0" />,
      };
    }
    if (level === 'WARNING') {
      return {
        textClass: 'text-amber-700 dark:text-amber-400',
        label: 'Alerta',
        icon: <AlertTriangle className="w-3.5 h-3.5 shrink-0" />,
      };
    }
    return {
      textClass: 'text-emerald-700 dark:text-emerald-400',
      label: 'Nominal',
      icon: <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />,
    };
  }

  public render(): React.ReactNode {
    const {
      logs,
      totalCount,
      summary,
      isLoading,
      isExporting,
      errorMsg,
      filters,
      selectedLog,
      triggersModalOpen,
    } = this.state;

    return (
      <div className="space-y-6 animate-fadeIn">
        {/* ENCABEZADO */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Auditoría del Sistema y Logs
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Base de datos separada{' '}
              <span className="font-mono font-semibold text-navy-800 dark:text-navy-300">
                db_barberia_logs
              </span>{' '}
              alimentada automáticamente mediante triggers SQL en{' '}
              <span className="font-mono font-semibold text-navy-800 dark:text-navy-300">
                db_barberia
              </span>
              .
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => this.setState({ triggersModalOpen: true })}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-[#243D63] bg-white dark:bg-[#0D1A2D] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#12233B] text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <GitBranch className="w-3.5 h-3.5 text-navy-700 dark:text-navy-300" />
              <span>
                Triggers Activos ({summary?.activeTriggersCount ?? 0})
              </span>
            </button>

            <button
              type="button"
              onClick={() => void this.loadAuditData()}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-[#243D63] bg-white dark:bg-[#0D1A2D] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#12233B] text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>

            <button
              type="button"
              onClick={() => void this.handleExportCsv()}
              disabled={isExporting || logs.length === 0}
              className="px-4 py-2 rounded-lg bg-navy-800 hover:bg-navy-700 dark:bg-navy-600 dark:hover:bg-navy-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Exportando...' : 'Exportar CSV'}</span>
            </button>
          </div>
        </div>

        {/* ERROR */}
        {errorMsg && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 rounded-xl px-4 py-3 text-xs font-medium flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => void this.loadAuditData()}
              className="text-xs font-bold underline cursor-pointer whitespace-nowrap"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* RESUMEN CUANTITATIVO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Total Registros</span>
              <Database className="w-4 h-4 text-navy-700 dark:text-navy-300" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono tabular-nums">
              {summary ? summary.totalLogs.toLocaleString('es-BO') : '—'}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Almacenados en <span className="font-mono">db_barberia_logs</span>
            </p>
          </div>

          <div className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Eventos de Hoy</span>
              <Clock className="w-4 h-4 text-navy-700 dark:text-navy-300" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono tabular-nums">
              {summary ? summary.todayLogs.toLocaleString('es-BO') : '—'}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Fecha UTC actual · Registro continuo
            </p>
          </div>

          <div className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Disparos por Triggers</span>
              <GitBranch className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono tabular-nums">
              {summary ? summary.triggerLogs.toLocaleString('es-BO') : '—'}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {summary?.activeTriggersCount ?? 0} triggers SQL activos en db_barberia
            </p>
          </div>

          <div className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Alertas y Eliminaciones</span>
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono tabular-nums">
              {summary ? summary.criticalOrWarningLogs.toLocaleString('es-BO') : '—'}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Intentos fallidos, bajas y egresos
            </p>
          </div>
        </div>

        {/* BARRA DE FILTROS */}
        <div className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
              <Filter className="w-3.5 h-3.5 text-navy-700 dark:text-navy-300" />
              <span>Filtros de Auditoría</span>
              <span className="text-slate-400 dark:text-slate-500 font-normal">·</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                {totalCount} resultados
              </span>
            </div>

            <button
              type="button"
              onClick={this.handleResetFilters}
              className="text-xs font-semibold text-navy-700 dark:text-navy-300 hover:underline cursor-pointer"
            >
              Limpiar filtros
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar usuario, tabla, trigger o descripción..."
                value={filters.search || ''}
                onChange={e => this.handleFilterChange({ search: e.target.value })}
                className="w-full bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-navy-600 dark:focus:border-navy-400"
              />
            </div>

            <select
              value={filters.modulo || 'ALL'}
              onChange={e => this.handleFilterChange({ modulo: e.target.value })}
              aria-label="Filtrar por módulo"
              className="bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-navy-600 cursor-pointer"
            >
              {AuditLogsAdmin.MODULE_OPTIONS.map(mod => (
                <option key={mod} value={mod}>
                  {mod === 'ALL' ? 'Todos los módulos' : mod}
                </option>
              ))}
            </select>

            <select
              value={filters.operacion || 'ALL'}
              onChange={e => this.handleFilterChange({ operacion: e.target.value })}
              aria-label="Filtrar por operación"
              className="bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-navy-600 cursor-pointer"
            >
              {AuditLogsAdmin.OPERATION_OPTIONS.map(op => (
                <option key={op} value={op}>
                  {op === 'ALL' ? 'Todas las operaciones' : op}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={filters.dateFrom || ''}
              onChange={e => this.handleFilterChange({ dateFrom: e.target.value })}
              aria-label="Fecha desde"
              className="bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-navy-600 font-mono tabular-nums"
            />

            <input
              type="date"
              value={filters.dateTo || ''}
              onChange={e => this.handleFilterChange({ dateTo: e.target.value })}
              aria-label="Fecha hasta"
              className="bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-navy-600 font-mono tabular-nums"
            />
          </div>
        </div>

        {/* TABLA DE LOGS */}
        <div className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map(row => (
                <div
                  key={row}
                  className="h-10 rounded-lg bg-slate-100 dark:bg-[#12233B] animate-pulse"
                />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Database className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                No se encontraron registros de auditoría
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Ajusta los filtros de búsqueda o realiza una acción en la barbería para generar un nuevo registro automático mediante triggers.
              </p>
              <button
                type="button"
                onClick={this.handleResetFilters}
                className="px-4 py-2 rounded-lg bg-navy-800 hover:bg-navy-700 dark:bg-navy-600 text-white text-xs font-semibold cursor-pointer"
              >
                Restablecer filtros
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#1E3354] bg-slate-50/80 dark:bg-[#0A1526] text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4 whitespace-nowrap">ID · Fecha y Hora</th>
                    <th className="py-3 px-4 whitespace-nowrap">Usuario</th>
                    <th className="py-3 px-4 whitespace-nowrap">Módulo</th>
                    <th className="py-3 px-4 whitespace-nowrap">Operación · Trigger</th>
                    <th className="py-3 px-4">Detalle</th>
                    <th className="py-3 px-4 whitespace-nowrap">Nivel</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Inspección</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1E3354] text-xs">
                  {logs.map(log => {
                    const levelInfo = this.getLevelVisual(log.nivel);
                    return (
                      <tr
                        key={log.logUuid}
                        className="hover:bg-slate-50/90 dark:hover:bg-[#12233B]/70 transition-colors"
                      >
                        <td className="py-3 px-4 whitespace-nowrap font-mono tabular-nums text-slate-700 dark:text-slate-200">
                          <span className="text-slate-400 dark:text-slate-500 mr-1.5">#{log.id}</span>
                          <span>{log.fechaHoraLocal}</span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {log.usuario}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {log.rolUsuario} · {log.ipOrigen || '127.0.0.1'}
                          </div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap text-slate-700 dark:text-slate-200 font-medium">
                          {log.modulo}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-mono font-bold text-navy-800 dark:text-navy-300">
                            {log.operacion}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            {log.tablaAfectada} · {log.triggerNombre || 'trigger_audit'}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-700 dark:text-slate-200 max-w-md">
                          <p className="line-clamp-2 leading-relaxed">{log.resumen}</p>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 font-semibold ${levelInfo.textClass}`}
                          >
                            {levelInfo.icon}
                            <span>{levelInfo.label}</span>
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => this.setState({ selectedLog: log })}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#243D63] text-navy-800 dark:text-navy-200 hover:bg-navy-50 dark:hover:bg-[#162B47] font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL DE DETALLE DE LOG */}
        {selectedLog && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => this.setState({ selectedLog: null })}
          >
            <div
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="px-6 py-4 border-b border-slate-200 dark:border-[#1E3354] flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Detalle de Auditoría #{selectedLog.id}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    {selectedLog.baseDatosOrigen} → {selectedLog.baseDatosDestino} · {selectedLog.triggerNombre || 'trigger_audit'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => this.setState({ selectedLog: null })}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#12233B] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-100 dark:border-[#1E3354]">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Fecha y Hora Local</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                      {selectedLog.fechaHoraLocal}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Timestamp UTC</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {selectedLog.fechaHora}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Usuario / Rol</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {selectedLog.usuario} ({selectedLog.rolUsuario})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Tabla · Operación</span>
                    <span className="font-mono font-semibold text-navy-800 dark:text-navy-300">
                      {selectedLog.tablaAfectada} · {selectedLog.operacion}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Registro ID</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {selectedLog.registroId || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">IP / Cliente</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200 break-all">
                      {selectedLog.ipOrigen || '127.0.0.1'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 font-semibold block mb-1">
                    Resumen del Evento
                  </span>
                  <p className="text-slate-900 dark:text-slate-100 leading-relaxed">
                    {selectedLog.resumen}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 font-semibold block mb-1.5">
                      Datos Anteriores (OLD)
                    </span>
                    <pre className="p-3 rounded-lg bg-slate-50 dark:bg-[#0A1526] border border-slate-200 dark:border-[#1E3354] text-[11px] font-mono text-slate-700 dark:text-slate-300 overflow-x-auto max-h-56">
                      {this.formatJsonPreview(selectedLog.datosAnteriores)}
                    </pre>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 font-semibold block mb-1.5">
                      Datos Nuevos (NEW)
                    </span>
                    <pre className="p-3 rounded-lg bg-slate-50 dark:bg-[#0A1526] border border-slate-200 dark:border-[#1E3354] text-[11px] font-mono text-slate-700 dark:text-slate-300 overflow-x-auto max-h-56">
                      {this.formatJsonPreview(selectedLog.datosNuevos)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE TRIGGERS ACTIVOS EN db_barberia */}
        {triggersModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => this.setState({ triggersModalOpen: false })}
          >
            <div
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="px-6 py-4 border-b border-slate-200 dark:border-[#1E3354] flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Triggers SQL Integrados en db_barberia
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Cada trigger ejecuta automáticamente la inserción del registro en la base de datos separada{' '}
                    <span className="font-mono font-semibold">db_barberia_logs</span>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => this.setState({ triggersModalOpen: false })}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#12233B] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4">
                {(summary?.activeTriggers || []).map((trg: AuditTriggerDefinition) => (
                  <div
                    key={trg.name}
                    className="border border-slate-200 dark:border-[#1E3354] rounded-xl p-4 bg-slate-50/70 dark:bg-[#0A1526]"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-xs font-bold text-navy-800 dark:text-navy-300">
                        {trg.name}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        Tabla: {trg.tableName} → db_barberia_logs
                      </span>
                    </div>
                    <pre className="text-[11px] font-mono text-slate-700 dark:text-slate-300 overflow-x-auto whitespace-pre-wrap">
                      {trg.sql}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

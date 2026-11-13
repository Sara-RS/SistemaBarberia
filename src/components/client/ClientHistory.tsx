/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BaseAppComponent } from '../../context/AppContext';
import { CurrencyFormatter, DateTimeHelper } from '../../utils/helpers';
import { Calendar, Clock, Scissors, AlertCircle, User } from 'lucide-react';

interface ClientHistoryState {
  filter: 'all' | 'upcoming' | 'past';
}

export class ClientHistory extends BaseAppComponent<{}, ClientHistoryState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      filter: 'all',
    };
  }

  private handleCancelAppointment = (id: string): void => {
    if (window.confirm('¿Está seguro de que desea cancelar esta reserva?')) {
      this.app.updateAptStatus(id, 'cancelled');
    }
  };

  public render(): React.ReactNode {
    const { appointments, services, employees } = this.app;
    const { filter } = this.state;

    const clientApts = appointments.filter(a => a.clientId === 'cli-juan');
    const todayStr = '2026-07-02';

    const filteredApts = clientApts.filter(apt => {
      const aptDate = apt.date || '';
      if (filter === 'upcoming') {
        return aptDate >= todayStr && apt.status !== 'cancelled';
      }
      if (filter === 'past') {
        return aptDate < todayStr || apt.status === 'completed' || apt.status === 'cancelled';
      }
      return true;
    });

    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Mis Reservas</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Consulta tu historial de cortes, rituales de barba y tratamientos faciales.
            </p>
          </div>

          <div className="flex bg-slate-100 dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] p-1 rounded-lg">
            <button
              onClick={() => this.setState({ filter: 'all' })}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-navy-800 dark:bg-navy-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => this.setState({ filter: 'upcoming' })}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                filter === 'upcoming'
                  ? 'bg-navy-800 dark:bg-navy-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Próximas
            </button>
            <button
              onClick={() => this.setState({ filter: 'past' })}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                filter === 'past'
                  ? 'bg-navy-800 dark:bg-navy-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Historial
            </button>
          </div>
        </div>

        {filteredApts.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-slate-200 dark:border-[#1E3354] bg-white dark:bg-[#0D1A2D] max-w-xl mx-auto space-y-3 shadow-sm">
            <AlertCircle className="w-10 h-10 text-navy-600 dark:text-navy-300 mx-auto" />
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white">No se encontraron reservas</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Aún no tienes citas agendadas bajo este filtro.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {filteredApts.map(apt => {
              const service = services.find(s => s.id === apt.serviceId);
              const employee = employees.find(e => e.id === apt.employeeId);
              const isCancelled = apt.status === 'cancelled';
              const isCompleted = apt.status === 'completed';
              const isUpcoming = (apt.date || '') >= todayStr && apt.status !== 'cancelled' && apt.status !== 'completed';

              return (
                <div
                  key={apt.id}
                  className={`p-5 rounded-xl border flex flex-col justify-between transition-all ${
                    isCancelled
                      ? 'border-slate-200 dark:border-[#1E3354] bg-slate-50/70 dark:bg-[#0A1526] opacity-60'
                      : isCompleted
                      ? 'border-slate-200 dark:border-[#1E3354] bg-slate-50/70 dark:bg-[#0A1526]'
                      : 'border-navy-200 dark:border-[#243D63] hover:border-navy-400 dark:hover:border-navy-400 bg-white dark:bg-[#0D1A2D] shadow-sm'
                  }`}
                >
                  <div className="space-y-3.5">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">
                        Cita #{apt.id.slice(0, 8)}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${
                          isCancelled
                            ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                            : isCompleted
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                            : 'bg-navy-50 dark:bg-navy-900/70 text-navy-800 dark:text-navy-200 border border-navy-200 dark:border-navy-700/60'
                        }`}
                      >
                        {apt.status}
                      </span>
                    </div>

                    <div className="flex gap-3 items-start">
                      <div className="w-9 h-9 rounded-lg bg-navy-50 dark:bg-navy-900/70 border border-navy-200 dark:border-navy-700/60 flex items-center justify-center text-navy-700 dark:text-navy-300 shrink-0">
                        <Scissors className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-extrabold text-sm text-slate-800 dark:text-white block">
                          {service?.name || 'Servicio Barbería'}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          Barbero:{' '}
                          <strong className="text-slate-700 dark:text-slate-200 font-semibold">
                            {employee?.fullName || 'Especialista'}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-2 border-t border-b border-slate-100 dark:border-[#1E3354] text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Fecha</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                          <Calendar className="w-3.5 h-3.5 text-navy-700 dark:text-navy-300" />
                          {DateTimeHelper.formatLegible(apt.date || '')}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Horario</span>
                        <span className="font-bold text-navy-700 dark:text-navy-300 flex items-center gap-1.5 mt-0.5 font-mono">
                          <Clock className="w-3.5 h-3.5 text-navy-700 dark:text-navy-300" />
                          {apt.startTime} - {apt.endTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-4">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Importe pagado</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                        {CurrencyFormatter.format(apt.price || 0)}
                      </span>
                    </div>

                    {isUpcoming && (
                      <button
                        onClick={() => this.handleCancelAppointment(apt.id)}
                        className="px-3 py-1.5 text-[11px] bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-lg transition-all font-bold cursor-pointer"
                      >
                        Cancelar cita
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
}

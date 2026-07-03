/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDateLegible } from '../../utils/helpers';
import { Calendar, Clock, Scissors, AlertCircle, RefreshCw, XCircle, ChevronRight, User } from 'lucide-react';

export const ClientHistory: React.FC = () => {
  const { appointments, services, employees, updateAptStatus, selectedBranchId } = useApp();
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  // Filtrar citas del cliente demostrativo "Juan Pérez" (ID: cli-juan)
  const clientApts = appointments.filter(a => a.clientId === 'cli-juan');

  const filteredApts = clientApts.filter(apt => {
    const todayStr = '2026-07-02';
    if (filter === 'upcoming') {
      return apt.date >= todayStr && apt.status !== 'cancelled';
    }
    if (filter === 'past') {
      return apt.date < todayStr || apt.status === 'completed' || apt.status === 'cancelled';
    }
    return true;
  });

  const handleCancelAppointment = (id: string) => {
    if (window.confirm('¿Está seguro de que desea cancelar esta reserva?')) {
      updateAptStatus(id, 'cancelled');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Mis Reservas</h1>
          <p className="text-xs text-slate-500 mt-1">Consulta tu historial de cortes, rituales de barba y tratamientos faciales.</p>
        </div>

        {/* CONTROLES FILTRADO */}
        <div className="flex bg-slate-100 border border-slate-200 p-1 rounded-lg">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
              filter === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
              filter === 'upcoming' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Próximas
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
              filter === 'past' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Historial
          </button>
        </div>
      </div>

      {filteredApts.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border border-slate-200 bg-slate-50 max-w-xl mx-auto space-y-3 shadow-sm">
          <AlertCircle className="w-10 h-10 text-indigo-400 mx-auto" />
          <div>
            <h3 className="font-bold text-slate-800">No se encontraron reservas</h3>
            <p className="text-xs text-slate-500 mt-1">Aún no tienes citas agendadas bajo este filtro.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {filteredApts.map((apt) => {
            const service = services.find(s => s.id === apt.serviceId);
            const employee = employees.find(e => e.id === apt.employeeId);
            const isCancelled = apt.status === 'cancelled';
            const isCompleted = apt.status === 'completed';
            const isUpcoming = apt.date >= '2026-07-02' && apt.status !== 'cancelled' && apt.status !== 'completed';

            return (
              <div
                key={apt.id}
                className={`p-5 rounded-xl border flex flex-col justify-between transition-all ${
                  isCancelled
                    ? 'border-slate-200 bg-slate-50/50 opacity-60'
                    : isCompleted
                    ? 'border-slate-200 bg-slate-50/50'
                    : 'border-indigo-150 hover:border-indigo-300 bg-white shadow-sm'
                }`}
              >
                <div className="space-y-3.5">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Cita #{apt.id.slice(0, 8)}</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${
                      isCancelled
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : isCompleted
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    }`}>
                      {apt.status}
                    </span>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                      <Scissors className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-extrabold text-sm text-slate-800 block">{service?.name || 'Servicio Barbería'}</span>
                      <span className="text-xs text-slate-500 mt-0.5 block flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        Barbero: <strong className="text-slate-700 font-semibold">{employee?.fullName || 'Especialista'}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-2 border-t border-b border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Fecha</span>
                      <span className="font-bold text-slate-700 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        {formatDateLegible(apt.date)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Horario</span>
                      <span className="font-bold text-indigo-600 flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        {apt.startTime} - {apt.endTime}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-4">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Importe pagado</span>
                    <span className="text-sm font-black text-slate-900">{formatCurrency(apt.price)}</span>
                  </div>

                  {isUpcoming && (
                    <button
                      onClick={() => handleCancelAppointment(apt.id)}
                      className="px-3 py-1.5 text-[11px] bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-lg transition-all font-bold cursor-pointer"
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
};

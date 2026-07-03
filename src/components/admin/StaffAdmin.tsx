/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/helpers';
import { Users, UserPlus, Clock, Award, Shield, CheckCircle, XCircle } from 'lucide-react';

export const StaffAdmin: React.FC = () => {
  const { employees, selectedBranchId, updateEmployee } = useApp();

  const branchStaff = employees.filter(e => e.branchId === selectedBranchId);

  const handleToggleActive = (id: string, currentStatus: boolean) => {
    updateEmployee(id, { active: !currentStatus });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
        <div>
          <h2 className="font-bold text-slate-900 text-base">Personal & Comisión de Barberos</h2>
          <span className="text-[10px] text-slate-500 block">Configuración de jornadas laborales, especialidades de barbería y estatus activo.</span>
        </div>
      </div>

      {/* STAFF LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {branchStaff.map((emp) => {
          const isBarber = emp.role === 'barber';

          return (
            <div
              key={emp.id}
              className={`p-5 rounded-xl border bg-white transition-all flex flex-col justify-between shadow-sm ${
                emp.active ? 'border-slate-200 hover:border-slate-300' : 'border-slate-150 opacity-60'
              }`}
            >
              <div className="space-y-4">
                {/* HEADER INFO CARDS */}
                <div className="flex justify-between items-start">
                  <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0 font-bold shadow-sm">
                      {emp.fullName.charAt(0)}{emp.fullName.split(' ')[1]?.charAt(0) || ''}
                    </div>
                    <div>
                      <span className="font-bold text-sm text-slate-800 block">{emp.fullName}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 capitalize font-semibold">{emp.role}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleActive(emp.id, emp.active)}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border cursor-pointer transition-all ${
                      emp.active
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                    }`}
                  >
                    {emp.active ? 'Activo (En turno)' : 'Inactivo (Vacaciones)'}
                  </button>
                </div>

                {/* ESPECIALIDADES */}
                {isBarber && emp.specialties.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Especialidades</span>
                    <div className="flex flex-wrap gap-1">
                      {emp.specialties.map((spec, index) => (
                        <span key={index} className="bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* JORNADA Y DESCANSO */}
                <div className="grid grid-cols-2 gap-4 py-2 border-t border-b border-slate-100 text-xs text-slate-600">
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block flex items-center gap-1">
                      <Clock className="w-3 h-3 text-indigo-600" />
                      <span>Horario Shift</span>
                    </span>
                    <span className="font-bold text-slate-850">
                      {emp.workSchedule.start} - {emp.workSchedule.end}
                    </span>
                  </div>
                  
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block flex items-center gap-1">
                      <Clock className="w-3 h-3 text-indigo-600" />
                      <span>Almuerzo (Lunch)</span>
                    </span>
                    <span className="font-bold text-slate-850">
                      {emp.workSchedule.lunchStart} - {emp.workSchedule.lunchEnd}
                    </span>
                  </div>
                </div>
              </div>

              {/* RENTABILIDAD Y COMISIÓN INFO */}
              <div className="mt-4 pt-3 flex justify-between items-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Tasa de Comisión</span>
                  <span className="text-sm font-black text-indigo-600 block mt-0.5">35% de Servicios</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Descanso Semanal</span>
                  <span className="text-xs font-bold text-slate-600 block capitalize mt-0.5">
                    {emp.workSchedule.offDays.join(', ')}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/helpers';
import { Users, UserPlus, Clock, Award, Shield, CheckCircle, XCircle, Edit, Trash2, Plus, X, Percent } from 'lucide-react';
import { Employee } from '../../types';

export const StaffAdmin: React.FC = () => {
  const { employees, selectedBranchId, updateEmployee, addEmployee, deleteEmployee, currentRole } = useApp();

  const branchStaff = employees.filter(e => e.branchId === selectedBranchId);

  // CRUD state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'recep' | 'barber'>('barber');
  const [commissionRate, setCommissionRate] = useState(35);
  const [specialties, setSpecialties] = useState('');
  const [active, setActive] = useState(true);

  // Simple Schedule Form states
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('18:00');
  const [breakStart, setBreakStart] = useState('13:00');
  const [breakEnd, setBreakEnd] = useState('14:00');
  const [workDays, setWorkDays] = useState({
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: true,
    sunday: false,
  });

  const handleToggleActive = (id: string, currentStatus: boolean) => {
    if (currentRole !== 'admin') return;
    updateEmployee(id, { active: !currentStatus });
  };

  const openAddModal = () => {
    if (currentRole !== 'admin') return;
    setEditingEmployee(null);
    setFullName('');
    setPhone('');
    setEmail('');
    setRole('barber');
    setCommissionRate(35);
    setSpecialties('Corte, Barba');
    setActive(true);
    setShiftStart('09:00');
    setShiftEnd('18:00');
    setBreakStart('13:00');
    setBreakEnd('14:00');
    setWorkDays({
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: false,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    if (currentRole !== 'admin') return;
    setEditingEmployee(emp);
    setFullName(emp.fullName);
    setPhone(emp.phone);
    setEmail(emp.email);
    setRole(emp.role);
    setCommissionRate(Math.round(emp.commissionRate * 100));
    setSpecialties(emp.specialties.join(', '));
    setActive(emp.active);

    // Intentar leer horario del primer día activo
    const daysKeys = Object.keys(emp.schedule || {});
    const activeDaysKeys = daysKeys.filter(day => emp.schedule[day]?.active);
    const firstActiveDay = activeDaysKeys.length > 0 ? emp.schedule[activeDaysKeys[0]] : null;

    if (firstActiveDay) {
      setShiftStart(firstActiveDay.start || '09:00');
      setShiftEnd(firstActiveDay.end || '18:00');
      const brk = firstActiveDay.breaks?.[0];
      if (brk) {
        setBreakStart(brk.start || '13:00');
        setBreakEnd(brk.end || '14:00');
      } else {
        setBreakStart('13:00');
        setBreakEnd('14:00');
      }
    }

    const currentWorkDays = {
      monday: emp.schedule?.monday?.active ?? true,
      tuesday: emp.schedule?.tuesday?.active ?? true,
      wednesday: emp.schedule?.wednesday?.active ?? true,
      thursday: emp.schedule?.thursday?.active ?? true,
      friday: emp.schedule?.friday?.active ?? true,
      saturday: emp.schedule?.saturday?.active ?? true,
      sunday: emp.schedule?.sunday?.active ?? false,
    };
    setWorkDays(currentWorkDays);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (currentRole !== 'admin') return;
    if (window.confirm('¿Estás seguro de que deseas eliminar a este barbero/empleado?')) {
      deleteEmployee(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentRole !== 'admin') return;

    // Construir schedule completo para cada día de la semana
    const days: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[] = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ];

    const schedule: Employee['schedule'] = {};
    days.forEach(day => {
      const isDayActive = workDays[day];
      schedule[day] = {
        start: shiftStart,
        end: shiftEnd,
        active: isDayActive,
        breaks: isDayActive ? [{ start: breakStart, end: breakEnd }] : [],
      };
    });

    const specialtiesList = specialties
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const employeeData = {
      fullName,
      phone,
      email,
      role,
      commissionRate: commissionRate / 100,
      specialties: specialtiesList,
      active,
      schedule,
      vacations: editingEmployee ? editingEmployee.vacations : [],
    };

    if (editingEmployee) {
      updateEmployee(editingEmployee.id, employeeData);
    } else {
      addEmployee(employeeData);
    }

    setIsModalOpen(false);
  };

  const toggleDay = (day: keyof typeof workDays) => {
    setWorkDays(prev => ({ ...prev, [day]: !prev[day] }));
  };

  const dayLabels: { [key: string]: string } = {
    monday: 'Lun',
    tuesday: 'Mar',
    wednesday: 'Mie',
    thursday: 'Jue',
    friday: 'Vie',
    saturday: 'Sab',
    sunday: 'Dom',
  };

  const isCurrentRoleAdmin = currentRole === 'admin';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
        <div>
          <h2 className="font-bold text-slate-900 text-base">Personal & Comisión de Barberos</h2>
          <span className="text-[10px] text-slate-500 block">Configuración de jornadas laborales, especialidades de barbería y estatus activo.</span>
        </div>
        {isCurrentRoleAdmin && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Agregar Barbero</span>
          </button>
        )}
      </div>

      {/* STAFF LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {branchStaff.map((emp) => {
          const isBarber = emp.role === 'barber';

          // Traducir los días al español
          const dayNamesEs: { [key: string]: string } = {
            monday: 'Lunes',
            tuesday: 'Martes',
            wednesday: 'Miércoles',
            thursday: 'Jueves',
            friday: 'Viernes',
            saturday: 'Sábado',
            sunday: 'Domingo',
          };

          // Obtener días libres
          const offDays = Object.keys(emp.schedule || {})
            .filter((day) => !emp.schedule[day]?.active)
            .map((day) => dayNamesEs[day] || day);

          // Obtener horas y descansos del primer día activo
          const activeDaysKeys = Object.keys(emp.schedule || {}).filter(
            (day) => emp.schedule[day]?.active
          );
          const firstActiveDay = activeDaysKeys.length > 0 ? emp.schedule[activeDaysKeys[0]] : null;

          const startShift = firstActiveDay?.start || 'N/A';
          const endShift = firstActiveDay?.end || 'N/A';

          const firstBreak = firstActiveDay?.breaks?.[0];
          const startBreak = firstBreak?.start || 'N/A';
          const endBreak = firstBreak?.end || 'N/A';

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
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-slate-800 block">{emp.fullName}</span>
                        {isCurrentRoleAdmin && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditModal(emp)}
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-50 transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(emp.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-50 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5 capitalize font-semibold">{emp.role === 'barber' ? 'Barbero Profesional' : emp.role}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleActive(emp.id, emp.active)}
                    disabled={!isCurrentRoleAdmin}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                      isCurrentRoleAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-80'
                    } ${
                      emp.active
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                    }`}
                  >
                    {emp.active ? 'Activo (En turno)' : 'Inactivo (Vacaciones)'}
                  </button>
                </div>

                {/* INFO CONTACT */}
                <div className="text-[11px] text-slate-500 space-y-0.5">
                  <div><span className="font-semibold text-slate-700">Email:</span> {emp.email}</div>
                  <div><span className="font-semibold text-slate-700">Teléfono:</span> {emp.phone}</div>
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
                      {startShift} - {endShift}
                    </span>
                  </div>
                  
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block flex items-center gap-1">
                      <Clock className="w-3 h-3 text-indigo-600" />
                      <span>Almuerzo (Lunch)</span>
                    </span>
                    <span className="font-bold text-slate-850">
                      {startBreak} - {endBreak}
                    </span>
                  </div>
                </div>
              </div>

              {/* RENTABILIDAD Y COMISIÓN INFO */}
              <div className="mt-4 pt-3 flex justify-between items-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Tasa de Comisión</span>
                  <span className="text-sm font-black text-indigo-600 block mt-0.5">{(emp.commissionRate * 100).toFixed(0)}% de Servicios</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Descanso Semanal</span>
                  <span className="text-xs font-bold text-slate-600 block capitalize mt-0.5">
                    {offDays.length > 0 ? offDays.join(', ') : 'Ninguno'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CRUD MODAL */}
      {isModalOpen && isCurrentRoleAdmin && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scaleIn my-8">
            <div className="flex justify-between items-center bg-slate-50 px-5 py-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingEmployee ? 'Editar Barbero / Personal' : 'Agregar Nuevo Barbero'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase block">Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase block">Teléfono</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 77123456"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase block">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="Ej. juan@barba.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase block">Rol</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                  >
                    <option value="barber">Barbero</option>
                    <option value="recep">Recepcionista</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase block">Comisión (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="0"
                      max="100"
                      value={commissionRate}
                      onChange={e => setCommissionRate(Number(e.target.value))}
                      className="w-full text-xs pl-3 pr-8 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                    <span className="absolute right-3 top-2.5 text-slate-400 text-xs font-bold">%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase block">Especialidades (separadas por coma)</label>
                <input
                  type="text"
                  placeholder="Corte, Barba, Limpieza"
                  value={specialties}
                  onChange={e => setSpecialties(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* SCHEDULE GENERATOR */}
              <div className="border-t border-slate-100 pt-3 space-y-3">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Horario de Trabajo</span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 font-bold uppercase block">Inicio Turno</label>
                    <input
                      type="time"
                      value={shiftStart}
                      onChange={e => setShiftStart(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 font-bold uppercase block">Fin Turno</label>
                    <input
                      type="time"
                      value={shiftEnd}
                      onChange={e => setShiftEnd(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 font-bold uppercase block">Inicio Almuerzo</label>
                    <input
                      type="time"
                      value={breakStart}
                      onChange={e => setBreakStart(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 font-bold uppercase block">Fin Almuerzo</label>
                    <input
                      type="time"
                      value={breakEnd}
                      onChange={e => setBreakEnd(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* WEEKDAYS SELECTOR */}
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-400 font-bold uppercase block">Días Laborales</label>
                  <div className="flex gap-1 justify-between bg-slate-50 p-2 border border-slate-100 rounded-lg">
                    {Object.keys(workDays).map((day) => {
                      const isActive = workDays[day as keyof typeof workDays];
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day as keyof typeof workDays)}
                          className={`w-9 h-9 text-[10px] font-bold rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                            isActive
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                              : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          {dayLabels[day]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ACTIVE STATUS TOGGLE */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Estado de Contrato</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={e => setActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  <span className="ml-2 text-xs font-semibold text-slate-700">{active ? 'Contratado / Activo' : 'Inactivo / Suspendido'}</span>
                </label>
              </div>

              {/* SUBMIT ACTIONS */}
              <div className="flex gap-3 border-t border-slate-150 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer"
                >
                  {editingEmployee ? 'Guardar Cambios' : 'Crear Barbero'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

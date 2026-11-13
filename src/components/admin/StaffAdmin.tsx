/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BaseAppComponent } from '../../context/AppContext';
import { ModelFactory } from '../../models/DomainModels';
import { UserPlus, Clock, Edit, Trash2, X } from 'lucide-react';
import { Employee } from '../../types';

interface WorkDaysState {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

interface StaffAdminState {
  isModalOpen: boolean;
  editingEmployee: Employee | null;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  role: 'admin' | 'recep' | 'barber';
  commissionRate: number;
  specialties: string;
  active: boolean;
  shiftStart: string;
  shiftEnd: string;
  breakStart: string;
  breakEnd: string;
  workDays: WorkDaysState;
}

export class StaffAdmin extends BaseAppComponent<{}, StaffAdminState> {
  private readonly dayLabels: Record<string, string> = {
    monday: 'Lun',
    tuesday: 'Mar',
    wednesday: 'Mie',
    thursday: 'Jue',
    friday: 'Vie',
    saturday: 'Sab',
    sunday: 'Dom',
  };

  private readonly dayNamesEs: Record<string, string> = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo',
  };

  constructor(props: {}) {
    super(props);
    this.state = {
      isModalOpen: false,
      editingEmployee: null,
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      role: 'barber',
      commissionRate: 35,
      specialties: '',
      active: true,
      shiftStart: '09:00',
      shiftEnd: '18:00',
      breakStart: '13:00',
      breakEnd: '14:00',
      workDays: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
        sunday: false,
      },
    };
  }

  private handleToggleActive = (id: string, currentStatus: boolean): void => {
    if (this.app.currentRole !== 'admin') return;
    this.app.updateEmployee(id, { active: !currentStatus });
  };

  private openAddModal = (): void => {
    if (this.app.currentRole !== 'admin') return;
    this.setState({
      editingEmployee: null,
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      role: 'barber',
      commissionRate: 35,
      specialties: 'Corte, Barba',
      active: true,
      shiftStart: '09:00',
      shiftEnd: '18:00',
      breakStart: '13:00',
      breakEnd: '14:00',
      workDays: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
        sunday: false,
      },
      isModalOpen: true,
    });
  };

  private openEditModal = (emp: Employee): void => {
    if (this.app.currentRole !== 'admin') return;
    const empModel = ModelFactory.createEmployee(emp);
    const parts = (empModel.fullName || '').split(' ');
    const shift = empModel.getFirstActiveShift();

    this.setState({
      editingEmployee: emp,
      firstName: parts.length >= 2 ? parts[0] : empModel.fullName || '',
      lastName: parts.length >= 2 ? parts.slice(1).join(' ') : '',
      phone: empModel.phone,
      email: empModel.email,
      role: empModel.role,
      commissionRate: empModel.getCommissionPercentage(),
      specialties: empModel.specialties.join(', '),
      active: empModel.active,
      shiftStart: shift.start !== 'N/A' ? shift.start : '09:00',
      shiftEnd: shift.end !== 'N/A' ? shift.end : '18:00',
      breakStart: shift.breakStart !== 'N/A' ? shift.breakStart : '13:00',
      breakEnd: shift.breakEnd !== 'N/A' ? shift.breakEnd : '14:00',
      workDays: {
        monday: empModel.schedule?.monday?.active ?? true,
        tuesday: empModel.schedule?.tuesday?.active ?? true,
        wednesday: empModel.schedule?.wednesday?.active ?? true,
        thursday: empModel.schedule?.thursday?.active ?? true,
        friday: empModel.schedule?.friday?.active ?? true,
        saturday: empModel.schedule?.saturday?.active ?? true,
        sunday: empModel.schedule?.sunday?.active ?? false,
      },
      isModalOpen: true,
    });
  };

  private handleDelete = (id: string): void => {
    if (this.app.currentRole !== 'admin') return;
    if (window.confirm('¿Estás seguro de que deseas eliminar a este barbero/empleado?')) {
      this.app.deleteEmployee(id);
    }
  };

  private handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (this.app.currentRole !== 'admin') return;

    const {
      editingEmployee,
      firstName,
      lastName,
      phone,
      email,
      role,
      commissionRate,
      specialties,
      active,
      shiftStart,
      shiftEnd,
      breakStart,
      breakEnd,
      workDays,
    } = this.state;

    const days: (keyof WorkDaysState)[] = [
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

    const fullComputedName = `${firstName.trim()} ${lastName.trim()}`.trim();

    const employeeData = {
      fullName: fullComputedName,
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
      this.app.updateEmployee(editingEmployee.id, employeeData);
    } else {
      this.app.addEmployee(employeeData);
    }

    this.setState({ isModalOpen: false });
  };

  private toggleDay = (day: keyof WorkDaysState): void => {
    this.setState(prevState => ({
      workDays: { ...prevState.workDays, [day]: !prevState.workDays[day] },
    }));
  };

  public render(): React.ReactNode {
    const { employees, selectedBranchId, currentRole } = this.app;
    const {
      isModalOpen,
      editingEmployee,
      firstName,
      lastName,
      phone,
      email,
      role,
      commissionRate,
      specialties,
      active,
      shiftStart,
      shiftEnd,
      breakStart,
      breakEnd,
      workDays,
    } = this.state;

    const branchStaff = employees.filter(e => e.branchId === selectedBranchId);
    const isCurrentRoleAdmin = currentRole === 'admin';

    return (
      <div className="space-y-6 animate-fadeIn">
        {/* HEADER SECTION */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] p-4 rounded-xl shadow-sm">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white text-base">Personal & Comisión de Barberos</h2>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
              Configuración de jornadas laborales, especialidades de barbería y estatus activo.
            </span>
          </div>
          {isCurrentRoleAdmin && (
            <button
              onClick={this.openAddModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-navy-800 hover:bg-navy-700 dark:bg-navy-600 dark:hover:bg-navy-500 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Agregar Barbero</span>
            </button>
          )}
        </div>

        {/* STAFF LIST */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {branchStaff.map(emp => {
            const empModel = ModelFactory.createEmployee(emp);
            const offDays = empModel.getOffDays(this.dayNamesEs);
            const shift = empModel.getFirstActiveShift();

            return (
              <div
                key={empModel.id}
                className={`p-5 rounded-xl border bg-white dark:bg-[#0D1A2D] transition-all flex flex-col justify-between shadow-sm ${
                  empModel.active
                    ? 'border-slate-200 dark:border-[#1E3354] hover:border-navy-400 dark:hover:border-navy-400'
                    : 'border-slate-200 dark:border-[#1E3354] opacity-60'
                }`}
              >
                <div className="space-y-4">
                  {/* HEADER INFO CARDS */}
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3 items-center">
                      <div className="w-10 h-10 rounded-full bg-navy-800 dark:bg-navy-600 flex items-center justify-center text-white shrink-0 font-bold text-xs shadow-sm">
                        {empModel.getInitials()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-slate-900 dark:text-white block">
                            {empModel.fullName}
                          </span>
                          {isCurrentRoleAdmin && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => this.openEditModal(emp)}
                                className="p-1 text-slate-400 hover:text-navy-700 dark:hover:text-navy-300 rounded-md hover:bg-slate-100 dark:hover:bg-[#12233B] transition-colors cursor-pointer"
                                title="Editar"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => this.handleDelete(empModel.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-navy-700 dark:text-navy-300 block mt-0.5 capitalize font-semibold">
                          {empModel.getRoleLabel()}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => this.handleToggleActive(empModel.id, empModel.active)}
                      disabled={!isCurrentRoleAdmin}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                        isCurrentRoleAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-80'
                      } ${
                        empModel.active
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                          : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60'
                      }`}
                    >
                      {empModel.active ? 'Activo (En turno)' : 'Inactivo (Vacaciones)'}
                    </button>
                  </div>

                  {/* INFO CONTACT */}
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                    <div>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">Email:</span> {empModel.email}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">Teléfono:</span>{' '}
                      <span className="font-mono">{empModel.phone}</span>
                    </div>
                  </div>

                  {/* ESPECIALIDADES */}
                  {empModel.isBarber() && empModel.specialties.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
                        Especialidades
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {empModel.specialties.map((spec, index) => (
                          <span
                            key={index}
                            className="bg-navy-50 dark:bg-navy-900/70 border border-navy-200 dark:border-navy-700/60 text-navy-800 dark:text-navy-200 text-[10px] px-2.5 py-0.5 rounded-md font-bold"
                          >
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* JORNADA Y DESCANSO */}
                  <div className="grid grid-cols-2 gap-4 py-2 border-t border-b border-slate-100 dark:border-[#1E3354] text-xs text-slate-600 dark:text-slate-300">
                    <div className="space-y-0.5">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block flex items-center gap-1">
                        <Clock className="w-3 h-3 text-navy-700 dark:text-navy-300" />
                        <span>Horario Turno</span>
                      </span>
                      <span className="font-bold text-slate-800 dark:text-white font-mono">
                        {shift.start} - {shift.end}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block flex items-center gap-1">
                        <Clock className="w-3 h-3 text-navy-700 dark:text-navy-300" />
                        <span>Almuerzo</span>
                      </span>
                      <span className="font-bold text-slate-800 dark:text-white font-mono">
                        {shift.breakStart} - {shift.breakEnd}
                      </span>
                    </div>
                  </div>
                </div>

                {/* RENTABILIDAD Y COMISIÓN INFO */}
                <div className="mt-4 pt-2 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">
                      Tasa de Comisión
                    </span>
                    <span className="text-sm font-black text-navy-800 dark:text-navy-300 block mt-0.5 font-mono">
                      {empModel.getCommissionPercentage()}% de Servicios
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">
                      Descanso Semanal
                    </span>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block capitalize mt-0.5">
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
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-8">
              <div className="flex justify-between items-center bg-slate-50 dark:bg-[#12233B] px-5 py-4 border-b border-slate-200 dark:border-[#1E3354]">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  {editingEmployee ? 'Editar Barbero / Personal' : 'Agregar Nuevo Barbero'}
                </h3>
                <button
                  onClick={() => this.setState({ isModalOpen: false })}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-[#182E4D] text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={this.handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block">
                      Nombres *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Juan Carlos"
                      value={firstName}
                      onChange={e => this.setState({ firstName: e.target.value })}
                      className="w-full text-xs px-3 py-2 bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] text-slate-800 dark:text-white rounded-lg focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block">
                      Apellidos *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Pérez Mamani"
                      value={lastName}
                      onChange={e => this.setState({ lastName: e.target.value })}
                      className="w-full text-xs px-3 py-2 bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] text-slate-800 dark:text-white rounded-lg focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block">
                      Teléfono
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. 77123456"
                      value={phone}
                      onChange={e => this.setState({ phone: e.target.value })}
                      className="w-full text-xs px-3 py-2 bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] text-slate-800 dark:text-white rounded-lg focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="Ej. juan@barba.com"
                      value={email}
                      onChange={e => this.setState({ email: e.target.value })}
                      className="w-full text-xs px-3 py-2 bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] text-slate-800 dark:text-white rounded-lg focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block">
                      Rol
                    </label>
                    <select
                      value={role}
                      onChange={e => this.setState({ role: e.target.value as 'admin' | 'recep' | 'barber' })}
                      className="w-full text-xs px-3 py-2 bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] text-slate-800 dark:text-white rounded-lg focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                    >
                      <option value="barber">Barbero</option>
                      <option value="recep">Recepcionista</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block">
                      Comisión (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        min="0"
                        max="100"
                        value={commissionRate}
                        onChange={e => this.setState({ commissionRate: Number(e.target.value) })}
                        className="w-full text-xs pl-3 pr-8 py-2 bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] text-slate-800 dark:text-white rounded-lg focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 font-mono"
                      />
                      <span className="absolute right-3 top-2 text-slate-400 text-xs font-bold">%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block">
                    Especialidades (separadas por coma)
                  </label>
                  <input
                    type="text"
                    placeholder="Corte, Barba, Limpieza"
                    value={specialties}
                    onChange={e => this.setState({ specialties: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] text-slate-800 dark:text-white rounded-lg focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                  />
                </div>

                {/* SCHEDULE GENERATOR */}
                <div className="border-t border-slate-100 dark:border-[#1E3354] pt-3 space-y-3">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block">
                    Horario de Trabajo
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 font-bold uppercase block">Inicio Turno</label>
                      <input
                        type="time"
                        value={shiftStart}
                        onChange={e => this.setState({ shiftStart: e.target.value })}
                        className="w-full text-xs px-3 py-1.5 bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] text-slate-800 dark:text-white rounded-lg focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 font-bold uppercase block">Fin Turno</label>
                      <input
                        type="time"
                        value={shiftEnd}
                        onChange={e => this.setState({ shiftEnd: e.target.value })}
                        className="w-full text-xs px-3 py-1.5 bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] text-slate-800 dark:text-white rounded-lg focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 font-bold uppercase block">Inicio Almuerzo</label>
                      <input
                        type="time"
                        value={breakStart}
                        onChange={e => this.setState({ breakStart: e.target.value })}
                        className="w-full text-xs px-3 py-1.5 bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] text-slate-800 dark:text-white rounded-lg focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 font-bold uppercase block">Fin Almuerzo</label>
                      <input
                        type="time"
                        value={breakEnd}
                        onChange={e => this.setState({ breakEnd: e.target.value })}
                        className="w-full text-xs px-3 py-1.5 bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] text-slate-800 dark:text-white rounded-lg focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 font-mono"
                      />
                    </div>
                  </div>

                  {/* WEEKDAYS SELECTOR */}
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 font-bold uppercase block">Días Laborales</label>
                    <div className="flex gap-1 justify-between bg-slate-50 dark:bg-[#12233B] p-2 border border-slate-200 dark:border-[#243D63] rounded-lg">
                      {(Object.keys(workDays) as (keyof WorkDaysState)[]).map(day => {
                        const isActive = workDays[day];
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => this.toggleDay(day)}
                            className={`w-9 h-9 text-[10px] font-bold rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                              isActive
                                ? 'bg-navy-800 dark:bg-navy-600 border-navy-800 dark:border-navy-500 text-white shadow-xs'
                                : 'bg-white dark:bg-[#0D1A2D] border-slate-200 dark:border-[#243D63] text-slate-400 hover:border-navy-400'
                            }`}
                          >
                            {this.dayLabels[day]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* ACTIVE STATUS TOGGLE */}
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-[#1E3354] pt-3">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">
                    Estado de Contrato
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={e => this.setState({ active: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 dark:bg-[#1E3354] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-navy-700 dark:peer-checked:bg-navy-500"></div>
                    <span className="ml-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {active ? 'Contratado / Activo' : 'Inactivo / Suspendido'}
                    </span>
                  </label>
                </div>

                {/* SUBMIT ACTIONS */}
                <div className="flex gap-3 border-t border-slate-100 dark:border-[#1E3354] pt-4 mt-6">
                  <button
                    type="button"
                    onClick={() => this.setState({ isModalOpen: false })}
                    className="flex-1 px-4 py-2 border border-slate-200 dark:border-[#243D63] hover:bg-slate-50 dark:hover:bg-[#12233B] text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-navy-800 hover:bg-navy-700 dark:bg-navy-600 dark:hover:bg-navy-500 text-white rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer"
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
  }
}

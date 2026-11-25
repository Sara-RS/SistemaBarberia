/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BaseAppComponent } from '../../context/AppContext';
import { scheduleEngine } from '../../services/scheduleEngine';
import { CurrencyFormatter, DateTimeHelper } from '../../utils/helpers';
import {
  Sparkles,
  Calendar,
  User,
  Scissors,
  CheckCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Phone,
  Mail,
  Smile,
  MapPin,
} from 'lucide-react';

interface ClientBookingState {
  step: number;
  selectedServiceId: string;
  selectedEmployeeId: string;
  selectedDate: string;
  selectedTime: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  notes: string;
  createdApt: any;
  errorMsg: string;
}

export class ClientBooking extends BaseAppComponent<{}, ClientBookingState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      step: 1,
      selectedServiceId: '',
      selectedEmployeeId: '',
      selectedDate: DateTimeHelper.getTomorrowStr(),
      selectedTime: '',
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      notes: '',
      createdApt: null,
      errorMsg: '',
    };
  }

  private handleNextStep = (): void => {
    const { step, selectedServiceId, selectedEmployeeId, selectedTime } = this.state;
    this.setState({ errorMsg: '' });

    if (step === 1) {
      if (!selectedServiceId) {
        this.setState({ errorMsg: 'Por favor selecciona un servicio para continuar.' });
        return;
      }
      this.setState({ step: 2 });
    } else if (step === 2) {
      if (!selectedEmployeeId) {
        this.setState({ errorMsg: 'Por favor selecciona un barbero para continuar.' });
        return;
      }
      this.setState({ step: 3 });
    } else if (step === 3) {
      if (!selectedTime) {
        this.setState({ errorMsg: 'Por favor selecciona una hora disponible para continuar.' });
        return;
      }
      this.setState({ step: 4 });
    }
  };

  private handlePrevStep = (): void => {
    this.setState(prev => ({
      errorMsg: '',
      step: Math.max(1, prev.step - 1),
    }));
  };

  private handleFinalizeBooking = (e: React.FormEvent): void => {
    e.preventDefault();
    const {
      firstName,
      lastName,
      phone,
      email,
      notes,
      selectedServiceId,
      selectedEmployeeId,
      selectedDate,
      selectedTime,
    } = this.state;
    const { services, addClient, addAppointment, selectedBranchId } = this.app;

    this.setState({ errorMsg: '' });

    if (!firstName.trim() || !phone || !email) {
      this.setState({ errorMsg: 'Nombres, Celular y Correo son obligatorios.' });
      return;
    }

    const activeService = services.find(s => s.id === selectedServiceId);
    const fullComputedName = `${firstName.trim()} ${lastName.trim()}`.trim();

    try {
      const client = addClient({
        tenantId: 'tenant-1',
        fullName: fullComputedName,
        phone,
        email,
        isRegistered: false,
      });

      const [sh, sm] = selectedTime.split(':').map(Number);
      const totalMinutes = sh * 60 + sm + (activeService?.duration || 30);
      const endTimeStr = scheduleEngine.minutesToTime(totalMinutes);

      const appointment = addAppointment({
        branchId: selectedBranchId,
        clientId: client.id,
        employeeId: selectedEmployeeId,
        serviceId: selectedServiceId,
        date: selectedDate,
        startTime: selectedTime,
        endTime: endTimeStr,
        status: 'confirmed',
        price: activeService?.price || 0,
        notes,
        isWalkIn: false,
      });

      this.setState({ createdApt: appointment, step: 5 });
    } catch (err: any) {
      this.setState({ errorMsg: err.message || 'Error al procesar la reserva. Por favor intente de nuevo.' });
    }
  };

  private handleResetBooking = (): void => {
    this.setState({
      selectedServiceId: '',
      selectedEmployeeId: '',
      selectedTime: '',
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      notes: '',
      step: 1,
    });
  };

  public render(): React.ReactNode {
    const { branches, employees, services, selectedBranchId, setSelectedBranchId } = this.app;
    const {
      step,
      selectedServiceId,
      selectedEmployeeId,
      selectedDate,
      selectedTime,
      firstName,
      lastName,
      phone,
      email,
      notes,
      createdApt,
      errorMsg,
    } = this.state;

    const activeBranch = branches.find(b => b.id === selectedBranchId) || branches[0];
    const activeService = services.find(s => s.id === selectedServiceId);
    const activeEmployee = employees.find(e => e.id === selectedEmployeeId);
    const branchBarbers = employees.filter(e => e.branchId === selectedBranchId && e.role === 'barber' && e.active);

    const availableSlots =
      selectedBranchId && selectedEmployeeId && selectedServiceId && selectedDate
        ? scheduleEngine.getAvailableSlots(selectedBranchId, selectedEmployeeId, selectedServiceId, selectedDate)
        : [];

    return (
      <div className="max-w-3xl mx-auto py-4 animate-fadeIn">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-navy-50 dark:bg-navy-900/70 text-navy-800 dark:text-navy-200 border border-navy-200 dark:border-navy-700/60 text-xs font-bold uppercase tracking-wider mb-2.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Reserva en línea</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Agenda tu Servicio</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
            Un ritual de estilo personalizado a tu medida.
          </p>
        </div>

        {step < 5 && (
          <div className="flex items-center justify-between mb-8 px-4">
            {[1, 2, 3, 4].map(s => (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all border ${
                      step === s
                        ? 'bg-navy-800 dark:bg-navy-600 text-white border-navy-800 dark:border-navy-500 shadow-md'
                        : step > s
                        ? 'bg-navy-50 dark:bg-navy-900/80 text-navy-800 dark:text-navy-200 border-navy-200 dark:border-navy-600'
                        : 'bg-white dark:bg-[#0D1A2D] text-slate-400 border-slate-200 dark:border-[#1E3354]'
                    }`}
                  >
                    {step > s ? '✓' : s}
                  </div>
                  <span
                    className={`text-[10px] mt-1.5 font-bold tracking-wide uppercase ${
                      step === s ? 'text-navy-800 dark:text-navy-300' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {s === 1 ? 'Servicio' : s === 2 ? 'Barbero' : s === 3 ? 'Fecha' : 'Confirmar'}
                  </span>
                </div>
                {s < 4 && (
                  <div
                    className={`flex-1 h-[2px] mx-2 transition-all ${
                      step > s ? 'bg-navy-700 dark:bg-navy-500' : 'bg-slate-200 dark:bg-[#1E3354]'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        <div className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-2xl shadow-xl overflow-hidden">
          {errorMsg && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-800/50 px-6 py-3.5 text-xs text-rose-700 dark:text-rose-300 font-medium">
              ⚠️ {errorMsg}
            </div>
          )}

          {step === 1 && (
            <div className="p-6 md:p-8 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-navy-700 dark:text-navy-300" />
                  <span>1. Elige una Sucursal</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {branches.map(b => (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBranchId(b.id)}
                      className={`p-4 text-left rounded-xl border transition-all relative overflow-hidden flex flex-col cursor-pointer ${
                        selectedBranchId === b.id
                          ? 'bg-navy-50/80 dark:bg-navy-900/50 border-navy-700 dark:border-navy-400 shadow-sm'
                          : 'bg-white dark:bg-[#12233B] border-slate-200 dark:border-[#243D63] hover:border-navy-300 dark:hover:border-navy-500'
                      }`}
                    >
                      <span className="font-bold text-slate-900 dark:text-white text-sm block">{b.name}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-300 mt-1 block">{b.address}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-400 mt-2 block font-mono">
                        {b.phone}
                      </span>
                      {selectedBranchId === b.id && (
                        <div className="absolute right-3 top-3 w-4 h-4 rounded-full bg-navy-800 dark:bg-navy-500 flex items-center justify-center text-white font-black text-[9px]">
                          ✓
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-navy-700 dark:text-navy-300" />
                  <span>2. Selecciona tu Servicio</span>
                </h2>
                <div className="space-y-3">
                  {services.map(s => (
                    <button
                      key={s.id}
                      onClick={() => this.setState({ selectedServiceId: s.id })}
                      className={`w-full p-4 text-left rounded-xl border transition-all flex justify-between items-center relative cursor-pointer ${
                        selectedServiceId === s.id
                          ? 'bg-navy-50/80 dark:bg-navy-900/50 border-navy-700 dark:border-navy-400 shadow-sm'
                          : 'bg-white dark:bg-[#12233B] border-slate-200 dark:border-[#243D63] hover:border-navy-300 dark:hover:border-navy-500'
                      }`}
                    >
                      <div className="flex gap-4 items-start pr-8">
                        <div className="w-2.5 h-10 rounded shrink-0" style={{ backgroundColor: s.color }} />
                        <div>
                          <span className="font-bold text-sm text-slate-800 dark:text-white block">{s.name}</span>
                          <p className="text-xs text-slate-500 dark:text-slate-300 mt-1 leading-normal">
                            {s.description}
                          </p>
                          <div className="flex gap-3 mt-2 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-navy-700 dark:text-navy-300" />
                              {s.duration} min
                            </span>
                            <span className="bg-navy-50 dark:bg-navy-900/70 text-navy-800 dark:text-navy-200 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold border border-navy-200 dark:border-navy-700/60">
                              {s.category}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-base font-black text-navy-800 dark:text-navy-300 block font-mono">
                          {CurrencyFormatter.format(s.price || 0)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="p-6 md:p-8 space-y-6">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-navy-700 dark:text-navy-300" />
                <span>3. Elige tu Barbero / Estilista</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {branchBarbers.map(b => (
                  <button
                    key={b.id}
                    onClick={() => this.setState({ selectedEmployeeId: b.id })}
                    className={`p-4 text-left rounded-xl border transition-all relative flex gap-3.5 items-center cursor-pointer ${
                      selectedEmployeeId === b.id
                        ? 'bg-navy-50/80 dark:bg-navy-900/50 border-navy-700 dark:border-navy-400 shadow-sm'
                        : 'bg-white dark:bg-[#12233B] border-slate-200 dark:border-[#243D63] hover:border-navy-300 dark:hover:border-navy-500'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-navy-800 dark:bg-navy-600 flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-sm">
                      {(b.fullName || '').charAt(0)}
                      {(b.fullName || '').split(' ')[1]?.charAt(0) || ''}
                    </div>
                    <div>
                      <span className="font-bold text-sm text-slate-800 dark:text-white block">{b.fullName}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-300 block mt-0.5 capitalize">{b.role}</span>
                      <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-1 leading-normal">
                        Especialidades: {(b.specialties || []).join(', ')}
                      </p>
                    </div>
                    {selectedEmployeeId === b.id && (
                      <div className="absolute right-3 top-3 w-4 h-4 rounded-full bg-navy-800 dark:bg-navy-500 flex items-center justify-center text-white text-[9px] font-bold">
                        ✓
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="p-6 md:p-8 space-y-6">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-navy-700 dark:text-navy-300" />
                <span>4. Selecciona Fecha y Hora</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider block">
                    Elige un Día
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    min={DateTimeHelper.getTodayStr()}
                    onChange={e => this.setState({ selectedDate: e.target.value, selectedTime: '' })}
                    className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                  />
                  <p className="text-[10px] text-slate-400 leading-normal mt-1">
                    Nota: Solo mostramos días habilitados según el horario comercial de la sucursal y la jornada del barbero.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider block">
                    Horarios Disponibles
                  </label>

                  {availableSlots.length === 0 ? (
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-[#243D63] bg-slate-50 dark:bg-[#12233B] text-center text-xs text-slate-500 dark:text-slate-400">
                      No hay horarios disponibles para {selectedDate}. Selecciona otra fecha o barbero.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                      {availableSlots.map(slot => (
                        <button
                          key={slot.time}
                          disabled={!slot.available}
                          onClick={() => this.setState({ selectedTime: slot.time })}
                          className={`py-2 text-center text-xs rounded-lg font-semibold font-mono transition-all border ${
                            selectedTime === slot.time
                              ? 'bg-navy-800 dark:bg-navy-600 text-white border-navy-800 dark:border-navy-500 shadow-md cursor-pointer'
                              : slot.available
                              ? 'bg-white dark:bg-[#12233B] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-[#243D63] hover:border-navy-600 dark:hover:border-navy-400 cursor-pointer'
                              : 'bg-slate-100 dark:bg-[#0A1526] text-slate-400 dark:text-slate-600 border-slate-200 dark:border-[#1E3354] cursor-not-allowed line-through'
                          }`}
                          title={slot.reason}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <form onSubmit={this.handleFinalizeBooking} className="p-6 md:p-8 space-y-6">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Smile className="w-5 h-5 text-navy-700 dark:text-navy-300" />
                <span>5. Ingresa tus Datos Personales</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase block">
                    Nombres *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Ej. Juan de Dios"
                      value={firstName}
                      onChange={e => this.setState({ firstName: e.target.value })}
                      className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase block">
                    Apellidos *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Ej. Mamani Flores"
                      value={lastName}
                      onChange={e => this.setState({ lastName: e.target.value })}
                      className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase block">
                    Teléfono Celular *
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      placeholder="Ej. 71523456"
                      value={phone}
                      onChange={e => this.setState({ phone: e.target.value })}
                      className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 font-mono"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase block">
                    Correo Electrónico *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="Ej. juan.perez@example.com"
                      value={email}
                      onChange={e => this.setState({ email: e.target.value })}
                      className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal mt-1">
                    Te asociaremos un perfil automático con tu correo o celular para que consultes tu historial sin duplicar cuentas.
                  </p>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold block uppercase">
                    Indicaciones especiales / Notas (Opcional)
                  </label>
                  <textarea
                    placeholder="Escribe alguna indicación (Ej. Cita para niño, estilo específico, etc.)"
                    value={notes}
                    onChange={e => this.setState({ notes: e.target.value })}
                    className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 h-20 focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 resize-none"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-xl space-y-2">
                <span className="text-[10px] uppercase font-bold text-navy-700 dark:text-navy-300 tracking-wider">
                  Resumen de tu Reserva
                </span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Servicio</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-white block truncate">
                      {activeService?.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Barbero</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-white block">
                      {activeEmployee?.fullName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                      Fecha y Hora
                    </span>
                    <span className="text-xs font-bold text-navy-800 dark:text-navy-300 block">
                      {DateTimeHelper.formatLegible(selectedDate)} a las {selectedTime}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Inversión</span>
                    <span className="text-xs font-black text-slate-900 dark:text-white block font-mono">
                      {CurrencyFormatter.format(activeService?.price || 0)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-navy-800 hover:bg-navy-700 dark:bg-navy-600 dark:hover:bg-navy-500 text-white py-3 rounded-xl font-bold tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
              >
                <span>Confirmar Reserva y Crear Ticket</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {step === 5 && createdApt && (
            <div className="p-6 md:p-8 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-8 h-8 stroke-[2.5]" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">¡Reserva Completada!</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Tu cita ha sido guardada en nuestra base de datos con éxito.
                </p>
              </div>

              <div className="max-w-md mx-auto bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-xl overflow-hidden shadow-xl relative text-left">
                <div className="h-1.5 bg-navy-800 dark:bg-navy-500 w-full" />

                <div className="p-5 space-y-4">
                  <div className="flex justify-between items-start border-b border-slate-100 dark:border-[#1E3354] pb-3">
                    <div>
                      <span className="text-[9px] uppercase tracking-widest font-black text-navy-700 dark:text-navy-300 block">
                        Ticket de Reserva
                      </span>
                      <span className="text-xs text-slate-400 block mt-0.5 font-mono">ID: {createdApt.id}</span>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 uppercase">
                      Confirmado
                    </div>
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-200">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Sucursal:</span>
                      <span className="font-bold text-slate-800 dark:text-white">{activeBranch?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Cliente:</span>
                      <span className="font-bold text-slate-800 dark:text-white">
                        {`${firstName} ${lastName}`.trim()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Servicio:</span>
                      <span className="font-bold text-slate-800 dark:text-white text-right max-w-[200px] truncate">
                        {activeService?.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Barbero:</span>
                      <span className="font-bold text-slate-800 dark:text-white">{activeEmployee?.fullName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Fecha:</span>
                      <span className="font-bold text-slate-800 dark:text-white">
                        {DateTimeHelper.formatLegible(createdApt.date)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Hora:</span>
                      <span className="font-bold text-navy-700 dark:text-navy-300 font-mono">
                        {createdApt.startTime} a {createdApt.endTime}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-[#1E3354] pt-3 flex justify-between items-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Total pagado / por pagar:</span>
                    <span className="text-lg font-black text-navy-800 dark:text-navy-300 font-mono">
                      {CurrencyFormatter.format(createdApt.price)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <button
                  onClick={this.handleResetBooking}
                  className="px-5 py-2.5 bg-slate-100 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] text-xs font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-[#182E4D] transition-all cursor-pointer text-slate-800 dark:text-slate-100"
                >
                  Agendar otra cita
                </button>
              </div>
            </div>
          )}

          {step < 4 && (
            <div className="bg-slate-50 dark:bg-[#0A1526] border-t border-slate-200 dark:border-[#1E3354] px-6 py-4 flex justify-between items-center">
              <button
                onClick={this.handlePrevStep}
                disabled={step === 1}
                className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                  step === 1
                    ? 'border-slate-200 dark:border-[#1E3354] bg-slate-100 dark:bg-[#0D1A2D] text-slate-400 dark:text-slate-600 cursor-not-allowed'
                    : 'border-slate-200 dark:border-[#243D63] bg-white dark:bg-[#12233B] text-slate-700 dark:text-slate-200 hover:border-navy-400 cursor-pointer'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Atrás</span>
              </button>

              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">
                Paso {step} de 4
              </span>

              <button
                onClick={this.handleNextStep}
                className="px-4 py-2 bg-navy-800 hover:bg-navy-700 dark:bg-navy-600 dark:hover:bg-navy-500 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <span>Continuar</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { scheduleEngine } from '../../services/scheduleEngine';
import { formatCurrency, formatDateLegible } from '../../utils/helpers';
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
  MessageSquare,
} from 'lucide-react';

export const ClientBooking: React.FC = () => {
  const {
    branches,
    employees,
    services,
    addClient,
    addAppointment,
    selectedBranchId,
    setSelectedBranchId,
    clients,
  } = useApp();

  // Wizard Steps: 1 = Sucursal & Servicio, 2 = Barbero, 3 = Fecha & Hora, 4 = Información, 5 = Éxito
  const [step, setStep] = useState(1);

  // Selections
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  // Client info for unregistered/registered
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  // Final ticket/success info
  const [createdApt, setCreatedApt] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Load standard date (tomorrow as default)
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  const activeBranch = branches.find(b => b.id === selectedBranchId) || branches[0];
  const activeService = services.find(s => s.id === selectedServiceId);
  const activeEmployee = employees.find(e => e.id === selectedEmployeeId);

  // Filtrar barberos de la sucursal seleccionada
  const branchBarbers = employees.filter(e => e.branchId === selectedBranchId && e.role === 'barber' && e.active);

  // Horas disponibles reales
  const availableSlots = (selectedBranchId && selectedEmployeeId && selectedServiceId && selectedDate)
    ? scheduleEngine.getAvailableSlots(selectedBranchId, selectedEmployeeId, selectedServiceId, selectedDate)
    : [];

  const handleNextStep = () => {
    setErrorMsg('');
    if (step === 1) {
      if (!selectedServiceId) {
        setErrorMsg('Por favor selecciona un servicio para continuar.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!selectedEmployeeId) {
        setErrorMsg('Por favor selecciona un barbero para continuar.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!selectedTime) {
        setErrorMsg('Por favor selecciona una hora disponible para continuar.');
        return;
      }
      setStep(4);
    }
  };

  const handlePrevStep = () => {
    setErrorMsg('');
    setStep(prev => Math.max(1, prev - 1));
  };

  const handleFinalizeBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName || !phone || !email) {
      setErrorMsg('Todos los datos personales (Nombre, Celular, Correo) son obligatorios.');
      return;
    }

    try {
      // 1. Crear o recuperar cliente (previene duplicados mediante email o teléfono en el tenant)
      const clientPayload = {
        tenantId: 'tenant-1',
        fullName,
        phone,
        email,
        isRegistered: false,
      };
      
      const client = addClient(clientPayload);

      // Calcular hora fin del servicio
      const [sh, sm] = selectedTime.split(':').map(Number);
      const totalMinutes = sh * 60 + sm + (activeService?.duration || 30);
      const eh = Math.floor(totalMinutes / 60);
      const em = totalMinutes % 60;
      const endTimeStr = `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`;

      // 2. Agendar cita en base de datos local
      const aptPayload = {
        branchId: selectedBranchId,
        clientId: client.id,
        employeeId: selectedEmployeeId,
        serviceId: selectedServiceId,
        date: selectedDate,
        startTime: selectedTime,
        endTime: endTimeStr,
        status: 'confirmed' as const, // Autoconfirmado por default en el wizard cliente
        price: activeService?.price || 0,
        notes,
        isWalkIn: false,
      };

      const appointment = addAppointment(aptPayload);
      setCreatedApt(appointment);
      setStep(5);
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al procesar la reserva. Por favor intente de nuevo.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-4 animate-fadeIn">
      {/* HEADER ENCANTO */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-2.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Reserva en línea</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Agenda tu Servicio</h1>
        <p className="text-sm text-slate-500 mt-1.5 font-medium">Un ritual de estilo personalizado a tu medida en Barbería Pro.</p>
      </div>

      {/* PROGRESS TRACKER */}
      {step < 5 && (
        <div className="flex items-center justify-between mb-8 px-4">
          {[1, 2, 3, 4].map((s) => (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all border ${
                  step === s
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/15'
                    : step > s
                    ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                    : 'bg-white text-slate-400 border-slate-200'
                }`}>
                  {step > s ? '✓' : s}
                </div>
                <span className={`text-[10px] mt-1.5 font-bold tracking-wide uppercase ${step === s ? 'text-indigo-600' : 'text-slate-400'}`}>
                  {s === 1 ? 'Servicio' : s === 2 ? 'Barbero' : s === 3 ? 'Fecha' : 'Confirmar'}
                </span>
              </div>
              {s < 4 && (
                <div className={`flex-1 h-[2px] mx-2 transition-all ${step > s ? 'bg-indigo-600' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* PANEL PRINCIPAL */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
        {errorMsg && (
          <div className="bg-rose-50 border-b border-rose-100 px-6 py-3.5 text-xs text-rose-600 font-medium">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* STEP 1: SUCURSAL Y SERVICIO */}
        {step === 1 && (
          <div className="p-6 md:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600" />
                <span>1. Elige una Sucursal</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {branches.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBranchId(b.id)}
                    className={`p-4 text-left rounded-xl border transition-all relative overflow-hidden flex flex-col ${
                      selectedBranchId === b.id
                        ? 'bg-indigo-50/50 border-indigo-600 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/30'
                    }`}
                  >
                    <span className="font-bold text-slate-900 text-sm block">{b.name}</span>
                    <span className="text-xs text-slate-500 mt-1 block">{b.address}</span>
                    <span className="text-[10px] text-slate-400 mt-2 block">{b.phone}</span>
                    {selectedBranchId === b.id && (
                      <div className="absolute right-3 top-3 w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-[9px]">
                        ✓
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Scissors className="w-5 h-5 text-indigo-600" />
                <span>2. Selecciona tu Servicio</span>
              </h2>
              <div className="space-y-3">
                {services.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedServiceId(s.id)}
                    className={`w-full p-4 text-left rounded-xl border transition-all flex justify-between items-center relative ${
                      selectedServiceId === s.id
                        ? 'bg-indigo-50/50 border-indigo-600 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/30'
                    }`}
                  >
                    <div className="flex gap-4 items-start pr-8">
                      <div
                        className="w-2.5 h-10 rounded shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      <div>
                        <span className="font-bold text-sm text-slate-800 block">{s.name}</span>
                        <p className="text-xs text-slate-500 mt-1 leading-normal">{s.description}</p>
                        <div className="flex gap-3 mt-2 text-[10px] text-slate-400 font-medium">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-indigo-600" />
                            {s.duration} min
                          </span>
                          <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold border border-indigo-100">
                            {s.category}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-base font-black text-indigo-600 block">
                        {formatCurrency(s.price)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: SELECCIONAR BARBERO */}
        {step === 2 && (
          <div className="p-6 md:p-8 space-y-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600" />
              <span>3. Elige tu Barbero / Estilista</span>
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {branchBarbers.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedEmployeeId(b.id)}
                  className={`p-4 text-left rounded-xl border transition-all relative flex gap-3.5 items-center ${
                    selectedEmployeeId === b.id
                      ? 'bg-indigo-50/50 border-indigo-600 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/30'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-sm">
                    {b.fullName.charAt(0)}{b.fullName.split(' ')[1]?.charAt(0) || ''}
                  </div>
                  <div>
                    <span className="font-bold text-sm text-slate-800 block">{b.fullName}</span>
                    <span className="text-xs text-slate-500 block mt-0.5 capitalize">{b.role}</span>
                    <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                      Especialidades: {b.specialties.join(', ')}
                    </p>
                  </div>
                  {selectedEmployeeId === b.id && (
                    <div className="absolute right-3 top-3 w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[9px] font-bold">
                      ✓
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: FECHA Y HORA DISPONIBLE */}
        {step === 3 && (
          <div className="p-6 md:p-8 space-y-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <span>4. Selecciona Fecha y Hora</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* DATE PICKER */}
              <div className="space-y-2">
                <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Elige un Día</label>
                <input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedTime('');
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-400 leading-normal mt-1">
                  Nota: Solo mostramos días habilitados según el horario comercial de la sucursal y la jornada del barbero.
                </p>
              </div>

              {/* SLOTS LIST */}
              <div className="space-y-2">
                <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Horarios Disponibles</label>
                
                {availableSlots.length === 0 ? (
                  <div className="p-4 rounded-xl border border-slate-150 bg-slate-50 text-center text-xs text-slate-450">
                    No hay horarios disponibles para {selectedDate}. Selecciona otra fecha o barbero.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.time}
                        disabled={!slot.available}
                        onClick={() => setSelectedTime(slot.time)}
                        className={`py-2 text-center text-xs rounded-lg font-semibold transition-all border ${
                          selectedTime === slot.time
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10'
                            : slot.available
                            ? 'bg-white text-slate-700 border-slate-200 hover:border-indigo-500'
                            : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through'
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

        {/* STEP 4: CONFIRMACIÓN Y CONTACTO */}
        {step === 4 && (
          <form onSubmit={handleFinalizeBooking} className="p-6 md:p-8 space-y-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Smile className="w-5 h-5 text-indigo-600" />
              <span>5. Ingresa tus Datos Personales</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500 font-semibold uppercase block">Nombre Completo *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Ej. Juan Pérez"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-500 font-semibold uppercase block">Teléfono Celular *</label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    placeholder="Ej. 71523456"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs text-slate-500 font-semibold uppercase block">Correo Electrónico *</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="Ej. juan.perez@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                </div>
                <p className="text-[10px] text-slate-400 leading-normal mt-1">
                  💡 Te asociaremos un perfil automático con tu correo o celular para que consultes tu historial sin duplicar cuentas.
                </p>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs text-slate-500 font-semibold block uppercase">Indicaciones especiales / Notas (Opcional)</label>
                <textarea
                  placeholder="Escribe alguna indicación (Ej. Cita para niño, estilo específico, etc.)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 h-20 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
            </div>

            {/* RESUMEN EN TARJETA */}
            <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-2">
              <span className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider">Resumen de tu Reserva</span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1">
                <div>
                  <span className="text-[10px] text-slate-450 block font-medium">Servicio</span>
                  <span className="text-xs font-bold text-slate-800 block truncate">{activeService?.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-450 block font-medium">Barbero</span>
                  <span className="text-xs font-bold text-slate-800 block">{activeEmployee?.fullName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-450 block font-medium">Fecha y Hora</span>
                  <span className="text-xs font-bold text-indigo-600 block">{formatDateLegible(selectedDate)} a las {selectedTime}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-450 block font-medium">Inversión</span>
                  <span className="text-xs font-black text-slate-800 block">{formatCurrency(activeService?.price || 0)}</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold tracking-wide hover:bg-indigo-700 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10"
            >
              <span>Confirmar Reserva y Crear Ticket</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 5: TICKET EXITOSO */}
        {step === 5 && createdApt && (
          <div className="p-6 md:p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-slate-900">¡Reserva Completada!</h2>
              <p className="text-sm text-slate-500 mt-1">Tu cita ha sido guardada en nuestra base de datos con éxito.</p>
            </div>

            {/* DISEÑO TICKET IMPRESO */}
            <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xl relative text-left">
              {/* Decoración superior ticket */}
              <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600 w-full" />
              
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[9px] uppercase tracking-widest font-black text-indigo-600 block">Ticket de Reserva</span>
                    <span className="text-xs text-slate-400 block mt-0.5">ID: {createdApt.id}</span>
                  </div>
                  <div className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200 uppercase">
                    Confirmado
                  </div>
                </div>

                <div className="space-y-2.5 text-xs text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sucursal:</span>
                    <span className="font-bold text-slate-800">{activeBranch?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cliente:</span>
                    <span className="font-bold text-slate-800">{fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Servicio:</span>
                    <span className="font-bold text-slate-800 text-right max-w-[200px] truncate">{activeService?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Barbero:</span>
                    <span className="font-bold text-slate-800">{activeEmployee?.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Fecha:</span>
                    <span className="font-bold text-slate-800">{formatDateLegible(createdApt.date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hora:</span>
                    <span className="font-bold text-indigo-600">{createdApt.startTime} a {createdApt.endTime}</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                  <span className="text-xs text-slate-550">Total pagado / por pagar:</span>
                  <span className="text-lg font-black text-indigo-600">{formatCurrency(createdApt.price)}</span>
                </div>
              </div>

              {/* Decoración corte ticket */}
              <div className="flex justify-between px-2 -mb-2">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="w-4 h-4 bg-slate-50 rounded-full" />
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <a
                href={`https://api.whatsapp.com/send?phone=${phone.replace(/[^0-9]/g, '').startsWith('591') ? phone.replace(/[^0-9]/g, '') : '591' + phone.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(
                  `¡Hola, ${fullName}! Te saludamos de Barbería Josué 🇧🇴\n\nConfirmamos tu cita agendada:\n✂️ *Servicio:* ${activeService?.name}\n💈 *Barbero:* ${activeEmployee?.fullName}\n📅 *Fecha:* ${formatDateLegible(createdApt.date)}\n⏰ *Hora:* ${createdApt.startTime} a ${createdApt.endTime}\n\n📍 *Sucursal:* ${activeBranch?.name}\n🏠 *Dirección:* ${activeBranch?.address}\n\n¡Gracias por tu preferencia! Te esperamos.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/10 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 stroke-[2]" />
                <span>Enviar Aviso por WhatsApp</span>
              </a>
              <button
                onClick={() => {
                  // Reset form fields
                  setSelectedServiceId('');
                  setSelectedEmployeeId('');
                  setSelectedTime('');
                  setFullName('');
                  setPhone('');
                  setEmail('');
                  setNotes('');
                  setStep(1);
                }}
                className="px-5 py-2.5 bg-slate-100 border border-slate-200 text-xs font-bold rounded-lg hover:bg-slate-200 transition-all cursor-pointer text-slate-800"
              >
                Agendar otra cita
              </button>
            </div>
          </div>
        )}

        {/* CONTROLES / NAVEGACIÓN BOTTOM */}
        {step < 4 && (
          <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-between items-center">
            <button
              onClick={handlePrevStep}
              disabled={step === 1}
              className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                step === 1
                  ? 'border-slate-100 bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 cursor-pointer'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Atrás</span>
            </button>

            <span className="text-xs font-semibold text-slate-400">Pasos {step} de 4</span>

            <button
              onClick={handleNextStep}
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/10"
            >
              <span>Continuar</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

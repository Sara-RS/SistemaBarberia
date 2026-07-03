/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatDateLegible, formatCurrency } from '../../utils/helpers';
import {
  Calendar,
  Clock,
  User,
  Scissors,
  Plus,
  XCircle,
  CheckCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
  Smile,
} from 'lucide-react';

export const CalendarView: React.FC = () => {
  const {
    appointments,
    services,
    employees,
    clients,
    selectedBranchId,
    addAppointment,
    updateAptStatus,
    updateApt,
  } = useApp();

  const [currentDate, setCurrentDate] = useState('2026-07-02'); // Fecha predeterminada de la demo
  const [selectedAptId, setSelectedAptId] = useState<string | null>(null);
  
  // Modal de Nueva Reserva
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAptEmployeeId, setNewAptEmployeeId] = useState('');
  const [newAptServiceId, setNewAptServiceId] = useState('');
  const [newAptClientId, setNewAptClientId] = useState('');
  const [newAptTime, setNewAptTime] = useState('09:00');
  const [newAptNotes, setNewAptNotes] = useState('');

  // Filtrar barberos activos de la sucursal
  const activeBarbers = employees.filter(e => e.branchId === selectedBranchId && e.role === 'barber' && e.active);

  // Filtrar citas de la fecha seleccionada
  const activeApts = appointments.filter(a => a.branchId === selectedBranchId && a.date === currentDate && a.status !== 'cancelled');

  // Horarios de la agenda (de 09:00 a 20:00 en intervalos de 1 hora)
  const timeBlocks = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
  ];

  const handleNextDay = () => {
    const d = new Date(currentDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    setCurrentDate(d.toISOString().split('T')[0]);
  };

  const handlePrevDay = () => {
    const d = new Date(currentDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    setCurrentDate(d.toISOString().split('T')[0]);
  };

  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAptClientId || !newAptServiceId || !newAptEmployeeId) {
      alert('Por favor selecciona cliente, servicio y barbero.');
      return;
    }

    const selectedService = services.find(s => s.id === newAptServiceId);
    if (!selectedService) return;

    // Calcular hora fin
    const [sh, sm] = newAptTime.split(':').map(Number);
    const totalMin = sh * 60 + sm + selectedService.duration;
    const eh = Math.floor(totalMin / 60);
    const em = totalMin % 60;
    const endTimeStr = `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`;

    try {
      addAppointment({
        branchId: selectedBranchId,
        clientId: newAptClientId,
        employeeId: newAptEmployeeId,
        serviceId: newAptServiceId,
        date: currentDate,
        startTime: newAptTime,
        endTime: endTimeStr,
        status: 'confirmed',
        price: selectedService.price,
        notes: newAptNotes,
        isWalkIn: false,
      });

      // Reset
      setShowAddModal(false);
      setNewAptNotes('');
    } catch (e: any) {
      alert(e.message || 'Error al agendar la cita.');
    }
  };

  const selectedApt = appointments.find(a => a.id === selectedAptId);
  const selectedAptClient = selectedApt ? clients.find(c => c.id === selectedApt.clientId) : null;
  const selectedAptService = selectedApt ? services.find(s => s.id === selectedApt.serviceId) : null;
  const selectedAptBarber = selectedApt ? employees.find(e => e.id === selectedApt.employeeId) : null;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* HEADER CONTROLES */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevDay}
            className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 border border-slate-200 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-left">
            <span className="text-[10px] text-indigo-600 font-extrabold block uppercase tracking-wider">Fecha de Agenda</span>
            <span className="text-sm font-black text-slate-800 block">{formatDateLegible(currentDate)}</span>
          </div>
          <button
            onClick={handleNextDay}
            className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 border border-slate-200 transition-all cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={() => {
            if (activeBarbers.length === 0) {
              alert('Debe haber al menos un barbero activo en la sucursal.');
              return;
            }
            setNewAptEmployeeId(activeBarbers[0].id);
            setNewAptServiceId(services[0]?.id || '');
            setNewAptClientId(clients[0]?.id || '');
            setShowAddModal(true);
          }}
          className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-600/10"
        >
          <Plus className="w-4 h-4" />
          <span>Agendar Cita</span>
        </button>
      </div>

      {/* AGENDA COLUMNAS GRID */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-sm">
        <div className="min-w-[800px]">
          {/* BARBERS HEADER COLUMN */}
          <div className="grid grid-cols-12 border-b border-slate-200 bg-slate-50/50 h-14 items-center">
            <div className="col-span-2 text-center text-[10px] uppercase font-black text-slate-400 border-r border-slate-200">
              Hora
            </div>
            <div className="col-span-10 grid" style={{ gridTemplateColumns: `repeat(${activeBarbers.length}, minmax(0, 1fr))` }}>
              {activeBarbers.map(barber => (
                <div key={barber.id} className="text-center border-r border-slate-150 last:border-0">
                  <span className="font-extrabold text-xs text-slate-800 block">{barber.fullName}</span>
                  <span className="text-[9px] text-indigo-600 font-bold uppercase tracking-wider block mt-0.5">Barbero</span>
                </div>
              ))}
            </div>
          </div>

          {/* TIMEGRID BODY */}
          <div className="divide-y divide-slate-150">
            {timeBlocks.map(block => (
              <div key={block} className="grid grid-cols-12 min-h-20 items-stretch">
                {/* BLOQUE HORA */}
                <div className="col-span-2 flex flex-col justify-center items-center bg-slate-50/30 border-r border-slate-200 font-mono text-xs text-slate-500 font-bold shrink-0">
                  {block}
                </div>

                {/* SLOTS BARBEROS */}
                <div className="col-span-10 grid relative" style={{ gridTemplateColumns: `repeat(${activeBarbers.length}, minmax(0, 1fr))` }}>
                  {activeBarbers.map((barber, barberIndex) => {
                    // Filtrar citas que inician o caen dentro de este bloque de hora para este barbero
                    const cellApt = activeApts.find(a => {
                      const hourStr = a.startTime.split(':')[0];
                      const blockHourStr = block.split(':')[0];
                      return a.employeeId === barber.id && hourStr === blockHourStr;
                    });

                    return (
                      <div
                        key={barber.id}
                        className="border-r border-slate-150 last:border-0 p-1.5 flex flex-col justify-between relative group hover:bg-slate-50/50 transition-all min-h-[5rem]"
                      >
                        {cellApt ? (
                          <button
                            onClick={() => setSelectedAptId(cellApt.id)}
                            className="w-full h-full text-left p-2 rounded-lg border flex flex-col justify-between relative cursor-pointer text-xs transition-all shadow-sm"
                            style={{
                              backgroundColor: `${services.find(s => s.id === cellApt.serviceId)?.color || '#4f46e5'}10`,
                              borderColor: services.find(s => s.id === cellApt.serviceId)?.color || '#4f46e5',
                            }}
                          >
                            <div>
                              <div className="flex justify-between items-start">
                                <span className="font-extrabold text-slate-800 block leading-snug">
                                  {clients.find(c => c.id === cellApt.clientId)?.fullName || 'Cliente'}
                                </span>
                                <span className="text-[9px] text-slate-400 font-medium">
                                  {cellApt.startTime}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                                {services.find(s => s.id === cellApt.serviceId)?.name || 'Corte'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center mt-2 pt-1 border-t border-slate-200/40">
                              <span className="text-[10px] font-black text-indigo-600">
                                {formatCurrency(cellApt.price)}
                              </span>
                              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                                {cellApt.status}
                              </span>
                            </div>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setNewAptEmployeeId(barber.id);
                              setNewAptTime(block);
                              setShowAddModal(true);
                            }}
                            className="w-full h-full rounded border border-dashed border-slate-200 hover:border-indigo-500/50 hover:bg-indigo-50/10 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer text-slate-400 hover:text-indigo-600 text-[10px] font-bold uppercase tracking-wider"
                          >
                            <Plus className="w-4.5 h-4.5 mr-1" />
                            <span>Agendar</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL / DRAWER DETALLE CITA */}
      {selectedApt && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative">
            <div className="h-1 bg-indigo-600 w-full" />
            
            <div className="p-6 space-y-5">
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-black text-indigo-600 tracking-wider">Cita Registrada</span>
                  <h3 className="font-black text-slate-900 text-lg mt-0.5">{selectedAptClient?.fullName}</h3>
                </div>
                <button
                  onClick={() => setSelectedAptId(null)}
                  className="p-1 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-all cursor-pointer text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3.5 text-xs text-slate-600">
                <div className="flex items-center gap-3">
                  <Scissors className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-slate-400 block text-[10px]">Servicio</span>
                    <span className="font-bold text-slate-800 text-sm">{selectedAptService?.name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-slate-400 block text-[10px]">Barbero Asignado</span>
                    <span className="font-bold text-slate-800">{selectedAptBarber?.fullName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-slate-400 block text-[10px]">Fecha y Horario</span>
                    <span className="font-bold text-indigo-600">{formatDateLegible(selectedApt.date)} ({selectedApt.startTime} - {selectedApt.endTime})</span>
                  </div>
                </div>

                {selectedApt.notes && (
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-slate-400 block text-[10px]">Observaciones</span>
                      <span className="text-slate-600 italic font-medium">"{selectedApt.notes}"</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-slate-400 block">Monto total</span>
                  <span className="text-base font-black text-slate-900">{formatCurrency(selectedApt.price)}</span>
                </div>

                <div className="flex gap-2">
                  {selectedApt.status === 'confirmed' && (
                    <button
                      onClick={() => {
                        updateAptStatus(selectedApt.id, 'completed');
                        setSelectedAptId(null);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Completar</span>
                    </button>
                  )}
                  {selectedApt.status !== 'completed' && (
                    <button
                      onClick={() => {
                        updateAptStatus(selectedApt.id, 'cancelled');
                        setSelectedAptId(null);
                      }}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-100 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancelar</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR NUEVA RESERVA DIRECTA */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateAppointment} className="bg-white border border-slate-200 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative">
            <div className="h-1 bg-indigo-600 w-full" />
            
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-base">Crear Nueva Cita</h3>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-all cursor-pointer text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* CLIENTE */}
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold block uppercase tracking-wider text-[10px]">Cliente</label>
                  <select
                    value={newAptClientId}
                    onChange={(e) => setNewAptClientId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.fullName} ({c.phone})</option>
                    ))}
                  </select>
                </div>

                {/* SERVICIO */}
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold block uppercase tracking-wider text-[10px]">Servicio</label>
                  <select
                    value={newAptServiceId}
                    onChange={(e) => setNewAptServiceId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    {services.map(s => (
                      <option key={s.id} value={s.id}>{s.name} - {formatCurrency(s.price)}</option>
                    ))}
                  </select>
                </div>

                {/* BARBERO */}
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold block uppercase tracking-wider text-[10px]">Barbero</label>
                  <select
                    value={newAptEmployeeId}
                    onChange={(e) => setNewAptEmployeeId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    {activeBarbers.map(b => (
                      <option key={b.id} value={b.id}>{b.fullName}</option>
                    ))}
                  </select>
                </div>

                {/* HORA */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-500 font-semibold block uppercase tracking-wider text-[10px]">Hora Inicio</label>
                    <input
                      type="text"
                      placeholder="Ej. 10:30"
                      value={newAptTime}
                      onChange={(e) => setNewAptTime(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-indigo-500 font-mono text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500 font-semibold block uppercase tracking-wider text-[10px]">Fecha</label>
                    <input
                      type="text"
                      disabled
                      value={currentDate}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-400 text-center cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* NOTAS */}
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold block uppercase tracking-wider text-[10px]">Notas de Recepción</label>
                  <textarea
                    placeholder="Escribe comentarios internos..."
                    value={newAptNotes}
                    onChange={(e) => setNewAptNotes(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 h-16 text-slate-800 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-bold tracking-wide transition-all cursor-pointer text-xs mt-4 shadow-md shadow-indigo-600/10"
              >
                Crear Reserva Confirmada
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

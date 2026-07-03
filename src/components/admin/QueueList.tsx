/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { calculateWaitTime } from '../../utils/helpers';
import {
  Users,
  Clock,
  UserPlus,
  Scissors,
  Check,
  XCircle,
  Play,
  UserCheck,
  AlertCircle,
  Smile,
} from 'lucide-react';

export const QueueList: React.FC = () => {
  const {
    queueItems,
    employees,
    services,
    addToQueue,
    updateQueueStatus,
    selectedBranchId,
  } = useApp();

  const [showAddForm, setShowAddForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high'>('normal');

  // Filtrar barberos activos de la sucursal
  const activeBarbers = employees.filter(e => e.branchId === selectedBranchId && e.role === 'barber' && e.active);

  // Lista de espera activa (esperando o siendo atendidos)
  const waitingList = queueItems.filter(q => q.status === 'waiting');
  const servingList = queueItems.filter(q => q.status === 'serving');

  const totalWaitTime = calculateWaitTime(waitingList.length);

  const handleRegisterWalkIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !selectedServiceId) {
      alert('Nombre, Teléfono y Servicio son campos obligatorios.');
      return;
    }

    const currentWait = calculateWaitTime(waitingList.length);

    addToQueue({
      branchId: selectedBranchId,
      fullName,
      phone,
      email: email || undefined,
      employeeId: selectedEmployeeId || undefined, // undefined = cualquier barbero libre
      serviceId: selectedServiceId,
      estimatedWaitTime: currentWait,
      priority,
    });

    // Reset fields
    setFullName('');
    setPhone('');
    setEmail('');
    setSelectedServiceId('');
    setSelectedEmployeeId('');
    setPriority('normal');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      {/* HEADER SUMMARY METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-[#0d0e15] border border-gray-800 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">En lista de espera</span>
            <span className="text-xl font-black text-white mt-1 block">{waitingList.length} Clientes</span>
          </div>
          <Users className="w-8 h-8 text-amber-500/30" />
        </div>

        <div className="p-4 bg-[#0d0e15] border border-gray-800 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Siendo Atendidos</span>
            <span className="text-xl font-black text-emerald-400 mt-1 block">{servingList.length} Barberos ocupados</span>
          </div>
          <UserCheck className="w-8 h-8 text-emerald-500/30" />
        </div>

        <div className="p-4 bg-[#0d0e15] border border-[#d97706]/30 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-amber-500/80 uppercase font-bold tracking-wider">Tiempo Estimado Fila</span>
            <span className="text-xl font-black text-amber-500 mt-1 block">{totalWaitTime} minutos</span>
          </div>
          <Clock className="w-8 h-8 text-amber-500/30 animate-pulse" />
        </div>
      </div>

      {/* BODY SECTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LISTAS DE CONTROL DE WALK-IN */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* SIENDO ATENDIDOS */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>En Sillón (Siendo Atendidos)</span>
            </h3>

            {servingList.length === 0 ? (
              <div className="p-4 text-center rounded-xl border border-gray-800 bg-[#0d0e15]/20 text-xs text-gray-500">
                No hay servicios de Walk-In siendo ejecutados en este momento.
              </div>
            ) : (
              <div className="space-y-2.5">
                {servingList.map(item => {
                  const s = services.find(srv => srv.id === item.serviceId);
                  const e = employees.find(emp => emp.id === item.employeeId);
                  return (
                    <div key={item.id} className="p-4 bg-[#0d0e15] border border-emerald-500/30 rounded-xl flex justify-between items-center shadow-lg shadow-emerald-500/5">
                      <div className="flex gap-3 items-center">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                          <Smile className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="font-extrabold text-sm text-white block">{item.fullName}</span>
                          <span className="text-[11px] text-gray-400 mt-0.5 block">
                            Servicio: {s?.name} — con <strong className="text-emerald-400">{e?.fullName}</strong>
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => updateQueueStatus(item.id, 'completed')}
                        className="px-3.5 py-1.5 bg-emerald-500 text-black text-xs font-bold rounded-lg hover:bg-emerald-600 transition-all cursor-pointer flex items-center gap-1 shadow-md shadow-emerald-500/10"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Terminar</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* LISTA DE ESPERA (ESPERANDO COLA) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Fila de Espera Activa</span>
            </h3>

            {waitingList.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-gray-800 bg-[#0d0e15]/20 text-xs text-gray-500">
                Fila vacía. Todos los clientes sin cita ya han sido atendidos.
              </div>
            ) : (
              <div className="space-y-2.5">
                {waitingList.map((item, index) => {
                  const s = services.find(srv => srv.id === item.serviceId);
                  const e = employees.find(emp => emp.id === item.employeeId);
                  const wait = calculateWaitTime(index);

                  return (
                    <div
                      key={item.id}
                      className={`p-4 bg-[#0d0e15] border rounded-xl flex justify-between items-center transition-all ${
                        item.priority === 'high' ? 'border-amber-500/40 bg-amber-500/5' : 'border-gray-800'
                      }`}
                    >
                      <div className="flex gap-3.5 items-center min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#11121d] border border-gray-800 flex items-center justify-center text-xs font-black text-amber-500 shrink-0">
                          #{index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-white truncate block">{item.fullName}</span>
                            {item.priority === 'high' && (
                              <span className="bg-amber-500 text-black text-[8px] font-black px-1 py-0.2 rounded uppercase tracking-wider">
                                ALTA
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-gray-400 block truncate mt-0.5">
                            {s?.name} — Barbero: <strong className="text-gray-200">{e?.fullName || 'Primer Disponible'}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right hidden sm:block">
                          <span className="text-xs font-bold text-amber-500 block">~{wait} min</span>
                          <span className="text-[10px] text-gray-500 block">espera</span>
                        </div>

                        <div className="flex gap-1.5">
                          <button
                            onClick={() => {
                              // Asignar primer barbero libre si es null
                              const bId = item.employeeId || (activeBarbers[0]?.id);
                              updateQueueStatus(item.id, 'serving', bId);
                            }}
                            className="p-2 bg-amber-500 text-black rounded-lg hover:bg-amber-600 transition-all cursor-pointer"
                            title="Iniciar servicio"
                          >
                            <Play className="w-3.5 h-3.5 fill-black stroke-[2]" />
                          </button>
                          <button
                            onClick={() => updateQueueStatus(item.id, 'cancelled')}
                            className="p-2 bg-gray-800/40 border border-gray-800 hover:border-rose-500/40 hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 rounded-lg transition-all cursor-pointer"
                            title="Remover"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* REGISTRO RÁPIDO WALK-IN CLIENTES */}
        <div>
          <div className="p-5 bg-[#0d0e15] border border-gray-800 rounded-xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-800/40">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                <UserPlus className="w-4.5 h-4.5 text-amber-500" />
                <span>Registro Walk-In</span>
              </h3>
            </div>

            <form onSubmit={handleRegisterWalkIn} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-gray-400 font-semibold block uppercase text-[9px]">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Roberto Mendoza"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#11121d] border border-gray-800 rounded-lg p-2.5 text-gray-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 font-semibold block uppercase text-[9px]">Teléfono Celular *</label>
                <input
                  type="tel"
                  required
                  placeholder="Ej. 55-4433-2211"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#11121d] border border-gray-800 rounded-lg p-2.5 text-gray-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 font-semibold block uppercase text-[9px]">Correo (Opcional)</label>
                <input
                  type="email"
                  placeholder="Ej. roberto@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#11121d] border border-gray-800 rounded-lg p-2.5 text-gray-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 font-semibold block uppercase text-[9px]">Servicio Solicitado *</label>
                <select
                  required
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full bg-[#11121d] border border-gray-800 rounded-lg p-2.5 text-gray-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Selecciona --</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 font-semibold block uppercase text-[9px]">Barbero Preferido</label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full bg-[#11121d] border border-gray-800 rounded-lg p-2.5 text-gray-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="">Cualquiera disponible</option>
                  {activeBarbers.map(b => (
                    <option key={b.id} value={b.id}>{b.fullName}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 font-semibold block uppercase text-[9px]">Prioridad Fila</label>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPriority('normal')}
                    className={`py-2 text-center rounded-lg border font-bold transition-all cursor-pointer ${
                      priority === 'normal'
                        ? 'bg-[#11121d] border-amber-500/50 text-amber-500'
                        : 'bg-gray-900/10 border-gray-800 text-gray-500 hover:border-gray-700'
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority('high')}
                    className={`py-2 text-center rounded-lg border font-bold transition-all cursor-pointer ${
                      priority === 'high'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                        : 'bg-gray-900/10 border-gray-800 text-gray-500 hover:border-gray-700'
                    }`}
                  >
                    Alta (Prioritario)
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-black py-2.5 rounded-lg font-bold tracking-wide transition-all cursor-pointer text-xs mt-4 shadow-lg shadow-amber-500/5"
              >
                Agregar a Fila de Espera
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  UserCheck,
  UserX,
  MessageSquare,
  Calendar,
  Sparkles,
  Filter,
  Check,
  X
} from 'lucide-react';

export const ClientsAdmin: React.FC = () => {
  const { clients, appointments, addClient } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'registered' | 'walk-in'>('all');

  // FORM STATES
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isRegistered, setIsRegistered] = useState(true);

  // Stats
  const totalClients = clients.length;
  const registeredCount = clients.filter(c => c.isRegistered).length;
  const walkInCount = clients.filter(c => !c.isRegistered).length;

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      alert('Nombre completo y teléfono celular son campos requeridos.');
      return;
    }

    // Clean phone number (leave only digits or standard characters)
    const cleanPhone = phone.replace(/[^0-9+]/g, '');

    try {
      addClient({
        tenantId: 'tenant-1', // Default tenant
        fullName: fullName.trim(),
        phone: cleanPhone,
        email: email.trim(),
        isRegistered,
      });

      // Reset
      setFullName('');
      setPhone('');
      setEmail('');
      setIsRegistered(true);
      setShowAddModal(false);
    } catch (err: any) {
      alert(err.message || 'Error al guardar el cliente.');
    }
  };

  // Get appointments count for a specific client
  const getClientAptCount = (clientId: string) => {
    return appointments.filter(a => a.clientId === clientId).length;
  };

  // Get initials for Avatar
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Colors for Avatars
  const colors = [
    'bg-indigo-100 text-indigo-700 border-indigo-200',
    'bg-emerald-100 text-emerald-700 border-emerald-200',
    'bg-amber-100 text-amber-700 border-amber-200',
    'bg-rose-100 text-rose-700 border-rose-200',
    'bg-sky-100 text-sky-700 border-sky-200',
    'bg-violet-100 text-violet-700 border-violet-200',
  ];

  const getAvatarColor = (id: string) => {
    // Deterministic selection based on ID length or character sum
    const sum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[sum % colors.length];
  };

  // Filter clients
  const filteredClients = clients.filter(client => {
    const matchesSearch =
      client.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.includes(searchTerm) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'registered' && client.isRegistered) ||
      (statusFilter === 'walk-in' && !client.isRegistered);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* HEADER CONTROLES */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
        <div>
          <h2 className="font-extrabold text-slate-900 text-lg">Directorio de Clientes</h2>
          <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider mt-0.5">Gestión y Registro Histórico</span>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-600/10"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Registrar Nuevo Cliente</span>
        </button>
      </div>

      {/* METRICAS RAPIDAS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* TOTAL CLIENTES */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Clientes Totales</span>
            <span className="text-2xl font-black text-slate-800 block font-mono">{totalClients}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* REGISTRADOS */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-wider block">Registrados con App</span>
            <span className="text-2xl font-black text-slate-800 block font-mono">{registeredCount}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        {/* WALK-INS */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] text-amber-500 font-extrabold uppercase tracking-wider block">Clientes Walk-In</span>
            <span className="text-2xl font-black text-slate-800 block font-mono">{walkInCount}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500">
            <UserX className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* BUSQUEDA Y FILTROS */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center">
        {/* Barra de Búsqueda */}
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre, celular o correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
          />
        </div>

        {/* Filtro por Tipo */}
        <div className="flex gap-1.5 w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-350'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setStatusFilter('registered')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'registered'
                ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-350'
            }`}
          >
            Registrados con App
          </button>
          <button
            onClick={() => setStatusFilter('walk-in')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'walk-in'
                ? 'bg-amber-50 border-amber-500 text-amber-700'
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-350'
            }`}
          >
            Walk-Ins / Sin Registro
          </button>
        </div>
      </div>

      {/* TABLA / GRILLA DE CLIENTES */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {filteredClients.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Users className="w-12 h-12 mx-auto stroke-[1.5] text-slate-300 mb-3" />
            <h4 className="font-extrabold text-slate-700 text-xs uppercase tracking-wider">No se encontraron clientes</h4>
            <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">Prueba ajustando tus términos de búsqueda o filtros, o registra un nuevo cliente.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 h-12 text-[10px] text-slate-400 font-black uppercase tracking-wider">
                  <th className="pl-6 pr-4">Cliente</th>
                  <th className="px-4">Contacto</th>
                  <th className="px-4">Estado de Registro</th>
                  <th className="px-4 text-center">Citas Totales</th>
                  <th className="px-4">Fecha Registro</th>
                  <th className="pr-6 pl-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClients.map((client) => {
                  const aptCount = getClientAptCount(client.id);
                  const isBolivianPhone = client.phone.length >= 7;
                  const formattedPhone = client.phone.startsWith('591') || client.phone.startsWith('+591')
                    ? client.phone
                    : `591${client.phone.replace(/[^0-9]/g, '')}`;
                  
                  return (
                    <tr key={client.id} className="hover:bg-slate-50/55 transition-all h-16">
                      {/* CLIENTE INFO */}
                      <td className="pl-6 pr-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 ${getAvatarColor(client.id)}`}>
                            {getInitials(client.fullName)}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-800 block text-sm leading-tight">{client.fullName}</span>
                            <span className="text-[10px] text-slate-400 font-medium font-mono">ID: {client.id}</span>
                          </div>
                        </div>
                      </td>

                      {/* CONTACTO */}
                      <td className="px-4">
                        <div className="space-y-0.5">
                          <span className="flex items-center gap-1 text-slate-600 font-medium font-mono">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {client.phone}
                          </span>
                          {client.email ? (
                            <span className="flex items-center gap-1 text-slate-400 text-[10px]">
                              <Mail className="w-3.5 h-3.5 text-slate-300" />
                              {client.email}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px] italic">Sin correo registrado</span>
                          )}
                        </div>
                      </td>

                      {/* REGISTRO TIPO */}
                      <td className="px-4">
                        {client.isRegistered ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                            ● App Registrado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                            ● Walk-In / Presencial
                          </span>
                        )}
                      </td>

                      {/* CITAS TOTALES */}
                      <td className="px-4 text-center font-mono font-bold text-slate-700 text-xs">
                        <span className={`inline-block px-2.5 py-1 rounded-lg ${aptCount > 0 ? 'bg-indigo-50 text-indigo-600 font-extrabold' : 'bg-slate-100 text-slate-400 font-medium'}`}>
                          {aptCount}
                        </span>
                      </td>

                      {/* FECHA REGISTRO */}
                      <td className="px-4 text-slate-500 font-mono">
                        {client.createdAt}
                      </td>

                      {/* ACCIONES */}
                      <td className="pr-6 pl-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          {isBolivianPhone && (
                            <a
                              href={`https://api.whatsapp.com/send?phone=${formattedPhone.replace('+', '')}&text=${encodeURIComponent(
                                `¡Hola, ${client.fullName}! Te saludamos de Barbería Josué 🇧🇴\n\nNos complace tenerte registrado como nuestro cliente VIP. ¡Esperamos verte pronto por la barbería para consentirte como te mereces! ✂️💈`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 bg-[#ecfdf5] text-emerald-600 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all cursor-pointer inline-flex items-center justify-center"
                              title="Enviar mensaje por WhatsApp"
                            >
                              <MessageSquare className="w-4 h-4 stroke-[2.2]" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL NUEVO CLIENTE */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateClient} className="bg-white border border-slate-200 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative">
            <div className="h-1 bg-indigo-600 w-full" />
            
            <div className="p-6 space-y-4 animate-fadeIn">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <span>Nuevo Registro de Cliente</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-all cursor-pointer text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs text-slate-700">
                {/* NOMBRE */}
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold block uppercase tracking-wider text-[10px]">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Juan de Dios"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                {/* CELULAR */}
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold block uppercase tracking-wider text-[10px]">Número de Celular *</label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej. 71523456"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-indigo-600"
                  />
                  <p className="text-[10px] text-slate-400">Se utilizará para enviar recordatorios de WhatsApp.</p>
                </div>

                {/* CORREO */}
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold block uppercase tracking-wider text-[10px]">Correo Electrónico (Opcional)</label>
                  <input
                    type="email"
                    placeholder="Ej. juan@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                {/* ESTADO REGISTRO */}
                <div className="space-y-2">
                  <label className="text-slate-500 font-semibold block uppercase tracking-wider text-[10px]">Origen / Tipo de Cliente</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsRegistered(true)}
                      className={`py-2 px-3 text-center text-xs rounded-lg border font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        isRegistered
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                          : 'bg-white border-slate-250 text-slate-400 hover:border-slate-350'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Registrado App</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRegistered(false)}
                      className={`py-2 px-3 text-center text-xs rounded-lg border font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        !isRegistered
                          ? 'bg-amber-50 border-amber-550 text-amber-700'
                          : 'bg-white border-slate-250 text-slate-400 hover:border-slate-350'
                      }`}
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>Walk-In / Presencial</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/2 border border-slate-200 text-slate-500 hover:bg-slate-50 py-2.5 rounded-lg font-bold transition-all cursor-pointer text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-bold tracking-wide transition-all cursor-pointer text-xs shadow-md shadow-indigo-600/10"
                >
                  Registrar Cliente
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

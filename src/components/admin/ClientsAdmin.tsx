/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BaseAppComponent } from '../../context/AppContext';
import { ModelFactory } from '../../models/DomainModels';
import { WhatsAppUrlBuilder } from '../../utils/helpers';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  UserCheck,
  UserX,
  MessageSquare,
} from 'lucide-react';

interface ClientsAdminState {
  showAddModal: boolean;
  searchTerm: string;
  statusFilter: 'all' | 'registered' | 'walk-in';
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  isRegistered: boolean;
}

export class ClientsAdmin extends BaseAppComponent<{}, ClientsAdminState> {
  private readonly avatarColors = [
    'bg-navy-100 dark:bg-navy-900/70 text-navy-800 dark:text-navy-200 border-navy-200 dark:border-navy-700/60',
    'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
    'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
    'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
    'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/60',
    'bg-navy-50 dark:bg-navy-800/70 text-navy-700 dark:text-navy-100 border-navy-300 dark:border-navy-600/60',
  ];

  constructor(props: {}) {
    super(props);
    this.state = {
      showAddModal: false,
      searchTerm: '',
      statusFilter: 'all',
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      isRegistered: true,
    };
  }

  private handleCreateClient = (e: React.FormEvent): void => {
    e.preventDefault();
    const { firstName, lastName, phone, email, isRegistered } = this.state;

    if (!firstName.trim() || !phone.trim()) {
      alert('Nombres y teléfono celular son campos requeridos.');
      return;
    }

    const fullComputedName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const cleanPhone = phone.replace(/[^0-9+]/g, '');

    try {
      this.app.addClient({
        tenantId: 'tenant-1',
        fullName: fullComputedName,
        phone: cleanPhone,
        email: email.trim(),
        isRegistered,
      });

      this.setState({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        isRegistered: true,
        showAddModal: false,
      });
    } catch (err: any) {
      alert(err.message || 'Error al guardar el cliente.');
    }
  };

  private getClientAptCount(clientId: string): number {
    return this.app.appointments.filter(a => a.clientId === clientId).length;
  }

  private getAvatarColor(id: string): string {
    const sum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return this.avatarColors[sum % this.avatarColors.length];
  }

  public render(): React.ReactNode {
    const { clients } = this.app;
    const { showAddModal, searchTerm, statusFilter, firstName, lastName, phone, email, isRegistered } = this.state;

    const clientModels = clients.map(c => ModelFactory.createClient(c));
    const totalClients = clientModels.length;
    const registeredCount = clientModels.filter(c => c.isRegistered).length;
    const walkInCount = clientModels.filter(c => !c.isRegistered).length;

    const term = searchTerm.toLowerCase();
    const filteredClients = clientModels.filter(client => {
      const matchesSearch =
        client.fullName.toLowerCase().includes(term) ||
        client.phone.includes(searchTerm) ||
        client.email.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'registered' && client.isRegistered) ||
        (statusFilter === 'walk-in' && !client.isRegistered);

      return matchesSearch && matchesStatus;
    });

    return (
      <div className="space-y-6 animate-fadeIn">
        {/* HEADER CONTROLES */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] p-4 rounded-xl shadow-sm">
          <div>
            <h2 className="font-extrabold text-slate-900 dark:text-white text-lg">Directorio de Clientes</h2>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-bold tracking-wider mt-0.5">
              Gestión y Registro Histórico
            </span>
          </div>

          <button
            onClick={() => this.setState({ showAddModal: true })}
            className="w-full sm:w-auto px-4 py-2.5 bg-navy-800 hover:bg-navy-700 dark:bg-navy-600 dark:hover:bg-navy-500 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-navy-900/15"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Registrar Nuevo Cliente</span>
          </button>
        </div>

        {/* METRICAS RAPIDAS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider block">
                Clientes Totales
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-white block font-mono">{totalClients}</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-navy-50 dark:bg-navy-900/70 border border-navy-200 dark:border-navy-700/60 flex items-center justify-center text-navy-800 dark:text-navy-300">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-extrabold uppercase tracking-wider block">
                Registrados con App
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-white block font-mono">{registeredCount}</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold uppercase tracking-wider block">
                Clientes Walk-In
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-white block font-mono">{walkInCount}</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <UserX className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* BUSQUEDA Y FILTROS */}
        <div className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] p-4 rounded-xl shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center">
          <div className="relative w-full md:max-w-md">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre, celular o correo..."
              value={searchTerm}
              onChange={(e) => this.setState({ searchTerm: e.target.value })}
              className="w-full bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg pl-10 pr-4 py-2 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-navy-600 dark:focus:border-navy-400 focus:bg-white dark:focus:bg-[#162B47] transition-all"
            />
          </div>

          <div className="flex gap-1.5 w-full md:w-auto overflow-x-auto">
            <button
              onClick={() => this.setState({ statusFilter: 'all' })}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-navy-50 dark:bg-navy-900/70 border-navy-600 dark:border-navy-400 text-navy-800 dark:text-navy-200'
                  : 'bg-white dark:bg-[#12233B] border-slate-200 dark:border-[#243D63] text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-navy-500'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => this.setState({ statusFilter: 'registered' })}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'registered'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300'
                  : 'bg-white dark:bg-[#12233B] border-slate-200 dark:border-[#243D63] text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-navy-500'
              }`}
            >
              Registrados con App
            </button>
            <button
              onClick={() => this.setState({ statusFilter: 'walk-in' })}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'walk-in'
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 dark:border-amber-600 text-amber-700 dark:text-amber-300'
                  : 'bg-white dark:bg-[#12233B] border-slate-200 dark:border-[#243D63] text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-navy-500'
              }`}
            >
              Walk-Ins / Sin Registro
            </button>
          </div>
        </div>

        {/* TABLA / GRILLA DE CLIENTES */}
        <div className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-xl overflow-hidden shadow-sm">
          {filteredClients.length === 0 ? (
            <div className="p-12 text-center text-slate-400 dark:text-slate-500">
              <Users className="w-12 h-12 mx-auto stroke-[1.5] text-slate-300 dark:text-slate-600 mb-3" />
              <h4 className="font-extrabold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider">
                No se encontraron clientes
              </h4>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
                Prueba ajustando tus términos de búsqueda o filtros, o registra un nuevo cliente.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#12233B] border-b border-slate-200 dark:border-[#243D63] h-12 text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider">
                    <th className="pl-6 pr-4">Cliente</th>
                    <th className="px-4">Contacto</th>
                    <th className="px-4">Estado de Registro</th>
                    <th className="px-4 text-center">Citas Totales</th>
                    <th className="px-4">Fecha Registro</th>
                    <th className="pr-6 pl-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1E3354]">
                  {filteredClients.map((client) => {
                    const aptCount = this.getClientAptCount(client.id);
                    const isBolivianPhone = client.phone.length >= 7;

                    return (
                      <tr key={client.id} className="hover:bg-slate-50/75 dark:hover:bg-[#12233B]/70 transition-all h-16">
                        <td className="pl-6 pr-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 ${this.getAvatarColor(client.id)}`}>
                              {client.getInitials()}
                            </div>
                            <div>
                              <span className="font-extrabold text-slate-800 dark:text-white block text-sm leading-tight">
                                {client.fullName}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium font-mono">
                                ID: {client.id}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-4">
                          <div className="space-y-0.5">
                            <span className="flex items-center gap-1 text-slate-700 dark:text-slate-200 font-medium font-mono">
                              <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                              {client.phone}
                            </span>
                            {client.email ? (
                              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-[10px]">
                                <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                {client.email}
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 text-[10px] italic">
                                Sin correo registrado
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4">
                          {client.isRegistered ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                              ● App Registrado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                              ● Walk-In / Presencial
                            </span>
                          )}
                        </td>

                        <td className="px-4 text-center font-mono font-bold text-slate-700 dark:text-slate-200 text-xs">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg ${
                              aptCount > 0
                                ? 'bg-navy-50 dark:bg-navy-900/70 text-navy-800 dark:text-navy-200 border border-navy-200 dark:border-navy-700/60 font-extrabold'
                                : 'bg-slate-100 dark:bg-[#12233B] text-slate-400 dark:text-slate-500 font-medium'
                            }`}
                          >
                            {aptCount}
                          </span>
                        </td>

                        <td className="px-4 text-slate-500 dark:text-slate-400 font-mono">
                          {client.createdAt}
                        </td>

                        <td className="pr-6 pl-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            {isBolivianPhone && (
                              <a
                                href={WhatsAppUrlBuilder.buildApiUrl(
                                  client.phone,
                                  `¡Hola, ${client.fullName}! Te saludamos de Barbería Josué 🇧🇴\n\nNos complace tenerte registrado como nuestro cliente VIP. ¡Esperamos verte pronto por la barbería para consentirte como te mereces! ✂️💈`
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/70 border border-emerald-200 dark:border-emerald-800/60 rounded-lg transition-all cursor-pointer inline-flex items-center justify-center"
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
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <form
              onSubmit={this.handleCreateClient}
              className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative"
            >
              <div className="h-1.5 bg-navy-800 dark:bg-navy-500 w-full" />

              <div className="p-6 space-y-4 animate-fadeIn">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-[#1E3354]">
                  <h3 className="font-black text-slate-900 dark:text-white text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-navy-800 dark:text-navy-300" />
                    <span>Nuevo Registro de Cliente</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => this.setState({ showAddModal: false })}
                    className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-[#12233B] transition-all cursor-pointer text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                        Nombres *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Juan de Dios"
                        value={firstName}
                        onChange={(e) => this.setState({ firstName: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-navy-600 dark:focus:border-navy-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                        Apellidos *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Mamani Flores"
                        value={lastName}
                        onChange={(e) => this.setState({ lastName: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-navy-600 dark:focus:border-navy-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                      Número de Celular *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Ej. 71523456"
                      value={phone}
                      onChange={(e) => this.setState({ phone: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-800 dark:text-white font-mono placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-navy-600 dark:focus:border-navy-400"
                    />
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      Se utilizará para enviar recordatorios de WhatsApp.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                      Correo Electrónico (Opcional)
                    </label>
                    <input
                      type="email"
                      placeholder="Ej. juan@example.com"
                      value={email}
                      onChange={(e) => this.setState({ email: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-navy-600 dark:focus:border-navy-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                      Origen / Tipo de Cliente
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => this.setState({ isRegistered: true })}
                        className={`py-2 px-3 text-center text-xs rounded-lg border font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          isRegistered
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300'
                            : 'bg-white dark:bg-[#12233B] border-slate-200 dark:border-[#243D63] text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-navy-500'
                        }`}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Registrado App</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => this.setState({ isRegistered: false })}
                        className={`py-2 px-3 text-center text-xs rounded-lg border font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          !isRegistered
                            ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 dark:border-amber-600 text-amber-700 dark:text-amber-300'
                            : 'bg-white dark:bg-[#12233B] border-slate-200 dark:border-[#243D63] text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-navy-500'
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
                    onClick={() => this.setState({ showAddModal: false })}
                    className="w-1/2 border border-slate-200 dark:border-[#243D63] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#12233B] py-2.5 rounded-lg font-bold transition-all cursor-pointer text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 bg-navy-800 hover:bg-navy-700 dark:bg-navy-600 dark:hover:bg-navy-500 text-white py-2.5 rounded-lg font-bold tracking-wide transition-all cursor-pointer text-xs shadow-md shadow-navy-900/15"
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
  }
}

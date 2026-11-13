/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BaseAppComponent } from '../../context/AppContext';
import { ModelFactory } from '../../models/DomainModels';
import { WhatsAppUrlBuilder } from '../../utils/helpers';
import {
  Truck,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Edit,
  Trash2,
  MessageSquare,
  Building2,
  PackageCheck,
  UserCheck,
} from 'lucide-react';
import { Provider } from '../../types';

interface ProvidersAdminState {
  searchTerm: string;
  showModal: boolean;
  editingProvider: Provider | null;
  companyName: string;
  contactFirstName: string;
  contactLastName: string;
  phone: string;
  email: string;
  address: string;
}

export class ProvidersAdmin extends BaseAppComponent<{}, ProvidersAdminState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      searchTerm: '',
      showModal: false,
      editingProvider: null,
      companyName: '',
      contactFirstName: '',
      contactLastName: '',
      phone: '',
      email: '',
      address: '',
    };
  }

  private openAddModal = (): void => {
    this.setState({
      editingProvider: null,
      companyName: '',
      contactFirstName: '',
      contactLastName: '',
      phone: '',
      email: '',
      address: '',
      showModal: true,
    });
  };

  private openEditModal = (p: Provider): void => {
    const pm = ModelFactory.createProvider(p);
    const contact = p.contactName || p.nombreContacto || '';
    const parts = contact.split(' ');

    this.setState({
      editingProvider: p,
      companyName: pm.name,
      contactFirstName: parts.length >= 2 ? parts[0] : contact,
      contactLastName: parts.length >= 2 ? parts.slice(1).join(' ') : '',
      phone: pm.phone,
      email: pm.email,
      address: pm.address,
      showModal: true,
    });
  };

  private handleDelete = (id: string): void => {
    if (this.app.currentRole !== 'admin') {
      alert('Solo los administradores pueden eliminar proveedores.');
      return;
    }
    if (window.confirm('¿Estás seguro de eliminar este proveedor del sistema?')) {
      this.app.deleteProvider(id);
    }
  };

  private handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    const { editingProvider, companyName, contactFirstName, contactLastName, phone, email, address } = this.state;

    if (!companyName.trim()) {
      alert('El nombre o razón social de la empresa es obligatorio.');
      return;
    }

    const fullContactName = `${contactFirstName.trim()} ${contactLastName.trim()}`.trim();
    const payload = {
      name: companyName.trim(),
      nombre: companyName.trim(),
      contactName: fullContactName,
      nombreContacto: fullContactName,
      phone: phone.trim(),
      telefono: phone.trim(),
      email: email.trim(),
      correo: email.trim(),
      address: address.trim(),
      direccion: address.trim(),
    };

    try {
      if (editingProvider) {
        this.app.updateProvider(editingProvider.id, payload);
      } else {
        this.app.addProvider(payload);
      }
      this.setState({ showModal: false });
    } catch (err: any) {
      alert(err.message || 'Error al guardar el proveedor.');
    }
  };

  public render(): React.ReactNode {
    const { providers } = this.app;
    const {
      searchTerm,
      showModal,
      editingProvider,
      companyName,
      contactFirstName,
      contactLastName,
      phone,
      email,
      address,
    } = this.state;

    const term = searchTerm.toLowerCase();
    const filteredProviders = providers.filter(p => {
      const pm = ModelFactory.createProvider(p);
      return (
        pm.name.toLowerCase().includes(term) ||
        pm.contactName.toLowerCase().includes(term) ||
        pm.phone.includes(term)
      );
    });

    return (
      <div className="space-y-6 animate-fadeIn">
        {/* HEADER CONTROLES */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] p-4 rounded-xl shadow-sm">
          <div>
            <h2 className="font-extrabold text-slate-900 dark:text-white text-lg flex items-center gap-2">
              <Truck className="w-5 h-5 text-navy-700 dark:text-navy-300" />
              <span>Módulo de Proveedores & Distribución</span>
            </h2>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-bold tracking-wider mt-0.5">
              Gestión de Empresas Proveedoras e Insumos
            </span>
          </div>

          <button
            onClick={this.openAddModal}
            className="w-full sm:w-auto px-4 py-2.5 bg-navy-800 hover:bg-navy-700 dark:bg-navy-600 dark:hover:bg-navy-500 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Registrar Proveedor</span>
          </button>
        </div>

        {/* METRICAS Y RESUMEN */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                Total Proveedores
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-white block font-mono">
                {providers.length}
              </span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-navy-50 dark:bg-navy-900/70 border border-navy-200 dark:border-navy-700/60 flex items-center justify-center text-navy-700 dark:text-navy-300">
              <Building2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase tracking-wider block">
                Proveedores Activos
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-white block font-mono">
                {providers.length}
              </span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold uppercase tracking-wider block">
                Catálogo Insumos
              </span>
              <span className="text-lg font-black text-slate-900 dark:text-white block">Barbería & Cuidado</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <PackageCheck className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* BUSQUEDA */}
        <div className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] p-4 rounded-xl shadow-sm">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por empresa, contacto o teléfono..."
              value={searchTerm}
              onChange={e => this.setState({ searchTerm: e.target.value })}
              className="w-full bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg pl-10 pr-4 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 transition-all"
            />
          </div>
        </div>

        {/* GRILLA DE PROVEEDORES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProviders.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-xl p-12 text-center text-slate-400">
              <Truck className="w-12 h-12 mx-auto stroke-[1.5] text-slate-300 dark:text-slate-600 mb-3" />
              <h4 className="font-extrabold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">
                No hay proveedores registrados
              </h4>
              <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                Agrega proveedores de insumos como pomadas, navajas y toallas para gestionar tu cadena de suministros.
              </p>
            </div>
          ) : (
            filteredProviders.map(p => {
              const pm = ModelFactory.createProvider(p);

              return (
                <div
                  key={pm.id}
                  className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-2xl p-5 shadow-sm hover:border-navy-400 dark:hover:border-navy-400 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-navy-50 dark:bg-navy-900/70 text-navy-700 dark:text-navy-300 border border-navy-200 dark:border-navy-700/60 flex items-center justify-center font-bold text-sm shrink-0">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">{pm.name}</h3>
                          <span className="text-[10px] text-slate-400 font-mono">ID: {pm.id}</span>
                        </div>
                      </div>

                      <div className="flex gap-1">
                        <button
                          onClick={() => this.openEditModal(p)}
                          className="p-1.5 text-slate-400 hover:text-navy-700 dark:hover:text-navy-300 hover:bg-navy-50 dark:hover:bg-navy-900/50 rounded-lg transition-all cursor-pointer"
                          title="Editar Proveedor"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => this.handleDelete(pm.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all cursor-pointer"
                          title="Eliminar Proveedor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-[#1E3354]">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase w-20">Contacto:</span>
                        <span className="font-semibold text-slate-800 dark:text-white">{pm.contactName}</span>
                      </div>

                      {pm.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono text-slate-700 dark:text-slate-200">{pm.phone}</span>
                        </div>
                      )}

                      {pm.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-slate-600 dark:text-slate-300 truncate">{pm.email}</span>
                        </div>
                      )}

                      {pm.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">{pm.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-[#1E3354] flex justify-end gap-2">
                    {pm.phone && (
                      <a
                        href={WhatsAppUrlBuilder.buildApiUrl(
                          pm.phone,
                          `Hola ${pm.contactName}, nos comunicamos de Barbería Josué para solicitar información de stock de insumos.`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/60 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Contactar WhatsApp</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* MODAL AGREGAR / EDITAR PROVEEDOR */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <form
              onSubmit={this.handleSubmit}
              className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative"
            >
              <div className="h-1.5 bg-navy-800 dark:bg-navy-500 w-full" />

              <div className="p-6 space-y-4 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-[#1E3354]">
                  <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <Truck className="w-5 h-5 text-navy-700 dark:text-navy-300" />
                    <span>{editingProvider ? 'Editar Proveedor' : 'Registrar Nuevo Proveedor'}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => this.setState({ showModal: false })}
                    className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-[#12233B] transition-all cursor-pointer text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3.5 text-slate-700 dark:text-slate-200">
                  <div className="space-y-1">
                    <label className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px]">
                      Nombre / Razón Social Empresa *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Distribuidora Barba & Estilo S.R.L."
                      value={companyName}
                      onChange={e => this.setState({ companyName: e.target.value })}
                      className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-800 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px]">
                        Nombres del Contacto
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Roberto"
                        value={contactFirstName}
                        onChange={e => this.setState({ contactFirstName: e.target.value })}
                        className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-800 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px]">
                        Apellidos del Contacto
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Gómez Pérez"
                        value={contactLastName}
                        onChange={e => this.setState({ contactLastName: e.target.value })}
                        className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-800 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px]">
                        Teléfono / Celular
                      </label>
                      <input
                        type="tel"
                        placeholder="Ej. 78912345"
                        value={phone}
                        onChange={e => this.setState({ phone: e.target.value })}
                        className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-800 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px]">
                        Correo Electrónico
                      </label>
                      <input
                        type="email"
                        placeholder="Ej. ventas@distribuidora.com"
                        value={email}
                        onChange={e => this.setState({ email: e.target.value })}
                        className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-800 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px]">
                      Dirección o Ubicación
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Av. Blanco Galindo Km 3, Cochabamba"
                      value={address}
                      onChange={e => this.setState({ address: e.target.value })}
                      className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-800 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => this.setState({ showModal: false })}
                    className="w-1/2 border border-slate-200 dark:border-[#243D63] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#12233B] py-2.5 rounded-lg font-bold transition-all cursor-pointer text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 bg-navy-800 hover:bg-navy-700 dark:bg-navy-600 dark:hover:bg-navy-500 text-white py-2.5 rounded-lg font-bold tracking-wide transition-all cursor-pointer text-xs shadow-sm"
                  >
                    {editingProvider ? 'Guardar Cambios' : 'Registrar Proveedor'}
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

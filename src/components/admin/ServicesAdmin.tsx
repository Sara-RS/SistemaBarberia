/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BaseAppComponent } from '../../context/AppContext';
import { CurrencyFormatter } from '../../utils/helpers';
import { ModelFactory } from '../../models/DomainModels';
import { Scissors, Plus, Clock, Tag } from 'lucide-react';

interface ServicesAdminState {
  showAddForm: boolean;
  code: string;
  name: string;
  description: string;
  category: string;
  price: number;
  duration: number;
  color: string;
}

export class ServicesAdmin extends BaseAppComponent<{}, ServicesAdminState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      showAddForm: false,
      code: '',
      name: '',
      description: '',
      category: 'Corte',
      price: 35,
      duration: 30,
      color: '#1C519B',
    };
  }

  private openAddModal = (): void => {
    const nextNum = this.app.services.length + 1;
    this.setState({
      code: `SRV-${String(nextNum).padStart(3, '0')}`,
      name: '',
      description: '',
      category: 'Corte',
      price: 35,
      duration: 30,
      color: '#1C519B',
      showAddForm: true,
    });
  };

  private handleCreateService = (e: React.FormEvent): void => {
    e.preventDefault();
    const { code, name, description, category, price, duration, color } = this.state;
    if (!name || !description) {
      alert('Nombre y Descripción son campos obligatorios.');
      return;
    }

    const serviceCode = code.trim() || `SRV-${String(this.app.services.length + 1).padStart(3, '0')}`;

    try {
      this.app.addService({
        codigo: serviceCode,
        code: serviceCode,
        name,
        description,
        category,
        price,
        duration,
        color,
        active: true,
      });

      this.setState({
        name: '',
        description: '',
        code: '',
        category: 'Corte',
        price: 35,
        duration: 30,
        color: '#1C519B',
        showAddForm: false,
      });
    } catch (err: any) {
      alert(err.message || 'Error al agregar el servicio.');
    }
  };

  public render(): React.ReactNode {
    const { services } = this.app;
    const { showAddForm, code, name, description, category, price, duration, color } = this.state;

    return (
      <div className="space-y-6 animate-fadeIn">
        {/* HEADER CONTROLES */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] p-4 rounded-xl shadow-sm">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white text-base">
              Catálogo de Tratamientos & Servicios
            </h2>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
              Configura precios, duraciones en minutos y colores de visualización en agenda.
            </span>
          </div>

          <button
            onClick={this.openAddModal}
            className="w-full sm:w-auto px-4 py-2 bg-navy-800 hover:bg-navy-700 dark:bg-navy-600 dark:hover:bg-navy-500 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Servicio</span>
          </button>
        </div>

        {/* SERVICES CATALOG CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {services.map(s => {
            const sm = ModelFactory.createService(s);
            return (
              <div
                key={sm.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-[#1E3354] bg-white dark:bg-[#0D1A2D] flex flex-col justify-between hover:border-navy-400 dark:hover:border-navy-400 shadow-sm transition-all"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-2.5 items-center">
                      <div className="w-3 h-8 rounded shrink-0" style={{ backgroundColor: s.color }} />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-sm text-slate-900 dark:text-white block">
                            {sm.name}
                          </span>
                          <span className="bg-navy-50 dark:bg-navy-900/70 border border-navy-200 dark:border-navy-700/60 text-navy-800 dark:text-navy-200 font-mono text-[10px] px-1.5 py-0.5 rounded font-black">
                            {sm.code}
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider mt-0.5">
                          {s.category}
                        </span>
                      </div>
                    </div>
                    <Scissors className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                  </div>

                  <p className="text-slate-500 dark:text-slate-300 leading-normal text-[11px] min-h-[2.5rem]">
                    {s.description}
                  </p>

                  <div className="flex gap-4 py-2 border-t border-b border-slate-100 dark:border-[#1E3354] text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-navy-700 dark:text-navy-300" />
                      Duración: <strong className="text-slate-800 dark:text-slate-200">{sm.duration} min</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-navy-700 dark:text-navy-300" />
                      Color:{' '}
                      <strong style={{ color: s.color }} className="font-mono">
                        {s.color}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-end mt-4">
                  <div>
                    <span className="text-[9px] text-slate-400 block font-semibold uppercase tracking-wider">Costo</span>
                    <span className="text-base font-black text-navy-800 dark:text-navy-300 font-mono">
                      {CurrencyFormatter.format(sm.price)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* MODAL AGREGAR SERVICIO */}
        {showAddForm && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <form
              onSubmit={this.handleCreateService}
              className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative text-xs"
            >
              <div className="h-1.5 bg-navy-800 dark:bg-navy-500 w-full" />

              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-[#1E3354]">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Registrar Nuevo Servicio</h3>
                  <button
                    type="button"
                    onClick={() => this.setState({ showAddForm: false })}
                    className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded transition-all cursor-pointer text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3.5 text-slate-700 dark:text-slate-200">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1 col-span-1">
                      <label className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px]">
                        Código (ID) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. SRV-005"
                        value={code}
                        onChange={e => this.setState({ code: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-800 dark:text-white font-mono font-bold focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 uppercase"
                      />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <label className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px]">
                        Nombre Servicio *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Afeitado Toalla Caliente"
                        value={name}
                        onChange={e => this.setState({ name: e.target.value })}
                        className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-800 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px]">
                      Descripción Detallada *
                    </label>
                    <textarea
                      required
                      placeholder="Describe el ritual (Ej. Vaporización, navaja libre, aceites esenciales...)"
                      value={description}
                      onChange={e => this.setState({ description: e.target.value })}
                      className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 h-16 text-slate-800 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px]">
                        Categoría
                      </label>
                      <select
                        value={category}
                        onChange={e => this.setState({ category: e.target.value })}
                        className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-800 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                      >
                        <option value="Corte">Corte</option>
                        <option value="Barba">Barba</option>
                        <option value="Combo">Combo</option>
                        <option value="Facial">Facial</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px]">
                        Agenda Color Hex
                      </label>
                      <input
                        type="color"
                        value={color}
                        onChange={e => this.setState({ color: e.target.value })}
                        className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg h-[40px] px-1.5 py-1 text-slate-800 focus:outline-none cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px]">
                        Precio (Bs.)
                      </label>
                      <input
                        type="number"
                        value={price}
                        onChange={e => this.setState({ price: Number(e.target.value) })}
                        className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-800 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 font-mono text-center"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px]">
                        Duración (Minutos)
                      </label>
                      <input
                        type="number"
                        value={duration}
                        onChange={e => this.setState({ duration: Number(e.target.value) })}
                        className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-800 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 font-mono text-center"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-navy-800 hover:bg-navy-700 dark:bg-navy-600 dark:hover:bg-navy-500 text-white py-2.5 rounded-lg font-bold tracking-wide transition-all cursor-pointer text-xs mt-4 shadow-sm"
                >
                  Registrar Servicio en Catálogo
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }
}

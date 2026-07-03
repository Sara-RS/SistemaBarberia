/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/helpers';
import { Scissors, Plus, Clock, Tag, RefreshCw } from 'lucide-react';

export const ServicesAdmin: React.FC = () => {
  const { services, addService, updateService } = useApp();

  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Corte');
  const [price, setPrice] = useState<number>(350);
  const [duration, setDuration] = useState<number>(30);
  const [color, setColor] = useState('#8B5CF6'); // violet by default

  const handleCreateService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description) {
      alert('Nombre y Descripción son campos obligatorios.');
      return;
    }

    try {
      addService({
        name,
        description,
        category,
        price,
        duration,
        color,
        active: true,
      });

      // Reset
      setName('');
      setDescription('');
      setCategory('Corte');
      setPrice(350);
      setDuration(30);
      setColor('#8B5CF6');
      setShowAddForm(false);
    } catch (err: any) {
      alert(err.message || 'Error al agregar el servicio.');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* HEADER CONTROLES */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
        <div>
          <h2 className="font-bold text-slate-900 text-base">Catálogo de Tratamientos & Servicios</h2>
          <span className="text-[10px] text-slate-500 block">Configura precios, duraciones en minutos y colores de visualización en agenda.</span>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-600/10"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Servicio</span>
        </button>
      </div>

      {/* SERVICES CATALOG CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
        {services.map(s => (
          <div key={s.id} className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col justify-between hover:border-slate-300 shadow-sm transition-all">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex gap-2.5 items-center">
                  <div
                    className="w-3 h-8 rounded shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <div>
                    <span className="font-extrabold text-sm text-slate-800 block">{s.name}</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider mt-0.5">{s.category}</span>
                  </div>
                </div>
                <Scissors className="w-4.5 h-4.5 text-slate-300" />
              </div>

              <p className="text-slate-500 leading-normal text-[11px] min-h-[2.5rem]">{s.description}</p>

              <div className="flex gap-4 py-2 border-t border-b border-slate-100 text-[11px] text-slate-500 font-medium">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  Duración: <strong>{s.duration} min</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-indigo-600" />
                  Agenda Color: <strong style={{ color: s.color }} className="font-mono">{s.color}</strong>
                </span>
              </div>
            </div>

            <div className="flex justify-between items-end mt-4">
              <div>
                <span className="text-[9px] text-slate-400 block font-semibold uppercase tracking-wider">Costo</span>
                <span className="text-base font-black text-indigo-600">{formatCurrency(s.price)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL AGREGAR SERVICIO */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateService} className="bg-white border border-slate-200 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative text-xs">
            <div className="h-1 bg-indigo-600 w-full" />
            
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-base">Registrar Nuevo Servicio</h3>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="p-1 text-slate-400 hover:text-slate-800 rounded transition-all cursor-pointer text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3.5 text-slate-650">
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold uppercase text-[9px]">Nombre Servicio *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Afeitado Toalla Caliente"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 font-bold uppercase text-[9px]">Descripción Detallada *</label>
                  <textarea
                    required
                    placeholder="Describe el ritual (Ej. Vaporización, navaja libre, aceites esenciales...)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 h-16 text-slate-800 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-500 font-bold uppercase text-[9px]">Categoría</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none"
                    >
                      <option value="Corte">Corte</option>
                      <option value="Barba">Barba</option>
                      <option value="Combo">Combo</option>
                      <option value="Facial">Facial</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 font-bold uppercase text-[9px]">Agenda Color Hex</label>
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg h-[40px] px-1.5 py-1 text-slate-800 focus:outline-none cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-500 font-bold uppercase text-[9px]">Precio ($ MXN)</label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none font-mono text-center"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 font-bold uppercase text-[9px]">Duración (Minutos)</label>
                    <input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none font-mono text-center"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-bold tracking-wide transition-all cursor-pointer text-xs mt-4 shadow-md shadow-indigo-600/10"
              >
                Registrar Servicio en Catálogo
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

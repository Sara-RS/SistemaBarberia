/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import { MapPin, Phone, Clock, Calendar } from 'lucide-react';

export const BranchInfo: React.FC = () => {
  const { branches } = useApp();

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Nuestras Sucursales</h1>
        <p className="text-xs text-slate-500 mt-1">Conoce nuestras ubicaciones, horarios de atención y números de contacto directos.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {branches.map((b) => (
          <div key={b.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {/* Header sucursal decorativo */}
            <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-slate-800 text-base">{b.name}</h2>
                <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider block mt-0.5">Barbería Premium</span>
              </div>
              <MapPin className="w-5 h-5 text-indigo-600" />
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-3">
                <div className="flex gap-3 text-xs items-start">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400 font-semibold block">Dirección</span>
                    <span className="text-slate-700 mt-0.5 block">{b.address}</span>
                  </div>
                </div>

                <div className="flex gap-3 text-xs items-start">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400 font-semibold block">Teléfono de Reservas</span>
                    <span className="text-indigo-600 mt-0.5 block font-bold">{b.phone}</span>
                  </div>
                </div>
              </div>

              {/* Horarios en tabla compacta */}
              <div className="border-t border-slate-100 pt-4 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Horarios de Apertura</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {Object.entries(b.openingHours).map(([day, value]) => {
                    const val = value as { open: string; close: string; active: boolean };
                    return (
                      <div key={day} className="flex justify-between py-1 border-b border-slate-50">
                        <span className="capitalize text-slate-500 font-medium">{day}:</span>
                        <span className="text-slate-800 font-bold">
                          {val.active ? `${val.open} - ${val.close}` : 'Cerrado'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

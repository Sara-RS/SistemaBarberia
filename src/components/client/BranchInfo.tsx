/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BaseAppComponent } from '../../context/AppContext';
import { ModelFactory } from '../../models/DomainModels';
import { MapPin, Phone } from 'lucide-react';

export class BranchInfo extends BaseAppComponent {
  public render(): React.ReactNode {
    const branchModels = this.app.branches.map(b => ModelFactory.createBranch(b));

    return (
      <div className="space-y-6 animate-fadeIn">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Nuestras Sucursales</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Conoce nuestras ubicaciones, horarios de atención y números de contacto directos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {branchModels.map(branch => (
            <div
              key={branch.id}
              className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-xl overflow-hidden shadow-sm"
            >
              <div className="p-5 border-b border-slate-200 dark:border-[#1E3354] bg-slate-50/70 dark:bg-[#12233B] flex justify-between items-center">
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white text-base">{branch.name}</h2>
                  <span className="text-[10px] text-navy-700 dark:text-navy-300 font-bold uppercase tracking-wider block mt-0.5">
                    Barbería Premium
                  </span>
                </div>
                <MapPin className="w-5 h-5 text-navy-700 dark:text-navy-300" />
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-3">
                  <div className="flex gap-3 text-xs items-start">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-400 dark:text-slate-400 font-semibold block">Dirección</span>
                      <span className="text-slate-700 dark:text-slate-200 mt-0.5 block">{branch.address}</span>
                    </div>
                  </div>

                  <div className="flex gap-3 text-xs items-start">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-400 dark:text-slate-400 font-semibold block">
                        Teléfono de Reservas
                      </span>
                      <span className="text-navy-700 dark:text-navy-300 mt-0.5 block font-bold font-mono">
                        {branch.phone}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-[#1E3354] pt-4 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Horarios de Apertura
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {Object.entries(branch.openingHours).map(([day, value]) => {
                      const val = value as { open: string; close: string; active: boolean };
                      return (
                        <div
                          key={day}
                          className="flex justify-between py-1 border-b border-slate-100 dark:border-[#1E3354]/60"
                        >
                          <span className="capitalize text-slate-500 dark:text-slate-400 font-medium">{day}:</span>
                          <span className="text-slate-800 dark:text-slate-100 font-bold font-mono">
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
  }
}

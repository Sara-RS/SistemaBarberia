/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BaseAppComponent, AppContextProps } from '../../context/AppContext';
import {
  Settings,
  Building2,
  Receipt,
  Scissors,
  Check,
  Save,
  Phone,
  Mail,
  MapPin,
  Percent,
} from 'lucide-react';

interface SettingsAdminState {
  name: string;
  slogan: string;
  nitRuc: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string;
  receiptFooterMsg: string;
  currencySymbol: string;
  defaultCommission: number;
  savedSuccess: boolean;
}

export class SettingsAdmin extends BaseAppComponent<{}, SettingsAdminState> {
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly presetLogos = [
    { id: 'classic', label: 'Barbería Clásica', url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=120&auto=format&fit=crop&q=80' },
    { id: 'modern', label: 'Estilo Urbano', url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=120&auto=format&fit=crop&q=80' },
    { id: 'vintage', label: 'Vintage Pole', url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=120&auto=format&fit=crop&q=80' },
  ];

  constructor(props: {}, context: AppContextProps) {
    super(props, context);
    const info = context?.companyInfo;
    this.state = {
      name: info?.name || '',
      slogan: info?.slogan || '',
      nitRuc: info?.nitRuc || '',
      address: info?.address || '',
      phone: info?.phone || '',
      email: info?.email || '',
      logoUrl: info?.logoUrl || '',
      receiptFooterMsg: info?.receiptFooterMsg || '',
      currencySymbol: info?.currencySymbol || 'Bs.',
      defaultCommission: info?.defaultCommission || 35,
      savedSuccess: false,
    };
  }

  public componentDidMount(): void {
    const info = this.app.companyInfo;
    this.setState({
      name: info.name || '',
      slogan: info.slogan || '',
      nitRuc: info.nitRuc || '',
      address: info.address || '',
      phone: info.phone || '',
      email: info.email || '',
      logoUrl: info.logoUrl || '',
      receiptFooterMsg: info.receiptFooterMsg || '',
      currencySymbol: info.currencySymbol || 'Bs.',
      defaultCommission: info.defaultCommission || 35,
    });
  }

  public componentWillUnmount(): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
  }

  private handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    const {
      name,
      slogan,
      nitRuc,
      address,
      phone,
      email,
      logoUrl,
      receiptFooterMsg,
      currencySymbol,
      defaultCommission,
    } = this.state;

    if (!name.trim()) {
      alert('El nombre de la barbería/institución es obligatorio.');
      return;
    }

    this.app.updateCompanyInfo({
      name: name.trim(),
      slogan: slogan.trim(),
      nitRuc: nitRuc.trim(),
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim(),
      logoUrl: logoUrl.trim(),
      receiptFooterMsg: receiptFooterMsg.trim(),
      currencySymbol: currencySymbol.trim(),
      defaultCommission: Number(defaultCommission),
    });

    this.setState({ savedSuccess: true });
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.setState({ savedSuccess: false }), 3500);
  };

  public render(): React.ReactNode {
    const {
      name,
      slogan,
      nitRuc,
      address,
      phone,
      email,
      logoUrl,
      receiptFooterMsg,
      currencySymbol,
      defaultCommission,
      savedSuccess,
    } = this.state;

    return (
      <div className="space-y-6 animate-fadeIn pb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] p-5 rounded-2xl shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-navy-800 dark:text-navy-300 stroke-[2.5]" />
              <h2 className="font-black text-slate-900 dark:text-white text-lg">Parametrización del Sistema</h2>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-extrabold tracking-wider mt-1">
              Módulo de Administración General e Identidad Institucional
            </span>
          </div>

          {savedSuccess && (
            <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
              <span>¡Parámetros actualizados correctamente!</span>
            </div>
          )}
        </div>

        <form onSubmit={this.handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-[#1E3354]">
                <div className="p-2 bg-navy-50 dark:bg-navy-900/70 text-navy-800 dark:text-navy-300 rounded-lg border border-navy-200 dark:border-navy-700/60">
                  <Building2 className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
                    Datos de la Institución / Empresa
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    Información pública visible en reportes, recibos y cabeceras de pantalla.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    Nombre de la Barbería / Institución *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder='Ej. Barbería "Josué"'
                    value={name}
                    onChange={(e) => this.setState({ name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-xl p-3 text-slate-800 dark:text-white font-semibold placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-navy-600 dark:focus:border-navy-400 focus:bg-white dark:focus:bg-[#162B47] transition-all text-sm"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    Eslogan / Leyenda Institucional
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Estilo, Corte & Tradición de Caballero"
                    value={slogan}
                    onChange={(e) => this.setState({ slogan: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-xl p-2.5 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-navy-600 dark:focus:border-navy-400 focus:bg-white dark:focus:bg-[#162B47] transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    NIT / RUC / Registro Fiscal
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 1029384029"
                    value={nitRuc}
                    onChange={(e) => this.setState({ nitRuc: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-xl p-2.5 text-slate-800 dark:text-white font-mono placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-navy-600 dark:focus:border-navy-400 focus:bg-white dark:focus:bg-[#162B47] transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    Teléfono Principal / WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Ej. 71523456"
                      value={phone}
                      onChange={(e) => this.setState({ phone: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-xl pl-9 pr-3 py-2.5 text-slate-800 dark:text-white font-mono placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-navy-600 dark:focus:border-navy-400 focus:bg-white dark:focus:bg-[#162B47] transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    Dirección Principal de la Institución
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Ej. Av. 16 de Julio #1420, El Prado, La Paz, Bolivia"
                      value={address}
                      onChange={(e) => this.setState({ address: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-xl pl-9 pr-3 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-navy-600 dark:focus:border-navy-400 focus:bg-white dark:focus:bg-[#162B47] transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    Correo Electrónico Institucional
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      placeholder="Ej. contacto@barberiajosue.bo"
                      value={email}
                      onChange={(e) => this.setState({ email: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-xl pl-9 pr-3 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-navy-600 dark:focus:border-navy-400 focus:bg-white dark:focus:bg-[#162B47] transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-[#1E3354]">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
                  <Receipt className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
                    Configuración de Comprobantes & Pagos
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    Personaliza la moneda del sistema y los detalles impresos en los recibos.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    Símbolo de Moneda
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Bs."
                    value={currencySymbol}
                    onChange={(e) => this.setState({ currencySymbol: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-xl p-2.5 text-slate-800 dark:text-white font-bold font-mono focus:outline-none focus:border-navy-600 dark:focus:border-navy-400 focus:bg-white dark:focus:bg-[#162B47] transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    Comisión Estándar a Barberos (%)
                  </label>
                  <div className="relative">
                    <Percent className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute right-3 top-3" />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={defaultCommission}
                      onChange={(e) => this.setState({ defaultCommission: Number(e.target.value) })}
                      className="w-full bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-xl p-2.5 text-slate-800 dark:text-white font-mono font-bold focus:outline-none focus:border-navy-600 dark:focus:border-navy-400 focus:bg-white dark:focus:bg-[#162B47] transition-all pr-8"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    Mensaje / Pie de Página del Comprobante de Venta
                  </label>
                  <textarea
                    rows={3}
                    placeholder='Ej. ¡Gracias por elegir Barbería "Josué"! Vuelva pronto.'
                    value={receiptFooterMsg}
                    onChange={(e) => this.setState({ receiptFooterMsg: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-xl p-3 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-navy-600 dark:focus:border-navy-400 focus:bg-white dark:focus:bg-[#162B47] transition-all text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-8 py-3.5 bg-navy-800 hover:bg-navy-700 dark:bg-navy-600 dark:hover:bg-navy-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-navy-900/20 transition-all cursor-pointer active:scale-95"
              >
                <Save className="w-4 h-4 stroke-[2.5]" />
                <span>Guardar Parámetros Institucionales</span>
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider border-b border-slate-100 dark:border-[#1E3354] pb-2">
                Logo de la Barbería
              </h3>

              <div className="space-y-1.5">
                <label className="text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  URL de Imagen de Logo (Opcional)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={logoUrl}
                  onChange={(e) => this.setState({ logoUrl: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-xl p-2 text-slate-800 dark:text-white text-xs placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-navy-600 dark:focus:border-navy-400"
                />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">
                  O elige un estilo predefinido:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {this.presetLogos.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => this.setState({ logoUrl: preset.url })}
                      className={`p-1.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer overflow-hidden ${
                        logoUrl === preset.url
                          ? 'border-navy-600 dark:border-navy-400 bg-navy-50/70 dark:bg-navy-900/70 ring-2 ring-navy-600/20 dark:ring-navy-400/20'
                          : 'border-slate-200 dark:border-[#243D63] hover:border-slate-300 dark:hover:border-navy-500 bg-slate-50/50 dark:bg-[#12233B]'
                      }`}
                    >
                      <img src={preset.url} alt={preset.label} className="w-10 h-10 object-cover rounded-lg" />
                      <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 text-center truncate w-full">
                        {preset.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-navy-900 dark:bg-[#06142B] border border-navy-800 dark:border-[#243D63] rounded-2xl p-5 text-white shadow-xl space-y-4 font-mono text-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-navy-400/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between border-b border-navy-800 dark:border-[#1E3354] pb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-navy-200 dark:text-navy-300 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5" />
                  Vista Previa Comprobante
                </span>
                <span className="text-[9px] text-navy-200 bg-navy-800 dark:bg-[#12233B] px-2 py-0.5 rounded border border-navy-700 dark:border-[#243D63]">
                  MUESTRA
                </span>
              </div>

              <div className="text-center space-y-1 py-2">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="w-12 h-12 object-cover rounded-full mx-auto border-2 border-navy-400/40"
                  />
                ) : (
                  <div className="w-10 h-10 bg-navy-700 dark:bg-navy-600 rounded-xl flex items-center justify-center text-white mx-auto shadow-md border border-navy-500/40">
                    <Scissors className="w-5 h-5" />
                  </div>
                )}

                <h4 className="font-extrabold text-sm text-white uppercase tracking-tight">
                  {name || 'Nombre Barbería'}
                </h4>
                <p className="text-[10px] text-navy-200/80 italic">{slogan || 'Eslogan Institucional'}</p>
                <p className="text-[10px] text-navy-200/80">NIT: {nitRuc || '1029384029'}</p>
                <p className="text-[9px] text-navy-300/70 leading-tight">{address || 'Dirección de la Barbería'}</p>
                <p className="text-[9px] text-navy-300/70">Tel: {phone || '71523456'}</p>
              </div>

              <div className="border-t border-b border-dashed border-navy-800 dark:border-[#1E3354] py-3 space-y-1.5 text-[11px]">
                <div className="flex justify-between text-navy-100/80">
                  <span>1× Corte de Cabello VIP</span>
                  <span>50.00 {currencySymbol}</span>
                </div>
                <div className="flex justify-between text-navy-100/80">
                  <span>1× Cera Modeladora Matte</span>
                  <span>25.00 {currencySymbol}</span>
                </div>
                <div className="flex justify-between font-bold text-white pt-1 border-t border-navy-800 dark:border-[#1E3354]">
                  <span>TOTAL:</span>
                  <span className="text-amber-400 font-extrabold">75.00 {currencySymbol}</span>
                </div>
              </div>

              <div className="text-center text-[10px] text-navy-200/80 leading-normal italic pt-1">
                "{receiptFooterMsg || '¡Gracias por su preferencia! Vuelva pronto.'}"
              </div>
            </div>
          </div>
        </form>
      </div>
    );
  }
}

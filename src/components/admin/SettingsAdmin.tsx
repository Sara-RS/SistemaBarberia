/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
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
  FileText,
  Percent,
  Sparkles,
  HelpCircle,
  Globe,
  DollarSign
} from 'lucide-react';

export const SettingsAdmin: React.FC = () => {
  const { companyInfo, updateCompanyInfo } = useApp();

  const [name, setName] = useState(companyInfo.name || '');
  const [slogan, setSlogan] = useState(companyInfo.slogan || '');
  const [nitRuc, setNitRuc] = useState(companyInfo.nitRuc || '');
  const [address, setAddress] = useState(companyInfo.address || '');
  const [phone, setPhone] = useState(companyInfo.phone || '');
  const [email, setEmail] = useState(companyInfo.email || '');
  const [logoUrl, setLogoUrl] = useState(companyInfo.logoUrl || '');
  const [receiptFooterMsg, setReceiptFooterMsg] = useState(companyInfo.receiptFooterMsg || '');
  const [currencySymbol, setCurrencySymbol] = useState(companyInfo.currencySymbol || 'Bs.');
  const [defaultCommission, setDefaultCommission] = useState(companyInfo.defaultCommission || 35);

  const [savedSuccess, setSavedSuccess] = useState(false);

  // PRESET LOGOS
  const presetLogos = [
    { id: 'classic', label: 'Barbería Clásica', url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=120&auto=format&fit=crop&q=80' },
    { id: 'modern', label: 'Estilo Urbano', url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=120&auto=format&fit=crop&q=80' },
    { id: 'vintage', label: 'Vintage Pole', url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=120&auto=format&fit=crop&q=80' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('El nombre de la barbería/institución es obligatorio.');
      return;
    }

    updateCompanyInfo({
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

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600 stroke-[2.5]" />
            <h2 className="font-black text-slate-900 text-lg">Parametrización del Sistema</h2>
          </div>
          <span className="text-[10px] text-slate-500 block uppercase font-extrabold tracking-wider mt-1">
            Módulo de Administración General e Identidad Institucional
          </span>
        </div>

        {savedSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 animate-bounce">
            <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
            <span>¡Parámetros actualizados correctamente!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUMNA IZQUIERDA Y CENTRO: DATOS FORMULARIO */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 1. INFORMACIÓN GENERAL DE LA INSTITUCIÓN */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Building2 className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Datos de la Institución / Empresa</h3>
                <p className="text-[10px] text-slate-400">Información pública visible en reportes, recibos y cabeceras de pantalla.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* NOMBRE BARBERIA */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  Nombre de la Barbería / Institución *
                </label>
                <input
                  type="text"
                  required
                  placeholder='Ej. Barbería "Josué"'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded-xl p-3 text-slate-800 font-semibold focus:outline-none focus:border-indigo-600 focus:bg-white transition-all text-sm"
                />
              </div>

              {/* ESLOGAN */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  Eslogan / Leyenda Institucional
                </label>
                <input
                  type="text"
                  placeholder="Ej. Estilo, Corte & Tradición de Caballero"
                  value={slogan}
                  onChange={(e) => setSlogan(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                />
              </div>

              {/* NIT / RUC */}
              <div className="space-y-1.5">
                <label className="text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  NIT / RUC / Registro Fiscal
                </label>
                <input
                  type="text"
                  placeholder="Ej. 1029384029"
                  value={nitRuc}
                  onChange={(e) => setNitRuc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded-xl p-2.5 text-slate-800 font-mono focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                />
              </div>

              {/* TELEFONO */}
              <div className="space-y-1.5">
                <label className="text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  Teléfono Principal / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Ej. 71523456"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl pl-9 pr-3 py-2.5 text-slate-800 font-mono focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* DIRECCION */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  Dirección Principal de la Institución
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Ej. Av. 16 de Julio #1420, El Prado, La Paz, Bolivia"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl pl-9 pr-3 py-2.5 text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* EMAIL */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  Correo Electrónico Institucional
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    placeholder="Ej. contacto@barberiajosue.bo"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl pl-9 pr-3 py-2.5 text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. COMPROBANTE DE VENTA Y REGLAS DE COBRO */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <Receipt className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Configuración de Comprobantes & Pagos</h3>
                <p className="text-[10px] text-slate-400">Personaliza la moneda del sistema y los detalles impresos en los recibos.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* MONEDA */}
              <div className="space-y-1.5">
                <label className="text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  Símbolo de Moneda
                </label>
                <input
                  type="text"
                  placeholder="Ej. Bs."
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded-xl p-2.5 text-slate-800 font-bold font-mono focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                />
              </div>

              {/* COMISION DE BARBEROS */}
              <div className="space-y-1.5">
                <label className="text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  Comisión Estándar a Barberos (%)
                </label>
                <div className="relative">
                  <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={defaultCommission}
                    onChange={(e) => setDefaultCommission(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl p-2.5 text-slate-800 font-mono font-bold focus:outline-none focus:border-indigo-600 focus:bg-white transition-all pr-8"
                  />
                </div>
              </div>

              {/* PIE DE PAGINA DE COMPROBANTE */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  Mensaje / Pie de Página del Comprobante de Venta
                </label>
                <textarea
                  rows={3}
                  placeholder='Ej. ¡Gracias por elegir Barbería "Josué"! Vuelva pronto.'
                  value={receiptFooterMsg}
                  onChange={(e) => setReceiptFooterMsg(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded-xl p-3 text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all text-xs"
                />
              </div>
            </div>
          </div>

          {/* BOTON GUARDAR */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer active:scale-98"
            >
              <Save className="w-4 h-4 stroke-[2.5]" />
              <span>Guardar Parámetros Institucionales</span>
            </button>
          </div>
        </div>

        {/* COLUMNA DERECHA: LOGO & VISTA PREVIA DEL COMPROBANTE */}
        <div className="space-y-6">
          
          {/* LOGO PERSONALIZADO / PRESETS */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
              Logo de la Barbería
            </h3>

            {/* URL LOGO INPUT */}
            <div className="space-y-1.5">
              <label className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                URL de Imagen de Logo (Opcional)
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800 text-xs focus:outline-none focus:border-indigo-600"
              />
            </div>

            {/* PRESETS DE LOGO */}
            <div className="space-y-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">O elige un estilo predefinido:</span>
              <div className="grid grid-cols-3 gap-2">
                {presetLogos.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setLogoUrl(preset.url)}
                    className={`p-1.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer overflow-hidden ${
                      logoUrl === preset.url
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <img src={preset.url} alt={preset.label} className="w-10 h-10 object-cover rounded-lg" />
                    <span className="text-[9px] font-bold text-slate-600 text-center truncate w-full">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* VISTA PREVIA DEL COMPROBANTE DE VENTA */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-xl space-y-4 font-mono text-xs relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5" />
                Vista Previa Comprobante
              </span>
              <span className="text-[9px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded">MUESTRA</span>
            </div>

            {/* ENCABEZADO TICKET PREVIEW */}
            <div className="text-center space-y-1 py-2">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-12 h-12 object-cover rounded-full mx-auto border-2 border-indigo-500/30" />
              ) : (
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white mx-auto shadow-md">
                  <Scissors className="w-5 h-5" />
                </div>
              )}

              <h4 className="font-extrabold text-sm text-white uppercase tracking-tight">{name || 'Nombre Barbería'}</h4>
              <p className="text-[10px] text-slate-400 italic">{slogan || 'Eslogan Institucional'}</p>
              <p className="text-[10px] text-slate-400">NIT: {nitRuc || '1029384029'}</p>
              <p className="text-[9px] text-slate-500 leading-tight">{address || 'Dirección de la Barbería'}</p>
              <p className="text-[9px] text-slate-500">Tel: {phone || '71523456'}</p>
            </div>

            {/* CUERPO MOCK */}
            <div className="border-t border-b border-dashed border-slate-800 py-3 space-y-1.5 text-[11px]">
              <div className="flex justify-between text-slate-400">
                <span>1× Corte de Cabello VIP</span>
                <span>50.00 {currencySymbol}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>1× Cera Modeladora Matte</span>
                <span>25.00 {currencySymbol}</span>
              </div>
              <div className="flex justify-between font-bold text-white pt-1 border-t border-slate-800">
                <span>TOTAL:</span>
                <span className="text-amber-400 font-extrabold">75.00 {currencySymbol}</span>
              </div>
            </div>

            {/* PIE MOCK */}
            <div className="text-center text-[10px] text-slate-400 leading-normal italic pt-1">
              "{receiptFooterMsg || '¡Gracias por su preferencia! Vuelva pronto.'}"
            </div>
          </div>

        </div>
      </form>
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/helpers';
import {
  TrendingUp,
  Calendar,
  Users,
  Package,
  Sparkles,
  AlertTriangle,
  Award,
  Clock,
  ArrowRight,
  BrainCircuit,
  Loader,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

export const Dashboard: React.FC = () => {
  const { appointments, services, products, sales, clients, selectedBranchId } = useApp();

  // AI Advice states
  const [advice, setAdvice] = useState('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [adviceError, setAdviceError] = useState('');

  // 1. COMPUTE KEY PERFORMANCE INDICATORS (KPIs)
  const todayStr = '2026-07-02'; // Matching mock date
  const todaySales = sales.reduce((acc, s) => acc + s.total, 0);
  const todayAppointments = appointments.filter(a => a.date === todayStr && a.status !== 'cancelled');
  const activeClientsCount = clients.length;
  
  // Alerta de stock crítico (stock <= minStock)
  const criticalProducts = products.filter(p => p.stock <= p.minStock);
  const criticalStockCount = criticalProducts.length;

  // 2. ANALYTICS DATA GENERATION
  const revenueHistory = [
    { name: 'Lun', ingresos: 4200 },
    { name: 'Mar', ingresos: 5800 },
    { name: 'Mié', ingresos: 5100 },
    { name: 'Jue', ingresos: 6500 },
    { name: 'Vie', ingresos: 8900 },
    { name: 'Sáb', ingresos: 12500 },
    { name: 'Dom', ingresos: todaySales > 0 ? todaySales : 3500 },
  ];

  const serviceCategories = [
    { name: 'Corte', value: 12, color: '#3B82F6' },
    { name: 'Barba', value: 8, color: '#10B981' },
    { name: 'Combo', value: 15, color: '#8B5CF6' },
    { name: 'Facial', value: 4, color: '#F59E0B' },
  ];

  const barberSales = [
    { name: 'Carlos', cortes: 14, color: '#3B82F6' },
    { name: 'Luis', cortes: 18, color: '#10B981' },
    { name: 'Mateo', cortes: 9, color: '#8B5CF6' },
  ];

  const handleFetchAIAdvice = async () => {
    setLoadingAdvice(true);
    setAdviceError('');
    setAdvice('');

    try {
      const metricsPayload = {
        todaySales,
        todayAppointments: todayAppointments.length,
        activeClients: activeClientsCount,
        criticalStockCount,
        recentAppointments: todayAppointments.slice(0, 3).map(a => {
          const service = services.find(s => s.id === a.serviceId);
          return { time: a.startTime, serviceName: service?.name || 'Servicio' };
        }),
      };

      const res = await fetch('/api/ai/advise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics: metricsPayload }),
      });

      const data = await res.json();
      if (res.ok) {
        setAdvice(data.advice);
      } else {
        throw new Error(data.error || 'No se pudo generar el consejo.');
      }
    } catch (err: any) {
      setAdviceError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoadingAdvice(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight">Dashboard Ejecutivo</h1>
          <p className="text-xs text-slate-500 mt-1">Métricas clave, comportamiento de sucursal y consultoría estratégica de IA.</p>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl relative overflow-hidden group shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Ventas de Hoy</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {formatCurrency(todaySales || 580)}
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-[10px] text-emerald-600 font-semibold">
            <span>+14.2%</span>
            <span className="text-slate-400 font-normal">vs lunes pasado</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl relative overflow-hidden group shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Citas Agendadas</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {todayAppointments.length}
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Calendar className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-[10px] text-indigo-600 font-semibold">
            <span>{appointments.filter(a => a.status === 'completed').length} Completadas</span>
            <span className="text-slate-400 font-normal">de hoy</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl relative overflow-hidden group shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Clientes Activos</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {activeClientsCount}
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-[10px] text-purple-600 font-semibold">
            <span>+4 nuevos</span>
            <span className="text-slate-400 font-normal">este mes</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl relative overflow-hidden group shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Insumos Críticos</span>
              <span className={`text-2xl font-black mt-1 block ${criticalStockCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {criticalStockCount}
              </span>
            </div>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${criticalStockCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-400'}`}>
              <Package className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-[10px] text-slate-500 font-semibold">
            <span className={criticalStockCount > 0 ? 'text-rose-600 font-bold' : ''}>
              {criticalStockCount > 0 ? 'Requiere reabastecimiento' : 'Stock en niveles óptimos'}
            </span>
          </div>
        </div>
      </div>

      {/* GRID DE IA Y ALERTAS DE STOCK */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* WIDGET IA CONSULTOR */}
        <div className="lg:col-span-2 p-5 bg-white border border-slate-200 rounded-xl space-y-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-60 pointer-events-none" />
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
            <div className="flex gap-2.5 items-center">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm">
                <BrainCircuit className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Consultor Estratégico de IA</h3>
                <span className="text-[10px] text-indigo-600 font-extrabold tracking-wider uppercase block">Powered by Gemini AI</span>
              </div>
            </div>
            <button
              onClick={handleFetchAIAdvice}
              disabled={loadingAdvice}
              className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 cursor-pointer flex items-center gap-1.5 shrink-0 transition-all disabled:opacity-50 shadow-md shadow-indigo-600/10"
            >
              {loadingAdvice ? (
                <>
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                  <span>Analizando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 fill-white" />
                  <span>Obtener Análisis</span>
                </>
              )}
            </button>
          </div>

          {/* ÁREA DE CONTENIDO DE CONSEJO */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs leading-relaxed text-slate-700 min-h-[140px] max-h-[300px] overflow-y-auto relative z-10">
            {loadingAdvice ? (
              <div className="h-28 flex flex-col items-center justify-center text-center gap-2">
                <Loader className="w-6 h-6 text-indigo-600 animate-spin" />
                <span className="text-slate-500 font-semibold">Gemini está analizando los ingresos, citas y almacenes...</span>
              </div>
            ) : advice ? (
              <div className="prose prose-xs whitespace-pre-line max-w-none text-slate-700 font-medium">
                {advice}
              </div>
            ) : adviceError ? (
              <div className="text-center p-4 space-y-2 text-rose-600">
                <AlertTriangle className="w-8 h-8 mx-auto stroke-[2]" />
                <p className="font-bold">Error de Configuración</p>
                <p className="text-[10px] text-slate-400">{adviceError}</p>
                <p className="text-[10px] bg-rose-50 border border-rose-100 p-2.5 text-rose-700 rounded-lg max-w-sm mx-auto">
                  💡 Tip: Puedes configurar tu API key de Gemini en el panel de Secrets de AI Studio.
                </p>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 space-y-1.5">
                <BrainCircuit className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-700">¿Listo para mejorar la rentabilidad?</p>
                <p className="text-[10px] text-slate-500">Presiona el botón de arriba para analizar las ventas de hoy y obtener 3 consejos automatizados para tu barbería.</p>
              </div>
            )}
          </div>
        </div>

        {/* ALERTA DE STOCK CRÍTICO */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-4 shadow-sm">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Alertas de Stock</h3>
            <span className="bg-rose-50 text-rose-600 text-[10px] px-2 py-0.5 rounded-full font-bold border border-rose-100">
              {criticalStockCount} ítems
            </span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {criticalProducts.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400">
                ✅ Todo el inventario está completo y por encima del stock mínimo.
              </div>
            ) : (
              criticalProducts.map(p => (
                <div key={p.id} className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-xs text-slate-800 block">{p.name}</span>
                    <span className="text-[9px] text-slate-400 block">SKU: {p.sku}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-rose-600 block">{p.stock} pz</span>
                    <span className="text-[9px] text-slate-400 block">mín: {p.minStock}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* VISUALIZACIONES GRÁFICAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* GRÁFICO REVENUE */}
        <div className="md:col-span-2 p-5 bg-white border border-slate-200 rounded-xl space-y-4 shadow-sm">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Curva de Ingresos Semanales</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                  labelStyle={{ color: '#0f172a', fontWeight: 'bold', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="ingresos" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* DISTRIBUCIÓN POR SERVICIO */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-4 shadow-sm">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Servicios más Solicitados</h3>
          <div className="h-44 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={serviceCategories}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {serviceCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {serviceCategories.map((c) => (
              <div key={c.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="text-slate-500 font-medium">{c.name}:</span>
                <span className="text-slate-900 font-bold ml-auto">{c.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

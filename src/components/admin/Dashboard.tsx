/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, getTodayStr, getOffsetDateStr, getDayNameShort } from '../../utils/helpers';
import {
  TrendingUp,
  Calendar,
  Users,
  Package,
  AlertTriangle,
  Award,
  Clock,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const Dashboard: React.FC = () => {
  const { appointments, services, products, sales, clients, employees, selectedBranchId, companyInfo } = useApp();

  // 1. FECHA PRESENTE Y FILTRADO REAL
  const todayStr = getTodayStr();
  const yesterdayStr = getOffsetDateStr(-1);

  // Ventas de hoy (de la lista real de ventas)
  const todaySalesRecords = sales.filter(s => s.branchId === selectedBranchId && (s.date.startsWith(todayStr) || s.createdAt.startsWith(todayStr)));
  const todaySalesTotalFromPOS = todaySalesRecords.reduce((acc, s) => acc + s.total, 0);

  // Citas completadas de hoy
  const todayCompletedApts = appointments.filter(a => a.branchId === selectedBranchId && a.date === todayStr && a.status === 'completed');
  const todayAptsRevenue = todayCompletedApts.reduce((acc, a) => acc + a.price, 0);

  // Total acumulado ventas de hoy
  const todaySales = todaySalesTotalFromPOS > 0 ? todaySalesTotalFromPOS : todayAptsRevenue;

  // Ventas de ayer para cálculo de crecimiento
  const yesterdaySalesRecords = sales.filter(s => s.branchId === selectedBranchId && (s.date.startsWith(yesterdayStr) || s.createdAt.startsWith(yesterdayStr)));
  const yesterdaySalesTotalFromPOS = yesterdaySalesRecords.reduce((acc, s) => acc + s.total, 0);
  const yesterdayCompletedApts = appointments.filter(a => a.branchId === selectedBranchId && a.date === yesterdayStr && a.status === 'completed');
  const yesterdaySales = yesterdaySalesTotalFromPOS > 0 ? yesterdaySalesTotalFromPOS : yesterdayCompletedApts.reduce((acc, a) => acc + a.price, 0);

  // Porcentaje de crecimiento vs ayer
  const salesGrowthVal = yesterdaySales > 0 
    ? (((todaySales - yesterdaySales) / yesterdaySales) * 100).toFixed(1)
    : todaySales > 0 ? '+100' : '0';

  // Citas de hoy
  const todayAppointments = appointments.filter(a => a.branchId === selectedBranchId && a.date === todayStr && a.status !== 'cancelled');
  const completedTodayCount = appointments.filter(a => a.branchId === selectedBranchId && a.date === todayStr && a.status === 'completed').length;

  // Clientes y Stock
  const activeClientsCount = clients.length;
  const criticalProducts = products.filter(p => p.branchId === selectedBranchId && p.stock <= p.minStock);
  const criticalStockCount = criticalProducts.length;

  // 2. CURVA DE INGRESOS REALES DE LOS ÚLTIMOS 7 DÍAS
  const revenueHistory = Array.from({ length: 7 }, (_, i) => {
    const offset = 6 - i;
    const dateStr = getOffsetDateStr(-offset);
    const dayLabel = getDayNameShort(dateStr);

    // Sumar ventas de ese día
    const daySalesPos = sales
      .filter(s => s.branchId === selectedBranchId && (s.date.startsWith(dateStr) || s.createdAt.startsWith(dateStr)))
      .reduce((acc, s) => acc + s.total, 0);

    const dayApts = appointments
      .filter(a => a.branchId === selectedBranchId && a.date === dateStr && a.status === 'completed')
      .reduce((acc, a) => acc + a.price, 0);

    const dayTotal = daySalesPos > 0 ? daySalesPos : dayApts;

    return {
      name: dayLabel,
      ingresos: dayTotal,
      date: dateStr,
    };
  });

  // 3. DISTRIBUCIÓN REAL POR CATEGORÍA DE SERVICIOS
  const categoryColors: Record<string, string> = {
    Corte: '#3B82F6',
    Barba: '#10B981',
    Combo: '#8B5CF6',
    Insumo: '#F59E0B',
    Facial: '#EC4899',
  };

  const serviceCategoriesMap = services.reduce((acc, srv) => {
    const cat = srv.category || 'Otros';
    const count = appointments.filter(a => a.branchId === selectedBranchId && a.serviceId === srv.id && a.status !== 'cancelled').length;
    acc[cat] = (acc[cat] || 0) + count;
    return acc;
  }, {} as Record<string, number>);

  const serviceCategories = Object.keys(serviceCategoriesMap).map(cat => ({
    name: cat,
    value: serviceCategoriesMap[cat] || 1,
    color: categoryColors[cat] || '#6366F1',
  }));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight">Dashboard Ejecutivo</h1>
          <p className="text-xs text-slate-500 mt-1">
            Métricas reales en tiempo real — Hoy: <strong className="text-slate-800">{todayStr}</strong>
          </p>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: VENTAS HOY */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl relative overflow-hidden group shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Ventas de Hoy</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block font-mono">
                {formatCurrency(todaySales)}
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-[10px] text-emerald-600 font-semibold">
            <span>{Number(salesGrowthVal) >= 0 ? `+${salesGrowthVal}%` : `${salesGrowthVal}%`}</span>
            <span className="text-slate-400 font-normal">vs ayer</span>
          </div>
        </div>

        {/* KPI 2: CITAS AGENDADAS */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl relative overflow-hidden group shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Citas Agendadas</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block font-mono">
                {todayAppointments.length}
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Calendar className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-[10px] text-indigo-600 font-semibold">
            <span>{completedTodayCount} Completadas</span>
            <span className="text-slate-400 font-normal">de hoy</span>
          </div>
        </div>

        {/* KPI 3: CLIENTES ACTIVOS */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl relative overflow-hidden group shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Clientes Registrados</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block font-mono">
                {activeClientsCount}
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-[10px] text-purple-600 font-semibold">
            <span>{clients.filter(c => c.isRegistered).length} frecuentes</span>
            <span className="text-slate-400 font-normal">en base de datos</span>
          </div>
        </div>

        {/* KPI 4: INSUMOS CRÍTICOS */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl relative overflow-hidden group shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Insumos Críticos</span>
              <span className={`text-2xl font-black mt-1 block font-mono ${criticalStockCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
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

      {/* SECCIÓN DE ALERTA DE STOCK CRÍTICO */}
      {criticalStockCount > 0 && (
        <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-4 shadow-sm animate-fadeIn">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="font-bold text-rose-600 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 stroke-[2]" />
              <span>Insumos con Stock Crítico en Inventario</span>
            </h3>
            <span className="bg-rose-50 text-rose-600 text-[10px] px-2.5 py-0.5 rounded-full font-bold border border-rose-100">
              {criticalStockCount} ítems en alerta
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {criticalProducts.map(p => (
              <div key={p.id} className="p-3 bg-rose-50/30 border border-rose-100 rounded-lg flex justify-between items-center hover:bg-rose-50/50 transition-colors">
                <div>
                  <span className="font-bold text-xs text-slate-800 block">{p.name}</span>
                  <span className="text-[9px] text-slate-400 block font-mono">SKU: {p.sku}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-rose-600 block font-mono">{p.stock} pz</span>
                  <span className="text-[9px] text-slate-400 block font-mono">mín: {p.minStock}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VISUALIZACIONES GRÁFICAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* GRÁFICO REVENUE REAL 7 DÍAS */}
        <div className="md:col-span-2 p-5 bg-white border border-slate-200 rounded-xl space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Curva de Ingresos Semanales en Tiempo Real</h3>
            <span className="text-[10px] text-slate-400 font-bold font-mono">Últimos 7 días</span>
          </div>
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
                  formatter={(value: any) => [`${Number(value).toFixed(2)} ${companyInfo.currencySymbol}`, 'Ingresos']}
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
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Demanda por Categoría</h3>
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
                <span className="text-slate-900 font-bold ml-auto font-mono">{c.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

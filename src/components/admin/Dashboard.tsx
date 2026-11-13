/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BaseAppComponent } from '../../context/AppContext';
import { CurrencyFormatter, DateTimeHelper } from '../../utils/helpers';
import { ModelFactory, ProductModel } from '../../models/DomainModels';
import { TrendingUp, Calendar, Users, Package, AlertTriangle } from 'lucide-react';
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

export class Dashboard extends BaseAppComponent {
  private readonly categoryColors: Record<string, string> = {
    Corte: '#1C519B',
    Barba: '#10B981',
    Combo: '#5994D9',
    Insumo: '#F59E0B',
    Facial: '#EC4899',
  };

  private computeDailyRevenue(dateStr: string): number {
    const { sales, appointments, selectedBranchId } = this.app;
    const posTotal = sales
      .filter(s => s.branchId === selectedBranchId && ((s.date || '').startsWith(dateStr) || (s.createdAt || '').startsWith(dateStr)))
      .reduce((acc, s) => acc + (s.total || 0), 0);

    if (posTotal > 0) return posTotal;

    return appointments
      .filter(a => a.branchId === selectedBranchId && a.date === dateStr && a.status === 'completed')
      .reduce((acc, a) => acc + (a.price || 0), 0);
  }

  private buildRevenueHistory(): { name: string; ingresos: number; date: string }[] {
    return Array.from({ length: 7 }, (_, i) => {
      const offset = 6 - i;
      const dateStr = DateTimeHelper.getOffsetDateStr(-offset);
      return {
        name: DateTimeHelper.getDayNameShort(dateStr),
        ingresos: this.computeDailyRevenue(dateStr),
        date: dateStr,
      };
    });
  }

  private buildServiceCategories(): { name: string; value: number; color: string }[] {
    const { services, appointments, selectedBranchId } = this.app;
    const map = services.reduce((acc, srv) => {
      const cat = srv.category || 'Otros';
      const count = appointments.filter(
        a => a.branchId === selectedBranchId && a.serviceId === srv.id && a.status !== 'cancelled'
      ).length;
      acc[cat] = (acc[cat] || 0) + count;
      return acc;
    }, {} as Record<string, number>);

    return Object.keys(map).map(cat => ({
      name: cat,
      value: map[cat] || 1,
      color: this.categoryColors[cat] || '#2F6EC4',
    }));
  }

  public render(): React.ReactNode {
    const { appointments, products, clients, selectedBranchId, companyInfo, theme } = this.app;
    const isDark = theme === 'dark';

    const chartStroke = isDark ? '#5994D9' : '#143D78';
    const axisColor = isDark ? '#94A3B8' : '#64748B';
    const tooltipBg = isDark ? '#0D1A2D' : '#FFFFFF';
    const tooltipBorder = isDark ? '#243D63' : '#E2E8F0';
    const tooltipLabel = isDark ? '#F8FAFC' : '#0F172A';

    const todayStr = DateTimeHelper.getTodayStr();
    const yesterdayStr = DateTimeHelper.getOffsetDateStr(-1);

    const todaySales = this.computeDailyRevenue(todayStr);
    const yesterdaySales = this.computeDailyRevenue(yesterdayStr);
    const salesGrowthVal =
      yesterdaySales > 0
        ? (((todaySales - yesterdaySales) / yesterdaySales) * 100).toFixed(1)
        : todaySales > 0
        ? '+100'
        : '0';

    const todayAppointments = appointments.filter(
      a => a.branchId === selectedBranchId && a.date === todayStr && a.status !== 'cancelled'
    );
    const completedTodayCount = appointments.filter(
      a => a.branchId === selectedBranchId && a.date === todayStr && a.status === 'completed'
    ).length;

    const activeClientsCount = clients.length;
    const criticalProductModels: ProductModel[] = products
      .filter(p => p.branchId === selectedBranchId)
      .map(p => ModelFactory.createProduct(p))
      .filter(pm => pm.isCriticalStock());

    const criticalStockCount = criticalProductModels.length;
    const revenueHistory = this.buildRevenueHistory();
    const serviceCategories = this.buildServiceCategories();

    return (
      <div className="space-y-6 animate-fadeIn">
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Dashboard Ejecutivo</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Métricas operativas en tiempo real — Hoy:{' '}
              <strong className="text-navy-800 dark:text-navy-300 font-mono">{todayStr}</strong>
            </p>
          </div>
        </div>

        {/* KPI GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-xl relative overflow-hidden shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-400 tracking-wider">
                  Ventas de Hoy
                </span>
                <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block font-mono">
                  {CurrencyFormatter.format(todaySales)}
                </span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-3 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
              <span>{Number(salesGrowthVal) >= 0 ? `+${salesGrowthVal}%` : `${salesGrowthVal}%`}</span>
              <span className="text-slate-400 font-sans font-normal">vs ayer</span>
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-xl relative overflow-hidden shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-400 tracking-wider">
                  Citas Agendadas
                </span>
                <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block font-mono">
                  {todayAppointments.length}
                </span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-navy-50 dark:bg-navy-900/70 text-navy-800 dark:text-navy-300 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-3 text-[10px] text-navy-700 dark:text-navy-300 font-semibold">
              <span className="font-mono">{completedTodayCount} Completadas</span>
              <span className="text-slate-400 font-normal">de hoy</span>
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-xl relative overflow-hidden shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-400 tracking-wider">
                  Clientes Registrados
                </span>
                <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block font-mono">
                  {activeClientsCount}
                </span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-navy-50 dark:bg-navy-900/70 text-navy-800 dark:text-navy-300 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-3 text-[10px] text-navy-700 dark:text-navy-300 font-semibold">
              <span className="font-mono">{clients.filter(c => c.isRegistered).length} frecuentes</span>
              <span className="text-slate-400 font-normal">en base de datos</span>
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-xl relative overflow-hidden shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-400 tracking-wider">
                  Insumos Críticos
                </span>
                <span
                  className={`text-2xl font-black mt-1 block font-mono ${
                    criticalStockCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {criticalStockCount}
                </span>
              </div>
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  criticalStockCount > 0
                    ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                    : 'bg-slate-100 dark:bg-[#12233B] text-slate-400'
                }`}
              >
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-3 text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
              <span className={criticalStockCount > 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}>
                {criticalStockCount > 0 ? 'Requiere reabastecimiento' : 'Stock en niveles óptimos'}
              </span>
            </div>
          </div>
        </div>

        {/* ALERTA DE STOCK CRÍTICO */}
        {criticalStockCount > 0 && (
          <div className="p-5 bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-xl space-y-4 shadow-sm animate-fadeIn">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-[#1E3354]">
              <h3 className="font-bold text-rose-600 dark:text-rose-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 stroke-[2]" />
                <span>Insumos con Stock Crítico en Inventario</span>
              </h3>
              <span className="bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-[10px] px-2.5 py-0.5 rounded-md font-bold border border-rose-200 dark:border-rose-800/60 font-mono">
                {criticalStockCount} ítems en alerta
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {criticalProductModels.map(pm => (
                <div
                  key={pm.id}
                  className="p-3 bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/50 rounded-lg flex justify-between items-center"
                >
                  <div>
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-100 block">{pm.name}</span>
                    <span className="text-[10px] text-slate-400 block font-mono">SKU: {pm.sku}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-rose-600 dark:text-rose-400 block font-mono">
                      {pm.stock} pz
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">mín: {pm.minStock}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VISUALIZACIONES GRÁFICAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 p-5 bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-xl space-y-4 shadow-sm">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider">
                Curva de Ingresos Semanales en Tiempo Real
              </h3>
              <span className="text-[10px] text-slate-400 font-bold font-mono">Últimos 7 días</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartStroke} stopOpacity={0.28} />
                      <stop offset="95%" stopColor={chartStroke} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke={axisColor} fontSize={11} tickLine={false} />
                  <YAxis stroke={axisColor} fontSize={11} tickLine={false} />
                  <Tooltip
                    formatter={(value: any) => [`${Number(value).toFixed(2)} ${companyInfo.currencySymbol}`, 'Ingresos']}
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      border: `1px solid ${tooltipBorder}`,
                      borderRadius: '8px',
                      color: tooltipLabel,
                      boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.15)',
                    }}
                    labelStyle={{ color: tooltipLabel, fontWeight: 'bold', fontSize: '12px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="ingresos"
                    stroke={chartStroke}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-xl space-y-4 shadow-sm">
            <h3 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider">
              Demanda por Categoría
            </h3>
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
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      border: `1px solid ${tooltipBorder}`,
                      borderRadius: '8px',
                      color: tooltipLabel,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {serviceCategories.map(c => (
                <div key={c.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="text-slate-600 dark:text-slate-300 font-medium truncate">{c.name}:</span>
                  <span className="text-slate-900 dark:text-white font-bold ml-auto font-mono">{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

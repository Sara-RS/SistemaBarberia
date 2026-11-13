/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BaseAppComponent } from '../../context/AppContext';
import { DateTimeHelper } from '../../utils/helpers';
import {
  Scissors,
  Calendar,
  Users,
  UserCheck,
  Package,
  ShoppingCart,
  TrendingUp,
  Settings,
  Menu,
  X,
  Bell,
  MapPin,
  Clock,
  Sparkles,
  DollarSign,
  Monitor,
  MessageSquare,
  Truck,
  Sun,
  Moon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

interface LayoutState {
  mobileMenuOpen: boolean;
  notificationsOpen: boolean;
  currentTime: string;
}

export class Layout extends BaseAppComponent<LayoutProps, LayoutState> {
  private clockTimer: ReturnType<typeof setInterval> | null = null;

  private readonly adminMenuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: TrendingUp },
    { id: 'calendar', name: 'Agenda', icon: Calendar },
    { id: 'pos', name: 'Caja', icon: DollarSign },
    { id: 'inventory', name: 'Inventario', icon: Package },
    { id: 'purchases', name: 'Compras', icon: ShoppingCart },
    { id: 'providers', name: 'Proveedores', icon: Truck },
    { id: 'services', name: 'Servicios', icon: Scissors },
    { id: 'staff', name: 'Barberos', icon: Users },
    { id: 'clients', name: 'Clientes', icon: UserCheck },
    { id: 'reminders', name: 'Recordatorios WhatsApp', icon: MessageSquare },
    { id: 'settings', name: 'Parametrización', icon: Settings },
  ];

  private readonly clientMenuItems = [
    { id: 'booking', name: 'Reservar Cita', icon: Sparkles },
    { id: 'client-history', name: 'Mis Reservas', icon: Calendar },
    { id: 'branch-info', name: 'Sucursales', icon: MapPin },
  ];

  constructor(props: LayoutProps) {
    super(props);
    this.state = {
      mobileMenuOpen: false,
      notificationsOpen: false,
      currentTime: DateTimeHelper.getBoliviaClockString(),
    };
  }

  public componentDidMount(): void {
    this.updateClock();
    this.clockTimer = setInterval(this.updateClock, 1000);
  }

  public componentWillUnmount(): void {
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
      this.clockTimer = null;
    }
  }

  private updateClock = (): void => {
    this.setState({ currentTime: DateTimeHelper.getBoliviaClockString() });
  };

  private toggleRole = (): void => {
    const { currentRole, setCurrentRole } = this.app;
    const nextRole = currentRole === 'client' ? 'admin' : 'client';
    setCurrentRole(nextRole);
    this.props.setActiveTab(nextRole === 'client' ? 'booking' : 'dashboard');
  };

  private getActiveTabLabel(): string {
    const { activeTab } = this.props;
    const allItems = [...this.adminMenuItems, ...this.clientMenuItems];
    return allItems.find(i => i.id === activeTab)?.name || activeTab;
  }

  public render(): React.ReactNode {
    const { activeTab, setActiveTab, children } = this.props;
    const {
      currentRole,
      selectedBranchId,
      setSelectedBranchId,
      branches,
      activeSession,
      companyInfo,
      theme,
      toggleTheme,
    } = this.app;
    const { mobileMenuOpen, notificationsOpen, currentTime } = this.state;

    const currentMenuItems = currentRole === 'client' ? this.clientMenuItems : this.adminMenuItems;
    const activeBranch = branches.find(b => b.id === selectedBranchId) || branches[0];
    const isDark = theme === 'dark';

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#070E1A] text-slate-900 dark:text-slate-100 font-sans flex flex-col md:flex-row antialiased selection:bg-navy-800 selection:text-white dark:selection:bg-navy-500 transition-colors duration-200">
        {/* SIDEBAR DESKTOP */}
        <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-[#0D1A2D] border-r border-slate-200 dark:border-[#1E3354] shrink-0 transition-colors duration-200">
          {/* LOGO AREA */}
          <div className="h-16 flex items-center px-5 border-b border-slate-200 dark:border-[#1E3354] justify-between">
            <div className="flex items-center gap-2.5">
              {companyInfo.logoUrl ? (
                <img
                  src={companyInfo.logoUrl}
                  alt="Logo"
                  className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-[#28426B]"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-navy-800 dark:bg-navy-600 flex items-center justify-center text-white font-black shadow-sm">
                  <Scissors className="w-4 h-4 stroke-[2.5]" />
                </div>
              )}
              <div>
                <span className="font-bold tracking-tight text-slate-900 dark:text-white block leading-tight truncate max-w-[140px]">
                  {companyInfo.name || 'Barbería'}
                </span>
                <span className="text-[10px] text-navy-700 dark:text-navy-300 font-bold tracking-widest uppercase">
                  Management OS
                </span>
              </div>
            </div>
          </div>

          {/* SELECTOR SUCURSAL */}
          {currentRole !== 'client' && (
            <div className="px-4 py-3 border-b border-slate-200 dark:border-[#1E3354] bg-slate-50/70 dark:bg-[#0A1526]">
              <label className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-1.5 block">
                Sucursal Activa
              </label>
              <div className="relative">
                <select
                  value={selectedBranchId}
                  onChange={e => setSelectedBranchId(e.target.value)}
                  className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] text-xs rounded-lg px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 cursor-pointer appearance-none pr-8 font-medium"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <MapPin className="w-3.5 h-3.5 text-navy-700 dark:text-navy-300 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>
          )}

          {/* MENÚ DE NAVEGACIÓN */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            <div className="px-3 mb-2 text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold">
              Navegación
            </div>
            {currentMenuItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm transition-all cursor-pointer ${
                    isActive
                      ? 'bg-navy-800 dark:bg-navy-600 text-white font-semibold shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-[#132540] hover:text-navy-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white stroke-[2.2]' : 'text-slate-400 dark:text-slate-400'}`} />
                  <span className="truncate">{item.name}</span>
                </button>
              );
            })}
          </nav>

          {/* PERFIL / QUICK ROLE SWITCHER */}
          <div className="p-4 border-t border-slate-200 dark:border-[#1E3354] bg-slate-50/70 dark:bg-[#0A1526]">
            <div className="mb-3 p-2.5 rounded-lg bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-navy-700 dark:text-navy-300 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-400 block leading-none">Vista Activa</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase">
                    {currentRole === 'client' ? 'Cliente' : 'Administración'}
                  </span>
                </div>
              </div>
              <button
                onClick={this.toggleRole}
                className="px-2.5 py-1 text-[10px] bg-navy-50 dark:bg-navy-900/70 hover:bg-navy-100 dark:hover:bg-navy-800 text-navy-800 dark:text-navy-200 rounded border border-navy-200 dark:border-navy-600/60 font-bold tracking-wide cursor-pointer transition-all"
              >
                Cambiar
              </button>
            </div>
            <div className="flex items-center gap-3 px-1">
              <div className="w-9 h-9 rounded-full bg-navy-800 dark:bg-navy-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
                {currentRole === 'client' ? 'CL' : 'AD'}
              </div>
              <div className="overflow-hidden">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 block truncate">
                  {currentRole === 'client' ? 'Juan Pérez' : 'Carlos Gómez'}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                  {currentRole === 'client' ? 'juan.perez@example.com' : 'carlos@barberia.com'}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* MOBILE BAR */}
        <header className="md:hidden h-16 bg-white dark:bg-[#0D1A2D] border-b border-slate-200 dark:border-[#1E3354] flex items-center justify-between px-4 z-40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-navy-800 dark:bg-navy-600 flex items-center justify-center text-white font-black">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-xs text-slate-900 dark:text-white block">
                {companyInfo.name || 'Barbería "Josue"'}
              </span>
              <span className="text-[9px] text-navy-700 dark:text-navy-300 font-semibold tracking-wider uppercase">
                OS
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
              className="p-2 rounded-lg bg-slate-100 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] text-navy-800 dark:text-navy-200 transition-colors cursor-pointer"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={this.toggleRole}
              className="px-2 py-1 text-[9px] bg-navy-50 dark:bg-navy-900/70 text-navy-800 dark:text-navy-200 rounded border border-navy-200 dark:border-navy-600/60 font-bold uppercase transition-all"
            >
              {currentRole === 'client' ? 'Cliente ⇆' : 'Admin ⇆'}
            </button>
            <button
              onClick={() => this.setState({ mobileMenuOpen: !mobileMenuOpen })}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-navy-800 dark:hover:text-white focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </header>

        {/* MOBILE DRAWER */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="md:hidden absolute top-16 left-0 right-0 bg-white dark:bg-[#0D1A2D] border-b border-slate-200 dark:border-[#1E3354] z-30 shadow-2xl flex flex-col p-4 space-y-4"
            >
              {currentRole !== 'client' && (
                <div className="bg-slate-50 dark:bg-[#12233B] p-3 rounded-xl border border-slate-200 dark:border-[#243D63]">
                  <label className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold mb-1.5 block">
                    Sucursal
                  </label>
                  <select
                    value={selectedBranchId}
                    onChange={e => {
                      setSelectedBranchId(e.target.value);
                      this.setState({ mobileMenuOpen: false });
                    }}
                    className="w-full bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#243D63] text-xs rounded-lg px-3 py-2 text-slate-800 dark:text-slate-100"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                {currentMenuItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        this.setState({ mobileMenuOpen: false });
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-sm font-semibold transition-all ${
                        isActive
                          ? 'bg-navy-800 dark:bg-navy-600 text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#132540]'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MAIN CONTAINER */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-[#070E1A] overflow-x-hidden transition-colors duration-200">
          {/* HEADER TOP */}
          <header className="hidden md:flex h-16 items-center justify-between px-8 bg-white/95 dark:bg-[#0D1A2D]/95 border-b border-slate-200 dark:border-[#1E3354] sticky top-0 backdrop-blur-md z-10 transition-colors duration-200">
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-bold text-slate-900 dark:text-white">{activeBranch?.name}</span>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="text-xs bg-navy-50 dark:bg-navy-900/70 border border-navy-200 dark:border-navy-700/60 px-2.5 py-0.5 rounded-md text-navy-800 dark:text-navy-200 font-semibold">
                {this.getActiveTabLabel()}
              </span>
            </div>

            <div className="flex items-center gap-4">
              {currentRole !== 'client' && (
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${activeSession ? 'bg-emerald-500' : 'bg-rose-500'}`}
                  />
                  <span className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">
                    Caja: <strong className={activeSession ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>{activeSession ? 'ABIERTA' : 'CERRADA'}</strong>
                  </span>
                </div>
              )}

              <div className="w-px h-4 bg-slate-200 dark:bg-[#1E3354]" />

              <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 font-medium font-mono">
                <Clock className="w-3.5 h-3.5 text-navy-700 dark:text-navy-300" />
                <span>{currentTime} (Bolivia)</span>
              </div>

              <div className="w-px h-4 bg-slate-200 dark:bg-[#1E3354]" />

              {/* SELECTOR DE TEMA DUAL (CLARO / OSCURO) */}
              <div
                role="group"
                aria-label="Selector de tema"
                className="flex items-center bg-slate-100 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-0.5"
              >
                <button
                  type="button"
                  onClick={() => {
                    if (isDark) toggleTheme();
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    !isDark
                      ? 'bg-navy-800 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Tema Claro Azul Marino"
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Claro</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!isDark) toggleTheme();
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    isDark
                      ? 'bg-navy-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Tema Oscuro Azul Marino"
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Oscuro</span>
                </button>
              </div>

              {/* Campana de Notificaciones */}
              <div className="relative">
                <button
                  onClick={() => this.setState({ notificationsOpen: !notificationsOpen })}
                  className="p-1.5 text-slate-500 dark:text-slate-300 hover:text-navy-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#132540] rounded-lg transition-all relative cursor-pointer"
                  aria-label="Notificaciones"
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-navy-700 dark:bg-navy-400" />
                </button>

                <AnimatePresence>
                  {notificationsOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => this.setState({ notificationsOpen: false })}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2.5 w-80 bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#243D63] rounded-xl shadow-2xl z-50 p-3"
                      >
                        <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-100 dark:border-[#1E3354]">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">Notificaciones de Hoy</span>
                          <span
                            onClick={() => this.setState({ notificationsOpen: false })}
                            className="text-[10px] text-navy-700 dark:text-navy-300 font-bold uppercase cursor-pointer hover:underline"
                          >
                            Marcar leído
                          </span>
                        </div>
                        <div className="space-y-2.5 max-h-60 overflow-y-auto">
                          <div className="text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#1E3354]">
                            <div className="flex justify-between items-start mb-0.5">
                              <span className="font-bold text-slate-800 dark:text-slate-100">Nueva Cita Walk-In</span>
                              <span className="text-[10px] text-slate-400">Hace 5 min</span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                              Roberto Mendoza ha sido agregado a la fila de espera.
                            </p>
                          </div>
                          <div className="text-xs p-2.5 rounded-lg bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50">
                            <div className="flex justify-between items-start mb-0.5">
                              <span className="font-bold text-rose-700 dark:text-rose-400">Stock Crítico</span>
                              <span className="text-[10px] text-slate-400">Hace 1 hora</span>
                            </div>
                            <p className="text-rose-600 dark:text-rose-300 text-[11px]">
                              "Aceite de Barba Premium Oud" queda solo 3 unidades en stock.
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </header>

          {/* WORKSPACE CONTENT VIEWPORT */}
          <div className="flex-1 p-4 md:p-8 overflow-y-auto relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentRole}-${activeTab}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="h-full max-w-7xl mx-auto"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    );
  }
}

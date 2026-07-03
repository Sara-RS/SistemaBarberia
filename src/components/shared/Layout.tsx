/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Scissors,
  Calendar,
  Users,
  UserCheck,
  Package,
  TrendingUp,
  Settings,
  HelpCircle,
  Menu,
  X,
  Bell,
  MapPin,
  Clock,
  Briefcase,
  Layers,
  Sparkles,
  DollarSign,
  Monitor,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { currentRole, setCurrentRole, selectedBranchId, setSelectedBranchId, branches, activeSession } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Determinar los ítems del menú según el rol activo
  const adminMenuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: TrendingUp },
    { id: 'calendar', name: 'Agenda', icon: Calendar },
    { id: 'queue', name: 'Walk-Ins', icon: Clock },
    { id: 'pos', name: 'Caja & POS', icon: DollarSign },
    { id: 'inventory', name: 'Inventario', icon: Package },
    { id: 'services', name: 'Servicios', icon: Scissors },
    { id: 'staff', name: 'Barberos', icon: Users },
  ];

  const clientMenuItems = [
    { id: 'booking', name: 'Reservar Cita', icon: Sparkles },
    { id: 'client-history', name: 'Mis Reservas', icon: Calendar },
    { id: 'branch-info', name: 'Sucursales', icon: MapPin },
  ];

  const currentMenuItems = currentRole === 'client' ? clientMenuItems : adminMenuItems;

  // Sucursal seleccionada
  const activeBranch = branches.find(b => b.id === selectedBranchId) || branches[0];

  const toggleRole = () => {
    const nextRole = currentRole === 'client' ? 'admin' : 'client';
    setCurrentRole(nextRole);
    // Cambiar al tab inicial correcto
    setActiveTab(nextRole === 'client' ? 'booking' : 'dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col md:flex-row antialiased selection:bg-indigo-600 selection:text-white">
      
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0">
        {/* LOGO AREA */}
        <div className="h-16 flex items-center px-6 border-b border-slate-200 justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black shadow-md shadow-indigo-600/10">
              <Scissors className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-slate-900 block leading-tight">Barbería Pro</span>
              <span className="text-[10px] text-indigo-600 font-medium tracking-widest uppercase">Management OS</span>
            </div>
          </div>
        </div>

        {/* SELECTOR SUCURSAL */}
        {currentRole !== 'client' && (
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50">
            <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1 block">Sucursal Activa</label>
            <div className="relative">
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full bg-white border border-slate-200 text-xs rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none pr-8"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <MapPin className="w-3.5 h-3.5 text-indigo-600 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
        )}

        {/* MENÚ DE NAVEGACIÓN */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          <div className="px-3 mb-2 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Navegación</div>
          {currentMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'stroke-[2.5]' : ''}`} />
                <span>{item.name}</span>
                {item.id === 'queue' && currentRole !== 'client' && (
                  <span className="ml-auto bg-indigo-100 text-indigo-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    WAIT
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* PERFIL / QUICK ROLE SWITCHER */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
          <div className="mb-3 p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-indigo-600 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block leading-none">Vista Activa</span>
                <span className="text-xs font-bold text-slate-800 uppercase">{currentRole === 'client' ? 'Cliente' : 'Administración'}</span>
              </div>
            </div>
            <button
              onClick={toggleRole}
              className="px-2 py-1 text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded border border-indigo-200 font-bold tracking-wide cursor-pointer transition-all"
            >
              Cambiar
            </button>
          </div>
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center font-bold text-indigo-600 shrink-0">
              {currentRole === 'client' ? 'CL' : 'AD'}
            </div>
            <div className="overflow-hidden">
              <span className="text-xs font-semibold text-slate-800 block truncate">
                {currentRole === 'client' ? 'Juan Pérez' : 'Carlos Gómez'}
              </span>
              <span className="text-[10px] text-slate-500 block truncate">
                {currentRole === 'client' ? 'juan.perez@example.com' : 'carlos@barberia.com'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* MOBILE BAR */}
      <header className="md:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black">
            <Scissors className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-xs text-slate-900 block">Barbería Pro</span>
            <span className="text-[9px] text-indigo-600 font-semibold tracking-wider uppercase">OS</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick toggle in mobile header */}
          <button
            onClick={toggleRole}
            className="px-2 py-1 text-[9px] bg-indigo-50 text-indigo-600 rounded border border-indigo-100 font-bold uppercase transition-all"
          >
            {currentRole === 'client' ? 'Cliente ⇆' : 'Admin ⇆'}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-slate-500 hover:text-slate-800 focus:outline-none"
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
            className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-slate-200 z-30 shadow-2xl flex flex-col p-4 space-y-4"
          >
            {currentRole !== 'client' && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1.5 block">Sucursal</label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => {
                    setSelectedBranchId(e.target.value);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full bg-white border border-slate-200 text-xs rounded-lg px-3 py-2 text-slate-800"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              {currentMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                        : 'text-slate-600 hover:bg-slate-50'
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
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-x-hidden">
        
        {/* HEADER TOP */}
        <header className="hidden md:flex h-16 items-center justify-between px-8 bg-white border-b border-slate-200 sticky top-0 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">{activeBranch?.name}</span>
            <span className="text-slate-300">/</span>
            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-600 font-medium capitalize">
              {activeTab}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Indicador de Estado de Caja */}
            {currentRole !== 'client' && (
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${activeSession ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span className="text-[11px] text-gray-400 font-semibold">
                  Caja: {activeSession ? 'ABIERTA' : 'CERRADA'}
                </span>
              </div>
            )}

            <div className="w-[1px] h-4 bg-gray-800" />

            <div className="text-xs text-gray-400 flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Julio 2, 2026 (7:54 PM UTC)</span>
            </div>

            {/* Campana de Notificaciones */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800/40 rounded-lg transition-all relative cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" />
              </button>

              <AnimatePresence>
                {notificationsOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2.5 w-80 bg-[#12141f] border border-gray-800 rounded-xl shadow-2xl z-50 p-3"
                    >
                      <div className="flex justify-between items-center pb-2 mb-2 border-b border-gray-800">
                        <span className="text-xs font-bold text-white">Notificaciones de Hoy</span>
                        <span className="text-[9px] text-amber-500 font-bold uppercase cursor-pointer">Marcar leído</span>
                      </div>
                      <div className="space-y-2.5 max-h-60 overflow-y-auto">
                        <div className="text-xs p-2 rounded-lg bg-[#1a1c2a]/30 border border-gray-800/40">
                          <div className="flex justify-between items-start mb-0.5">
                            <span className="font-bold text-gray-200">Nueva Cita Walk-In</span>
                            <span className="text-[9px] text-gray-500">Hace 5 min</span>
                          </div>
                          <p className="text-gray-400 text-[11px]">Roberto Mendoza ha sido agregado a la fila de espera.</p>
                        </div>
                        <div className="text-xs p-2 rounded-lg bg-[#1a1c2a]/30 border border-gray-800/40">
                          <div className="flex justify-between items-start mb-0.5">
                            <span className="font-bold text-[#f87171]">Stock Crítico!</span>
                            <span className="text-[9px] text-gray-500">Hace 1 hora</span>
                          </div>
                          <p className="text-[#fca5a5] text-[11px]">"Aceite de Barba Premium Oud" queda solo 3 unidades en stock.</p>
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
};

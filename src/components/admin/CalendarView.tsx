/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BaseAppComponent } from '../../context/AppContext';
import { ModelFactory } from '../../models/DomainModels';
import {
  CurrencyFormatter,
  DateTimeHelper,
  QueueEstimator,
  WhatsAppUrlBuilder,
} from '../../utils/helpers';
import {
  Clock,
  User,
  Scissors,
  Plus,
  XCircle,
  CheckCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Play,
  Check,
  MessageSquare,
} from 'lucide-react';

interface CalendarViewState {
  currentDate: string;
  selectedAptId: string | null;
  showAddModal: boolean;
  newAptEmployeeId: string;
  newAptServiceId: string;
  newAptClientId: string;
  newAptTime: string;
  newAptNotes: string;
  showAddWalkInModal: boolean;
  walkInFirstName: string;
  walkInLastName: string;
  walkInPhone: string;
  walkInEmail: string;
  walkInServiceId: string;
  walkInEmployeeId: string;
  walkInPriority: 'normal' | 'high';
}

export class CalendarView extends BaseAppComponent<{}, CalendarViewState> {
  private readonly timeBlocks: string[] = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
  ];

  constructor(props: {}) {
    super(props);
    this.state = {
      currentDate: DateTimeHelper.getTodayStr(),
      selectedAptId: null,
      showAddModal: false,
      newAptEmployeeId: '',
      newAptServiceId: '',
      newAptClientId: '',
      newAptTime: '09:00',
      newAptNotes: '',
      showAddWalkInModal: false,
      walkInFirstName: '',
      walkInLastName: '',
      walkInPhone: '',
      walkInEmail: '',
      walkInServiceId: '',
      walkInEmployeeId: '',
      walkInPriority: 'normal',
    };
  }

  private handleNextDay = (): void => {
    const d = new Date(this.state.currentDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    this.setState({ currentDate: d.toISOString().split('T')[0] });
  };

  private handlePrevDay = (): void => {
    const d = new Date(this.state.currentDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    this.setState({ currentDate: d.toISOString().split('T')[0] });
  };

  private handleCreateAppointment = (e: React.FormEvent): void => {
    e.preventDefault();
    const { services, selectedBranchId, addAppointment } = this.app;
    const {
      newAptClientId,
      newAptServiceId,
      newAptEmployeeId,
      newAptTime,
      currentDate,
      newAptNotes,
    } = this.state;

    if (!newAptClientId || !newAptServiceId || !newAptEmployeeId) {
      alert('Por favor selecciona cliente, servicio y barbero.');
      return;
    }

    const selectedService = services.find(s => s.id === newAptServiceId);
    if (!selectedService) return;

    const serviceModel = ModelFactory.createService(selectedService);
    const [sh, sm] = newAptTime.split(':').map(Number);
    const totalMin = sh * 60 + sm + serviceModel.duration;
    const eh = Math.floor(totalMin / 60);
    const em = totalMin % 60;
    const endTimeStr = `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`;

    try {
      addAppointment({
        branchId: selectedBranchId,
        clientId: newAptClientId,
        employeeId: newAptEmployeeId,
        serviceId: newAptServiceId,
        date: currentDate,
        startTime: newAptTime,
        endTime: endTimeStr,
        status: 'confirmed',
        price: serviceModel.price,
        notes: newAptNotes,
        isWalkIn: false,
      });

      this.setState({
        showAddModal: false,
        newAptNotes: '',
      });
    } catch (err: any) {
      alert(err.message || 'Error al agendar la cita.');
    }
  };

  private handleRegisterWalkIn = (e: React.FormEvent): void => {
    e.preventDefault();
    const { selectedBranchId, queueItems, addToQueue } = this.app;
    const {
      walkInFirstName,
      walkInLastName,
      walkInPhone,
      walkInEmail,
      walkInServiceId,
      walkInEmployeeId,
      walkInPriority,
    } = this.state;

    if (!walkInFirstName.trim() || !walkInPhone || !walkInServiceId) {
      alert('Nombres, Teléfono y Servicio son campos obligatorios.');
      return;
    }

    const fullComputedWalkInName = `${walkInFirstName.trim()} ${walkInLastName.trim()}`.trim();
    const currentWait = QueueEstimator.calculateWaitTime(
      queueItems.filter(q => q.status === 'waiting').length
    );

    addToQueue({
      branchId: selectedBranchId,
      fullName: fullComputedWalkInName,
      phone: walkInPhone,
      email: walkInEmail || undefined,
      employeeId: walkInEmployeeId || undefined,
      serviceId: walkInServiceId,
      estimatedWaitTime: currentWait,
      priority: walkInPriority,
    });

    this.setState({
      walkInFirstName: '',
      walkInLastName: '',
      walkInPhone: '',
      walkInEmail: '',
      walkInServiceId: '',
      walkInEmployeeId: '',
      walkInPriority: 'normal',
      showAddWalkInModal: false,
    });
  };

  public render(): React.ReactNode {
    const {
      appointments,
      services,
      employees,
      clients,
      selectedBranchId,
      updateAptStatus,
      queueItems,
      updateQueueStatus,
    } = this.app;

    const {
      currentDate,
      selectedAptId,
      showAddModal,
      newAptEmployeeId,
      newAptServiceId,
      newAptClientId,
      newAptTime,
      newAptNotes,
      showAddWalkInModal,
      walkInFirstName,
      walkInLastName,
      walkInPhone,
      walkInEmail,
      walkInServiceId,
      walkInEmployeeId,
      walkInPriority,
    } = this.state;

    const activeBarbers = employees.filter(
      e => e.branchId === selectedBranchId && e.role === 'barber' && e.active
    );

    const activeApts = appointments.filter(
      a => a.branchId === selectedBranchId && a.date === currentDate && a.status !== 'cancelled'
    );

    const selectedApt = appointments.find(a => a.id === selectedAptId);
    const selectedAptClient = selectedApt ? clients.find(c => c.id === selectedApt.clientId) : null;
    const selectedAptService = selectedApt ? services.find(s => s.id === selectedApt.serviceId) : null;
    const selectedAptBarber = selectedApt ? employees.find(e => e.id === selectedApt.employeeId) : null;

    const waitingItems = queueItems.filter(q => q.status === 'waiting');
    const servingItems = queueItems.filter(q => q.status === 'serving');

    return (
      <div className="space-y-6 animate-fadeIn">
        {/* HEADER CONTROLES */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={this.handlePrevDay}
              className="p-1.5 bg-slate-50 dark:bg-[#12233B] hover:bg-slate-100 dark:hover:bg-[#182E4D] rounded text-slate-600 dark:text-slate-300 hover:text-navy-800 dark:hover:text-white border border-slate-200 dark:border-[#243D63] transition-all cursor-pointer"
              title="Día anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-left">
              <span className="text-[10px] text-navy-700 dark:text-navy-300 font-extrabold block uppercase tracking-wider">
                Fecha de Agenda
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-white block">
                {DateTimeHelper.formatLegible(currentDate)}
              </span>
            </div>
            <button
              onClick={this.handleNextDay}
              className="p-1.5 bg-slate-50 dark:bg-[#12233B] hover:bg-slate-100 dark:hover:bg-[#182E4D] rounded text-slate-600 dark:text-slate-300 hover:text-navy-800 dark:hover:text-white border border-slate-200 dark:border-[#243D63] transition-all cursor-pointer"
              title="Día siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {currentDate !== DateTimeHelper.getTodayStr() && (
              <button
                onClick={() => this.setState({ currentDate: DateTimeHelper.getTodayStr() })}
                className="px-2.5 py-1 bg-navy-50 dark:bg-navy-900/70 hover:bg-navy-100 dark:hover:bg-navy-800 text-navy-800 dark:text-navy-200 text-xs font-extrabold rounded-lg border border-navy-200 dark:border-navy-600/60 transition-all cursor-pointer"
              >
                Hoy
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                if (activeBarbers.length === 0) {
                  alert('Debe haber al menos un barbero activo en la sucursal.');
                  return;
                }
                this.setState({
                  walkInEmployeeId: '',
                  walkInServiceId: services[0]?.id || '',
                  walkInPriority: 'normal',
                  showAddWalkInModal: true,
                });
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>Registrar Walk-In</span>
            </button>

            <button
              onClick={() => {
                if (activeBarbers.length === 0) {
                  alert('Debe haber al menos un barbero activo en la sucursal.');
                  return;
                }
                this.setState({
                  newAptEmployeeId: activeBarbers[0].id,
                  newAptServiceId: services[0]?.id || '',
                  newAptClientId: clients[0]?.id || '',
                  showAddModal: true,
                });
              }}
              className="px-4 py-2 bg-navy-800 hover:bg-navy-700 dark:bg-navy-600 dark:hover:bg-navy-500 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Agendar Cita</span>
            </button>
          </div>
        </div>

        {/* UNIFICACIÓN AGENDA Y WALK-INS */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
          {/* COLUMNA AGENDA (3/4) */}
          <div className="xl:col-span-3 space-y-6">
            <div className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-2xl overflow-x-auto shadow-sm">
              <div className="min-w-[800px]">
                {/* BARBERS HEADER COLUMN */}
                <div className="grid grid-cols-12 border-b border-slate-200 dark:border-[#1E3354] bg-slate-50/80 dark:bg-[#12233B] h-14 items-center">
                  <div className="col-span-2 text-center text-[10px] uppercase font-black text-slate-400 dark:text-slate-400 border-r border-slate-200 dark:border-[#1E3354]">
                    Hora
                  </div>
                  <div
                    className="col-span-10 grid"
                    style={{ gridTemplateColumns: `repeat(${activeBarbers.length}, minmax(0, 1fr))` }}
                  >
                    {activeBarbers.map(barber => {
                      const barberModel = ModelFactory.createEmployee(barber);
                      return (
                        <div key={barberModel.id} className="text-center border-r border-slate-200 dark:border-[#1E3354] last:border-0">
                          <span className="font-extrabold text-xs text-slate-800 dark:text-white block">
                            {barberModel.fullName}
                          </span>
                          <span className="text-[9px] text-navy-700 dark:text-navy-300 font-bold uppercase tracking-wider block mt-0.5">
                            Barbero
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* TIMEGRID BODY */}
                <div className="divide-y divide-slate-200 dark:divide-[#1E3354]">
                  {this.timeBlocks.map(block => (
                    <div key={block} className="grid grid-cols-12 min-h-20 items-stretch">
                      <div className="col-span-2 flex flex-col justify-center items-center bg-slate-50/50 dark:bg-[#0A1526] border-r border-slate-200 dark:border-[#1E3354] font-mono text-xs text-slate-500 dark:text-slate-400 font-bold shrink-0">
                        {block}
                      </div>

                      <div
                        className="col-span-10 grid relative"
                        style={{ gridTemplateColumns: `repeat(${activeBarbers.length}, minmax(0, 1fr))` }}
                      >
                        {activeBarbers.map(barber => {
                          const cellApt = activeApts.find(a => {
                            const hourStr = a.startTime.split(':')[0];
                            const blockHourStr = block.split(':')[0];
                            return a.employeeId === barber.id && hourStr === blockHourStr;
                          });

                          return (
                            <div
                              key={barber.id}
                              className="border-r border-slate-200 dark:border-[#1E3354] last:border-0 p-1.5 flex flex-col justify-between relative group hover:bg-slate-50/70 dark:hover:bg-[#12233B]/50 transition-all min-h-[5rem]"
                            >
                              {cellApt ? (
                                <button
                                  onClick={() => this.setState({ selectedAptId: cellApt.id })}
                                  className="w-full h-full text-left p-2 rounded-lg border flex flex-col justify-between relative cursor-pointer text-xs transition-all shadow-xs"
                                  style={{
                                    backgroundColor: `${services.find(s => s.id === cellApt.serviceId)?.color || '#1c519b'}18`,
                                    borderColor: services.find(s => s.id === cellApt.serviceId)?.color || '#1c519b',
                                  }}
                                >
                                  <div>
                                    <div className="flex justify-between items-start">
                                      <span className="font-extrabold text-slate-900 dark:text-white block leading-snug truncate max-w-[120px]">
                                        {clients.find(c => c.id === cellApt.clientId)?.fullName || 'Cliente'}
                                      </span>
                                      <span className="text-[9px] text-slate-500 dark:text-slate-300 font-mono font-semibold shrink-0 ml-1">
                                        {cellApt.startTime}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-slate-600 dark:text-slate-300 font-semibold block mt-1 truncate">
                                      {services.find(s => s.id === cellApt.serviceId)?.name || 'Corte'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center mt-2 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                                    <span className="text-[10px] font-black text-navy-800 dark:text-navy-300 font-mono">
                                      {CurrencyFormatter.format(cellApt.price)}
                                    </span>
                                    <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                                      {cellApt.status}
                                    </span>
                                  </div>
                                </button>
                              ) : (
                                <button
                                  onClick={() =>
                                    this.setState({
                                      newAptEmployeeId: barber.id,
                                      newAptServiceId: newAptServiceId || services[0]?.id || '',
                                      newAptClientId: newAptClientId || clients[0]?.id || '',
                                      newAptTime: block,
                                      showAddModal: true,
                                    })
                                  }
                                  className="w-full h-full rounded border border-dashed border-slate-200 dark:border-[#243D63] hover:border-navy-600 dark:hover:border-navy-400 hover:bg-navy-50/40 dark:hover:bg-navy-900/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer text-slate-400 hover:text-navy-800 dark:hover:text-navy-200 text-[10px] font-bold uppercase tracking-wider"
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  <span>Agendar</span>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* COLUMNA WALK-INS (1/4) */}
          <div className="xl:col-span-1 space-y-6">
            <div className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-2xl p-4 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-[#1E3354]">
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-navy-700 dark:text-navy-300" />
                    <span>Walk-Ins de Hoy</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                    Fila de Espera
                  </span>
                </div>
                <span className="bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-[10px] px-2 py-0.5 rounded-md font-bold shrink-0 font-mono">
                  {waitingItems.length} en espera
                </span>
              </div>

              {/* METRIC WAITING TIME */}
              <div className="p-3.5 bg-navy-50/60 dark:bg-[#12233B] border border-navy-200/70 dark:border-[#243D63] rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                    Tiempo de Espera Fila
                  </span>
                  <span className="text-base font-black text-navy-800 dark:text-navy-200 mt-0.5 block font-mono">
                    ~{QueueEstimator.calculateWaitTime(waitingItems.length)} minutos
                  </span>
                </div>
                <Clock className="w-7 h-7 text-navy-700/20 dark:text-navy-300/20" />
              </div>

              {/* SECTION: EN SILLON (SERVING) */}
              <div className="space-y-2">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold tracking-wider uppercase block">
                  ● En Sillón ({servingItems.length})
                </span>
                {servingItems.length === 0 ? (
                  <div className="p-3 text-center rounded-xl border border-slate-200 dark:border-[#1E3354] bg-slate-50 dark:bg-[#12233B] text-[11px] text-slate-400">
                    Sin walk-ins siendo atendidos.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {servingItems.map(item => {
                      const s = services.find(srv => srv.id === item.serviceId);
                      const e = employees.find(emp => emp.id === item.employeeId);
                      return (
                        <div
                          key={item.id}
                          className="p-3 bg-white dark:bg-[#12233B] border border-emerald-300 dark:border-emerald-700/60 rounded-xl flex justify-between items-center shadow-xs"
                        >
                          <div className="min-w-0">
                            <span className="font-extrabold text-xs text-slate-800 dark:text-white block truncate">
                              {item.fullName}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate mt-0.5">
                              {s?.name} — <strong className="text-emerald-600 dark:text-emerald-400">{e?.fullName}</strong>
                            </span>
                          </div>
                          <button
                            onClick={() => updateQueueStatus(item.id, 'completed')}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all cursor-pointer shrink-0 ml-2"
                            title="Terminar Servicio"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECTION: EN FILA (WAITING) */}
              <div className="space-y-2">
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold tracking-wider uppercase block">
                  ● Lista de Espera ({waitingItems.length})
                </span>
                {waitingItems.length === 0 ? (
                  <div className="p-3 text-center rounded-xl border border-slate-200 dark:border-[#1E3354] bg-slate-50 dark:bg-[#12233B] text-[11px] text-slate-400">
                    Fila vacía en este momento.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {waitingItems.map((item, idx) => {
                      const s = services.find(srv => srv.id === item.serviceId);
                      const e = employees.find(emp => emp.id === item.employeeId);
                      const wait = QueueEstimator.calculateWaitTime(idx);
                      const waMsg = `¡Hola, ${item.fullName}! Te saludamos de Barbería Josué 🇧🇴\n\nTe confirmamos tu registro en nuestra Fila de Espera (Walk-In).\n⏱️ *Tiempo aproximado de espera:* ~${wait} minutos\n✂️ *Servicio:* ${s?.name}\n\nTe avisaremos por esta vía cuando el barbero esté listo. ¡Te esperamos!`;
                      return (
                        <div
                          key={item.id}
                          className={`p-3 bg-white dark:bg-[#12233B] border rounded-xl flex flex-col gap-2.5 shadow-xs ${
                            item.priority === 'high'
                              ? 'border-amber-400 dark:border-amber-600/70 bg-amber-50/20 dark:bg-amber-950/20'
                              : 'border-slate-200 dark:border-[#243D63]'
                          }`}
                        >
                          <div className="flex justify-between items-start min-w-0 gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-extrabold text-xs text-slate-800 dark:text-white truncate block">
                                  {item.fullName}
                                </span>
                                {item.priority === 'high' && (
                                  <span className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[8px] font-black px-1 rounded uppercase tracking-wider shrink-0">
                                    ALTA
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate mt-0.5">
                                {s?.name}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate font-mono">
                                Cel: {item.phone}
                              </span>
                              <span className="text-[9px] text-slate-400 block truncate">
                                Asig:{' '}
                                <strong className="text-slate-700 dark:text-slate-200">
                                  {e?.fullName || 'Primer Libre'}
                                </strong>
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block font-mono">
                                ~{wait} min
                              </span>
                              <span className="text-[9px] text-slate-400 block">espera</span>
                            </div>
                          </div>

                          <div className="flex gap-1.5 justify-end pt-1.5 border-t border-slate-100 dark:border-[#1E3354]">
                            <a
                              href={WhatsAppUrlBuilder.buildApiUrl(item.phone, waMsg)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/60 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0"
                              title="Enviar aviso por WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5 stroke-[2.5]" />
                            </a>

                            <button
                              onClick={() => updateQueueStatus(item.id, 'cancelled')}
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-[#243D63] hover:border-rose-200 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer flex items-center justify-center shrink-0"
                              title="Quitar de la fila"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                const bId = item.employeeId || activeBarbers[0]?.id;
                                updateQueueStatus(item.id, 'serving', bId);
                              }}
                              className="px-2.5 py-1 bg-navy-800 hover:bg-navy-700 dark:bg-navy-600 dark:hover:bg-navy-500 text-white text-[10px] font-black rounded-lg transition-all cursor-pointer flex items-center gap-1"
                              title="Pasar al sillón"
                            >
                              <Play className="w-3 h-3 fill-current stroke-[2.5]" />
                              <span>Atender</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* MODAL / DRAWER DETALLE CITA */}
        {selectedApt && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative">
              <div className="h-1.5 bg-navy-800 dark:bg-navy-500 w-full" />

              <div className="p-6 space-y-5">
                <div className="flex justify-between items-start border-b border-slate-100 dark:border-[#1E3354] pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-black text-navy-700 dark:text-navy-300 tracking-wider">
                      Cita Registrada
                    </span>
                    <h3 className="font-black text-slate-900 dark:text-white text-lg mt-0.5">
                      {selectedAptClient?.fullName}
                    </h3>
                  </div>
                  <button
                    onClick={() => this.setState({ selectedAptId: null })}
                    className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-[#12233B] transition-all cursor-pointer text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-3">
                    <Scissors className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-slate-400 block text-[10px]">Servicio</span>
                      <span className="font-bold text-slate-800 dark:text-white text-sm">
                        {selectedAptService?.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-slate-400 block text-[10px]">Barbero Asignado</span>
                      <span className="font-bold text-slate-800 dark:text-white">{selectedAptBarber?.fullName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-slate-400 block text-[10px]">Fecha y Horario</span>
                      <span className="font-bold text-navy-800 dark:text-navy-300 font-mono">
                        {DateTimeHelper.formatLegible(selectedApt.date)} ({selectedApt.startTime} - {selectedApt.endTime})
                      </span>
                    </div>
                  </div>

                  {selectedApt.notes && (
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="text-slate-400 block text-[10px]">Observaciones</span>
                        <span className="text-slate-600 dark:text-slate-300 italic font-medium">
                          "{selectedApt.notes}"
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 dark:border-[#1E3354] pt-4 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Monto total</span>
                    <span className="text-base font-black text-slate-900 dark:text-white font-mono">
                      {CurrencyFormatter.format(selectedApt.price)}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {selectedAptClient?.phone && (
                      <a
                        href={WhatsAppUrlBuilder.buildApiUrl(
                          selectedAptClient.phone,
                          `¡Hola, ${selectedAptClient.fullName}! Te saludamos de Barbería Josué 🇧🇴\n\nConfirmamos tu cita agendada:\n✂️ *Servicio:* ${selectedAptService?.name}\n💈 *Barbero:* ${selectedAptBarber?.fullName}\n📅 *Fecha:* ${DateTimeHelper.formatLegible(selectedApt.date)}\n⏰ *Hora:* ${selectedApt.startTime} a ${selectedApt.endTime}\n\n📍 *Sucursal:* Sucursal Central (La Paz)\n🏠 *Dirección:* Av. 16 de Julio, El Prado, La Paz, Bolivia\n\n¡Gracias por tu preferencia! Te esperamos.`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="Enviar aviso de cita agendada por WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                    {selectedApt.status === 'confirmed' && (
                      <button
                        onClick={() => {
                          updateAptStatus(selectedApt.id, 'completed');
                          this.setState({ selectedAptId: null });
                        }}
                        className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Completar</span>
                      </button>
                    )}
                    {selectedApt.status !== 'completed' && (
                      <button
                        onClick={() => {
                          updateAptStatus(selectedApt.id, 'cancelled');
                          this.setState({ selectedAptId: null });
                        }}
                        className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 rounded-lg border border-rose-200 dark:border-rose-800/60 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancelar</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL CREAR NUEVA RESERVA DIRECTA */}
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <form
              onSubmit={this.handleCreateAppointment}
              className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative"
            >
              <div className="h-1.5 bg-navy-800 dark:bg-navy-500 w-full" />

              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-[#1E3354]">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Crear Nueva Cita</h3>
                  <button
                    type="button"
                    onClick={() => this.setState({ showAddModal: false })}
                    className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-[#12233B] transition-all cursor-pointer text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                      Cliente
                    </label>
                    <select
                      value={newAptClientId}
                      onChange={e => this.setState({ newAptClientId: e.target.value })}
                      className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                    >
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.fullName} ({c.phone})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                      Servicio
                    </label>
                    <select
                      value={newAptServiceId}
                      onChange={e => this.setState({ newAptServiceId: e.target.value })}
                      className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                    >
                      {services.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} - {CurrencyFormatter.format(s.price)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                      Barbero
                    </label>
                    <select
                      value={newAptEmployeeId}
                      onChange={e => this.setState({ newAptEmployeeId: e.target.value })}
                      className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                    >
                      {activeBarbers.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.fullName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                        Hora Inicio
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. 10:30"
                        value={newAptTime}
                        onChange={e => this.setState({ newAptTime: e.target.value })}
                        className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 font-mono text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                        Fecha
                      </label>
                      <input
                        type="text"
                        disabled
                        value={currentDate}
                        className="w-full bg-slate-50 dark:bg-[#0A1526] border border-slate-200 dark:border-[#1E3354] rounded-lg p-2.5 text-slate-400 text-center cursor-not-allowed font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                      Notas de Recepción
                    </label>
                    <textarea
                      placeholder="Escribe comentarios internos..."
                      value={newAptNotes}
                      onChange={e => this.setState({ newAptNotes: e.target.value })}
                      className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 h-16 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 resize-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-navy-800 hover:bg-navy-700 dark:bg-navy-600 dark:hover:bg-navy-500 text-white py-2.5 rounded-lg font-bold tracking-wide transition-all cursor-pointer text-xs mt-4 shadow-md"
                >
                  Crear Reserva Confirmada
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MODAL NUEVO WALK-IN */}
        {showAddWalkInModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <form
              onSubmit={this.handleRegisterWalkIn}
              className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative"
            >
              <div className="h-1.5 bg-amber-500 w-full" />

              <div className="p-6 space-y-4 animate-fadeIn">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-[#1E3354]">
                  <h3 className="font-black text-slate-900 dark:text-white text-lg flex items-center gap-1.5">
                    <UserPlus className="w-5 h-5 text-amber-500" />
                    <span>Registro Rápido Walk-In</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => this.setState({ showAddWalkInModal: false })}
                    className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-[#12233B] transition-all cursor-pointer text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3.5 text-xs text-slate-700 dark:text-slate-200">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                        Nombres *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Roberto"
                        value={walkInFirstName}
                        onChange={e => this.setState({ walkInFirstName: e.target.value })}
                        className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                        Apellidos *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Mendoza Roca"
                        value={walkInLastName}
                        onChange={e => this.setState({ walkInLastName: e.target.value })}
                        className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                      Teléfono Celular *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Ej. 71523456"
                      value={walkInPhone}
                      onChange={e => this.setState({ walkInPhone: e.target.value })}
                      className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                      Correo (Opcional)
                    </label>
                    <input
                      type="email"
                      placeholder="Ej. roberto@example.com"
                      value={walkInEmail}
                      onChange={e => this.setState({ walkInEmail: e.target.value })}
                      className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                      Servicio Solicitado *
                    </label>
                    <select
                      required
                      value={walkInServiceId}
                      onChange={e => this.setState({ walkInServiceId: e.target.value })}
                      className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                    >
                      <option value="">-- Selecciona Servicio --</option>
                      {services.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({CurrencyFormatter.format(s.price)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                      Barbero Preferido
                    </label>
                    <select
                      value={walkInEmployeeId}
                      onChange={e => this.setState({ walkInEmployeeId: e.target.value })}
                      className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                    >
                      <option value="">Cualquier barbero disponible</option>
                      {activeBarbers.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.fullName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                      Prioridad Cola de Espera
                    </label>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => this.setState({ walkInPriority: 'normal' })}
                        className={`py-2 text-center text-xs rounded-lg border font-bold transition-all cursor-pointer ${
                          walkInPriority === 'normal'
                            ? 'bg-navy-50 dark:bg-navy-900/70 border-navy-600 dark:border-navy-400 text-navy-800 dark:text-navy-200'
                            : 'bg-white dark:bg-[#12233B] border-slate-200 dark:border-[#243D63] text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        Normal
                      </button>
                      <button
                        type="button"
                        onClick={() => this.setState({ walkInPriority: 'high' })}
                        className={`py-2 text-center text-xs rounded-lg border font-bold transition-all cursor-pointer ${
                          walkInPriority === 'high'
                            ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-700 dark:text-amber-300'
                            : 'bg-white dark:bg-[#12233B] border-slate-200 dark:border-[#243D63] text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        Alta (Prioritario)
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 py-2.5 rounded-lg font-bold tracking-wide transition-all cursor-pointer text-xs mt-4 shadow-sm"
                >
                  Agregar a Cola de Espera
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BaseAppComponent } from '../../context/AppContext';
import { ModelFactory } from '../../models/DomainModels';
import { CurrencyFormatter, DateTimeHelper, WhatsAppUrlBuilder } from '../../utils/helpers';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  Sparkles,
  Smartphone,
  Copy,
  Bell,
  Check,
  Edit3,
  RefreshCw,
  Phone,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
} from 'lucide-react';

export interface WhatsAppTemplate {
  id: 'confirmation' | 'reminder_24h' | 'reminder_2h' | 'thank_you';
  name: string;
  triggerLabel: string;
  enabled: boolean;
  templateText: string;
}

/**
 * Servicio encapsulado orientado a objetos para gestionar plantillas y almacenamiento de WhatsApp.
 */
class WhatsAppTemplateService {
  private static readonly MASTER_STORAGE_KEY = 'wa_reminders_master';
  private static readonly TEMPLATES_STORAGE_KEY = 'wa_reminders_templates';

  public static readonly DEFAULT_TEMPLATES: WhatsAppTemplate[] = [
    {
      id: 'confirmation',
      name: 'Confirmación de Reserva',
      triggerLabel: 'Enviado inmediatamente al reservar una cita',
      enabled: true,
      templateText: `¡Hola *{NOMBRE_CLIENTE}*! 👋 

Tu reserva en *{NOMBRE_EMPRESA}* ha sido confirmada con éxito.

✂️ *Servicio:* {SERVICIO}
💈 *Barbero:* {BARBERO}
📅 *Fecha:* {FECHA}
⏰ *Hora:* {HORA}
📍 *Sucursal:* {SUCURSAL} ({DIRECCION})
💵 *Total a pagar:* {PRECIO}

Si necesitas reprogramar o cancelar, por favor avísanos con al menos 2 horas de anticipación. ¡Te esperamos! ✨`,
    },
    {
      id: 'reminder_24h',
      name: 'Recordatorio (24 Horas Antes)',
      triggerLabel: 'Enviado 1 día antes de la cita programada',
      enabled: true,
      templateText: `¡Hola *{NOMBRE_CLIENTE}*! 💈 Recordatorio de tu cita mañana en *{NOMBRE_EMPRESA}*:

✂️ *Servicio:* {SERVICIO}
💈 *Barbero:* {BARBERO}
📅 *Fecha:* {FECHA}
⏰ *Hora:* {HORA}
📍 *Sucursal:* {SUCURSAL}

Responde *SI* para confirmar tu asistencia o *REPROGRAMAR* si tuviste algún inconveniente. ¡Que tengas excelente día!`,
    },
    {
      id: 'reminder_2h',
      name: 'Recordatorio Urgente (2 Horas Antes)',
      triggerLabel: 'Enviado 2 horas antes de la cita programada',
      enabled: true,
      templateText: `¡Hola *{NOMBRE_CLIENTE}*! ⏰ Te recordamos que tu cita en *{NOMBRE_EMPRESA}* es HOY a las *{HORA}*.

💈 *Atención por:* {BARBERO}
✂️ *Servicio:* {SERVICIO}
📍 *Ubicación:* {SUCURSAL} - {DIRECCION}

Por favor procura llegar 5 minutos antes. ¡Nos vemos pronto!`,
    },
    {
      id: 'thank_you',
      name: 'Agradecimiento / Evaluación Post-Servicio',
      triggerLabel: 'Enviado al finalizar el servicio en caja',
      enabled: false,
      templateText: `¡Gracias por visitarnos hoy, *{NOMBRE_CLIENTE}*! 🙏 

Esperamos que hayas disfrutado tu servicio con *{BARBERO}* en *{NOMBRE_EMPRESA}*.

⭐ ¿Cómo fue tu experiencia? Califícanos o déjanos tus comentarios. ¡Fue un gusto atenderte y nos vemos en tu próxima visita! ✂️`,
    },
  ];

  public static loadMasterEnabled(): boolean {
    const saved = localStorage.getItem(WhatsAppTemplateService.MASTER_STORAGE_KEY);
    return saved !== null ? JSON.parse(saved) : true;
  }

  public static loadTemplates(): WhatsAppTemplate[] {
    const saved = localStorage.getItem(WhatsAppTemplateService.TEMPLATES_STORAGE_KEY);
    return saved ? JSON.parse(saved) : WhatsAppTemplateService.DEFAULT_TEMPLATES;
  }

  public static persist(isMasterEnabled: boolean, templates: WhatsAppTemplate[]): void {
    localStorage.setItem(WhatsAppTemplateService.MASTER_STORAGE_KEY, JSON.stringify(isMasterEnabled));
    localStorage.setItem(WhatsAppTemplateService.TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  }
}

interface WhatsAppRemindersState {
  isMasterEnabled: boolean;
  templates: WhatsAppTemplate[];
  selectedTemplateId: WhatsAppTemplate['id'];
  testPhoneNumber: string;
  sentSuccessId: string | null;
  copiedId: string | null;
  savedSettingsMsg: boolean;
}

export class WhatsAppReminders extends BaseAppComponent<{}, WhatsAppRemindersState> {
  private readonly availableVariables = [
    { key: 'NOMBRE_CLIENTE', label: 'Nombre del Cliente' },
    { key: 'BARBERO', label: 'Barbero Asignado' },
    { key: 'SERVICIO', label: 'Servicio Reservado' },
    { key: 'FECHA', label: 'Fecha de Cita' },
    { key: 'HORA', label: 'Hora de Cita' },
    { key: 'SUCURSAL', label: 'Sucursal' },
    { key: 'DIRECCION', label: 'Dirección' },
    { key: 'PRECIO', label: 'Precio Total' },
    { key: 'NOMBRE_EMPRESA', label: 'Nombre Barbería' },
  ];

  private toastTimer: number | null = null;
  private sentTimer: number | null = null;
  private copiedTimer: number | null = null;

  constructor(props: {}) {
    super(props);
    this.state = {
      isMasterEnabled: WhatsAppTemplateService.loadMasterEnabled(),
      templates: WhatsAppTemplateService.loadTemplates(),
      selectedTemplateId: 'reminder_24h',
      testPhoneNumber: '71523456',
      sentSuccessId: null,
      copiedId: null,
      savedSettingsMsg: false,
    };
  }

  public componentDidUpdate(_prevProps: {}, prevState: WhatsAppRemindersState): void {
    if (
      prevState.isMasterEnabled !== this.state.isMasterEnabled ||
      prevState.templates !== this.state.templates
    ) {
      WhatsAppTemplateService.persist(this.state.isMasterEnabled, this.state.templates);
    }
  }

  public componentWillUnmount(): void {
    if (this.toastTimer) window.clearTimeout(this.toastTimer);
    if (this.sentTimer) window.clearTimeout(this.sentTimer);
    if (this.copiedTimer) window.clearTimeout(this.copiedTimer);
  }

  private triggerSaveToast = (): void => {
    this.setState({ savedSettingsMsg: true });
    if (this.toastTimer) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.setState({ savedSettingsMsg: false }), 2500);
  };

  private handleToggleMaster = (): void => {
    this.setState(
      prevState => ({ isMasterEnabled: !prevState.isMasterEnabled }),
      this.triggerSaveToast
    );
  };

  private handleToggleTemplate = (id: WhatsAppTemplate['id']): void => {
    this.setState(
      prevState => ({
        templates: prevState.templates.map(t => (t.id === id ? { ...t, enabled: !t.enabled } : t)),
      }),
      this.triggerSaveToast
    );
  };

  private handleTextChange = (text: string): void => {
    const { selectedTemplateId } = this.state;
    this.setState(prevState => ({
      templates: prevState.templates.map(t =>
        t.id === selectedTemplateId ? { ...t, templateText: text } : t
      ),
    }));
  };

  private handleResetTemplate = (): void => {
    const defaultOne = WhatsAppTemplateService.DEFAULT_TEMPLATES.find(
      t => t.id === this.state.selectedTemplateId
    );
    if (defaultOne) {
      this.handleTextChange(defaultOne.templateText);
      this.triggerSaveToast();
    }
  };

  private insertVariable = (variableKey: string): void => {
    const activeTemplate = this.getActiveTemplate();
    this.handleTextChange(activeTemplate.templateText + ` {${variableKey}}`);
  };

  private getActiveTemplate(): WhatsAppTemplate {
    const { templates, selectedTemplateId } = this.state;
    return templates.find(t => t.id === selectedTemplateId) || templates[0];
  }

  private replacePlaceholders = (text: string, apt?: any): string => {
    const { companyInfo, clients, employees, services, branches, selectedBranchId } = this.app;

    const client = clients.find(c => c.id === apt?.clientId);
    const employee = employees.find(e => e.id === apt?.employeeId);
    const service = services.find(s => s.id === apt?.serviceId);
    const branch = branches.find(b => b.id === (apt?.branchId || selectedBranchId)) || branches[0];

    const clientName = client ? ModelFactory.createClient(client).fullName : 'Andrés Silva';
    const barberName = employee ? ModelFactory.createEmployee(employee).fullName : 'Luis Morales';
    const serviceModel = service ? ModelFactory.createService(service) : null;
    const branchModel = branch ? ModelFactory.createBranch(branch) : null;

    const serviceName = serviceModel ? serviceModel.name : 'Corte de Cabello & Barba';
    const priceVal = serviceModel
      ? CurrencyFormatter.format(serviceModel.price)
      : `${companyInfo.currencySymbol || 'Bs.'} 40.00`;
    const dateVal = apt?.date
      ? DateTimeHelper.formatLegible(apt.date)
      : DateTimeHelper.formatLegible(DateTimeHelper.getTodayStr());
    const timeVal = apt?.startTime || '16:00';
    const branchName = branchModel ? branchModel.name : 'Sucursal Principal';
    const addressVal = branchModel?.address || companyInfo.address || 'Av. Principal #123';

    return text
      .replaceAll('{NOMBRE_CLIENTE}', clientName)
      .replaceAll('{BARBERO}', barberName)
      .replaceAll('{SERVICIO}', serviceName)
      .replaceAll('{FECHA}', dateVal)
      .replaceAll('{HORA}', timeVal)
      .replaceAll('{SUCURSAL}', branchName)
      .replaceAll('{DIRECCION}', addressVal)
      .replaceAll('{PRECIO}', priceVal)
      .replaceAll('{NOMBRE_EMPRESA}', companyInfo.name || 'Barbería Josué');
  };

  private sendWhatsAppMessage = (phone: string, text: string, aptId?: string): void => {
    const url = WhatsAppUrlBuilder.buildWaMeUrl(phone, text);
    window.open(url, '_blank', 'noopener,noreferrer');

    if (aptId) {
      this.setState({ sentSuccessId: aptId });
      if (this.sentTimer) window.clearTimeout(this.sentTimer);
      this.sentTimer = window.setTimeout(() => this.setState({ sentSuccessId: null }), 4000);
    }
  };

  private copyToClipboard = (text: string, id: string): void => {
    navigator.clipboard.writeText(text);
    this.setState({ copiedId: id });
    if (this.copiedTimer) window.clearTimeout(this.copiedTimer);
    this.copiedTimer = window.setTimeout(() => this.setState({ copiedId: null }), 2500);
  };

  public render(): React.ReactNode {
    const { companyInfo, appointments, clients, employees, services, selectedBranchId } = this.app;
    const {
      isMasterEnabled,
      templates,
      selectedTemplateId,
      testPhoneNumber,
      sentSuccessId,
      copiedId,
      savedSettingsMsg,
    } = this.state;

    const activeTemplate = this.getActiveTemplate();
    const upcomingAppointments = appointments
      .filter(a => a.branchId === selectedBranchId && a.status !== 'cancelled')
      .slice(0, 8);

    return (
      <div className="space-y-6 animate-fadeIn pb-12">
        {/* HEADER PRINCIPAL DEL MÓDULO */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 dark:border-emerald-800/60">
              <MessageSquare className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Recordatorios Automáticos por WhatsApp
                </h1>
                <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold rounded-full border border-emerald-200 dark:border-emerald-800/60 uppercase tracking-wider">
                  Módulo Activo
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Configura plantillas personalizadas y envía notificaciones por WhatsApp a tus clientes antes y después de sus citas.
              </p>
            </div>
          </div>

          {/* MASTER SWITCH CONTROL */}
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] px-4 py-2.5 rounded-xl self-stretch md:self-auto justify-between md:justify-start">
            <div className="text-right">
              <span className="text-xs font-bold text-slate-800 dark:text-white block">Envío Automático</span>
              <span
                className={`text-[10px] font-semibold block ${
                  isMasterEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {isMasterEnabled ? 'SISTEMA ACTIVADO' : 'SISTEMA PAUSADO'}
              </span>
            </div>
            <button
              type="button"
              onClick={this.handleToggleMaster}
              className="text-2xl transition-transform active:scale-95 cursor-pointer focus:outline-none"
              title="Activar o desactivar recordatorios por WhatsApp"
            >
              {isMasterEnabled ? (
                <ToggleRight className="w-9 h-9 text-emerald-500 stroke-[1.5]" />
              ) : (
                <ToggleLeft className="w-9 h-9 text-slate-300 dark:text-slate-600 stroke-[1.5]" />
              )}
            </button>
          </div>
        </div>

        {savedSettingsMsg && (
          <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 animate-fadeIn shadow-sm">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
            <span>Configuración de plantillas guardada correctamente en el sistema.</span>
          </div>
        )}

        {/* CONTENIDO PRINCIPAL: CONFIGURADOR + PREVIEW EN VIVO */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* COLUMNA IZQUIERDA: EDITOR DE PLANTILLAS Y REGLAS (7 COLS) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1E3354]">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-navy-800 dark:text-navy-300 stroke-[2.2]" />
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                    Disparadores de Mensajes
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">Selecciona para editar</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {templates.map(tmpl => {
                  const isSelected = tmpl.id === selectedTemplateId;
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => this.setState({ selectedTemplateId: tmpl.id })}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between relative ${
                        isSelected
                          ? 'bg-navy-50/80 dark:bg-navy-900/70 border-navy-600 dark:border-navy-400 ring-2 ring-navy-600/20 dark:ring-navy-400/20 shadow-sm'
                          : 'bg-slate-50/70 dark:bg-[#12233B] border-slate-200 dark:border-[#243D63] hover:border-slate-300 dark:hover:border-navy-500 hover:bg-slate-50 dark:hover:bg-[#162B47]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-black text-slate-900 dark:text-white block">{tmpl.name}</span>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            this.handleToggleTemplate(tmpl.id);
                          }}
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                            tmpl.enabled
                              ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60'
                              : 'bg-slate-200 dark:bg-[#0A1526] text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-[#243D63]'
                          }`}
                        >
                          {tmpl.enabled ? 'ON' : 'OFF'}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                        {tmpl.triggerLabel}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* EDITOR DE PLANTILLA SELECCIONADA */}
            <div className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1E3354]">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.2]" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                    Personalizar Mensaje:{' '}
                    <span className="text-navy-800 dark:text-navy-300">{activeTemplate.name}</span>
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={this.handleResetTemplate}
                  className="text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                  title="Restablecer plantilla por defecto"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Restablecer</span>
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Insertar Variables Dinámicas (Haz clic para añadir al mensaje)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {this.availableVariables.map(v => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => this.insertVariable(v.key)}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-[#12233B] hover:bg-navy-50 dark:hover:bg-navy-900/70 hover:text-navy-800 dark:hover:text-navy-200 hover:border-navy-300 dark:hover:border-navy-500 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#243D63] rounded-lg text-[11px] font-mono font-medium transition-all cursor-pointer shadow-xs"
                    >
                      +{`{${v.key}}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                  <span>Formatos soportados por WhatsApp: *negrita*, _cursiva_, ~tachado~</span>
                  <span className="font-mono">{activeTemplate.templateText.length} caracteres</span>
                </div>
                <textarea
                  rows={9}
                  value={activeTemplate.templateText}
                  onChange={e => this.handleTextChange(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-xl p-3.5 text-xs text-slate-800 dark:text-slate-100 font-mono leading-relaxed focus:outline-none focus:border-navy-600 dark:focus:border-navy-400 focus:bg-white dark:focus:bg-[#162B47] transition-all shadow-inner"
                  placeholder="Escribe aquí el texto personalizado del recordatorio..."
                />
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Consejo de conversión:</strong> Mensajes breves con horario exacto y nombre del barbero incrementan la asistencia en un 94%.
                </span>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: PREVIEW DE PANTALLA WHATSAPP REALISTA (5 COLS) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-navy-950 dark:bg-[#0D1A2D] border border-navy-800 dark:border-[#1E3354] rounded-2xl p-5 shadow-lg text-white space-y-4 sticky top-6">
              <div className="flex items-center justify-between pb-3 border-b border-navy-800 dark:border-[#1E3354]">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400 stroke-[2.2]" />
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-200">
                    Vista Previa en Vivo (WhatsApp)
                  </h3>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-mono font-bold px-2 py-0.5 rounded-md border border-emerald-500/30">
                  Simulación Real
                </span>
              </div>

              <div className="bg-[#0b141a] rounded-xl border border-navy-800 dark:border-[#1E3354] overflow-hidden shadow-2xl">
                <div className="bg-[#202c33] px-3.5 py-2.5 flex items-center justify-between border-b border-[#222d34]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                      {companyInfo.name ? companyInfo.name.charAt(0) : 'B'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-[#e9edef] block leading-none">
                          {companyInfo.name || 'Barbería Josué'}
                        </span>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" />
                      </div>
                      <span className="text-[9px] text-[#8696a0] block leading-tight mt-0.5">
                        Cuenta Comercial de Empresa
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                    Verificado
                  </span>
                </div>

                <div className="p-4 bg-[#0b141a] bg-[radial-gradient(#1f2c34_1px,transparent_1px)] [background-size:12px_12px] min-h-[260px] flex flex-col justify-end">
                  <div className="text-center my-2">
                    <span className="bg-[#111b21] text-[#8696a0] text-[9px] font-semibold px-2.5 py-1 rounded-md border border-[#222d34]">
                      HOY
                    </span>
                  </div>

                  <div className="bg-[#005c4b] text-[#e9edef] p-3 rounded-lg rounded-tl-none max-w-[90%] text-xs font-sans whitespace-pre-wrap leading-relaxed shadow-md border border-[#00705a] relative my-1 self-start">
                    {this.replacePlaceholders(activeTemplate.templateText)}
                    <div className="text-[9px] text-[#8696a0] text-right mt-1.5 flex items-center justify-end gap-1">
                      <span>10:30 AM</span>
                      <span className="text-emerald-300 font-black">✓✓</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 space-y-3">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-navy-200 dark:text-slate-400 block">
                  Probar Plantilla Directo en Tu WhatsApp
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={testPhoneNumber}
                      onChange={e => this.setState({ testPhoneNumber: e.target.value })}
                      placeholder="Número de WhatsApp"
                      className="w-full bg-navy-900 dark:bg-[#12233B] border border-navy-700 dark:border-[#243D63] rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      this.sendWhatsAppMessage(
                        testPhoneNumber,
                        this.replacePlaceholders(activeTemplate.templateText)
                      )
                    }
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Probar Mensaje</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN INFERIOR: COLA DE CITAS Y ENVÍO DIRECTO DE RECORDATORIOS */}
        <div className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100 dark:border-[#1E3354]">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-navy-800 dark:text-navy-300 stroke-[2.2]" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Próximas Citas y Recordatorios Listos para Enviar
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Envía recordatorios personalizados de tus citas agendadas con un solo clic hacia WhatsApp.
              </p>
            </div>
            <span className="text-xs bg-navy-50 dark:bg-navy-900/70 text-navy-800 dark:text-navy-200 font-bold px-3 py-1 rounded-full border border-navy-200 dark:border-navy-700/60">
              {upcomingAppointments.length} Cita(s) en Lista
            </span>
          </div>

          {upcomingAppointments.length === 0 ? (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-[#0A1526] rounded-xl border border-dashed border-slate-200 dark:border-[#243D63]">
              <p className="text-xs font-semibold">
                No hay citas registradas en la agenda para la sucursal actual.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#243D63] bg-slate-50 dark:bg-[#12233B] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Cliente</th>
                    <th className="py-3 px-3">Teléfono</th>
                    <th className="py-3 px-3">Cita / Servicio</th>
                    <th className="py-3 px-3">Barbero</th>
                    <th className="py-3 px-3 text-center">Estado Recordatorio</th>
                    <th className="py-3 px-3 text-right">Acciones WhatsApp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1E3354]">
                  {upcomingAppointments.map(apt => {
                    const client = clients.find(c => c.id === apt.clientId);
                    const employee = employees.find(e => e.id === apt.employeeId);
                    const service = services.find(s => s.id === apt.serviceId);

                    const clientModel = client ? ModelFactory.createClient(client) : null;
                    const employeeModel = employee ? ModelFactory.createEmployee(employee) : null;
                    const serviceModel = service ? ModelFactory.createService(service) : null;

                    const clientName = clientModel?.fullName || 'Cliente General';
                    const clientPhone = clientModel?.phone || '71523456';
                    const barberName = employeeModel?.fullName || 'Atención General';
                    const serviceName = serviceModel?.name || 'Servicio Barbería';

                    const personalizedMessage = this.replacePlaceholders(
                      templates.find(t => t.id === 'reminder_24h')?.templateText || activeTemplate.templateText,
                      apt
                    );

                    const isSent = sentSuccessId === apt.id;
                    const isCopied = copiedId === apt.id;

                    return (
                      <tr key={apt.id} className="hover:bg-slate-50/80 dark:hover:bg-[#12233B]/70 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 dark:text-white">{clientName}</div>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">ID: #{apt.id}</span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">{clientPhone}</td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block">{serviceName}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            {apt.date} a las {apt.startTime}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">{barberName}</td>
                        <td className="py-3 px-3 text-center">
                          {isSent ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>Enviado a WhatsApp</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-full border border-amber-200 dark:border-amber-800/60">
                              <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              <span>Listo para enviar</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => this.copyToClipboard(personalizedMessage, apt.id)}
                              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-[#12233B] hover:bg-slate-200 dark:hover:bg-[#183052] rounded-lg transition-all cursor-pointer"
                              title="Copiar texto de recordatorio"
                            >
                              {isCopied ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                this.sendWhatsAppMessage(clientPhone, personalizedMessage, apt.id)
                              }
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Enviar Recordatorio</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }
}

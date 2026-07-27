import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { formatDateLegible, formatCurrency, getTodayStr } from '../../utils/helpers';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  Sparkles,
  Smartphone,
  Copy,
  ExternalLink,
  Bell,
  Check,
  Edit3,
  RefreshCw,
  Phone,
  Calendar as CalendarIcon,
  User,
  Scissors,
  HelpCircle,
  ToggleLeft,
  ToggleRight,
  ShieldCheck
} from 'lucide-react';

export interface WhatsAppTemplate {
  id: 'confirmation' | 'reminder_24h' | 'reminder_2h' | 'thank_you';
  name: string;
  triggerLabel: string;
  enabled: boolean;
  templateText: string;
}

const DEFAULT_TEMPLATES: WhatsAppTemplate[] = [
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

export const WhatsAppReminders: React.FC = () => {
  const { companyInfo, appointments, clients, employees, services, branches, selectedBranchId } = useApp();

  // Settings State
  const [isMasterEnabled, setIsMasterEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('wa_reminders_master');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [templates, setTemplates] = useState<WhatsAppTemplate[]>(() => {
    const saved = localStorage.getItem('wa_reminders_templates');
    return saved ? JSON.parse(saved) : DEFAULT_TEMPLATES;
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState<WhatsAppTemplate['id']>('reminder_24h');
  const [testPhoneNumber, setTestPhoneNumber] = useState<string>('71523456');
  const [sentSuccessId, setSentSuccessId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedSettingsMsg, setSavedSettingsMsg] = useState(false);

  // Active Template object
  const activeTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('wa_reminders_master', JSON.stringify(isMasterEnabled));
    localStorage.setItem('wa_reminders_templates', JSON.stringify(templates));
  }, [isMasterEnabled, templates]);

  const handleToggleMaster = () => {
    setIsMasterEnabled(!isMasterEnabled);
    triggerSaveToast();
  };

  const handleToggleTemplate = (id: WhatsAppTemplate['id']) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t))
    );
    triggerSaveToast();
  };

  const handleTextChange = (text: string) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === selectedTemplateId ? { ...t, templateText: text } : t))
    );
  };

  const handleResetTemplate = () => {
    const defaultOne = DEFAULT_TEMPLATES.find((t) => t.id === selectedTemplateId);
    if (defaultOne) {
      handleTextChange(defaultOne.templateText);
      triggerSaveToast();
    }
  };

  const triggerSaveToast = () => {
    setSavedSettingsMsg(true);
    setTimeout(() => setSavedSettingsMsg(false), 2500);
  };

  // Dynamic variable insertion
  const insertVariable = (variableKey: string) => {
    handleTextChange(activeTemplate.templateText + ` {${variableKey}}`);
  };

  // Replace placeholders helper
  const replacePlaceholders = (text: string, apt?: any) => {
    const client = clients.find((c) => c.id === apt?.clientId);
    const employee = employees.find((e) => e.id === apt?.employeeId);
    const service = services.find((s) => s.id === apt?.serviceId);
    const branch = branches.find((b) => b.id === (apt?.branchId || selectedBranchId)) || branches[0];

    const clientName = client?.fullName || client?.nombreCompleto || 'Andrés Silva';
    const barberName = employee?.fullName || employee?.nombreCompleto || 'Luis Morales';
    const serviceName = service?.name || service?.nombre || 'Corte de Cabello & Barba';
    const priceVal = service ? formatCurrency(service.price ?? service.precio ?? 40) : `${companyInfo.currencySymbol || 'Bs.'} 40.00`;
    const dateVal = apt?.date ? formatDateLegible(apt.date) : formatDateLegible(getTodayStr());
    const timeVal = apt?.startTime || '16:00';
    const branchName = branch?.name || branch?.nombre || 'Sucursal Principal';
    const addressVal = branch?.address || branch?.direccion || companyInfo.address || 'Av. Principal #123';

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

  // WhatsApp Sending Trigger
  const sendWhatsAppMessage = (phone: string, text: string, aptId?: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const encodedText = encodeURIComponent(text);
    const url = `https://wa.me/${cleanPhone.length <= 8 ? '591' + cleanPhone : cleanPhone}?text=${encodedText}`;
    
    window.open(url, '_blank', 'noopener,noreferrer');

    if (aptId) {
      setSentSuccessId(aptId);
      setTimeout(() => setSentSuccessId(null), 4000);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Upcoming appointments for queue
  const todayStr = getTodayStr();
  const upcomingAppointments = appointments
    .filter((a) => a.branchId === selectedBranchId && a.status !== 'cancelled')
    .slice(0, 8);

  const availableVariables = [
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

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* HEADER PRINCIPAL DEL MÓDULO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <MessageSquare className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Recordatorios Automáticos por WhatsApp
              </h1>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full border border-emerald-200 uppercase tracking-wider">
                Modulo Activo
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Configura plantillas personalizadas y envía notificaciones por WhatsApp a tus clientes antes y después de sus citas.
            </p>
          </div>
        </div>

        {/* MASTER SWITCH CONTROL */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl self-stretch md:self-auto justify-between md:justify-start">
          <div className="text-right">
            <span className="text-xs font-bold text-slate-800 block">Envío Automático</span>
            <span className={`text-[10px] font-semibold block ${isMasterEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
              {isMasterEnabled ? 'SISTEMA ACTIVADO' : 'SISTEMA PAUSADO'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleToggleMaster}
            className="text-2xl transition-transform active:scale-95 cursor-pointer focus:outline-none"
            title="Activar o desactivar recordatorios por WhatsApp"
          >
            {isMasterEnabled ? (
              <ToggleRight className="w-9 h-9 text-emerald-500 stroke-[1.5]" />
            ) : (
              <ToggleLeft className="w-9 h-9 text-slate-300 stroke-[1.5]" />
            )}
          </button>
        </div>
      </div>

      {savedSettingsMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 animate-fadeIn shadow-sm">
          <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
          <span>Configuración de plantillas guardada correctamente en el sistema.</span>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL: CONFIGURADOR + PREVIEW EN VIVO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUMNA IZQUIERDA: EDITOR DE PLANTILLAS Y REGLAS (7 COLS) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* SELECCIÓN DE REGLA / DETONADOR */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-600 stroke-[2.2]" />
                <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                  Disparadores de Mensajes
                </h3>
              </div>
              <span className="text-[10px] text-slate-400">Selecciona para editar</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {templates.map((tmpl) => {
                const isSelected = tmpl.id === selectedTemplateId;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => setSelectedTemplateId(tmpl.id)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between relative ${
                      isSelected
                        ? 'bg-indigo-50/60 border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
                        : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-black text-slate-900 block">{tmpl.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleTemplate(tmpl.id);
                        }}
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md transition-colors ${
                          tmpl.enabled
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-200 text-slate-500 border border-slate-300'
                        }`}
                      >
                        {tmpl.enabled ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                      {tmpl.triggerLabel}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* EDITOR DE PLANTILLA SELECCIONADA */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-600 stroke-[2.2]" />
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Personalizar Mensaje: <span className="text-indigo-600">{activeTemplate.name}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={handleResetTemplate}
                className="text-[10px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
                title="Restablecer plantilla por defecto"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Restablecer</span>
              </button>
            </div>

            {/* DYNAMIC VARIABLES INSERTION CHIPS */}
            <div className="space-y-2">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                Insertar Variables Dinámicas (Haz clic para añadir al mensaje)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {availableVariables.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insertVariable(v.key)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-mono font-medium transition-all cursor-pointer shadow-2xs"
                  >
                    +{`{${v.key}}`}
                  </button>
                ))}
              </div>
            </div>

            {/* TEXTAREA EDITOR */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                <span>Formatos soportados por WhatsApp: *negrita*, _cursiva_, ~tachado~</span>
                <span>{activeTemplate.templateText.length} caracteres</span>
              </div>
              <textarea
                rows={9}
                value={activeTemplate.templateText}
                onChange={(e) => handleTextChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-250 rounded-xl p-3.5 text-xs text-slate-800 font-mono leading-relaxed focus:outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
                placeholder="Escribe aquí el texto personalizado del recordatorio..."
              />
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-800 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Consejo de conversión:</strong> Mensajes breves con horario exacto y nombre del barbero incrementan la asistencia en un 94%.
              </span>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: PREVIEW DE PANTALLA WHATSAPP REALISTA (5 COLS) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg text-white space-y-4 sticky top-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
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

            {/* WHATSAPP PHONE FRAME SIMULATOR */}
            <div className="bg-[#0b141a] rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
              {/* WhatsApp Header Bar */}
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

              {/* Chat Canvas */}
              <div className="p-4 bg-[#0b141a] bg-[radial-gradient(#1f2c34_1px,transparent_1px)] [background-size:12px_12px] min-h-[260px] flex flex-col justify-end">
                {/* Date separator pill */}
                <div className="text-center my-2">
                  <span className="bg-[#111b21] text-[#8696a0] text-[9px] font-semibold px-2.5 py-1 rounded-md border border-[#222d34]">
                    HOY
                  </span>
                </div>

                {/* Received / Sent Chat Bubble */}
                <div className="bg-[#005c4b] text-[#e9edef] p-3 rounded-lg rounded-tl-none max-w-[90%] text-xs font-sans whitespace-pre-wrap leading-relaxed shadow-md border border-[#00705a] relative my-1 self-start">
                  {replacePlaceholders(activeTemplate.templateText)}
                  <div className="text-[9px] text-[#8696a0] text-right mt-1.5 flex items-center justify-end gap-1">
                    <span>10:30 AM</span>
                    <span className="text-emerald-300 font-black">✓✓</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ENVÍO DE PRUEBA INTERACTIVO */}
            <div className="pt-2 space-y-3">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Probar Plantilla Directo en Tu WhatsApp
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={testPhoneNumber}
                    onChange={(e) => setTestPhoneNumber(e.target.value)}
                    placeholder="Número de WhatsApp"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => sendWhatsAppMessage(testPhoneNumber, replacePlaceholders(activeTemplate.templateText))}
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
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600 stroke-[2.2]" />
              <h3 className="font-extrabold text-slate-900 text-base">
                Próximas Citas y Recordatorios Listos para Enviar
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Envía recordatorios personalizados de tus citas agendadas con un solo clic hacia WhatsApp.
            </p>
          </div>
          <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-3 py-1 rounded-full border border-indigo-100">
            {upcomingAppointments.length} Cita(s) en Lista
          </span>
        </div>

        {upcomingAppointments.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <p className="text-xs font-semibold">No hay citas registradas en la agenda para la sucursal actual.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Cliente</th>
                  <th className="py-3 px-3">Teléfono</th>
                  <th className="py-3 px-3">Cita / Servicio</th>
                  <th className="py-3 px-3">Barbero</th>
                  <th className="py-3 px-3 text-center">Estado Recordatorio</th>
                  <th className="py-3 px-3 text-right">Acciones WhatsApp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {upcomingAppointments.map((apt) => {
                  const client = clients.find((c) => c.id === apt.clientId);
                  const employee = employees.find((e) => e.id === apt.employeeId);
                  const service = services.find((s) => s.id === apt.serviceId);

                  const clientName = client?.fullName || client?.nombreCompleto || 'Cliente General';
                  const clientPhone = client?.phone || client?.telefono || '71523456';
                  const barberName = employee?.fullName || employee?.nombreCompleto || 'Atención General';
                  const serviceName = service?.name || service?.nombre || 'Servicio Barbería';

                  const personalizedMessage = replacePlaceholders(
                    templates.find((t) => t.id === 'reminder_24h')?.templateText || activeTemplate.templateText,
                    apt
                  );

                  const isSent = sentSuccessId === apt.id;
                  const isCopied = copiedId === apt.id;

                  return (
                    <tr key={apt.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{clientName}</div>
                        <span className="text-[10px] text-slate-400">ID: #{apt.id}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700">
                        {clientPhone}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-800 block">{serviceName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {apt.date} a las {apt.startTime}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-700">
                        {barberName}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isSent ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Enviado a WhatsApp</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Listo para enviar</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(personalizedMessage, apt.id)}
                            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
                            title="Copiar texto de recordatorio"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => sendWhatsAppMessage(clientPhone, personalizedMessage, apt.id)}
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
};

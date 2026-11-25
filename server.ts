/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Content } from '@google/genai';
import dotenv from 'dotenv';
import {
  ActorContext,
  AdminAuthService,
  DualDatabaseAuditManager,
} from './server/auditDualDb';
import { SvgCaptchaService } from './server/captchaService';

// Cargar variables de entorno
dotenv.config();

interface ChatHistoryEntry {
  role: 'user' | 'model';
  text: string;
}

interface BarbershopChatContext {
  company: {
    name: string;
    slogan: string;
    address: string;
    phone: string;
    email: string;
    currencySymbol: string;
  };
  branches: Array<{
    name: string;
    address: string;
    phone: string;
    hoursSummary: string;
  }>;
  services: Array<{
    code: string;
    name: string;
    category: string;
    price: number;
    duration: number;
    description: string;
  }>;
  barbers: Array<{
    name: string;
    specialties: string[];
  }>;
  products: Array<{
    name: string;
    category: string;
    price: number;
    stock: number;
    description: string;
  }>;
}

/**
 * Servicio encapsulado orientado a objetos para gestionar las llamadas a Gemini API en el servidor.
 */
class GeminiAssistantService {
  private static readonly MODEL_NAME = 'gemini-4-hydrogen';
  private aiClient: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI {
    if (!this.aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('La variable de entorno GEMINI_API_KEY no está configurada.');
      }
      this.aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
    return this.aiClient;
  }

  private async executeWithRetry<T>(operation: () => Promise<T>, maxRetries = 2): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (err: any) {
        lastError = err;
        const status = err?.status || err?.code;
        const isTransient = status === 503 || status === 500 || err?.message?.includes('fetch');
        if (!isTransient || attempt === maxRetries) {
          throw err;
        }
        await new Promise(resolve => setTimeout(resolve, 400 * Math.pow(2, attempt)));
      }
    }
    throw lastError;
  }

  private buildChatbotSystemInstruction(contextData?: BarbershopChatContext): string {
    const companyName = contextData?.company?.name || 'Barbería "Josué"';
    const currency = contextData?.company?.currencySymbol || 'Bs.';

    const branchesText = contextData?.branches?.length
      ? contextData.branches
          .map(b => `- ${b.name} | Dirección: ${b.address} | Teléfono: ${b.phone} | Horario: ${b.hoursSummary}`)
          .join('\n')
      : `- Sucursal Central (La Paz) | Dirección: ${contextData?.company?.address || 'Av. 16 de Julio #1420, El Prado, La Paz, Bolivia'} | Teléfono: ${contextData?.company?.phone || '71523456'}`;

    const servicesText = contextData?.services?.length
      ? contextData.services
          .map(
            s =>
              `- [${s.code}] ${s.name} (${s.category}): ${currency} ${s.price.toFixed(2)} | Duración: ${s.duration} min${s.description ? ` | ${s.description}` : ''}`
          )
          .join('\n')
      : '- Corte de Cabello Clásico, Perfilado de Barba, Afeitado Tradicional y Combos.';

    const barbersText = contextData?.barbers?.length
      ? contextData.barbers
          .map(b => `- ${b.name}${b.specialties.length ? ` (Especialidades: ${b.specialties.join(', ')})` : ''}`)
          .join('\n')
      : '- Equipo de barberos profesionales disponibles por orden de llegada o reserva.';

    const productsText = contextData?.products?.length
      ? contextData.products
          .map(
            p =>
              `- ${p.name} (${p.category}): ${currency} ${p.price.toFixed(2)} | Stock disponible: ${p.stock} uds.${p.description ? ` | ${p.description}` : ''}`
          )
          .join('\n')
      : '- Ceras, pomadas y aceites para barba disponibles en sucursal.';

    return `Eres el asistente virtual oficial de "${companyName}" (${contextData?.company?.slogan || 'Estilo, Corte & Tradición de Caballero'}).
Tu objetivo es resolver con amabilidad, precisión y claridad las dudas de clientes y personal sobre la atención en la barbería, precios, servicios, horarios, sucursales, barberos, productos y políticas de reserva.

DATOS ACTUALIZADOS DEL NEGOCIO:
- Nombre comercial: ${companyName}
- Dirección principal: ${contextData?.company?.address || 'No especificada'}
- Teléfono / WhatsApp: ${contextData?.company?.phone || 'No especificado'}
- Correo: ${contextData?.company?.email || 'No especificado'}
- Moneda: ${currency}

SUCURSALES Y HORARIOS:
${branchesText}

CATÁLOGO DE SERVICIOS Y PRECIOS:
${servicesText}

EQUIPO DE BARBEROS:
${barbersText}

PRODUCTOS PARA CUIDADO PERSONAL EN VENTA:
${productsText}

POLÍTICAS Y MODALIDADES DE ATENCIÓN:
- Reservas: Los clientes pueden agendar cita desde la sección "Reservar Cita" eligiendo servicio, sucursal, barbero, fecha y hora disponible.
- Atención sin cita (Walk-In): También atendemos por orden de llegada en fila de espera según disponibilidad del barbero en turno.
- Puntualidad y reprogramación: Se recomienda llegar 5 minutos antes; para reprogramar o cancelar, avisar con al menos 2 horas de anticipación.
- Métodos de pago aceptados en caja: Efectivo, tarjeta, transferencia bancaria / QR y pago mixto.

REGLAS DE RESPUESTA:
1. Responde siempre en español natural, cercano y profesional.
2. Usa únicamente los precios, códigos, horarios, productos y datos reales proporcionados arriba. Si un dato no figura en el contexto, indícalo con honestidad y sugiere contactar por teléfono o WhatsApp (${contextData?.company?.phone || 'de la sucursal'}).
3. Mantén las respuestas claras, ordenadas y concisas (máximo 150 palabras salvo que te pidan el catálogo completo), usando listas breves cuando enumeres servicios o precios.
4. No inventes descuentos ni servicios inexistentes.`;
  }

  public async handleChat(
    message: string,
    history: ChatHistoryEntry[] = [],
    contextData?: BarbershopChatContext
  ): Promise<string> {
    const ai = this.getClient();

    const formattedHistory: Content[] = history
      .filter(entry => entry && typeof entry.text === 'string' && entry.text.trim().length > 0)
      .slice(-12)
      .map(entry => ({
        role: entry.role === 'model' ? 'model' : 'user',
        parts: [{ text: entry.text }],
      }));

    const response = await this.executeWithRetry(async () => {
      const chat = ai.chats.create({
        model: GeminiAssistantService.MODEL_NAME,
        history: formattedHistory,
        config: {
          systemInstruction: this.buildChatbotSystemInstruction(contextData),
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
        },
      });
      return chat.sendMessage({ message });
    });

    return response.text?.trim() || 'Lo siento, no pude generar una respuesta en este momento.';
  }

  public async generateBusinessAdvice(metrics: Record<string, any>): Promise<string> {
    const ai = this.getClient();
    const prompt = `
      Actúa como un Consultor de Negocios Senior especializado en Barberías y Salones de Belleza de Alta Gama.
      Analiza las siguientes métricas operacionales de nuestra barbería:
      
      - Ventas Totales del Día: Bs. ${metrics.todaySales || 0}
      - Citas Agendadas Hoy: ${metrics.todayAppointments || 0} citas
      - Clientes Activos Totales: ${metrics.activeClients || 0} clientes
      - Productos en Stock Crítico: ${metrics.criticalStockCount || 0} productos
      - Historial de Reservas: ${JSON.stringify(metrics.recentAppointments || [])}

      Por favor, genera un análisis ejecutivo breve, directo y elegante que incluya:
      1. Diagnóstico del día (cómo se ve el rendimiento).
      2. 3 acciones estratégicas concretas (inventario, promociones o asignación de personal).
      3. Un consejo de marketing o retención de clientes rápido.

      IMPORTANTE: Responde en formato markdown limpio, usando un tono profesional y directo.
    `;

    const response = await this.executeWithRetry(() =>
      ai.models.generateContent({
        model: GeminiAssistantService.MODEL_NAME,
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      })
    );

    return response.text || 'No se pudo generar el consejo estratégico en este momento.';
  }

  public async predictDemand(dateStr: string, currentBookingsCount: number): Promise<Record<string, any>> {
    const ai = this.getClient();
    const dateObj = new Date(dateStr + 'T00:00:00');
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayOfWeek = days[dateObj.getDay()];

    const prompt = `
      Actúa como un algoritmo predictivo inteligente de ocupación para Barberías Pro.
      Analiza los siguientes parámetros para predecir la ocupación y comportamiento del cliente para el día de la semana:
      
      - Fecha solicitada: ${dateStr}
      - Día de la semana: ${dayOfWeek}
      - Citas ya reservadas para este día: ${currentBookingsCount || 0} citas

      Por favor, genera una respuesta en JSON estructurado que tenga exactamente la siguiente estructura de campos (no incluyas markdown backticks en tu respuesta, solo el JSON puro):
      {
        "estimatedOccupancyPercent": número entre 0 y 100 de ocupación estimada,
        "peakHours": ["lista de strings con rango de horas pico estimadas para un ${dayOfWeek}"],
        "demandLevel": "Alta" o "Media" o "Baja",
        "staffingRecommendation": "string corto sugiriendo si se necesitan más barberos en turno o si está balanceado",
        "dynamicPricingSuggestion": "string corto de estrategia de precios (e.g., descuento horas valle, tarifa normal, etc.)"
      }
    `;

    const response = await this.executeWithRetry(() =>
      ai.models.generateContent({
        model: GeminiAssistantService.MODEL_NAME,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      })
    );

    const resultText = (response.text ?? '{}').trim();
    return JSON.parse(resultText);
  }
}

/**
 * Extractor OOP de contexto de actor autenticado o público desde la solicitud HTTP.
 */
class RequestContextExtractor {
  private static readonly PUBLIC_CLIENT_MUTATIONS = new Set(['createClient', 'createAppointment']);
  private static readonly ALLOWED_CLIENT_EVENTS = new Set([
    'PAGE_VIEW',
    'CHATBOT_QUERY',
    'THEME_CHANGE',
    'BRANCH_CHANGE',
    'ROLE_SWITCH',
    'EXPORT',
  ]);

  constructor(private readonly authService: AdminAuthService) {}

  public getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
      return forwarded.split(',')[0].trim();
    }
    return req.socket?.remoteAddress || '127.0.0.1';
  }

  public getUserAgent(req: Request): string {
    const ua = req.headers['user-agent'];
    return typeof ua === 'string' ? ua.slice(0, 180) : 'BrowserClient';
  }

  public getActor(req: Request, clientHintName?: string): {
    actor: ActorContext;
    isAdmin: boolean;
  } {
    const session = this.authService.verifyBearerHeader(req.headers.authorization);
    const ipOrigen = this.getClientIp(req);
    const userAgent = this.getUserAgent(req);

    if (session) {
      return {
        isAdmin: true,
        actor: {
          usuario: session.username,
          rolUsuario: 'admin',
          ipOrigen,
          userAgent,
        },
      };
    }

    const cleanHint =
      typeof clientHintName === 'string' && clientHintName.trim()
        ? `Cliente (${clientHintName.trim().slice(0, 60)})`
        : 'Cliente Público';

    return {
      isAdmin: false,
      actor: {
        usuario: cleanHint,
        rolUsuario: 'client',
        ipOrigen,
        userAgent,
      },
    };
  }

  public isPublicMutation(action: string): boolean {
    return RequestContextExtractor.PUBLIC_CLIENT_MUTATIONS.has(action);
  }

  public isAllowedPageEvent(tipoEvento: string, isAdmin: boolean): boolean {
    if (isAdmin) {
      return RequestContextExtractor.ALLOWED_CLIENT_EVENTS.has(tipoEvento) || tipoEvento === 'SYSTEM';
    }
    return RequestContextExtractor.ALLOWED_CLIENT_EVENTS.has(tipoEvento);
  }
}

const app = express();
const PORT = 3000;
const geminiService = new GeminiAssistantService();
const adminAuthService = new AdminAuthService();
const dualDbAuditManager = new DualDatabaseAuditManager();
const requestContextExtractor = new RequestContextExtractor(adminAuthService);
const svgCaptchaService = new SvgCaptchaService();

app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));

// 1. Healthcheck
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 2. CAPTCHA y Autenticación Administrativa + Registro Automático en db_barberia_logs vía Trigger
app.get('/api/auth/captcha', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(svgCaptchaService.generateChallenge());
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password, captchaId, captchaAnswer } = req.body || {};
  const ipOrigen = requestContextExtractor.getClientIp(req);
  const userAgent = requestContextExtractor.getUserAgent(req);
  const attemptedUser = String(username || '').trim().slice(0, 80) || 'Desconocido';

  const captchaCheck = svgCaptchaService.verifyChallenge(
    String(captchaId || ''),
    String(captchaAnswer || '')
  );

  if (!captchaCheck.valid) {
    dualDbAuditManager.logPageEvent(
      {
        usuario: attemptedUser,
        rolUsuario: 'client',
        ipOrigen,
        userAgent,
      },
      {
        tipoEvento: 'LOGIN_FAILED',
        modulo: 'Autenticación',
        resumen: `Fallo de verificación CAPTCHA en inicio de sesión para "${attemptedUser}".`,
        detalles: { attemptedUsername: attemptedUser, outcome: 'CAPTCHA_FAILED' },
        nivel: 'WARNING',
      }
    );

    return res.status(400).json({
      success: false,
      captchaError: true,
      error: captchaCheck.error || 'Código CAPTCHA inválido.',
    });
  }

  const result = adminAuthService.authenticate(String(username || ''), String(password || ''));

  if (result.success && result.token && result.username) {
    dualDbAuditManager.logPageEvent(
      {
        usuario: result.username,
        rolUsuario: 'admin',
        ipOrigen,
        userAgent,
      },
      {
        tipoEvento: 'LOGIN',
        modulo: 'Autenticación',
        resumen: `Inicio de sesión administrativo exitoso para el usuario "${result.username}".`,
        detalles: { username: result.username, outcome: 'SUCCESS' },
        nivel: 'INFO',
      }
    );

    return res.json({
      success: true,
      token: result.token,
      username: result.username,
    });
  }

  dualDbAuditManager.logPageEvent(
    {
      usuario: attemptedUser,
      rolUsuario: 'client',
      ipOrigen,
      userAgent,
    },
    {
      tipoEvento: 'LOGIN_FAILED',
      modulo: 'Autenticación',
      resumen: `Intento fallido de inicio de sesión administrativo con usuario "${attemptedUser}".`,
      detalles: { attemptedUsername: attemptedUser, outcome: 'FAILED' },
      nivel: 'WARNING',
    }
  );

  return res.status(401).json({
    success: false,
    error: result.error || 'Credenciales incorrectas.',
  });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const { actor, isAdmin } = requestContextExtractor.getActor(req);
  if (isAdmin) {
    dualDbAuditManager.logPageEvent(actor, {
      tipoEvento: 'LOGOUT',
      modulo: 'Autenticación',
      resumen: `Cierre de sesión administrativo del usuario "${actor.usuario}".`,
      detalles: { username: actor.usuario },
      nivel: 'INFO',
    });
  }
  res.json({ success: true });
});

app.get('/api/auth/session', (req: Request, res: Response) => {
  const session = adminAuthService.verifyBearerHeader(req.headers.authorization);
  if (!session) {
    return res.status(401).json({ authenticated: false });
  }
  res.json({ authenticated: true, username: session.username, role: session.role });
});

// 3. Doble Base de Datos & Triggers: Sincronización de Mutaciones (db_barberia -> db_barberia_logs)
app.post('/api/audit/sync-mutation', (req: Request, res: Response) => {
  try {
    const { action, payload, actorHint } = req.body || {};
    if (!action || typeof action !== 'string') {
      return res.status(400).json({ error: 'Acción de base de datos requerida.' });
    }

    const { actor, isAdmin } = requestContextExtractor.getActor(req, actorHint);
    if (!isAdmin && !requestContextExtractor.isPublicMutation(action)) {
      return res.status(401).json({ error: 'Autenticación administrativa requerida para esta operación.' });
    }

    const result = dualDbAuditManager.syncDatabaseMutation(
      actor,
      action,
      payload && typeof payload === 'object' ? payload : {}
    );
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/audit/sync-mutation:', error?.message || error);
    res.status(500).json({ error: 'Error al registrar mutación en db_barberia.' });
  }
});

// 4. Registro de Eventos de Página (Navegación, Chatbot, Tema, Exportación) vía Trigger en db_barberia
app.post('/api/audit/event', (req: Request, res: Response) => {
  try {
    const { tipoEvento, modulo, sucursalId, resumen, detalles, nivel, actorHint } = req.body || {};
    if (!tipoEvento || typeof tipoEvento !== 'string' || !resumen || typeof resumen !== 'string') {
      return res.status(400).json({ error: 'tipoEvento y resumen son obligatorios.' });
    }

    const { actor, isAdmin } = requestContextExtractor.getActor(req, actorHint);
    if (!requestContextExtractor.isAllowedPageEvent(tipoEvento, isAdmin)) {
      return res.status(403).json({ error: 'Tipo de evento no permitido para este contexto.' });
    }

    const safeLevel = nivel === 'WARNING' || nivel === 'CRITICAL' ? nivel : 'INFO';
    const result = dualDbAuditManager.logPageEvent(actor, {
      tipoEvento,
      modulo: typeof modulo === 'string' && modulo.trim() ? modulo.trim() : 'Navegación',
      sucursalId: typeof sucursalId === 'string' ? sucursalId : null,
      resumen: resumen.slice(0, 500),
      detalles: detalles && typeof detalles === 'object' ? detalles : null,
      nivel: safeLevel,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/audit/event:', error?.message || error);
    res.status(500).json({ error: 'Error al registrar evento en auditoría.' });
  }
});

// 5. Consulta, Resumen y Exportación de "db_barberia_logs" (Protegido por Sesión Admin)
app.get('/api/audit/logs', (req: Request, res: Response) => {
  const session = adminAuthService.verifyBearerHeader(req.headers.authorization);
  if (!session) {
    return res.status(401).json({ error: 'Acceso restringido a administradores autenticados.' });
  }

  try {
    const data = dualDbAuditManager.queryLogs({
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      modulo: typeof req.query.modulo === 'string' ? req.query.modulo : undefined,
      operacion: typeof req.query.operacion === 'string' ? req.query.operacion : undefined,
      nivel: typeof req.query.nivel === 'string' ? req.query.nivel : undefined,
      dateFrom: typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined,
      dateTo: typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined,
      limit: req.query.limit ? Number(req.query.limit) : 150,
      offset: req.query.offset ? Number(req.query.offset) : 0,
    });
    res.json(data);
  } catch (error: any) {
    console.error('Error in /api/audit/logs:', error?.message || error);
    res.status(500).json({ error: 'Error al consultar db_barberia_logs.' });
  }
});

app.get('/api/audit/summary', (req: Request, res: Response) => {
  const session = adminAuthService.verifyBearerHeader(req.headers.authorization);
  if (!session) {
    return res.status(401).json({ error: 'Acceso restringido a administradores autenticados.' });
  }

  try {
    res.json(dualDbAuditManager.getAuditSummary());
  } catch (error: any) {
    console.error('Error in /api/audit/summary:', error?.message || error);
    res.status(500).json({ error: 'Error al obtener resumen de auditoría.' });
  }
});

app.get('/api/audit/export', (req: Request, res: Response) => {
  const session = adminAuthService.verifyBearerHeader(req.headers.authorization);
  if (!session) {
    return res.status(401).json({ error: 'Acceso restringido a administradores autenticados.' });
  }

  try {
    const csv = dualDbAuditManager.exportLogsCsv({
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      modulo: typeof req.query.modulo === 'string' ? req.query.modulo : undefined,
      operacion: typeof req.query.operacion === 'string' ? req.query.operacion : undefined,
      nivel: typeof req.query.nivel === 'string' ? req.query.nivel : undefined,
      dateFrom: typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined,
      dateTo: typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined,
    });

    const { actor } = requestContextExtractor.getActor(req);
    dualDbAuditManager.logPageEvent(actor, {
      tipoEvento: 'EXPORT',
      modulo: 'Auditoría y Logs',
      resumen: `Exportación CSV de registros desde db_barberia_logs ejecutada por "${actor.usuario}".`,
      detalles: { format: 'CSV' },
      nivel: 'INFO',
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="db_barberia_logs_${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send(csv);
  } catch (error: any) {
    console.error('Error in /api/audit/export:', error?.message || error);
    res.status(500).json({ error: 'Error al exportar registros de auditoría.' });
  }
});

// 6. IA - Chatbot de Atención al Cliente y Consultas de Barbería
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { message, history, contextData } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'El mensaje de consulta es obligatorio.' });
    }

    const { actor } = requestContextExtractor.getActor(req);
    const reply = await geminiService.handleChat(
      message.trim(),
      Array.isArray(history) ? history : [],
      contextData
    );

    dualDbAuditManager.logPageEvent(actor, {
      tipoEvento: 'CHATBOT_QUERY',
      modulo: 'Chatbot IA',
      resumen: `Consulta al asistente virtual: "${message.trim().slice(0, 120)}"`,
      detalles: { pregunta: message.trim().slice(0, 240), respuestaPreview: reply.slice(0, 200) },
      nivel: 'INFO',
    });

    res.json({ reply });
  } catch (error: any) {
    console.error('Error in /api/ai/chat:', error?.message || error);
    const missingKey = !process.env.GEMINI_API_KEY;
    res.status(error?.status && Number.isInteger(error.status) ? error.status : 500).json({
      error: missingKey
        ? 'El asistente requiere configurar GEMINI_API_KEY en el servidor.'
        : 'No pudimos procesar tu consulta en este momento. Intenta nuevamente.',
      details: error?.message,
    });
  }
});

// 7. IA - Asesor de Negocio (Analiza métricas y da consejos estratégicos)
app.post('/api/ai/advise', async (req: Request, res: Response) => {
  try {
    const { metrics } = req.body;
    if (!metrics) {
      return res.status(400).json({ error: 'Faltan las métricas del negocio.' });
    }

    const advice = await geminiService.generateBusinessAdvice(metrics);
    res.json({ advice });
  } catch (error: any) {
    console.error('Error in /api/ai/advise:', error?.message || error);
    res.status(500).json({
      error: 'Error al comunicarse con Gemini AI.',
      details: error?.message,
      suggestConfig: !process.env.GEMINI_API_KEY,
    });
  }
});

// 8. IA - Predicción de Demanda de Agenda Inteligente
app.post('/api/ai/predict', async (req: Request, res: Response) => {
  try {
    const { dateStr, currentBookingsCount } = req.body;
    if (!dateStr) {
      return res.status(400).json({ error: 'Falta la fecha de análisis.' });
    }

    const prediction = await geminiService.predictDemand(dateStr, currentBookingsCount);
    res.json(prediction);
  } catch (error: any) {
    console.error('Error in /api/ai/predict:', error?.message || error);
    res.status(500).json({
      error: 'Error al calcular la predicción inteligente.',
      details: error?.message,
      suggestConfig: !process.env.GEMINI_API_KEY,
    });
  }
});

// --- VITE MIDDLEWARE CONFIGURATION ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Barbería Pro Server] Running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
  });
}

startServer();

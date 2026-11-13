/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppContextProps } from '../context/AppContext';
import { BaseEntity, ModelFactory } from '../models/DomainModels';

export type ChatSender = 'user' | 'assistant';

export interface ChatMessageData {
  id: string;
  sender: ChatSender;
  text: string;
  timestamp: string;
  isError?: boolean;
}

export interface BarbershopChatContextPayload {
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
 * Modelo OOP para cada mensaje del chatbot.
 */
export class ChatMessageModel extends BaseEntity<ChatMessageData> {
  public get sender(): ChatSender {
    return this.data.sender;
  }

  public get text(): string {
    return this.data.text;
  }

  public get timestamp(): string {
    return this.data.timestamp;
  }

  public get isError(): boolean {
    return Boolean(this.data.isError);
  }

  public isUser(): boolean {
    return this.sender === 'user';
  }

  public getSummary(): string {
    return `[${this.timestamp}] ${this.sender}: ${this.text.slice(0, 48)}`;
  }
}

/**
 * Servicio OOP encargado de construir el contexto vivo de la barbería,
 * persistir la conversación de sesión y comunicarse con /api/ai/chat.
 */
export class ChatbotService {
  private static readonly STORAGE_KEY = 'barberia_josue_chat_history_v1';

  private static readonly DAY_LABELS: Record<string, string> = {
    monday: 'Lun',
    tuesday: 'Mar',
    wednesday: 'Mié',
    thursday: 'Jue',
    friday: 'Vie',
    saturday: 'Sáb',
    sunday: 'Dom',
  };

  public readonly quickPrompts: Array<{ id: string; label: string; question: string }> = [
    {
      id: 'prices',
      label: 'Servicios y precios',
      question: '¿Qué servicios ofrecen y cuáles son sus precios actuales?',
    },
    {
      id: 'hours',
      label: 'Horarios y sucursales',
      question: '¿Cuál es el horario de atención y la dirección de la barbería?',
    },
    {
      id: 'barbers',
      label: 'Barberos disponibles',
      question: '¿Quiénes son los barberos y cuáles son sus especialidades?',
    },
    {
      id: 'products',
      label: 'Productos en tienda',
      question: '¿Qué productos para cabello o barba tienen disponibles y a qué precio?',
    },
    {
      id: 'booking',
      label: 'Reservas y pagos',
      question: '¿Cómo puedo reservar una cita, atienden sin cita previa y qué métodos de pago aceptan?',
    },
  ];

  public createWelcomeMessage(companyName: string): ChatMessageModel {
    return new ChatMessageModel({
      id: `msg-welcome-${Date.now()}`,
      sender: 'assistant',
      text: `¡Hola! Soy el asistente de **${companyName || 'Barbería "Josué"'}**. Puedo ayudarte con precios de cortes y servicios, horarios, sucursales, barberos, productos en stock o cómo reservar tu cita. ¿En qué te ayudo hoy?`,
      timestamp: this.formatCurrentTime(),
    });
  }

  public formatCurrentTime(): string {
    return new Date().toLocaleTimeString('es-BO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  public loadMessages(companyName: string): ChatMessageModel[] {
    try {
      const raw = sessionStorage.getItem(ChatbotService.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessageData[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(item => new ChatMessageModel(item));
        }
      }
    } catch {
      // Si falla la lectura, iniciar conversación limpia
    }
    return [this.createWelcomeMessage(companyName)];
  }

  public saveMessages(messages: ChatMessageModel[]): void {
    try {
      const serialized = messages.slice(-30).map(m => m.toJSON());
      sessionStorage.setItem(ChatbotService.STORAGE_KEY, JSON.stringify(serialized));
    } catch {
      // Ignorar cuotas de almacenamiento
    }
  }

  public clearMessages(companyName: string): ChatMessageModel[] {
    sessionStorage.removeItem(ChatbotService.STORAGE_KEY);
    const initial = [this.createWelcomeMessage(companyName)];
    this.saveMessages(initial);
    return initial;
  }

  public buildContextPayload(app: AppContextProps): BarbershopChatContextPayload {
    const branches = app.branches.map(b => {
      const model = ModelFactory.createBranch(b);
      const hoursEntries = Object.entries(model.openingHours || {}).map(([day, info]) => {
        const dayLabel = ChatbotService.DAY_LABELS[day] || day;
        return info?.active ? `${dayLabel} ${info.open}-${info.close}` : `${dayLabel} Cerrado`;
      });
      return {
        name: model.name,
        address: model.address,
        phone: model.phone,
        hoursSummary: hoursEntries.join(', ') || 'Lun-Sáb 09:00-20:00',
      };
    });

    const services = app.services
      .filter(s => (s.active ?? s.activo ?? true))
      .map(s => {
        const model = ModelFactory.createService(s);
        return {
          code: model.code,
          name: model.name,
          category: s.category || s.categoria || 'General',
          price: model.price,
          duration: model.duration,
          description: s.description || s.descripcion || '',
        };
      });

    const barbers = app.employees
      .filter(e => {
        const model = ModelFactory.createEmployee(e);
        return model.active && model.isBarber();
      })
      .map(e => {
        const model = ModelFactory.createEmployee(e);
        return {
          name: model.fullName,
          specialties: model.specialties,
        };
      });

    const products = app.products
      .filter(p => (p.active ?? p.activo ?? true))
      .map(p => {
        const model = ModelFactory.createProduct(p);
        return {
          name: model.name,
          category: p.category || p.categoria || 'Cuidado Personal',
          price: model.price,
          stock: model.stock,
          description: p.description || p.descripcion || '',
        };
      });

    return {
      company: {
        name: app.companyInfo.name || 'Barbería "Josué"',
        slogan: app.companyInfo.slogan || '',
        address: app.companyInfo.address || '',
        phone: app.companyInfo.phone || '',
        email: app.companyInfo.email || '',
        currencySymbol: app.companyInfo.currencySymbol || 'Bs.',
      },
      branches,
      services,
      barbers,
      products,
    };
  }

  public async sendMessage(
    userMessage: string,
    conversation: ChatMessageModel[],
    app: AppContextProps
  ): Promise<string> {
    const history = conversation
      .filter(m => !m.isError && m.id !== conversation[0]?.id)
      .slice(-10)
      .map(m => ({
        role: (m.sender === 'user' ? 'user' : 'model') as 'user' | 'model',
        text: m.text,
      }));

    const contextData = this.buildContextPayload(app);

    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: userMessage,
        history,
        contextData,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'No se pudo obtener respuesta del asistente.');
    }

    return data.reply || 'No se recibió respuesta del asistente.';
  }
}

export const chatbotService = new ChatbotService();

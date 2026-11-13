/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Clase utilitaria orientada a objetos para formateo monetario.
 */
export class CurrencyFormatter {
  public static format(amount: number): string {
    return new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: 'BOB',
    }).format(amount);
  }
}

/**
 * Clase utilitaria orientada a objetos para manipulación y formato de fechas y horas.
 */
export class DateTimeHelper {
  public static formatLegible(dateStr: string): string {
    const parts = dateStr.split('-');
    let date: Date;
    if (parts.length === 3) {
      date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    } else {
      date = new Date(dateStr);
    }

    return new Intl.DateTimeFormat('es-BO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  public static getHourStringNow(): string {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }

  public static getTodayStr(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  public static getOffsetDateStr(offsetDays: number): string {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  public static getDayNameShort(dateStr: string): string {
    const parts = dateStr.split('-');
    const date = parts.length === 3 ? new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])) : new Date(dateStr);
    const name = new Intl.DateTimeFormat('es-BO', { weekday: 'short' }).format(date);
    return name.charAt(0).toUpperCase() + name.slice(1).replace('.', '');
  }

  public static getTomorrowStr(): string {
    return DateTimeHelper.getOffsetDateStr(1);
  }

  public static getBoliviaClockString(): string {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('es-BO', {
      timeZone: 'America/La_Paz',
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    const formatted = formatter.format(now);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }
}

/**
 * Clase utilitaria para estimación de tiempos en fila de espera.
 */
export class QueueEstimator {
  private static readonly AVERAGE_SERVICE_DURATION = 35;

  public static calculateWaitTime(queueLength: number): number {
    return queueLength * QueueEstimator.AVERAGE_SERVICE_DURATION;
  }
}

/**
 * Clase generadora de identificadores únicos.
 */
export class IdGenerator {
  public static generate(prefix: string = 'id'): string {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Clase constructora de enlaces y teléfonos normalizados para WhatsApp.
 */
export class WhatsAppUrlBuilder {
  public static normalizeBoliviaPhone(phone: string): string {
    const clean = phone.replace(/[^0-9]/g, '');
    if (!clean) return '';
    return clean.startsWith('591') ? clean : `591${clean}`;
  }

  public static buildApiUrl(phone: string, text: string): string {
    const normalized = WhatsAppUrlBuilder.normalizeBoliviaPhone(phone);
    return `https://api.whatsapp.com/send?phone=${normalized}&text=${encodeURIComponent(text)}`;
  }

  public static buildWaMeUrl(phone: string, text: string): string {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const normalized = cleanPhone.length <= 8 ? `591${cleanPhone}` : cleanPhone;
    return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
  }
}

// Exportaciones de compatibilidad delegadas a los métodos estáticos de las clases
export const formatCurrency = CurrencyFormatter.format;
export const formatDateLegible = DateTimeHelper.formatLegible;
export const getHourStringNow = DateTimeHelper.getHourStringNow;
export const calculateWaitTime = QueueEstimator.calculateWaitTime;
export const getTodayStr = DateTimeHelper.getTodayStr;
export const getOffsetDateStr = DateTimeHelper.getOffsetDateStr;
export const getDayNameShort = DateTimeHelper.getDayNameShort;
export const generateUID = IdGenerator.generate;

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Formatea un número como moneda boliviana (BOB).
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
  }).format(amount);
}

/**
 * Convierte un formato ISO o string de fecha a una versión legible (e.g., "Jueves, 2 de Julio").
 */
export function formatDateLegible(dateStr: string): string {
  const parts = dateStr.split('-');
  let date: Date;
  if (parts.length === 3) {
    // Evitar desfases de zona horaria interpretando como hora local inicial
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

/**
 * Retorna la hora actual en string formato "HH:MM".
 */
export function getHourStringNow(): string {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

/**
 * Calcula el tiempo estimado de espera para un turno en la lista basándose en el promedio de duración de servicios pendientes.
 */
export function calculateWaitTime(queueLength: number): number {
  const AVERAGE_SERVICE_DURATION = 35; // promedio de minutos por corte
  return queueLength * AVERAGE_SERVICE_DURATION;
}

/**
 * Retorna la fecha de hoy en formato YYYY-MM-DD según la hora local.
 */
export function getTodayStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Retorna una fecha relativa a hoy sumando o restando días (ej. -1 para ayer, +1 para mañana).
 */
export function getOffsetDateStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Retorna el nombre corto del día en español para un string YYYY-MM-DD.
 */
export function getDayNameShort(dateStr: string): string {
  const parts = dateStr.split('-');
  const date = parts.length === 3 ? new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])) : new Date(dateStr);
  const name = new Intl.DateTimeFormat('es-BO', { weekday: 'short' }).format(date);
  return name.charAt(0).toUpperCase() + name.slice(1).replace('.', '');
}

/**
 * Helper para generar IDs únicos sencillos.
 */
export function generateUID(prefix: string = 'id'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

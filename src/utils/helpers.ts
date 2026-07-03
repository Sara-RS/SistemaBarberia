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
 * Helper para generar IDs únicos sencillos.
 */
export function generateUID(prefix: string = 'id'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

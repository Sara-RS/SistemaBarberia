/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { mockDb } from '../db/mockDb';
import { Appointment } from '../types';

/**
 * Convierte un string de hora "HH:MM" a minutos desde la medianoche para facilitar comparaciones matemáticas.
 */
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convierte minutos desde la medianoche a un string con formato "HH:MM".
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export interface TimeSlot {
  time: string; // "HH:MM"
  available: boolean;
  reason?: string;
}

export const scheduleEngine = {
  /**
   * Calcula los intervalos de horarios disponibles reales para un barbero, servicio, fecha y sucursal.
   */
  getAvailableSlots(
    branchId: string,
    employeeId: string,
    serviceId: string,
    dateStr: string // "YYYY-MM-DD"
  ): TimeSlot[] {
    const branch = mockDb.getBranches().find(b => b.id === branchId);
    const employee = mockDb.getEmployees().find(e => e.id === employeeId);
    const service = mockDb.getServices().find(s => s.id === serviceId);

    if (!branch || !employee || !service || !employee.active) {
      return [];
    }

    // 1. Obtener día de la semana en inglés (minúsculas)
    const dateObj = new Date(dateStr + 'T00:00:00'); // Evitar problemas de zona horaria
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = daysOfWeek[dateObj.getDay()];

    // 2. Verificar si la sucursal abre este día
    const branchHours = branch.openingHours[dayName];
    if (!branchHours || !branchHours.active) {
      return [];
    }

    // 3. Verificar si el barbero trabaja este día
    const employeeSchedule = employee.schedule[dayName];
    if (!employeeSchedule || !employeeSchedule.active) {
      return [];
    }

    // 4. Verificar si el barbero está en vacaciones
    const isOnVacation = employee.vacations.some(v => {
      return dateStr >= v.start && dateStr <= v.end;
    });
    if (isOnVacation) {
      return [];
    }

    // Rango de horas operacionales cruzadas (intersección sucursal y barbero)
    const branchStartMin = timeToMinutes(branchHours.open);
    const branchEndMin = timeToMinutes(branchHours.close);

    const empStartMin = timeToMinutes(employeeSchedule.start);
    const empEndMin = timeToMinutes(employeeSchedule.end);

    const startWorkMin = Math.max(branchStartMin, empStartMin);
    const endWorkMin = Math.min(branchEndMin, empEndMin);

    if (startWorkMin >= endWorkMin) {
      return []; // No hay solapamiento de horarios
    }

    // 5. Cargar citas existentes del barbero para este día (excepto canceladas)
    const activeAppointments = mockDb.getAppointments(branchId, dateStr)
      .filter(apt => apt.employeeId === employeeId && apt.status !== 'cancelled');

    // 6. Configurar parámetros del servicio solicitado
    const serviceDuration = service.duration;
    const serviceCleanup = service.cleanupTime;
    const totalDurationRequired = serviceDuration + serviceCleanup; // tiempo total bloqueado

    const slots: TimeSlot[] = [];
    const intervalMinutes = 30; // Mostrar slots cada 30 minutos

    // Generar candidatos de slots de tiempo
    for (let currentMin = startWorkMin; currentMin + serviceDuration <= endWorkMin; currentMin += intervalMinutes) {
      const slotStartTimeStr = minutesToTime(currentMin);
      const slotEndTimeStr = minutesToTime(currentMin + serviceDuration);
      
      const slotStartMin = currentMin;
      const slotEndMin = currentMin + serviceDuration;

      let isAvailable = true;
      let reason = '';

      // A. Verificar descansos personales del barbero (e.g. Almuerzo)
      const isDuringBreak = employeeSchedule.breaks.some(brk => {
        const breakStart = timeToMinutes(brk.start);
        const breakEnd = timeToMinutes(brk.end);
        // Hay solapamiento si el slot inicia o termina dentro del descanso o lo cubre por completo
        return (slotStartMin < breakEnd && slotEndMin > breakStart);
      });

      if (isDuringBreak) {
        isAvailable = false;
        reason = 'Horario de descanso del barbero';
      }

      // B. Verificar solapamiento con citas agendadas
      if (isAvailable) {
        for (const apt of activeAppointments) {
          const aptStartMin = timeToMinutes(apt.startTime);
          // Tomar en cuenta el cleanup time de los servicios ya agendados para evitar solapamientos
          const bookedService = mockDb.getServices().find(s => s.id === apt.serviceId);
          const aptCleanup = bookedService ? bookedService.cleanupTime : 10;
          const aptEndMinWithCleanup = timeToMinutes(apt.endTime) + aptCleanup;

          // Solapamiento real incluyendo tiempos de limpieza cruzados
          if (slotStartMin < aptEndMinWithCleanup && slotEndMin + serviceCleanup > aptStartMin) {
            isAvailable = false;
            reason = 'Bloqueado por otra cita (incluye tiempo de limpieza)';
            break;
          }
        }
      }

      // C. Verificar si el slot es en el pasado (solo aplica para hoy)
      const todayStr = new Date().toISOString().split('T')[0];
      if (isAvailable && dateStr === todayStr) {
        const now = new Date();
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();
        const nowInMinutes = currentHours * 60 + currentMinutes;

        if (slotStartMin <= nowInMinutes) {
          isAvailable = false;
          reason = 'Horario ya transcurrido';
        }
      }

      slots.push({
        time: slotStartTimeStr,
        available: isAvailable,
        reason: isAvailable ? undefined : reason,
      });
    }

    return slots;
  }
};

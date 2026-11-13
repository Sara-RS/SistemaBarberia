/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { mockDb, MockDatabase } from '../db/mockDb';
import { DateTimeHelper } from '../utils/helpers';

export interface TimeSlot {
  time: string; // "HH:MM"
  available: boolean;
  reason?: string;
}

/**
 * Motor de disponibilidad y cálculo de horarios basado en Programación Orientada a Objetos.
 * Recibe la instancia de base de datos por inyección de dependencias.
 */
export class ScheduleEngine {
  private readonly db: MockDatabase;
  private readonly intervalMinutes: number = 30;

  constructor(db: MockDatabase) {
    this.db = db;
  }

  public timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  public minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  public getAvailableSlots(
    branchId: string,
    employeeId: string,
    serviceId: string,
    dateStr: string
  ): TimeSlot[] {
    const branch = this.db.getBranches().find(b => b.id === branchId);
    const employee = this.db.getEmployees().find(e => e.id === employeeId);
    const service = this.db.getServices().find(s => s.id === serviceId);

    if (!branch || !employee || !service || !employee.active) {
      return [];
    }

    const dateObj = new Date(dateStr + 'T00:00:00');
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = daysOfWeek[dateObj.getDay()];

    const branchHours = branch.openingHours?.[dayName];
    if (!branchHours || !branchHours.active) {
      return [];
    }

    const employeeSchedule = employee.schedule?.[dayName];
    if (!employeeSchedule || !employeeSchedule.active) {
      return [];
    }

    const isOnVacation = (employee.vacations || []).some(v => dateStr >= v.start && dateStr <= v.end);
    if (isOnVacation) {
      return [];
    }

    const branchStartMin = this.timeToMinutes(branchHours.open);
    const branchEndMin = this.timeToMinutes(branchHours.close);
    const empStartMin = this.timeToMinutes(employeeSchedule.start);
    const empEndMin = this.timeToMinutes(employeeSchedule.end);

    const startWorkMin = Math.max(branchStartMin, empStartMin);
    const endWorkMin = Math.min(branchEndMin, empEndMin);

    if (startWorkMin >= endWorkMin) {
      return [];
    }

    const activeAppointments = this.db
      .getAppointments(branchId, dateStr)
      .filter(apt => apt.employeeId === employeeId && apt.status !== 'cancelled');

    const serviceDuration = service.duration || 30;
    const serviceCleanup = service.cleanupTime || 0;
    const slots: TimeSlot[] = [];
    const todayStr = DateTimeHelper.getTodayStr();

    for (let currentMin = startWorkMin; currentMin + serviceDuration <= endWorkMin; currentMin += this.intervalMinutes) {
      const slotStartTimeStr = this.minutesToTime(currentMin);
      const slotStartMin = currentMin;
      const slotEndMin = currentMin + serviceDuration;

      let isAvailable = true;
      let reason = '';

      const isDuringBreak = (employeeSchedule.breaks || []).some(brk => {
        const breakStart = this.timeToMinutes(brk.start);
        const breakEnd = this.timeToMinutes(brk.end);
        return slotStartMin < breakEnd && slotEndMin > breakStart;
      });

      if (isDuringBreak) {
        isAvailable = false;
        reason = 'Horario de descanso del barbero';
      }

      if (isAvailable) {
        for (const apt of activeAppointments) {
          const aptStartMin = this.timeToMinutes(apt.startTime || '09:00');
          const bookedService = this.db.getServices().find(s => s.id === apt.serviceId);
          const aptCleanup = bookedService ? bookedService.cleanupTime || 0 : 10;
          const aptEndMinWithCleanup = this.timeToMinutes(apt.endTime || '09:30') + aptCleanup;

          if (slotStartMin < aptEndMinWithCleanup && slotEndMin + serviceCleanup > aptStartMin) {
            isAvailable = false;
            reason = 'Bloqueado por otra cita (incluye tiempo de limpieza)';
            break;
          }
        }
      }

      if (isAvailable && dateStr === todayStr) {
        const now = new Date();
        const nowInMinutes = now.getHours() * 60 + now.getMinutes();

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
}

export const scheduleEngine = new ScheduleEngine(mockDb);

export const timeToMinutes = (timeStr: string): number => scheduleEngine.timeToMinutes(timeStr);
export const minutesToTime = (minutes: number): string => scheduleEngine.minutesToTime(minutes);

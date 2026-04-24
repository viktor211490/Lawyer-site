import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, computed, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';
import { formatMoscowTimeHM, getMoscowDateKey } from '../../../utils/moscow-time';
import { AppointmentsClient, AppointmentResponseDto, CreateAppointmentDto, WorkingHoursClient } from '../../../services/client/web-api-client';

export interface RescheduleDialogData {
  appointment: AppointmentResponseDto;
  anchorDate?: Date;
}

@Component({
  selector: 'app-reschedule-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatStepperModule
  ],
  templateUrl: './reschedule-dialog.component.html',
  styleUrl: './reschedule-dialog.component.scss'
})
export class RescheduleDialogComponent implements OnInit {
  days = signal<any[]>([]);
  selectedSlotIso = signal<string | null>(null);
  isSaving = signal(false);
  error = signal<string>('');

  canContinue = computed(() => !!this.selectedSlotIso());
  private breakMinutes = signal<number>(15);

  constructor(
    private appointmentService: AppointmentsClient,
    private workingHoursService: WorkingHoursClient,
    private dialogRef: MatDialogRef<RescheduleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RescheduleDialogData
  ) {}

  ngOnInit(): void {
    const current = this.data.appointment.appointmentTime as any;
    const currentIso = current instanceof Date ? current.toISOString() : (typeof current === 'string' ? current : null);
    this.selectedSlotIso.set(currentIso);

    const anchor = this.data.anchorDate ?? (currentIso ? new Date(currentIso) : new Date());

    this.workingHoursService.getWeek().subscribe({
      next: (week) => {
        const anyDay = week.find(w => w.breakBetweenSlotsMinutes !== undefined);
        if (anyDay?.breakBetweenSlotsMinutes !== undefined) {
          this.breakMinutes.set(anyDay.breakBetweenSlotsMinutes);
        }
        this.loadSlots(anchor, 7, this.data.appointment.serviceId ?? undefined);
      },
      error: () => {
        this.loadSlots(anchor, 7, this.data.appointment.serviceId ?? undefined);
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  formatTime(dateIso: string): string {
    return formatMoscowTimeHM(dateIso);
  }

  formatDayLabel(date: Date): string {
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow',
      weekday: 'short',
      day: '2-digit',
      month: '2-digit'
    }).format(date);
  }

  private getMoscowDateKey(d: Date): string {
    return getMoscowDateKey(d);
  }

  private getMoscowNoon(date: Date): Date {
    const key = this.getMoscowDateKey(date);
    return new Date(`${key}T12:00:00+03:00`);
  }

  loadSlots(anchor: Date, daysToLoad: number, serviceId?: number): void {
    const startDate = this.getMoscowNoon(anchor);
    this.appointmentService.getAvailableSlots(startDate, daysToLoad, serviceId).subscribe({
      next: (allSlots: any[]) => {
        const days: any[] = [];
        for (let i = 0; i < daysToLoad; i++) {
          const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
          const dateKey = this.getMoscowDateKey(date);
          days.push({ dateKey, dayLabel: this.formatDayLabel(date), slots: [] as any[] });
        }

        allSlots.forEach((slot: any) => {
          const slotDate = new Date(slot.time);
          const dateKey = this.getMoscowDateKey(slotDate);
          const day = days.find(d => d.dateKey === dateKey);
          if (!day) return;
          day.slots.push(slot);
        });

        days.forEach(d => d.slots.sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime()));

        this.applyServiceFitRules(days);

        this.days.set(days);
        this.applyReservedHighlights();
      },
      error: (err) => {
        console.error('Error loading reschedule slots:', err);
        this.days.set([]);
        this.error.set('Не удалось загрузить слоты для переноса.');
      }
    });
  }

  selectSlot(slot: any): void {
    if (!slot?.isAvailable) return;
    this.selectedSlotIso.set(slot.time);
    this.applyReservedHighlights();
  }

  private applyServiceFitRules(days: any[]): void {
    // Disable start slots that cannot fit appointment duration (+break) contiguously.
    const serviceDuration = this.data.appointment.durationMinutes ?? 60;
    const neededDuration = serviceDuration + this.breakMinutes();

    days.forEach(d => {
      const slots = d.slots;
      for (let idx = 0; idx < slots.length; idx++) {
        const slot = slots[idx];
        if (!slot.isAvailable) continue;

        const slotDuration = slot.durationMinutes || 30;
        const slotsNeeded = Math.ceil(neededDuration / slotDuration);

        let contiguous = 0;
        for (let j = idx; j < slots.length && contiguous < slotsNeeded; j++) {
          if (slots[j].isAvailable) contiguous++;
          else break;
        }

        if (contiguous < slotsNeeded) {
          slot.isAvailable = false;
          slot.isUnavailableDueToService = true;
        }
      }
    });
  }

  private applyReservedHighlights(): void {
    const selectedIso = this.selectedSlotIso();
    const days = this.days();

    // clear previous
    days.forEach(d => d.slots?.forEach((s: any) => { s.isReservedForSelected = false; }));

    if (!selectedIso) {
      this.days.set([...days]);
      return;
    }

    const serviceDuration = this.data.appointment.durationMinutes ?? 60;
    const neededDuration = serviceDuration + this.breakMinutes();

    const day = days.find(d => d.slots?.some((s: any) => s.time === selectedIso));
    if (!day) {
      this.days.set([...days]);
      return;
    }

    const idx = day.slots.findIndex((s: any) => s.time === selectedIso);
    if (idx < 0) {
      this.days.set([...days]);
      return;
    }

    const slotDuration = day.slots[idx]?.durationMinutes || 30;
    const slotsNeeded = Math.ceil(neededDuration / slotDuration);

    for (let i = idx; i < idx + slotsNeeded && i < day.slots.length; i++) {
      day.slots[i].isReservedForSelected = true;
    }

    // trigger change detection
    this.days.set([...days]);
  }

  getSlotTitle(slot: any): string {
    if (slot?.isReservedForSelected && this.selectedSlotIso() !== slot.time) {
      return 'Будет занято выбранной услугой';
    }
    if (slot?.isUnavailableDueToService) {
      return 'Недостаточно времени для выбранной услуги';
    }
    if (!slot?.isAvailable) {
      return 'Недоступно';
    }
    return '';
  }

  getServiceTitle(): string {
    return (this.data.appointment.serviceTitle ?? '').toString();
  }

  getServiceDuration(): number {
    return this.data.appointment.durationMinutes ?? 0;
  }

  getBreakMinutes(): number {
    return this.breakMinutes();
  }

  getTotalMinutes(): number {
    return this.getServiceDuration() + this.getBreakMinutes();
  }

  getSelectedRangeLabel(): string {
    const slotIso = this.selectedSlotIso();
    if (!slotIso) return '—';
    const start = new Date(slotIso);
    const end = new Date(start.getTime() + (this.data.appointment.durationMinutes ?? 60) * 60 * 1000);
    return `${this.formatTime(start.toISOString())}–${this.formatTime(end.toISOString())}`;
  }

  getSelectedRangeLabelWithBreak(): string {
    const slotIso = this.selectedSlotIso();
    if (!slotIso) return '—';
    const start = new Date(slotIso);
    const end = new Date(start.getTime() + this.getTotalMinutes() * 60 * 1000);
    return `${this.formatTime(start.toISOString())}–${this.formatTime(end.toISOString())}`;
  }

  currentTimeLabel(): string {
    const iso = this.data.appointment.appointmentTime as any;
    const date = new Date(iso);
    const datePart = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
    const timePart = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
    return `${datePart} ${timePart}`;
  }

  confirm(): void {
    const slotIso = this.selectedSlotIso();
    const apt = this.data.appointment;
    if (!slotIso) return;

    this.isSaving.set(true);
    this.error.set('');

    const dto: CreateAppointmentDto = {
      appointmentTime: new Date(slotIso),
      clientName: apt.clientName!,
      clientEmail: apt.clientEmail!,
      clientPhone: apt.clientPhone!,
      serviceId: apt.serviceId || undefined,
      notes: apt.notes
    };

    this.appointmentService.create(dto).subscribe({
      next: () => {
        this.appointmentService.delete(apt.id!).subscribe({
          next: () => {
            this.isSaving.set(false);
            this.dialogRef.close(true);
          },
          error: (err) => {
            console.error('Error deleting old appointment:', err);
            this.isSaving.set(false);
            this.error.set('Не удалось удалить старую запись после переноса.');
          }
        });
      },
      error: (err) => {
        console.error('Error creating new appointment:', err);
        this.isSaving.set(false);
        this.error.set('Ошибка при переносе. Возможно, выбранное время уже занято.');
      }
    });
  }
}


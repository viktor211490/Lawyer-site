import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, computed, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { formatMoscowTimeHM, getMoscowDateKey } from '../../../utils/moscow-time';
import { AppointmentsClient, BlockedSlotsClient, CreateAppointmentDto, WorkingHoursClient } from '../../../services/client/web-api-client';

export interface QuickBookingDialogData {
  initialDate: Date;
}

@Component({
  selector: 'app-quick-booking-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatCheckboxModule
  ],
  templateUrl: './quick-booking-dialog.component.html',
  styleUrl: './quick-booking-dialog.component.scss'
})
export class QuickBookingDialogComponent implements OnInit {
  isSaving = false;
  error = '';
  days = signal<any[]>([]);
  selectedSlotIso = signal<string | null>(null);
  isLoadingSlots = signal<boolean>(false);
  selectedDate = signal<Date>(new Date());
  currentMonth = signal<Date>(new Date());
  monthDays = signal<any[]>([]);
  isWorkingDay = signal<boolean>(true);
  allowOnNonWorking = signal<boolean>(false);
  private weekMap = signal<Map<number, any>>(new Map());
  private breakMinutes = signal<number>(15);

  canPickSlots = computed(() => this.isWorkingDay() || this.allowOnNonWorking());
  selectedDateKey = computed(() => this.getMoscowDateKey(this.selectedDate()));

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private appointmentService: AppointmentsClient,
    private blockedSlotsService: BlockedSlotsClient,
    private workingHoursService: WorkingHoursClient,
    private dialogRef: MatDialogRef<QuickBookingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: QuickBookingDialogData
  ) {
    this.form = this.fb.group({
      slotIso: ['', Validators.required],
      clientName: ['', Validators.required],
      clientPhone: ['', Validators.required],
      clientEmail: [''],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.selectedDate.set(this.data.initialDate);
    this.currentMonth.set(this.getMoscowNoon(this.data.initialDate));

    // Load week settings once (slot duration, break, working day flags)
    this.workingHoursService.getWeek().subscribe({
      next: (week) => {
        const map = new Map<number, any>();
        week.forEach(w => map.set(w.dayOfWeekNum!, w));
        this.weekMap.set(map);
        const anyDay = week.find(w => w.breakBetweenSlotsMinutes !== undefined);
        if (anyDay?.breakBetweenSlotsMinutes !== undefined) this.breakMinutes.set(anyDay.breakBetweenSlotsMinutes);
        this.generateMonthGrid();
        this.refreshForDate(this.data.initialDate);
      },
      error: () => {
        this.generateMonthGrid();
        this.refreshForDate(this.data.initialDate);
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

  getMoscowDateKey(d: Date): string {
    return getMoscowDateKey(d);
  }

  private getMoscowNoon(date: Date): Date {
    const key = this.getMoscowDateKey(date);
    return new Date(`${key}T12:00:00+03:00`);
  }

  loadSlots(anchor: Date, daysToLoad: number): void {
    this.isLoadingSlots.set(true);
    const startDate = this.getMoscowNoon(anchor);

    this.appointmentService.getAvailableSlots(startDate, daysToLoad, undefined).subscribe({
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
        this.days.set(days);
        this.isLoadingSlots.set(false);
      },
      error: (err) => {
        console.error('Error loading slots:', err);
        this.days.set([]);
        this.isLoadingSlots.set(false);
        this.error = 'Не удалось загрузить слоты. Попробуйте позже.';
      }
    });
  }

  previousMonth(): void {
    const d = new Date(this.currentMonth());
    d.setMonth(d.getMonth() - 1);
    this.currentMonth.set(this.getMoscowNoon(d));
    this.generateMonthGrid();
  }

  nextMonth(): void {
    const d = new Date(this.currentMonth());
    d.setMonth(d.getMonth() + 1);
    this.currentMonth.set(this.getMoscowNoon(d));
    this.generateMonthGrid();
  }

  currentMonthLabel(): string {
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow',
      month: 'long',
      year: 'numeric'
    }).format(this.currentMonth());
  }

  selectDay(dateKey: string): void {
    const date = new Date(`${dateKey}T12:00:00+03:00`);
    this.selectedDate.set(date);
    this.generateMonthGrid();
    this.selectedSlotIso.set(null);
    this.form.patchValue({ slotIso: '' }, { emitEvent: false });
    this.form.updateValueAndValidity({ emitEvent: false });
    this.allowOnNonWorking.set(false);
    this.refreshForDate(date);
  }

  toggleAllowOnNonWorking(checked: boolean): void {
    this.allowOnNonWorking.set(checked);
    this.selectedSlotIso.set(null);
    this.form.patchValue({ slotIso: '' }, { emitEvent: false });
    this.form.updateValueAndValidity({ emitEvent: false });
    this.refreshForDate(this.selectedDate());
  }

  private refreshForDate(date: Date): void {
    const dow = this.getDow(date); // 1..7
    const wh = this.weekMap().get(dow);
    const isWorking = wh?.isWorkingDay ?? true;
    this.isWorkingDay.set(isWorking);

    if (isWorking) {
      // Standard: ask backend for available slots for this day
      this.loadSlots(date, 1);
      return;
    }

    // Non-working: only allow if admin explicitly enables it.
    if (!this.allowOnNonWorking()) {
      this.days.set([{
        dateKey: this.getMoscowDateKey(date),
        dayLabel: this.formatDayLabel(date),
        slots: []
      }]);
      return;
    }

    this.generateNonWorkingSlots(date);
  }

  private generateNonWorkingSlots(date: Date): void {
    this.isLoadingSlots.set(true);
    const dateKey = this.getMoscowDateKey(date);
    const dow = this.getDow(date);
    const wh = this.weekMap().get(dow);

    // Fallback defaults
    const startHour = wh?.startHour ?? 10;
    const startMinute = wh?.startMinute ?? 0;
    const endHour = wh?.endHour ?? 19;
    const endMinute = wh?.endMinute ?? 0;
    const slotDuration = wh?.slotDurationMinutes ?? 30;

    // Fetch day details to avoid conflicts with appointments/blocks
    const dateStr = dateKey; // yyyy-MM-dd expected by getDayDetails
    this.blockedSlotsService.getDayDetails(dateStr).subscribe({
      next: (details: any) => {
        const appts = details.appointments ?? [];
        const blocks = details.blockedSlots ?? [];

        const busyRanges: Array<{ start: Date; end: Date }> = [];
        appts.forEach((a: any) => {
          const start = new Date(a.appointmentTime);
          const dur = a.durationMinutes ?? 60;
          busyRanges.push({ start, end: new Date(start.getTime() + dur * 60 * 1000) });
        });
        blocks.forEach((b: any) => {
          if (b.isFullDay) {
            const dayStart = new Date(`${dateKey}T00:00:00+03:00`);
            busyRanges.push({ start: dayStart, end: new Date(dayStart.getTime() + 24 * 60 * 60 * 1000) });
            return;
          }
          const start = new Date(b.dateTime);
          const dur = (b.durationHours ?? 0) * 60 + (b.durationMinutes ?? 0);
          busyRanges.push({ start, end: new Date(start.getTime() + dur * 60 * 1000) });
        });

        const start = new Date(`${dateKey}T${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00+03:00`);
        const end = new Date(`${dateKey}T${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00+03:00`);

        const slots: any[] = [];
        for (let t = start.getTime(); t + slotDuration * 60 * 1000 <= end.getTime(); t += slotDuration * 60 * 1000) {
          const slotStart = new Date(t);
          const slotEnd = new Date(t + slotDuration * 60 * 1000);
          const overlaps = busyRanges.some(r => slotStart < r.end && slotEnd > r.start);
          slots.push({
            time: slotStart.toISOString(),
            isAvailable: !overlaps,
            durationMinutes: slotDuration,
            status: overlaps ? 'Busy' : 'Free'
          });
        }

        this.days.set([{ dateKey, dayLabel: this.formatDayLabel(date), slots }]);
        this.isLoadingSlots.set(false);
      },
      error: (err) => {
        console.error('Error loading day details:', err);
        this.error = 'Не удалось загрузить занятость дня для проверки.';
        this.days.set([{ dateKey, dayLabel: this.formatDayLabel(date), slots: [] }]);
        this.isLoadingSlots.set(false);
      }
    });
  }

  selectSlot(slot: any): void {
    if (!slot?.isAvailable) return;
    this.selectedSlotIso.set(slot.time);
    this.form.patchValue({ slotIso: slot.time }, { emitEvent: false });
    this.form.updateValueAndValidity({ emitEvent: false });
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const v = this.form.getRawValue();
    const slotIso = v.slotIso as string;
    const appointmentTime = new Date(slotIso);

    const dto: CreateAppointmentDto = {
      appointmentTime,
      clientName: v.clientName!,
      clientPhone: v.clientPhone!,
      clientEmail: v.clientEmail || '',
      serviceId: undefined,
      notes: this.decorateNotesForNonWorking(v.notes || '')
    };

    this.isSaving = true;
    this.error = '';
    this.appointmentService.create(dto).subscribe({
      next: () => {
        this.isSaving = false;
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error('Error creating appointment:', err);
        this.isSaving = false;
        this.error = 'Ошибка при записи. Возможно, время уже занято.';
      }
    });
  }

  private decorateNotesForNonWorking(notes: string): string {
    if (this.isWorkingDay()) return notes;
    if (!this.allowOnNonWorking()) return notes;

    const tag = '⚠️ Клиент записан на запланированный выходной (назначено адвокатом).';
    if (notes.includes(tag)) return notes;
    return notes ? `${notes}\n\n${tag}` : tag;
  }

  private getDow(date: Date): number {
    let d = date.getDay();
    if (d === 0) d = 7;
    return d;
  }

  private generateMonthGrid(): void {
    const anchor = this.getMoscowNoon(this.currentMonth());
    const monthStartKey = this.getMoscowDateKey(anchor);
    const monthStart = new Date(`${monthStartKey}T12:00:00+03:00`);
    monthStart.setDate(1);

    const firstKey = this.getMoscowDateKey(monthStart);
    const firstDate = new Date(`${firstKey}T12:00:00+03:00`);

    const monthToken = firstKey.slice(0, 7);
    const monthEnd = new Date(firstDate);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);

    // Monday-based grid start
    const dow = firstDate.getDay(); // 0..6
    const dowMon = dow === 0 ? 7 : dow; // 1..7
    const offset = dowMon - 1;
    const gridStart = new Date(firstDate.getTime() - offset * 24 * 60 * 60 * 1000);
    const cellCount = Math.ceil((offset + monthEnd.getDate()) / 7) * 7;

    const selectedKey = this.getMoscowDateKey(this.selectedDate());
    const todayKey = this.getMoscowDateKey(new Date());

    const days: any[] = [];
    for (let i = 0; i < cellCount; i++) {
      const d = new Date(gridStart.getTime() + i * 24 * 60 * 60 * 1000);
      const key = this.getMoscowDateKey(d);
      const inMonth = key.startsWith(monthToken);

      const dowNum = this.getDow(d);
      const wh = this.weekMap().get(dowNum);
      const nonWorking = wh ? !wh.isWorkingDay : false;

      days.push({
        dateKey: key,
        dayOfMonth: new Date(`${key}T12:00:00+03:00`).getDate(),
        isOutsideMonth: !inMonth,
        isToday: key === todayKey,
        isSelected: key === selectedKey,
        isNonWorking: nonWorking
      });
    }

    this.monthDays.set(days);
  }
}


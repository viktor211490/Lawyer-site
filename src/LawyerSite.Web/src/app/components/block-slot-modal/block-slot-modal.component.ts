import { Component, Input, Output, EventEmitter, signal, OnInit, effect } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { BlockedSlotsClient, CreateBlockedSlotDto, AppointmentsClient, WorkingHoursClient } from '../../services/client/web-api-client';

interface SlotWithAvailability {
  time: string;
  isAvailable: boolean;
  status: string;
  durationMinutes: number;
  isBlocked?: boolean;
}

interface CalendarDay {
  date: string;
  dayName: string;
  dayNumber: string;
  isToday: boolean;
  isWorkingDay: boolean;
  slots: SlotWithAvailability[];
}

@Component({
  selector: 'app-block-slot-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './block-slot-modal.component.html',
  styleUrl: './block-slot-modal.component.scss'
})
export class BlockSlotModalComponent implements OnInit {
  @Input() visible = signal(false);
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  @Input() set slotData(data: { dateTime?: string; date?: Date } | null) {
    if (!data) {
      return;
    }
    if (data.date) {
      this.currentDate = new Date(data.date);
      // Сбрасываем флаг инициализации чтобы загрузить слоты для новой даты
      this.isInitialized = false;
    }
    this.isEditMode = false;
  }

  formData = {
    dateTime: '',
    durationHours: 1,
    durationMinutes: 30,
    reason: 'Personal',
    comment: '',
    isFullDay: false
  };

  durationMode: 'minutes' | 'hours' = 'minutes';
  isEditMode = false;
  showComment = signal(false);
  isInitialized = false;

  // Сигналы для календаря и слотов
  currentDate = new Date();
  calendarDays = signal<CalendarDay[]>([]);
  filteredDays = signal<CalendarDay[]>([]);
  workingHoursMap = signal<Map<number, any>>(new Map());
  selectedDate = signal<string | null>(null);
  selectedSlots = signal<string[]>([]);

  constructor(
    private blockService: BlockedSlotsClient,
    private appointmentService: AppointmentsClient,
    private workingHoursService: WorkingHoursClient
  ) {
    // Отслеживаем изменения visible для загрузки слотов
    effect(() => {
      if (this.visible() && !this.isInitialized) {
        this.loadSlots();
        this.isInitialized = true;
      }
    });
  }

  ngOnInit(): void {
    // Инициализация не требуется, используем effect
  }

  // Загрузка слотов при открытии модального окна
  loadSlots(): void {
    const daysToLoad = 14;
    const startDate = new Date(this.currentDate);

    this.workingHoursService.getWeek().subscribe({
      next: (workingHours) => {
        const workingHoursMap = new Map<number, any>();
        workingHours.forEach(wh => {
          workingHoursMap.set(wh.dayOfWeekNum!, wh);
        });
        this.workingHoursMap.set(workingHoursMap);

        const days: CalendarDay[] = [];
        for (let i = 0; i < daysToLoad; i++) {
          const date = new Date(startDate);
          date.setDate(date.getDate() + i);

          let dayOfWeek = date.getDay();
          if (dayOfWeek === 0) dayOfWeek = 7;

          const workingHour = workingHoursMap.get(dayOfWeek);
          const isWorkingDay = workingHour?.isWorkingDay ?? false;

          const dateStr = date.toISOString().split('T')[0];
          days.push({
            date: dateStr,
            dayName: format(date, 'EEEE', { locale: ru }),
            dayNumber: format(date, 'd MMMM', { locale: ru }),
            isToday: date.toDateString() === new Date().toDateString(),
            isWorkingDay: isWorkingDay,
            slots: []
          });
        }

        // Загружаем все слоты
        this.appointmentService.getAvailableSlots(startDate, daysToLoad, null).subscribe({
          next: (allSlots) => {
            allSlots.forEach((slot: any) => {
              const slotDate = new Date(slot.time);
              const dateStr = slotDate.toISOString().split('T')[0];
              const day = days.find(d => d.date === dateStr);

              if (day && day.isWorkingDay) {
                day.slots.push({
                  time: slot.time,
                  isAvailable: slot.isAvailable,
                  status: slot.status,
                  durationMinutes: slot.durationMinutes,
                  isBlocked: !slot.isAvailable
                });
              }
            });

            // Сортируем слоты по времени
            days.forEach(day => {
              day.slots.sort((a, b) =>
                new Date(a.time).getTime() - new Date(b.time).getTime()
              );
            });

            this.calendarDays.set(days);
            this.filteredDays.set(days);
          },
          error: (err) => {
            console.error('Error loading slots:', err);
            this.calendarDays.set(days);
            this.filteredDays.set(days);
          }
        });
      },
      error: (err) => {
        console.error('Error loading working hours:', err);
      }
    });
  }

  getSlotTime(time: string): string {
    const date = new Date(time);
    const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
    const moscowTime = new Date(utcTime);
    return format(moscowTime, 'HH:mm');
  }

  getSlotDateTime(time: string): Date {
    const date = new Date(time);
    const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
    return new Date(utcTime);
  }

  getSlotTitle(slot: SlotWithAvailability): string {
    if (slot.isBlocked) {
      return 'Заблокировано';
    }
    if (!slot.isAvailable) {
      return 'Недоступно';
    }
    if (this.isSlotSelected(slot.time)) {
      return 'Нажмите для отмены выбора';
    }
    return 'Нажмите для выбора';
  }

  isSlotSelected(slotTime: string): boolean {
    return this.selectedSlots().includes(slotTime);
  }

  selectSlot(slot: SlotWithAvailability): void {
    if (!slot.isAvailable && !this.isSlotSelected(slot.time)) {
      return;
    }

    const currentSlots = this.selectedSlots();
    const slotIndex = currentSlots.indexOf(slot.time);

    // Если слот уже выбран - снимаем выбор (режим переключателя)
    if (slotIndex >= 0) {
      this.selectedSlots.set(currentSlots.filter(s => s !== slot.time));
    } else {
      // Добавляем слот к выбранным
      this.selectedSlots.set([...currentSlots, slot.time]);
    }
  }

  removeSlot(slotTime: string): void {
    this.selectedSlots.set(this.selectedSlots().filter(s => s !== slotTime));
  }

  resetSelection(): void {
    this.selectedSlots.set([]);
  }

  getTotalDuration(): number {
    const slots = this.selectedSlots();
    if (slots.length === 0) return 0;

    // Получаем длительность одного слота (предполагаем 15 минут)
    const days = this.calendarDays();
    for (const day of days) {
      for (const slot of day.slots) {
        if (slot.time === slots[0]) {
          return slots.length * (slot.durationMinutes || 15);
        }
      }
    }
    return slots.length * 15;
  }

  isToday(): boolean {
    const today = new Date();
    return this.currentDate.toDateString() === today.toDateString();
  }

  getCurrentDateRange(): string {
    const days = this.calendarDays();
    if (days.length === 0) return '';

    const start = days[0]?.date;
    const end = days[days.length - 1]?.date;

    if (!start || !end) return '';

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (startDate.getMonth() === endDate.getMonth()) {
      return `${format(startDate, 'MMMM yyyy', { locale: ru })}`;
    }

    return `${format(startDate, 'd MMM', { locale: ru })} - ${format(endDate, 'd MMM yyyy', { locale: ru })}`;
  }

  previousDays(): void {
    this.currentDate.setDate(this.currentDate.getDate() - 7);
    this.loadSlots();
  }

  nextDays(): void {
    this.currentDate.setDate(this.currentDate.getDate() + 7);
    this.loadSlots();
  }

  trackBySlot(index: number, slot: SlotWithAvailability): string {
    return slot.time;
  }

  trackByDay(index: number, day: CalendarDay): string {
    return day.date;
  }

  trackBySelectedSlot(index: number, slotTime: string): string {
    return slotTime;
  }

  onReasonChange(): void {
    this.showComment.set(this.formData.reason === 'Other');
  }

  isValid(): boolean {
    return this.selectedSlots().length > 0;
  }

  submit(): void {
    if (!this.isValid()) return;

    // Создаём блокировку для каждого выбранного слота
    const slotsToBlock = this.selectedSlots();
    let completed = 0;

    slotsToBlock.forEach((slotTime, index) => {
      const slotDate = this.getSlotDateTime(slotTime);

      const dto: CreateBlockedSlotDto = {
        dateTime: slotDate,
        durationHours: 0,
        durationMinutes: 15, // Блокируем по одному слоту 15 минут
        reason: this.formData.reason,
        comment: this.formData.comment || undefined,
        isFullDay: false
      };

      this.blockService.create(dto).subscribe({
        next: () => {
          completed++;
          if (completed === slotsToBlock.length) {
            this.saved.emit();
            this.close();
          }
        },
        error: (err) => {
          console.error('Error creating block:', err);
          completed++;
          if (completed === slotsToBlock.length) {
            this.saved.emit();
            this.close();
          }
        }
      });
    });
  }

  cancel(): void {
    this.closed.emit();
    this.close();
  }

  close(): void {
    this.visible.set(false);
    this.selectedSlots.set([]);
    this.formData = {
      dateTime: '',
      durationHours: 1,
      durationMinutes: 30,
      reason: 'Personal',
      comment: '',
      isFullDay: false
    };
    this.durationMode = 'minutes';
    this.showComment.set(false);
    this.isInitialized = false;
  }
}

import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { BlockedSlotsClient, CreateBlockedSlotDto } from '../../services/client/web-api-client';
import { getMoscowDateKey } from '../../utils/moscow-time';

interface MonthDay {
  dateKey: string;
  dayOfMonth: number;
  isOutsideMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
}

@Component({
  selector: 'app-block-day-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './block-day-modal.component.html',
  styleUrl: './block-day-modal.component.scss'
})
export class BlockDayModalComponent {
  @Input() visible = signal(false);
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  @Input() set date(date: Date | undefined) {
    if (date) {
      this.formData.date = getMoscowDateKey(date);
      this.currentMonth.set(new Date(`${this.formData.date}T12:00:00+03:00`));
      this.generateMonthGrid();
    }
  }

  formData = {
    date: '',
    reason: 'Vacation',
    comment: ''
  };

  currentMonth = signal<Date>(new Date());
  monthDays = signal<MonthDay[]>([]);

  readonly weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  currentMonthLabel = computed(() =>
    new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow',
      month: 'long',
      year: 'numeric'
    }).format(this.currentMonth())
  );

  constructor(private blockService: BlockedSlotsClient) {}

  prevMonth(): void {
    const d = new Date(this.currentMonth());
    d.setMonth(d.getMonth() - 1);
    this.currentMonth.set(new Date(`${getMoscowDateKey(d)}T12:00:00+03:00`));
    this.generateMonthGrid();
  }

  nextMonth(): void {
    const d = new Date(this.currentMonth());
    d.setMonth(d.getMonth() + 1);
    this.currentMonth.set(new Date(`${getMoscowDateKey(d)}T12:00:00+03:00`));
    this.generateMonthGrid();
  }

  selectDay(dateKey: string): void {
    this.formData.date = dateKey;
    this.generateMonthGrid();
  }

  isValid(): boolean {
    return !!this.formData.date;
  }

  submit(): void {
    if (!this.isValid()) return;

    const dto: CreateBlockedSlotDto = {
      dateTime: new Date(`${this.formData.date}T00:00:00+03:00`),
      durationHours: 24,
      reason: this.formData.reason,
      comment: this.formData.comment || undefined,
      isFullDay: true
    };

    this.blockService.create(dto).subscribe({
      next: () => {
        this.saved.emit();
        this.close();
      },
      error: (err) => console.error('Error creating day block:', err)
    });
  }

  cancel(): void {
    this.closed.emit();
    this.close();
  }

  close(): void {
    this.visible.set(false);
    this.formData = {
      date: '',
      reason: 'Vacation',
      comment: ''
    };
    this.currentMonth.set(new Date());
    this.generateMonthGrid();
  }

  private generateMonthGrid(): void {
    const anchorKey = getMoscowDateKey(this.currentMonth());
    const firstDate = new Date(`${anchorKey.slice(0, 7)}-01T12:00:00+03:00`);
    const monthToken = anchorKey.slice(0, 7);

    const monthEnd = new Date(firstDate);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);

    const dow = firstDate.getDay();
    const dowMon = dow === 0 ? 7 : dow;
    const offset = dowMon - 1;
    const gridStart = new Date(firstDate.getTime() - offset * 24 * 60 * 60 * 1000);
    const cellCount = Math.ceil((offset + monthEnd.getDate()) / 7) * 7;

    const todayKey = getMoscowDateKey(new Date());
    const selectedKey = this.formData.date;

    const days: MonthDay[] = [];
    for (let i = 0; i < cellCount; i++) {
      const d = new Date(gridStart.getTime() + i * 24 * 60 * 60 * 1000);
      const key = getMoscowDateKey(d);
      days.push({
        dateKey: key,
        dayOfMonth: new Date(`${key}T12:00:00+03:00`).getDate(),
        isOutsideMonth: !key.startsWith(monthToken),
        isToday: key === todayKey,
        isSelected: key === selectedKey
      });
    }

    this.monthDays.set(days);
  }
}

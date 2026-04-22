import { Component, OnInit, signal } from '@angular/core';

import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { DayDetailsPanelComponent } from '../../../components/day-details-panel/day-details-panel.component';
import { BlockSlotModalComponent } from '../../../components/block-slot-modal/block-slot-modal.component';
import { BlockDayModalComponent } from '../../../components/block-day-modal/block-day-modal.component';
import { AppointmentResponseDto, AppointmentsClient, BlockedSlotsClient, WorkingHoursClient } from '../../../services/client/web-api-client';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [
    DayDetailsPanelComponent,
    BlockSlotModalComponent,
    BlockDayModalComponent
],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss'
})
export class CalendarComponent implements OnInit {
  calendarDays = signal<any[]>([]);
  currentMonth = new Date();
  appointmentsByDay = signal<Map<string, AppointmentResponseDto[]>>(new Map());
  blockedDays = signal<Set<string>>(new Set());

  panelOpen = signal(false);
  selectedDateForPanel = signal<Date | null>(null);
  blockSlotModalVisible = signal(false);
  blockDayModalVisible = signal(false);
  selectedSlotData = signal<any>(null);
  selectedBlockDayDate = signal<Date | undefined>(undefined);
  nonWorkingDays = signal<Set<number>>(new Set());

  constructor(
    private appointmentService: AppointmentsClient,
    private blockService: BlockedSlotsClient,
    private workingHoursService: WorkingHoursClient
  ) {}

  ngOnInit(): void {
    this.loadCalendar();
  }

  loadCalendar(): void {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();

    const start = startOfMonth(this.currentMonth);
    const end = endOfMonth(this.currentMonth);
    const calendarStart = startOfWeek(start, { locale: ru });
    const calendarEnd = endOfWeek(end, { locale: ru });

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    // Загружаем рабочие часы для определения нерабочих дней
    this.workingHoursService.getWeek().subscribe({
      next: (workingHours) => {
        // Создаём множество нерабочих дней недели (1=Пн, 7=Вс)
        const nonWorking = new Set<number>();
        workingHours.forEach(wh => {
          // Получаем номер дня недели: используем dayOfWeekNum напрямую (1-7)
          // Старые значения (4, 8, 16, 32, 64) игнорируем - это битовые флаги
          let dayNum = wh.dayOfWeekNum;

          // Конвертируем старые битовые значения в 1-7
          if (dayNum! > 7 && wh.dayOfWeekName) {
            // Это старое значение enum (битовые флаги)
            // Определяем день по названию
            const nameMap: Record<string, number> = {
              'Monday': 1,
              'Tuesday': 2,
              'Wednesday': 3,
              'Thursday': 4,
              'Friday': 5,
              'Saturday': 6,
              'Sunday': 7
            };
            dayNum = nameMap[wh.dayOfWeekName] || dayNum;
          }

          if (!wh.isWorkingDay && dayNum) {
            nonWorking.add(dayNum);
          }
        });

        this.nonWorkingDays.set(nonWorking);

        // Загружаем записи и блокировки
        this.appointmentService.getCalendar(year, month + 1).subscribe({
          next: (data) => {
            const aptMap = new Map<string, AppointmentResponseDto[]>();
            data.days?.forEach(day => {
              // Нормализуем ключ к локальному формату 'yyyy-MM-dd'
              const dateObj = new Date(day.date!);
              const localYear = dateObj.getFullYear();
              const localMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
              const localDay = String(dateObj.getDate()).padStart(2, '0');
              const dateKey = `${localYear}-${localMonth}-${localDay}`;
              aptMap.set(dateKey, day.appointments!);
            });
            this.appointmentsByDay.set(aptMap);

            // Загружаем блокировки
            this.blockService.getByRange(calendarStart.toString(), calendarEnd.toString()).subscribe({
              next: (blocks) => {
                const blockedSet = new Set<string>();
                blocks.forEach(b => {
                  if (b.isFullDay) {
                    blockedSet.add(new Date(b.dateTime!).toDateString());
                  }
                });
                this.blockedDays.set(blockedSet);

                this.generateCalendarDays(days, aptMap, blockedSet, blocks, nonWorking);
              }
            });
          }
        });
      }
    });
  }

  generateCalendarDays(days: Date[], aptMap: Map<string, AppointmentResponseDto[]>, blockedSet: Set<string>, blocks: any[] = [], nonWorking: Set<number> = new Set()): void {
    const today = new Date();

    const calendarDays = days.map(date => {
      // Используем локальную дату без конвертации в UTC
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const appointments = aptMap.get(dateStr) || [];
      const isBlocked = blockedSet.has(date.toDateString());

      // Определяем день недели (1=Пн, 7=Вс)
      let dayOfWeek = date.getDay();
      if (dayOfWeek === 0) dayOfWeek = 7;
      const isNonWorking = nonWorking.has(dayOfWeek);

      // Находим ID блокировки для этого дня
      let blockedSlotId: number | undefined;
      if (isBlocked) {
        const block = blocks.find(b => {
          if (b.isFullDay && b.dateTime) {
            const blockDate = new Date(b.dateTime).toDateString();
            return blockDate === date.toDateString();
          }
          return false;
        });
        blockedSlotId = block?.id;
      }

      return {
        date: dateStr,
        day: date.getDate(),
        isCurrentMonth: isSameMonth(date, this.currentMonth),
        isToday: isToday(date),
        isBlocked,
        blockedSlotId,
        isNonWorking,
        appointmentCount: appointments.length,
        appointments
      };
    });

    this.calendarDays.set(calendarDays);
  }

  previousMonth(): void {
    this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
    this.loadCalendar();
  }

  nextMonth(): void {
    this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
    this.loadCalendar();
  }

  currentMonthName(): string {
    return format(this.currentMonth, 'MMMM', { locale: ru });
  }

  currentYear(): number {
    return this.currentMonth.getFullYear();
  }

  selectDay(day: any): void {
    // Создаем дату из строки 'yyyy-MM-dd' БЕЗ конвертации timezone
    // Используем конструктор который создаёт дату в локальной зоне
    const dateParts = day.date.split('-');
    const date = new Date(
      parseInt(dateParts[0]),  // год
      parseInt(dateParts[1]) - 1,  // месяц (0-11)
      parseInt(dateParts[2])  // день
    );

    console.log('Selecting day:', day.date, date, 'Day of week:', date.getDay(), 'Is blocked:', day.isBlocked);

    // Устанавливаем дату и открываем панель
    this.selectedDateForPanel.set(date);
    this.panelOpen.set(true);
  }

  unblockDay(day: any): void {
    if (day.blockedSlotId) {
      this.confirmUnblock(day.blockedSlotId);
    }
  }

  confirmUnblock(blockId: number): void {
    if (confirm('Вы уверены, что хотите разблокировать этот день? Все записи станут видимыми.')) {
      this.blockService.delete(blockId).subscribe({
        next: () => {
          this.loadCalendar();
          // Обновляем панель если открыта
          if (this.panelOpen()) {
            setTimeout(() => {
              const panel = document.querySelector('app-day-details-panel') as any;
              if (panel && panel.componentInstance) {
                panel.componentInstance.loadDayDetails();
              }
            });
          }
        },
        error: (err) => {
          console.error('Error unblocking day:', err);
          alert('Ошибка при разблокировке дня');
        }
      });
    }
  }

  closePanel(): void {
    this.panelOpen.set(false);
    this.selectedDateForPanel.set(null);
  }

  openBlockSlotModal(): void {
    this.selectedSlotData.set({ date: new Date() });
    this.blockSlotModalVisible.set(true);
  }

  closeBlockSlotModal(): void {
    this.blockSlotModalVisible.set(false);
    this.selectedSlotData.set(null);
  }

  openBlockDayModal(): void {
    this.selectedBlockDayDate.set(new Date());
    this.blockDayModalVisible.set(true);
  }

  openBlockDayModalForDate(date: Date): void {
    this.selectedBlockDayDate.set(date);
    this.blockDayModalVisible.set(true);
  }

  closeBlockDayModal(): void {
    this.blockDayModalVisible.set(false);
    this.selectedBlockDayDate.set(undefined);
  }

  onBlockSaved(): void {
    this.loadCalendar();
    // Обновляем панель если открыта
    if (this.panelOpen()) {
      setTimeout(() => {
        const panel = document.querySelector('app-day-details-panel') as any;
        if (panel && panel.componentInstance) {
          panel.componentInstance.loadDayDetails();
        }
      });
    }
  }

  getStatusClass(status: string): string {
    return status.toLowerCase();
  }

  getCountClass(count: number): string {
    if (count <= 3) return 'count-low';
    if (count <= 6) return 'count-medium';
    return 'count-high';
  }
}

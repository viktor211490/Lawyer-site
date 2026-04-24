import { Component, OnInit, computed, signal } from '@angular/core';

import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addDays
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { DayDetailsPanelComponent } from '../../../components/day-details-panel/day-details-panel.component';
import { BlockSlotModalComponent } from '../../../components/block-slot-modal/block-slot-modal.component';
import { BlockDayModalComponent } from '../../../components/block-day-modal/block-day-modal.component';
import { AppointmentResponseDto, AppointmentsClient, BlockedSlotsClient, WorkingHoursClient } from '../../../services/client/web-api-client';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { formatMoscowTimeHM, getMoscowHourMinute } from '../../../utils/moscow-time';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [
    DayDetailsPanelComponent,
    BlockSlotModalComponent,
    BlockDayModalComponent,
    MatButtonModule,
    MatIconModule,
    MatButtonToggleModule
],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss'
})
export class CalendarComponent implements OnInit {
  viewMode = signal<'day' | 'week' | 'month'>('week');

  calendarDays = signal<any[]>([]);
  currentMonth = new Date();
  anchorDate = signal<Date>(new Date());
  appointmentsByDay = signal<Map<string, AppointmentResponseDto[]>>(new Map());
  blockedDays = signal<Set<string>>(new Set());

  panelOpen = signal(false);
  selectedDateForPanel = signal<Date | null>(null);
  blockSlotModalVisible = signal(false);
  blockDayModalVisible = signal(false);
  selectedSlotData = signal<any>(null);
  selectedBlockDayDate = signal<Date | undefined>(undefined);
  nonWorkingDays = signal<Set<number>>(new Set());
  breakBetweenSlotsMinutes = signal<number>(15);

  weekDays = signal<Array<{ dateKey: string; date: Date; label: string; isToday: boolean; isNonWorking: boolean }>>([]);
  dayStatsByKey = signal<Map<string, any>>(new Map());

  timeStartHour = 8;
  timeEndHour = 20;
  hourLabels = computed(() => {
    const out: Array<{ hour: number; label: string }> = [];
    for (let h = this.timeStartHour; h <= this.timeEndHour; h++) {
      out.push({ hour: h, label: `${String(h).padStart(2, '0')}:00` });
    }
    return out;
  });

  constructor(
    private appointmentService: AppointmentsClient,
    private blockService: BlockedSlotsClient,
    private workingHoursService: WorkingHoursClient
  ) {}

  ngOnInit(): void {
    this.anchorDate.set(new Date());
    this.loadWorkingWeekSettings(() => this.loadCurrentView());
  }

  setViewMode(mode: 'day' | 'week' | 'month'): void {
    this.viewMode.set(mode);
    this.loadCurrentView();
    if (mode === 'day') this.openDockedDayPanel();
    if (mode !== 'day') this.closePanel();
  }

  today(): void {
    const now = new Date();
    this.anchorDate.set(now);
    this.currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    this.loadCurrentView();
    if (this.viewMode() === 'day') this.openDockedDayPanel();
  }

  previousRange(): void {
    const mode = this.viewMode();
    const a = new Date(this.anchorDate());
    if (mode === 'day') this.anchorDate.set(addDays(a, -1));
    else if (mode === 'week') this.anchorDate.set(addDays(a, -7));
    else this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
    this.loadCurrentView();
    if (this.viewMode() === 'day') this.openDockedDayPanel();
  }

  nextRange(): void {
    const mode = this.viewMode();
    const a = new Date(this.anchorDate());
    if (mode === 'day') this.anchorDate.set(addDays(a, 1));
    else if (mode === 'week') this.anchorDate.set(addDays(a, 7));
    else this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
    this.loadCurrentView();
    if (this.viewMode() === 'day') this.openDockedDayPanel();
  }

  private openDockedDayPanel(): void {
    const a = this.anchorDate();
    const date = new Date(a.getFullYear(), a.getMonth(), a.getDate());
    this.selectedDateForPanel.set(date);
    this.panelOpen.set(true);
  }

  toolbarTitle(): string {
    const mode = this.viewMode();
    const anchor = this.anchorDate();
    if (mode === 'month') return `${this.currentMonthName()} ${this.currentYear()}`;
    if (mode === 'day') return format(anchor, 'd MMMM yyyy', { locale: ru });
    const start = startOfWeek(anchor, { locale: ru });
    const end = endOfWeek(anchor, { locale: ru });
    return `${format(start, 'd MMM', { locale: ru })} — ${format(end, 'd MMM yyyy', { locale: ru })}`;
  }

  private loadWorkingWeekSettings(onDone?: () => void): void {
    this.workingHoursService.getWeek().subscribe({
      next: (workingHours) => {
        const nonWorking = new Set<number>();
        workingHours.forEach(wh => {
          let dayNum = wh.dayOfWeekNum;
          if (dayNum! > 7 && wh.dayOfWeekName) {
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
          if (!wh.isWorkingDay && dayNum) nonWorking.add(dayNum);
        });

        this.nonWorkingDays.set(nonWorking);

        const anyDay = workingHours.find(w => w.breakBetweenSlotsMinutes !== undefined);
        if (anyDay?.breakBetweenSlotsMinutes !== undefined) this.breakBetweenSlotsMinutes.set(anyDay.breakBetweenSlotsMinutes);

        onDone?.();
      },
      error: () => onDone?.()
    });
  }

  private loadCurrentView(): void {
    const mode = this.viewMode();
    if (mode === 'month') return void this.loadCalendar();
    if (mode === 'week') return void this.loadWeek();
    return void this.loadDay();
  }

  loadCalendar(): void {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();

    const start = startOfMonth(this.currentMonth);
    const end = endOfMonth(this.currentMonth);
    const calendarStart = startOfWeek(start, { locale: ru });
    const calendarEnd = endOfWeek(end, { locale: ru });

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const nonWorking = this.nonWorkingDays();
    this.appointmentService.getCalendar(year, month + 1).subscribe({
      next: (data) => {
        const aptMap = new Map<string, AppointmentResponseDto[]>();
        data.days?.forEach(day => {
          const dateObj = new Date(day.date!);
          const localYear = dateObj.getFullYear();
          const localMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
          const localDay = String(dateObj.getDate()).padStart(2, '0');
          const dateKey = `${localYear}-${localMonth}-${localDay}`;
          aptMap.set(dateKey, day.appointments!);
        });
        this.appointmentsByDay.set(aptMap);

        this.blockService.getByRange(calendarStart.toString(), calendarEnd.toString()).subscribe({
          next: (blocks) => {
            const blockedSet = new Set<string>();
            blocks.forEach(b => {
              if (b.isFullDay) blockedSet.add(new Date(b.dateTime!).toDateString());
            });
            this.blockedDays.set(blockedSet);

            this.generateCalendarDays(days, aptMap, blockedSet, blocks, nonWorking);
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
    this.loadCurrentView();
  }

  nextMonth(): void {
    this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
    this.loadCurrentView();
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

    // Month click: drill down into Day view (Google-like)
    if (this.viewMode() === 'month') {
      this.anchorDate.set(date);
      this.viewMode.set('day');
      this.loadCurrentView();
      this.openDockedDayPanel();
      return;
    }

    this.selectedDateForPanel.set(date);
    this.panelOpen.set(true);
  }

  selectDayByKey(dateKey: string): void {
    const [y, m, d] = dateKey.split('-').map((x: string) => parseInt(x, 10));
    const date = new Date(y, m - 1, d);
    if (this.viewMode() === 'day') {
      this.anchorDate.set(date);
      this.loadCurrentView();
      this.openDockedDayPanel();
      return;
    }
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

  timeToTopPx(dateValue: any): number {
    const dt = new Date(dateValue as any);
    const { hour: hh, minute: mm } = getMoscowHourMinute(dt);
    const minutes = (hh - this.timeStartHour) * 60 + mm;
    return Math.max(0, minutes) * 1.0;
  }

  durationToHeightPx(durationMinutes?: number): number {
    const mins = Math.max(15, durationMinutes ?? 30);
    return mins * 1.0;
  }

  formatTimeHM(dateValue: any): string {
    const dt = new Date(dateValue as any);
    return formatMoscowTimeHM(dt);
  }

  trackWeekDay(_: number, d: any): string {
    return d.dateKey;
  }

  trackHour(_: number, h: any): number {
    return h.hour;
  }

  private loadWeek(): void {
    const anchor = this.anchorDate();
    const start = startOfWeek(anchor, { locale: ru });
    const end = endOfWeek(anchor, { locale: ru });
    const days = eachDayOfInterval({ start, end });
    const nonWorking = this.nonWorkingDays();

    const weekDays = days.map(d => {
      const dateKey = this.toDateKey(d);
      const dow = this.dayOfWeekNum(d);
      return {
        dateKey,
        date: d,
        label: format(d, 'EEE d', { locale: ru }),
        isToday: isToday(d),
        isNonWorking: nonWorking.has(dow)
      };
    });
    this.weekDays.set(weekDays);

    const map = new Map<string, any>();
    let remaining = weekDays.length;
    weekDays.forEach(wd => {
      this.blockService.getDayDetails(wd.dateKey).subscribe({
        next: (data) => {
          map.set(wd.dateKey, data);
          remaining -= 1;
          if (remaining === 0) this.dayStatsByKey.set(map);
        },
        error: () => {
          map.set(wd.dateKey, null);
          remaining -= 1;
          if (remaining === 0) this.dayStatsByKey.set(map);
        }
      });
    });
  }

  private loadDay(): void {
    const anchor = this.anchorDate();
    const key = this.toDateKey(anchor);
    const dow = this.dayOfWeekNum(anchor);

    this.weekDays.set([{
      dateKey: key,
      date: anchor,
      label: format(anchor, 'EEE d', { locale: ru }),
      isToday: isToday(anchor),
      isNonWorking: this.nonWorkingDays().has(dow)
    }]);

    const map = new Map<string, any>();
    this.blockService.getDayDetails(key).subscribe({
      next: (data) => {
        map.set(key, data);
        this.dayStatsByKey.set(map);
      },
      error: () => {
        map.set(key, null);
        this.dayStatsByKey.set(map);
      }
    });
  }

  private toDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private dayOfWeekNum(date: Date): number {
    let day = date.getDay();
    if (day === 0) day = 7;
    return day;
  }
}

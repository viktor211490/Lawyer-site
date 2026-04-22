import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { SaveWorkingHourDto, WorkingHourDto, WorkingHoursClient } from '../../../services/client/web-api-client';

const DAYS_OF_WEEK = [
  { num: 1, name: 'Понедельник' },
  { num: 2, name: 'Вторник' },
  { num: 3, name: 'Среда' },
  { num: 4, name: 'Четверг' },
  { num: 5, name: 'Пятница' },
  { num: 6, name: 'Суббота' },
  { num: 7, name: 'Воскресенье' }
];

@Component({
  selector: 'app-working-hours',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './working-hours.component.html',
  styleUrl: './working-hours.component.scss'
})
export class WorkingHoursComponent implements OnInit {
  daysOfWeek = DAYS_OF_WEEK;
  hours = Array.from({ length: 24 }, (_, i) => i);

  workingHours = signal<WorkingHourDto[]>([]);
  message = signal<string>('');
  messageType = signal<'success' | 'error'>('success');

  constructor(
    private workingHoursService: WorkingHoursClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadWorkingHours();
  }

  loadWorkingHours(): void {
    console.log('[WorkingHours] Loading working hours...');
    this.workingHoursService.getWeek().subscribe({
      next: (hours) => {
        console.log('[WorkingHours] Loaded working hours:', hours);
        this.workingHours.set(hours);
        console.log('[WorkingHours] Current working hours signal:', this.workingHours());
      },
      error: (err) => {
        console.error('[WorkingHours] Error loading working hours:', err);
        this.message.set('Ошибка загрузки данных');
        this.messageType.set('error');
      }
    });
  }

  getDaySetting(dayNum: number): WorkingHourDto | undefined {
    const setting = this.workingHours().find(h => h.dayOfWeekNum === dayNum);
    // console.log(`[WorkingHours] getDaySetting(${dayNum}):`, setting);
    return setting;
  }

  toggleWorkingDay(dayNum: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    console.log(`[WorkingHours] Toggle day ${dayNum}, checked:`, input.checked);

    const setting = this.getDaySetting(dayNum);
    
    if (setting) {
      // Если настройка есть - просто обновляем статус
      setting.isWorkingDay = input.checked;
      this.workingHours.set([...this.workingHours()]);
      this.saveDay(dayNum);
    } else {
      // Если настройки нет - создаем новую на сервере
      this.createDaySetting(dayNum, input.checked);
    }
  }

  createDaySetting(dayNum: number, isWorkingDay: boolean): void {
    // Создаем новую настройку с значениями по умолчанию
    const newSetting: SaveWorkingHourDto = {
      startHour: 9,
      startMinute: 0,
      endHour: 18,
      endMinute: 0,
      isWorkingDay: isWorkingDay,
      slotDurationMinutes: 60,
      breakBetweenSlotsMinutes: 0
    };

    console.log('[WorkingHours] Creating new setting for day', dayNum, newSetting);

    this.workingHoursService.saveWorkingHour(dayNum, newSetting).subscribe({
      next: (response) => {
        console.log('[WorkingHours] Successfully created day', dayNum, 'Response:', response);
        this.message.set('Рабочее время создано');
        this.messageType.set('success');
        setTimeout(() => this.message.set(''), 3000);
        this.loadWorkingHours();
      },
      error: (err) => {
        console.error('[WorkingHours] Error creating day', dayNum, 'Error:', err);
        this.message.set('Ошибка создания: ' + (err?.error?.message || err?.message || 'Неизвестная ошибка'));
        this.messageType.set('error');
        setTimeout(() => this.message.set(''), 5000);
      }
    });
  }

  updateSetting(dayNum: number, field: string, event: Event): void {
    const input = event.target as HTMLSelectElement;
    console.log(`[WorkingHours] Update setting for day ${dayNum}, field: ${field}, value:`, input.value);

    const setting = this.getDaySetting(dayNum);
    
    if (setting) {
      // Если настройка есть - обновляем
      if (field === 'breakBetweenSlotsMinutes') {
        setting.breakBetweenSlotsMinutes = parseInt(input.value, 10);
      } else if (field.includes('Hour') || field.includes('Minutes')) {
        (setting as any)[field] = parseInt(input.value, 10);
      } else {
        (setting as any)[field] = input.value === 'true';
      }
      this.workingHours.set([...this.workingHours()]);
      this.saveDay(dayNum);
    } else {
      // Если настройки нет - создаем новую
      this.createDaySettingFromField(dayNum, field, input.value);
    }
  }

  createDaySettingFromField(dayNum: number, field: string, value: string): void {
    // Создаем новую настройку с значениями по умолчанию
    const newSetting: SaveWorkingHourDto = {
      startHour: 9,
      startMinute: 0,
      endHour: 18,
      endMinute: 0,
      isWorkingDay: true,
      slotDurationMinutes: 60,
      breakBetweenSlotsMinutes: 0
    };

    // Обновляем поле из события
    if (field === 'breakBetweenSlotsMinutes') {
      newSetting.breakBetweenSlotsMinutes = parseInt(value, 10);
    } else if (field.includes('Hour') || field.includes('Minutes')) {
      (newSetting as any)[field] = parseInt(value, 10);
    } else {
      (newSetting as any)[field] = value === 'true';
    }

    console.log('[WorkingHours] Creating new setting from field for day', dayNum, newSetting);

    this.workingHoursService.saveWorkingHour(dayNum, newSetting).subscribe({
      next: (response) => {
        console.log('[WorkingHours] Successfully created day', dayNum, 'Response:', response);
        this.message.set('Рабочее время создано');
        this.messageType.set('success');
        setTimeout(() => this.message.set(''), 3000);
        this.loadWorkingHours();
      },
      error: (err) => {
        console.error('[WorkingHours] Error creating day', dayNum, 'Error:', err);
        this.message.set('Ошибка создания: ' + (err?.error?.message || err?.message || 'Неизвестная ошибка'));
        this.messageType.set('error');
        setTimeout(() => this.message.set(''), 5000);
      }
    });
  }

  saveDay(dayNum: number): void {
    const setting = this.getDaySetting(dayNum);
    console.log(`[WorkingHours] Save day ${dayNum}, setting:`, setting);

    if (!setting) {
      console.error('[WorkingHours] No setting found for day', dayNum);
      this.message.set('Ошибка: настройки не найдены');
      this.messageType.set('error');
      setTimeout(() => this.message.set(''), 3000);
      return;
    }

    const dto: SaveWorkingHourDto = {
      startHour: setting.startHour,
      startMinute: setting.startMinute,
      endHour: setting.endHour,
      endMinute: setting.endMinute,
      isWorkingDay: setting.isWorkingDay,
      slotDurationMinutes: setting.slotDurationMinutes,
      breakBetweenSlotsMinutes: setting.breakBetweenSlotsMinutes
    };

    console.log('[WorkingHours] Sending DTO:', dto);

    this.workingHoursService.saveWorkingHour(dayNum, dto).subscribe({
      next: (response) => {
        console.log('[WorkingHours] Successfully saved day', dayNum, 'Response:', response);
        this.message.set('Рабочее время сохранено');
        this.messageType.set('success');
        setTimeout(() => this.message.set(''), 3000);
        // Обновляем данные после успешного сохранения
        this.loadWorkingHours();
      },
      error: (err) => {
        console.error('[WorkingHours] Error saving day', dayNum, 'Error:', err);
        this.message.set('Ошибка сохранения: ' + (err?.error?.message || err?.message || 'Неизвестная ошибка'));
        this.messageType.set('error');
        setTimeout(() => this.message.set(''), 5000);
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }
}

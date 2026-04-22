import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../components/header/header.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { AppointmentsClient, ServiceDto, ServicesClient, WorkingHoursClient } from '../../services/client/web-api-client';

// Расширенный тип услуги с флагом недоступности
interface ServiceWithAvailability extends ServiceDto {
  isUnavailableDueToSlot?: boolean;
}

// Расширенный тип слота с флагами недоступности
interface SlotWithAvailability {
  time: string;
  isAvailable: boolean;
  status: string;
  durationMinutes: number;
  isUnavailableDueToService?: boolean;
  isReservedForService?: boolean;
}

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    HeaderComponent,
    FooterComponent
  ],
  templateUrl: './booking.component.html',
  styleUrl: './booking.component.scss'
})
export class BookingComponent implements OnInit {
  bookingForm: FormGroup;
  selectedSlot = signal<string | null>(null);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  calendarDays = signal<any[]>([]);
  currentDate = new Date();
  availableServices = signal<ServiceDto[]>([]);
  selectedServiceId = signal<number | null>(null);
  selectedServiceDuration = signal<number>(60);
  workingHoursMap = signal<Map<number, any>>(new Map());

  // Фильтрованные данные
  filteredServices = signal<ServiceWithAvailability[]>([]);
  filteredDays = signal<any[]>([]);

  constructor(
    private fb: FormBuilder,
    private appointmentService: AppointmentsClient,
    private workingHoursService: WorkingHoursClient,
    private serviceService: ServicesClient
  ) {
    this.bookingForm = this.fb.group({
      clientName: ['', Validators.required],
      clientEmail: ['', [Validators.required, Validators.email]],
      clientPhone: ['', Validators.required],
      notes: [''],
      serviceId: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadServices();
    this.loadSlots();
  }

  loadServices(): void {
    this.serviceService.getServices(true).subscribe({
      next: (services) => {
        this.availableServices.set(services);
        this.filteredServices.set(services);
      },
      error: (err) => {
        console.error('Error loading services:', err);
      }
    });
  }

  loadSlots(): void {
    const daysToLoad = 14;
    const startDate = new Date(this.currentDate);

    // Сначала загружаем настройки рабочей недели
    this.workingHoursService.getWeek().subscribe({
      next: (workingHours) => {
        // Создаём карту рабочих часов по дням недели
        const workingHoursMap = new Map<number, any>();
        workingHours.forEach(wh => {
          workingHoursMap.set(wh.dayOfWeekNum!, wh);
        });
        this.workingHoursMap.set(workingHoursMap);

        // Создаём заготовки дней с кэшированием названий
        const days: any[] = [];
        for (let i = 0; i < daysToLoad; i++) {
          const date = new Date(startDate);
          date.setDate(date.getDate() + i);

          let dayOfWeek = date.getDay();
          if (dayOfWeek === 0) dayOfWeek = 7;

          const workingHour = workingHoursMap.get(dayOfWeek);
          const isWorkingDay = workingHour?.isWorkingDay ?? false;

          // Кэшируем названия и даты сразу
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

        // Загружаем ВСЕ слоты одним запросом
        const serviceId = this.selectedServiceId();

        this.appointmentService.getAvailableSlots(startDate, daysToLoad, serviceId ?? undefined).subscribe({
          next: (allSlots) => {
            // Распределяем слоты по дням
            allSlots.forEach((slot: any) => {
              const slotDate = new Date(slot.time);
              const dateStr = slotDate.toISOString().split('T')[0];
              const day = days.find(d => d.date === dateStr);

              if (day && day.isWorkingDay) {
                day.slots.push({
                  time: slot.time,
                  isAvailable: slot.isAvailable,
                  status: slot.status,
                  durationMinutes: slot.durationMinutes
                });
              }
            });

            // Сортируем слоты в каждом дне по времени
            days.forEach(day => {
              day.slots.sort((a: any, b: any) =>
                new Date(a.time).getTime() - new Date(b.time).getTime()
              );
            });

            this.calendarDays.set(days);
            this.filteredDays.set(days);

            // Применяем фильтры после загрузки
            this.applyFilters();
          },
          error: (err) => {
            console.error('Error loading slots:', err);
            // Fallback - загружаем дни без слотов
            this.calendarDays.set(days);
          }
        });
      },
      error: (err) => {
        console.error('Error loading working hours:', err);
        this.loadSlotsFallback();
      }
    });
  }

  loadSlotsFallback(): void {
    // Резервный вариант если API не работает
    const daysToLoad = 7;
    const days: any[] = [];

    for (let i = 0; i < daysToLoad; i++) {
      const date = new Date(this.currentDate);
      date.setDate(date.getDate() + i);

      let dayOfWeek = date.getDay();
      if (dayOfWeek === 0) dayOfWeek = 7;

      // Пропускаем Сб (6) и Вс (7)
      if (dayOfWeek === 6 || dayOfWeek === 7) {
        continue;
      }

      days.push({
        date: date.toISOString().split('T')[0],
        dayName: this.getDayName(date),
        dayNumber: this.getDayNumber(date),
        isToday: this.isDateToday(date),
        isWorkingDay: true,
        slots: []
      });
    }

    this.calendarDays.set(days);
  }

  getDayName(date: Date): string {
    return format(date, 'EEEE', { locale: ru });
  }

  getDayNumber(date: Date): string {
    return format(date, 'd MMMM', { locale: ru });
  }

  isDateToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  isToday(): boolean {
    const today = new Date();
    return this.currentDate.toDateString() === today.toDateString();
  }

  getSlotTime(time: string): string {
    // Конвертируем время в UTC, затем в московское (UTC+3)
    const date = new Date(time);
    // Получаем UTC время и добавляем 3 часа для Москвы
    const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
    const moscowTime = new Date(utcTime);
    return format(moscowTime, 'HH:mm');
  }

  getSlotDateTime(time: string): Date {
    // Конвертируем время в UTC, затем в московское (UTC+3)
    const date = new Date(time);
    const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
    return new Date(utcTime);
  }

  getSlotTitle(slot: any): string {
    if (slot.isReservedForService && slot.isAvailable) {
      return 'Будет занят выбранной услугой';
    }
    if (slot.isUnavailableDueToService) {
      return 'Недостаточно времени для выбранной услуги';
    }
    if (!slot.isAvailable) {
      return 'Недоступно';
    }
    return '';
  }

  getServiceIcon(service: ServiceWithAvailability): string {
    // Иконки в зависимости от длительности услуги
    if (service.durationMinutes! <= 60) {
      return '💬';  // Консультация
    } else if (service.durationMinutes! <= 90) {
      return '👥';  // Семейная терапия
    } else {
      return '📋';  // Диагностика
    }
  }

  getBreakMinutes(): number {
    // Получаем перерыв из настроек рабочих часов для текущего дня
    const days = this.calendarDays();
    if (days.length === 0) return 15;

    // Берём первый рабочий день и получаем перерыв из workingHours
    const firstWorkingDay = days.find(d => d.isWorkingDay);
    if (!firstWorkingDay) return 15;

    // Определяем день недели (1=Пн, 7=Вс)
    const date = new Date(firstWorkingDay.date);
    let dayOfWeek = date.getDay();
    if (dayOfWeek === 0) dayOfWeek = 7;

    // Получаем настройки перерыва из workingHoursMap
    const workingHour = this.workingHoursMap().get(dayOfWeek);
    if (workingHour && workingHour.breakBetweenSlotsMinutes !== undefined) {
      return workingHour.breakBetweenSlotsMinutes;
    }

    return 15; // Значение по умолчанию
  }

  getCurrentDateRange(): string {
    const start = this.calendarDays()[0]?.date;
    const end = this.calendarDays()[this.calendarDays().length - 1]?.date;

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

  onServiceSelected(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const serviceId = value ? +value : null;
    this.selectedServiceId.set(serviceId);
    this.selectedSlot.set(null);
    if (serviceId) {
      const service = this.availableServices().find(s => s.id === serviceId);
      this.selectedServiceDuration.set(service?.durationMinutes ?? 60);
      this.bookingForm.patchValue({ serviceId });
    } else {
      this.selectedServiceDuration.set(60);
    }
    this.applyFilters();
  }

  selectService(service: ServiceWithAvailability): void {
    // Нельзя выбрать недоступную услугу
    if (service.isUnavailableDueToSlot) {
      return;
    }

    const serviceId = service.id!;

    // Если услуга уже выбрана - снимаем выбор (режим переключателя)
    if (this.selectedServiceId() === serviceId) {
      this.selectedServiceId.set(null);
      this.selectedServiceDuration.set(60);
      this.bookingForm.patchValue({ serviceId: null });
      this.applyFilters();
      return;
    }

    this.selectedServiceId.set(serviceId);
    this.selectedServiceDuration.set(service.durationMinutes!);
    // Не сбрасываем выбранный слот!
    this.bookingForm.patchValue({ serviceId });
    this.applyFilters();
  }

  selectSlot(slot: any): void {
    if (slot.isAvailable) {
      this.selectedSlot.set(slot.time);
      this.errorMessage.set('');
      this.applyFilters();
    }
  }

  applyFilters(): void {
    const serviceId = this.selectedServiceId();
    const selectedSlot = this.selectedSlot();
    const serviceDuration = this.selectedServiceDuration();

    // Получаем перерыв из настроек рабочих часов
    const breakMinutes = this.getBreakMinutes();
    const neededDuration = serviceDuration + breakMinutes;

    // Не фильтруем слоты, а помечаем недоступные
    let daysWithSlots = this.calendarDays();

    if (serviceId) {
      daysWithSlots = daysWithSlots.map(day => {
        if (!day.isWorkingDay || !day.slots?.length) {
          return day;
        }

        // Для каждого слота проверяем, хватает ли места после него
        const updatedSlots = day.slots.map((slot: any, index: number) => {
          // Если это выбранный слот - всегда оставляем доступным
          const isSlotSelected = selectedSlot && slot.time === selectedSlot;
          if (isSlotSelected) {
            return { ...slot, isAvailable: true, isUnavailableDueToService: false };
          }

          // Если слот уже недоступен (не из-за услуги) - оставляем как есть
          if (!slot.isAvailable && !slot.isUnavailableDueToService) {
            return { ...slot, isUnavailableDueToService: false };
          }

          // Проверяем, есть ли достаточно последовательных доступных слотов после текущего
          const slotDuration = slot.durationMinutes || 15;
          const slotsNeeded = Math.ceil(neededDuration / slotDuration);

          let availableSlotsCount = 0;
          for (let i = index; i < day.slots.length && availableSlotsCount < slotsNeeded; i++) {
            if (day.slots[i].isAvailable || day.slots[i].isUnavailableDueToService) {
              availableSlotsCount++;
            } else {
              break;
            }
          }

          // Если не хватает слотов - помечаем как недоступный из-за услуги
          if (availableSlotsCount < slotsNeeded) {
            return { ...slot, isAvailable: false, isUnavailableDueToService: true };
          }

          return { ...slot, isAvailable: true, isUnavailableDueToService: false };
        });

        // Если выбран слот, подсвечиваем слоты которые займёт услуга
        const selectedSlotIndex = updatedSlots.findIndex((s: any) => s.time === selectedSlot);
        if (selectedSlotIndex >= 0) {
          const slotDuration = updatedSlots[selectedSlotIndex].durationMinutes || 15;
          const slotsNeeded = Math.ceil(neededDuration / slotDuration);

          for (let i = selectedSlotIndex; i < selectedSlotIndex + slotsNeeded && i < updatedSlots.length; i++) {
            updatedSlots[i] = { ...updatedSlots[i], isReservedForService: true };
          }
        }

        return {
          ...day,
          slots: updatedSlots
        };
      });
    } else {
      // Если услуга не выбрана - сбрасываем все флаги
      daysWithSlots = daysWithSlots.map(day => ({
        ...day,
        slots: day.slots.map((slot: any) => ({
          ...slot,
          isUnavailableDueToService: false,
          isReservedForService: false
        }))
      }));
    }

    this.filteredDays.set(daysWithSlots);

    // Фильтруем услуги: если выбран слот, проверяем, какие услуги помещаются
    if (selectedSlot) {
      const day = daysWithSlots.find(d =>
        d.slots.some((s: any) => s.time === selectedSlot)
      );

      if (day) {
        const slotIndex = day.slots.findIndex((s: any) => s.time === selectedSlot);
        const slotDuration = day.slots[slotIndex]?.durationMinutes || 15;

        // Считаем сколько последовательных слотов доступно после выбранного
        let availableSlotsCount = 0;
        for (let i = slotIndex; i < day.slots.length; i++) {
          // Считаем слот доступным если он isAvailable или isUnavailableDueToService
          // (isUnavailableDueToService означает что слот доступен но заблокирован текущей услугой)
          if (day.slots[i].isAvailable || day.slots[i].isUnavailableDueToService) {
            availableSlotsCount++;
          } else {
            break;
          }
        }

        const maxDuration = availableSlotsCount * slotDuration - breakMinutes;

        // Не фильтруем, а помечаем недоступные услуги
        // НО если услуга уже выбрана - не блокируем её
        const services: ServiceWithAvailability[] = this.availableServices().map(service => {
          const isTooLong = service.durationMinutes! > maxDuration;
          const isSelected = serviceId && service.id === serviceId;

          return {
            ...service,
            isUnavailableDueToSlot: isTooLong && !isSelected  // Не блокируем выбранную услугу
          };
        });
        this.filteredServices.set(services);
      }
    } else {
      // Возвращаем услуги без флага недоступности
      const services: ServiceWithAvailability[] = this.availableServices().map(service => ({
        ...service,
        isUnavailableDueToSlot: false
      }));
      this.filteredServices.set(services);
    }
  }

  trackBySlot(index: number, slot: any): string {
    // Используем оригинальное время из сервера для трекинга
    return slot.time;
  }

  trackByDay(index: number, day: any): string {
    return day.date;
  }

  trackByService(index: number, service: ServiceDto): number {
    return service.id!;
  }

  getFormattedSelectedSlot(): string {
    const slot = this.selectedSlot();
    if (!slot) return '';

    const date = new Date(slot);
    return `${format(date, 'd MMMM yyyy', { locale: ru })} в ${format(date, 'HH:mm')}`;
  }

  getSelectedService(): ServiceDto | null {
    const serviceId = this.selectedServiceId();
    if (!serviceId) return null;
    return this.availableServices().find(s => s.id === serviceId) ?? null;
  }

  getSelectedServiceTitle(): string {
    const service = this.getSelectedService();
    return service?.title ?? '';
  }

  getSelectedServiceDuration(): number {
    const service = this.getSelectedService();
    return service?.durationMinutes ?? 0;
  }

  getSelectedServicePrice(): number {
    const service = this.getSelectedService();
    return service?.price ?? 0;
  }

  get f() {
    return this.bookingForm.controls;
  }

  onSubmit(): void {
    if (this.bookingForm.invalid || !this.selectedSlot()) {
      return;
    }

    const formValue = this.bookingForm.getRawValue();
    const dto = {
      ...formValue,
      appointmentTime: this.selectedSlot()!,
      serviceId: formValue.serviceId || null
    };

    this.appointmentService.create(dto).subscribe({
      next: (appointment) => {
        this.successMessage.set(
          `Вы записаны на ${this.getFormattedSelectedSlot()}`
        );
        this.bookingForm.reset();
        this.selectedSlot.set(null);
        this.selectedServiceId.set(null);
        this.loadSlots();
      },
      error: (err) => {
        this.errorMessage.set(
          err.error?.message || 'Ошибка при записи. Попробуйте другое время.'
        );
      }
    });
  }
}

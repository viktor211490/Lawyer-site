import { CommonModule } from '@angular/common';
import { Component, OnInit, Signal, computed, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, startWith } from 'rxjs';
import { AppointmentsClient, ServiceDto, ServicesClient, WorkingHoursClient } from '../../../services/client/web-api-client';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

interface ServiceWithAvailability extends ServiceDto {
  isUnavailableDueToSlot?: boolean;
}

@Component({
  selector: 'app-booking-wizard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './booking-wizard.component.html',
  styleUrl: './booking-wizard.component.scss'
})
export class BookingWizardComponent implements OnInit {
  currentStep = signal<1 | 2 | 3>(1);

  bookingForm: FormGroup;

  selectedSlot = signal<string | null>(null);
  selectedServiceId = signal<number | null>(null);
  selectedServiceDuration = signal<number>(60);

  errorMessage = signal<string>('');
  infoMessage = signal<string>('');

  currentDate = new Date();

  monthDays = signal<any[]>([]);
  monthSelectedDateKey = signal<string | null>(null);
  monthSelectedDay = signal<any | null>(null);
  private pendingMonthSelectKey: string | null = null;

  availableServices = signal<ServiceDto[]>([]);
  filteredServices = signal<ServiceWithAvailability[]>([]);
  workingHoursMap = signal<Map<number, any>>(new Map());

  private readonly moscowTimeZone = 'Europe/Moscow';

  private bookingFormValid!: Signal<boolean>;

  canProceedToStep2 = computed(() => !!this.selectedServiceId());
  canProceedToStep3 = computed(() => !!this.selectedServiceId() && !!this.selectedSlot());

  canSubmit = computed(() => this.bookingFormValid() && !!this.selectedServiceId() && !!this.selectedSlot());

  constructor(
    private fb: FormBuilder,
    private appointmentService: AppointmentsClient,
    private workingHoursService: WorkingHoursClient,
    private serviceService: ServicesClient,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.bookingForm = this.fb.group({
      clientName: ['', Validators.required],
      clientEmail: ['', [Validators.required, Validators.email]],
      clientPhone: ['', Validators.required],
      notes: [''],
      consentAccepted: [false, Validators.requiredTrue]
    });

    this.bookingFormValid = toSignal(
      this.bookingForm.statusChanges.pipe(
        startWith(this.bookingForm.status),
        map((s) => s === 'VALID')
      ),
      { initialValue: this.bookingForm.valid }
    );
  }

  ngOnInit(): void {
    this.loadServices();
  }

  // ---------- Navigation ----------
  goToStep(n: 1 | 2 | 3): void {
    this.currentStep.set(n);
  }

  proceedToStep2(): void {
    if (!this.canProceedToStep2()) return;
    this.loadMonth();
    this.goToStep(2);
  }

  proceedToStep3(): void {
    if (!this.canProceedToStep3()) return;
    this.goToStep(3);
  }

  // ---------- API loading ----------
  loadServices(): void {
    const preselect = this.route.snapshot.queryParamMap.get('serviceId');
    this.serviceService.getServices(true).subscribe({
      next: (services) => {
        this.availableServices.set(services);
        this.filteredServices.set(services);
        if (preselect) {
          const svc = services.find(s => s.id === +preselect);
          if (svc) {
            this.selectService(svc);
            this.proceedToStep2();
          }
        }
      },
      error: (err) => console.error('Error loading services:', err)
    });
  }

  loadMonth(): void {
    const anchorNoon = this.getMoscowNoon(this.currentDate);
    const monthStart = new Date(anchorNoon.getTime());
    monthStart.setDate(1);

    const monthStartKey = this.getMoscowDateKey(monthStart);
    const monthStartDate = new Date(`${monthStartKey}T12:00:00+03:00`);
    const monthEndDate = new Date(monthStartDate.getTime());
    monthEndDate.setMonth(monthEndDate.getMonth() + 1);
    monthEndDate.setDate(0);
    const daysInMonth = monthEndDate.getDate();

    const monthStartDow = monthStartDate.getDay();
    const monthStartDowMon = monthStartDow === 0 ? 7 : monthStartDow;
    const offset = monthStartDowMon - 1;
    const gridStartDate = new Date(monthStartDate.getTime() - offset * 24 * 60 * 60 * 1000);
    const cellCount = Math.ceil((offset + daysInMonth) / 7) * 7;

    this.workingHoursService.getWeek().subscribe({
      next: (workingHours) => {
        const workingHoursMap = new Map<number, any>();
        workingHours.forEach(wh => workingHoursMap.set(wh.dayOfWeekNum!, wh));
        this.workingHoursMap.set(workingHoursMap);

        const days: any[] = [];
        const monthToken = monthStartKey.slice(0, 7);

        for (let i = 0; i < cellCount; i++) {
          const date = new Date(gridStartDate.getTime() + i * 24 * 60 * 60 * 1000);
          const dateKey = this.getMoscowDateKey(date);
          const inCurrentMonth = dateKey.startsWith(monthToken);

          let dayOfWeek = date.getDay();
          if (dayOfWeek === 0) dayOfWeek = 7;
          const workingHour = workingHoursMap.get(dayOfWeek);
          const isWorkingDay = workingHour?.isWorkingDay ?? false;

          const labels = this.formatMoscowDate(date);
          days.push({
            date: dateKey,
            dayName: labels.dayName,
            dayNumber: labels.dayNumber,
            dayOfMonth: new Date(`${dateKey}T12:00:00+03:00`).getDate(),
            isToday: dateKey === this.getMoscowDateKey(new Date()),
            isWorkingDay,
            isOutsideMonth: !inCurrentMonth,
            slots: [],
            hasAnyAvailable: false
          });
        }

        const serviceId = this.selectedServiceId();
        this.appointmentService.getAvailableSlots(gridStartDate, cellCount, serviceId ?? undefined).subscribe({
          next: (allSlots) => {
            allSlots.forEach((slot: any) => {
              const slotDate = new Date(slot.time);
              const dateKey = this.getMoscowDateKey(slotDate);
              const day = days.find(d => d.date === dateKey);
              if (!day || !day.isWorkingDay) return;
              day.slots.push({
                time: slot.time,
                isAvailable: slot.isAvailable,
                status: slot.status,
                durationMinutes: slot.durationMinutes
              });
            });

            days.forEach(d => {
              d.slots.sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());
              d.hasAnyAvailable = !d.isOutsideMonth && d.slots.some((s: any) => s.isAvailable);
            });

            this.monthDays.set(days);

            const pending = this.pendingMonthSelectKey;
            this.pendingMonthSelectKey = null;

            const defaultKey =
              pending ??
              days.find(d => d.isToday && !d.isOutsideMonth)?.date ??
              days.find(d => !d.isOutsideMonth && d.isWorkingDay)?.date ??
              days[0]?.date ??
              null;

            if (defaultKey) this.selectMonthDay(defaultKey);
            this.applyFilters();
            this.ensureSelectedSlotStillExists();
          },
          error: (err) => {
            console.error('Error loading month slots:', err);
            this.monthDays.set(days);
            this.applyFilters();
            this.ensureSelectedSlotStillExists();
          }
        });
      },
      error: (err) => console.error('Error loading working hours:', err)
    });
  }

  // ---------- Calendar controls ----------
  selectMonthDay(dateKey: string): void {
    this.monthSelectedDateKey.set(dateKey);
    const day = this.monthDays().find(d => d.date === dateKey) ?? null;

    if (day?.isOutsideMonth) {
      this.pendingMonthSelectKey = dateKey;
      this.currentDate = this.getMoscowNoon(new Date(`${dateKey}T12:00:00+03:00`));
      this.loadMonth();
      return;
    }

    this.monthSelectedDay.set(day);
  }

  previousMonth(): void {
    const d = new Date(this.getMoscowNoon(this.currentDate));
    d.setMonth(d.getMonth() - 1);
    this.currentDate = d;
    this.loadMonth();
  }

  nextMonth(): void {
    const d = new Date(this.getMoscowNoon(this.currentDate));
    d.setMonth(d.getMonth() + 1);
    this.currentDate = d;
    this.loadMonth();
  }

  getCurrentDateRange(): string {
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: this.moscowTimeZone,
      month: 'long',
      year: 'numeric'
    }).format(this.getMoscowNoon(this.currentDate));
  }

  // ---------- Selection ----------
  selectSlot(slot: any): void {
    if (!slot.isAvailable) return;
    this.selectedSlot.set(slot.time);
    this.infoMessage.set('');
    this.errorMessage.set('');
    this.applyFilters();
  }

  selectService(service: ServiceWithAvailability): void {
    if (service.isUnavailableDueToSlot) return;

    const serviceId = service.id!;
    if (this.selectedServiceId() === serviceId) {
      this.selectedServiceId.set(null);
      this.selectedServiceDuration.set(60);
      this.infoMessage.set('');
      this.applyFilters();
      if (this.currentStep() === 2) this.loadMonth();
      return;
    }

    this.selectedServiceId.set(serviceId);
    this.selectedServiceDuration.set(service.durationMinutes ?? 60);
    this.infoMessage.set('');
    this.errorMessage.set('');

    const hadSlot = !!this.selectedSlot();
    this.applyFilters();

    if (hadSlot && !this.isSelectedSlotCompatibleWithCurrentService()) {
      this.selectedSlot.set(null);
      this.infoMessage.set('Выбранное время не подходит для этой услуги. Пожалуйста, выберите другое время.');
    }

    if (this.currentStep() === 2) this.loadMonth();
  }

  // ---------- Availability rules ----------
  applyFilters(): void {
    const serviceId = this.selectedServiceId();
    const selectedSlot = this.selectedSlot();
    const neededDuration = this.selectedServiceDuration() + this.getBreakMinutes();

    const updatedDays = this.applyServiceRulesToDays(this.monthDays(), serviceId, selectedSlot, neededDuration);
    this.monthDays.set(updatedDays);

    const selectedKey = this.monthSelectedDateKey();
    this.monthSelectedDay.set(selectedKey ? (updatedDays.find(d => d.date === selectedKey) ?? null) : null);

    this.filteredServices.set(this.applySlotRulesToServices(updatedDays, selectedSlot, this.getBreakMinutes(), serviceId));
  }

  private applyServiceRulesToDays(days: any[], serviceId: number | null, selectedSlot: string | null, neededDuration: number): any[] {
    if (!serviceId) {
      return days.map(day => ({
        ...day,
        slots: (day.slots ?? []).map((slot: any) => ({
          ...slot,
          isUnavailableDueToService: false,
          isReservedForService: false
        }))
      }));
    }

    return days.map(day => {
      if (!day.isWorkingDay || !day.slots?.length) return day;

      const updatedSlots = day.slots.map((slot: any, index: number) => {
        if (!slot.isAvailable && !slot.isUnavailableDueToService) {
          return { ...slot, isUnavailableDueToService: false, isReservedForService: false };
        }

        const slotDuration = slot.durationMinutes || 15;
        const slotsNeeded = Math.ceil(neededDuration / slotDuration);

        let count = 0;
        for (let i = index; i < day.slots.length && count < slotsNeeded; i++) {
          if (day.slots[i].isAvailable || day.slots[i].isUnavailableDueToService) count++;
          else break;
        }

        if (count < slotsNeeded) {
          return { ...slot, isAvailable: false, isUnavailableDueToService: true, isReservedForService: false };
        }
        return { ...slot, isAvailable: true, isUnavailableDueToService: false, isReservedForService: false };
      });

      const selIdx = selectedSlot ? updatedSlots.findIndex((s: any) => s.time === selectedSlot) : -1;
      if (selIdx >= 0) {
        const slotDuration = updatedSlots[selIdx].durationMinutes || 15;
        const slotsNeeded = Math.ceil(neededDuration / slotDuration);
        for (let i = selIdx; i < selIdx + slotsNeeded && i < updatedSlots.length; i++) {
          updatedSlots[i] = { ...updatedSlots[i], isReservedForService: true };
        }
      }

      return { ...day, slots: updatedSlots };
    });
  }

  private applySlotRulesToServices(days: any[], selectedSlot: string | null, breakMinutes: number, selectedServiceId: number | null): ServiceWithAvailability[] {
    if (!selectedSlot) {
      return this.availableServices().map(s => ({ ...s, isUnavailableDueToSlot: false }));
    }

    const day = days.find(d => d.slots?.some((s: any) => s.time === selectedSlot));
    if (!day) return this.availableServices().map(s => ({ ...s, isUnavailableDueToSlot: false }));

    const slotIndex = day.slots.findIndex((s: any) => s.time === selectedSlot);
    const slotDuration = day.slots[slotIndex]?.durationMinutes || 15;

    let count = 0;
    for (let i = slotIndex; i < day.slots.length; i++) {
      if (day.slots[i].isAvailable || day.slots[i].isUnavailableDueToService) count++;
      else break;
    }

    const maxDuration = count * slotDuration - breakMinutes;
    return this.availableServices().map(s => ({
      ...s,
      isUnavailableDueToSlot: (s.durationMinutes ?? 0) > maxDuration && s.id !== selectedServiceId
    }));
  }

  private isSelectedSlotCompatibleWithCurrentService(): boolean {
    const selectedSlot = this.selectedSlot();
    const serviceId = this.selectedServiceId();
    if (!selectedSlot || !serviceId) return true;

    const neededDuration = this.selectedServiceDuration() + this.getBreakMinutes();
    const day = this.monthDays().find(d => d.slots?.some((s: any) => s.time === selectedSlot));
    if (!day) return false;

    const slotIndex = day.slots.findIndex((s: any) => s.time === selectedSlot);
    if (slotIndex < 0) return false;

    const slotDuration = day.slots[slotIndex]?.durationMinutes || 15;
    const slotsNeeded = Math.ceil(neededDuration / slotDuration);

    let count = 0;
    for (let i = slotIndex; i < day.slots.length && count < slotsNeeded; i++) {
      if (day.slots[i].isAvailable) count++;
      else break;
    }

    return count >= slotsNeeded;
  }

  private ensureSelectedSlotStillExists(): void {
    const selectedSlot = this.selectedSlot();
    if (!selectedSlot) return;
    if (!this.monthDays().some(d => d.slots?.some((s: any) => s.time === selectedSlot))) {
      this.selectedSlot.set(null);
      this.infoMessage.set('Выбранное время стало недоступным. Пожалуйста, выберите другое.');
    }
  }

  // ---------- Formatting / helpers ----------
  getSlotTime(time: string): string {
    return this.formatMoscowTime(new Date(time));
  }

  getSlotTitle(slot: any): string {
    if (slot.isReservedForService && slot.isAvailable) return 'Будет занят выбранной услугой';
    if (slot.isUnavailableDueToService) return 'Недостаточно времени для выбранной услуги';
    if (!slot.isAvailable) return 'Недоступно';
    return '';
  }

  getFormattedSelectedSlot(): string {
    const slot = this.selectedSlot();
    if (!slot) return '';
    return this.formatMoscowDateTime(new Date(slot));
  }

  getFormattedSelectedSlotShort(): string {
    const slot = this.selectedSlot();
    if (!slot) return '';
    const d = new Date(slot);
    const date = new Intl.DateTimeFormat('ru-RU', {
      timeZone: this.moscowTimeZone,
      day: 'numeric',
      month: 'short'
    }).format(d);
    return `${date} · ${this.formatMoscowTime(d)}`;
  }

  getSelectedService(): ServiceDto | null {
    const serviceId = this.selectedServiceId();
    if (!serviceId) return null;
    return this.availableServices().find(s => s.id === serviceId) ?? null;
  }

  getSelectedServiceTitle(): string {
    return this.getSelectedService()?.title ?? '';
  }

  getSelectedServiceDuration(): number {
    return this.getSelectedService()?.durationMinutes ?? 0;
  }

  getSelectedServicePrice(): number {
    return this.getSelectedService()?.price ?? 0;
  }

  getSelectedServiceIcon(): string {
    const svc = this.getSelectedService();
    return svc ? this.getServiceIcon(svc as ServiceWithAvailability) : '';
  }

  getServiceIcon(service: ServiceWithAvailability): string {
    if (service.emoji) return service.emoji;
    const title = (service.title ?? '').toLowerCase();
    if (title.includes('семейн')) return '⚖️';
    if (title.includes('иск') || title.includes('претенз') || title.includes('заявлен')) return '📄';
    if (title.includes('суд')) return '🏛️';
    if (title.includes('недвиж')) return '🏠';
    if ((service.durationMinutes ?? 0) <= 60) return '💬';
    if ((service.durationMinutes ?? 0) <= 90) return '🗂️';
    return '🛡️';
  }

  private getBreakMinutes(): number {
    const firstWorkingDay = this.monthDays().find(d => d.isWorkingDay && !d.isOutsideMonth);
    if (!firstWorkingDay) return 15;
    let dayOfWeek = new Date(firstWorkingDay.date).getDay();
    if (dayOfWeek === 0) dayOfWeek = 7;
    const wh = this.workingHoursMap().get(dayOfWeek);
    return wh?.breakBetweenSlotsMinutes ?? 15;
  }

  private getMoscowNoon(date: Date): Date {
    return new Date(`${this.getMoscowDateKey(date)}T12:00:00+03:00`);
  }

  private getMoscowDateKey(d: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: this.moscowTimeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  }

  private formatMoscowDate(d: Date): { dayName: string; dayNumber: string } {
    return {
      dayName: new Intl.DateTimeFormat('ru-RU', { timeZone: this.moscowTimeZone, weekday: 'long' }).format(d),
      dayNumber: new Intl.DateTimeFormat('ru-RU', { timeZone: this.moscowTimeZone, day: 'numeric', month: 'long' }).format(d)
    };
  }

  private formatMoscowTime(d: Date): string {
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: this.moscowTimeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(d);
  }

  private formatMoscowDateTime(d: Date): string {
    const datePart = new Intl.DateTimeFormat('ru-RU', {
      timeZone: this.moscowTimeZone,
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(d);
    return `${datePart} в ${this.formatMoscowTime(d)}`;
  }

  // ---------- Submit ----------
  onSubmit(): void {
    this.bookingForm.markAllAsTouched();
    if (!this.canSubmit()) return;

    const formValue = this.bookingForm.getRawValue();
    const slotIso = this.selectedSlot()!;
    const dto = {
      clientName: formValue.clientName,
      clientEmail: formValue.clientEmail,
      clientPhone: formValue.clientPhone,
      notes: formValue.notes,
      appointmentTime: new Date(slotIso),
      serviceId: this.selectedServiceId()!
    };

    this.appointmentService.create(dto).subscribe({
      next: () => {
        this.router.navigate(['/home'], {
          queryParams: {
            booking: 'success',
            time: slotIso,
            timeLabel: this.getFormattedSelectedSlot(),
            service: this.getSelectedServiceTitle()
          }
        });
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Ошибка при записи. Попробуйте другое время.');
      }
    });
  }
}

import { Component, Input, Output, EventEmitter, signal, OnInit, OnChanges, SimpleChanges } from '@angular/core';

import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { AppointmentCardComponent } from '../appointment-card/appointment-card.component';
import { BlockSlotModalComponent } from '../block-slot-modal/block-slot-modal.component';
import { format } from 'date-fns';
import { AppointmentsClient, BlockedSlotsClient, CreateAppointmentDto, CreateBlockedSlotDto, AppointmentResponseDto } from '../../services/client/web-api-client';

@Component({
  selector: 'app-day-details-panel',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, AppointmentCardComponent, BlockSlotModalComponent],
  templateUrl: './day-details-panel.component.html',
  styleUrl: './day-details-panel.component.scss'
})
export class DayDetailsPanelComponent implements OnInit, OnChanges {
  @Input() isOpen = signal(false);
  @Input() selectedDate: Date | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() blockDayRequested = new EventEmitter<Date>();

  statistics = signal<any>(null);
  filter = signal<string>('all');
  searchControl = new FormControl('');

  // Block Slot Modal
  blockSlotModalVisible = signal(false);
  selectedSlotData = signal<any>(null);

  // Reschedule Modal
  rescheduleModalVisible = signal(false);
  selectedAppointment = signal<AppointmentResponseDto | null>(null);
  rescheduleFormData = {
    dateTime: ''
  };

  // Quick Booking Modal
  quickBookingVisible = signal(false);
  quickBookingFormData = {
    dateTime: '',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    notes: ''
  };

  // Track blocked slots for current day
  currentDayBlockedSlotId = signal<number | undefined>(undefined);

  constructor(
    private blockService: BlockedSlotsClient,
    private appointmentService: AppointmentsClient
  ) {}

  ngOnInit(): void {
    // Загрузка данных происходит через ngOnChanges
  }

  ngOnChanges(): void {
    if (this.selectedDate) {
      console.log('Date changed, loading details for:', this.selectedDate);
      this.loadDayDetails();
    }
  }

  close(): void {
    this.isOpen.set(false);
    this.closed.emit();
  }

  loadDayDetails(): void {
    if (!this.selectedDate) return;

    console.log('Loading day details for:', this.selectedDate);

    // Создаём дату в формате yyyy-MM-dd для передачи в API
    // Это нужно чтобы избежать конвертации timezone при отправке
    const year = this.selectedDate.getFullYear();
    const month = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(this.selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    this.blockService.getDayDetails(dateStr).subscribe({
      next: (data) => {
        console.log('Received day data:', data);

        this.statistics.set({
          date: data.date,
          totalAppointments: data.totalAppointments,
          confirmedAppointments: data.confirmedAppointments,
          cancelledAppointments: data.cancelledAppointments,
          scheduledAppointments: data.scheduledAppointments,
          appointments: data.appointments,
          blockedSlots: data.blockedSlots
        });

        // Проверяем есть ли полная блокировка дня
        const fullDayBlock = data.blockedSlots?.find(b => b.isFullDay);
        this.currentDayBlockedSlotId.set(fullDayBlock?.id);
      },
      error: (err: any) => {
        console.error('Error loading day details:', err);
        this.statistics.set(null);
      }
    });
  }

  isDayBlocked(): boolean {
    return this.currentDayBlockedSlotId() !== undefined;
  }

  unblockCurrentDay(): void {
    const blockId = this.currentDayBlockedSlotId();
    if (!blockId) return;

    if (confirm('Вы уверены, что хотите разблокировать этот день? Все записи станут видимыми.')) {
      this.blockService.delete(blockId).subscribe({
        next: () => {
          this.currentDayBlockedSlotId.set(undefined);
          this.loadDayDetails();
        },
        error: (err) => {
          console.error('Error unblocking day:', err);
          alert('Ошибка при разблокировке дня');
        }
      });
    }
  }

  formatDate(date: Date | null): string {
    if (!date) return '';

    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();

    const monthNames = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];

    return `${day} ${monthNames[month]} ${year}`;
  }

  formatTime(dateStr: string): string {
    return format(new Date(dateStr), 'HH:mm');
  }

  formatEndTime(slot: any): string {
    const end = new Date(slot.dateTime!);
    end.setHours(end.getHours() + slot.durationHours!);
    end.setMinutes(end.getMinutes() + slot.durationMinutes!);
    return format(end, 'HH:mm');
  }

  getIcon(reason: string): string {
    const icons: any = {
      'Lunch': '🍽️',
      'Personal': '🏠',
      'Vacation': '✈️',
      'Sick': '🤒',
      'Other': '📝'
    };
    return icons[reason] || '🚫';
  }

  getReasonName(reason: string): string {
    const names: any = {
      'Lunch': 'Обед',
      'Personal': 'Личные дела',
      'Vacation': 'Отпуск',
      'Sick': 'Больничный',
      'Other': 'Другое'
    };
    return names[reason] || reason;
  }

  getSortedItems(stats: any): any[] {
    const appointments = stats.appointments || [];
    const blockedSlots = stats.blockedSlots || [];

    const filterValue = this.filter();
    const searchValue = this.searchControl.value?.toLowerCase() || '';

    let filteredAppointments = appointments;
    if (filterValue !== 'all') {
      filteredAppointments = appointments.filter((a: any) =>
        a.status.toLowerCase() === filterValue.toLowerCase()
      );
    }

    if (searchValue) {
      filteredAppointments = filteredAppointments.filter((a: any) =>
        a.clientName.toLowerCase().includes(searchValue)
      );
    }

    const allItems = [...filteredAppointments, ...blockedSlots];
    return allItems.sort((a, b) => {
      const timeA = a.appointmentTime || a.dateTime;
      const timeB = b.appointmentTime || b.dateTime;
      return new Date(timeA).getTime() - new Date(timeB).getTime();
    });
  }

  trackByFn(index: number, item: any): string {
    return item.id ? `apt-${item.id}` : `block-${index}`;
  }

  isAppointment(item: any): boolean {
    return !!item.appointmentTime;
  }

  isBlockedSlot(item: any): boolean {
    return !!item.dateTime && !item.appointmentTime;
  }

  onStatusChanged(event: { id: number, status: string }): void {
    this.appointmentService.updateStatus(event.id, event.status).subscribe({
      next: () => this.loadDayDetails(),
      error: (err) => console.error('Error updating status:', err)
    });
  }

  deleteBlock(id: number): void {
    if (confirm('Снять блокировку?')) {
      this.blockService.delete(id).subscribe({
        next: () => this.loadDayDetails(),
        error: (err) => console.error('Error deleting block:', err)
      });
    }
  }

  openBlockDayModal(): void {
    if (this.selectedDate) {
      this.blockDayRequested.emit(this.selectedDate);
    }
  }

  // Block Slot Modal
  openBlockSlotModal(): void {
    this.selectedSlotData.set({ date: this.selectedDate || new Date() });
    this.blockSlotModalVisible.set(true);
  }

  closeBlockSlotModal(): void {
    this.blockSlotModalVisible.set(false);
    this.selectedSlotData.set(null);
  }

  onBlockSaved(): void {
    this.loadDayDetails();
    this.closeBlockSlotModal();
  }

  // Reschedule Modal
  openRescheduleModal(appointment: AppointmentResponseDto): void {
    this.selectedAppointment.set(appointment);
    this.rescheduleFormData.dateTime = this.toDateTimeLocal(new Date(appointment.appointmentTime!));
    this.rescheduleModalVisible.set(true);
  }

  closeRescheduleModal(): void {
    this.rescheduleModalVisible.set(false);
    this.selectedAppointment.set(null);
    this.rescheduleFormData.dateTime = '';
  }

  formatRescheduleCurrentTime(): string {
    const apt = this.selectedAppointment();
    if (!apt) return '';
    const date = new Date(apt.appointmentTime!);
    return format(date, 'dd.MM.yyyy HH:mm');
  }

  confirmReschedule(): void {
    const apt = this.selectedAppointment();
    if (!apt || !this.rescheduleFormData.dateTime) return;

    // datetime-local возвращает строку 'YYYY-MM-DDTHH:mm' (локальное время без timezone)
    // Создаём дату в UTC, чтобы при сериализации не было конвертации
    const parts = this.rescheduleFormData.dateTime.split(/[-T:]/);
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // 0-based
    const day = parseInt(parts[2]);
    const hour = parseInt(parts[3]);
    const minute = parseInt(parts[4]);

    const utcDate = new Date(Date.UTC(year, month, day, hour, minute));

    const dto: CreateAppointmentDto = {
      appointmentTime: utcDate,
      clientName: apt.clientName!,
      clientEmail: apt.clientEmail!,
      clientPhone: apt.clientPhone!,
      serviceId: apt.serviceId || undefined,
      notes: apt.notes
    };

    // Сначала создаём новую запись, потом удаляем старую
    this.appointmentService.create(dto).subscribe({
      next: (newAppointment) => {
        // Удаляем старую запись
        this.appointmentService.delete(apt.id!).subscribe({
          next: () => {
            this.loadDayDetails();
            this.closeRescheduleModal();
          },
          error: (err) => console.error('Error deleting old appointment:', err)
        });
      },
      error: (err) => {
        console.error('Error creating new appointment:', err);
        alert('Ошибка при переносе записи. Возможно, время уже занято.');
      }
    });
  }

  // Quick Booking Modal
  openQuickBookingModal(): void {
    this.quickBookingFormData = {
      dateTime: this.toDateTimeLocal(this.selectedDate || new Date()),
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      notes: ''
    };
    this.quickBookingVisible.set(true);
  }

  closeQuickBooking(): void {
    this.quickBookingVisible.set(false);
    this.quickBookingFormData = {
      dateTime: '',
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      notes: ''
    };
  }

  confirmQuickBooking(): void {
    if (!this.quickBookingFormData.clientName || !this.quickBookingFormData.clientPhone || !this.quickBookingFormData.dateTime) {
      return;
    }

    // datetime-local возвращает строку 'YYYY-MM-DDTHH:mm' (локальное время без timezone)
    // При создании Date из такой строки, браузер считает это локальным временем
    // При JSON.stringify() Date конвертируется в UTC, отнимая offset (3 часа для Москвы)
    // Поэтому создаём дату так, чтобы при сериализации получилось нужное время
    const parts = this.quickBookingFormData.dateTime.split(/[-T:]/);
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // 0-based
    const day = parseInt(parts[2]);
    const hour = parseInt(parts[3]);
    const minute = parseInt(parts[4]);

    // Создаём дату в UTC, чтобы при сериализации не было конвертации
    const utcDate = new Date(Date.UTC(year, month, day, hour, minute));

    const dto: CreateAppointmentDto = {
      appointmentTime: utcDate,
      clientName: this.quickBookingFormData.clientName,
      clientEmail: this.quickBookingFormData.clientEmail || '',
      clientPhone: this.quickBookingFormData.clientPhone,
      serviceId:  undefined,
      notes: this.quickBookingFormData.notes
    };

    debugger
    this.appointmentService.create(dto).subscribe({
      next: (response) => {
        console.log(response)
        this.loadDayDetails();
        this.closeQuickBooking();
      },
      error: (err) => {
        console.error('Error creating appointment:', err);
        alert('Ошибка при записи. Возможно, время уже занято.');
      }
    });
  }

  toDateTimeLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  exportToCsv(): void {
    const stats = this.statistics();
    if (!stats || !this.selectedDate) return;

    const headers = ['Время', 'ФИО', 'Телефон', 'Email', 'Статус', 'Комментарий'];
    const rows = stats.appointments.map((a: any) => [
      this.formatTime(a.appointmentTime),
      a.clientName,
      a.clientPhone,
      a.clientEmail,
      this.getStatusName(a.status),
      a.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row: string[]) => row.map((cell: string) => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `appointments_${this.selectedDate.toISOString().split('T')[0]}.csv`;
    link.click();
  }

  getStatusName(status: string): string {
    const names: any = {
      'Scheduled': 'Запланировано',
      'Confirmed': 'Подтверждено',
      'Cancelled': 'Отменено',
      'Completed': 'Завершено'
    };
    return names[status] || status;
  }
}

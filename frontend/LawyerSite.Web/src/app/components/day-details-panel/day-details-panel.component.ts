import { Component, Input, Output, EventEmitter, signal, OnInit, OnChanges } from '@angular/core';

import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { AppointmentCardComponent } from '../appointment-card/appointment-card.component';
import { BlockSlotModalComponent } from '../block-slot-modal/block-slot-modal.component';
import { AppointmentsClient, BlockedSlotsClient, CreateAppointmentDto, CreateBlockedSlotDto, AppointmentResponseDto } from '../../services/client/web-api-client';
import { MatDialog } from '@angular/material/dialog';
import { RescheduleDialogComponent } from './reschedule-dialog/reschedule-dialog.component';
import { QuickBookingDialogComponent } from './quick-booking-dialog/quick-booking-dialog.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { formatMoscowTimeHM, getMoscowHourMinute } from '../../utils/moscow-time';

@Component({
  selector: 'app-day-details-panel',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    AppointmentCardComponent,
    BlockSlotModalComponent,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonToggleModule
  ],
  templateUrl: './day-details-panel.component.html',
  styleUrl: './day-details-panel.component.scss'
})
export class DayDetailsPanelComponent implements OnInit, OnChanges {
  @Input() isOpen = signal(false);
  @Input() selectedDate: Date | null = null;
  @Input() docked = false;
  @Output() closed = new EventEmitter<void>();
  @Output() blockDayRequested = new EventEmitter<Date>();

  statistics = signal<any>(null);
  filter = signal<string>('all');
  searchControl = new FormControl('');

  // Block Slot Modal
  blockSlotModalVisible = signal(false);
  selectedSlotData = signal<any>(null);

  // Track blocked slots for current day
  currentDayBlockedSlotId = signal<number | undefined>(undefined);

  constructor(
    private blockService: BlockedSlotsClient,
    private appointmentService: AppointmentsClient,
    private dialog: MatDialog
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
    return formatMoscowTimeHM(dateStr);
  }

  formatEndTime(slot: any): string {
    const start = new Date(slot.dateTime!);
    const { hour, minute } = getMoscowHourMinute(start);
    const minutesTotal = hour * 60 + minute + (slot.durationHours! * 60) + slot.durationMinutes!;
    const endHour = Math.floor(minutesTotal / 60) % 24;
    const endMinute = minutesTotal % 60;

    // Keep the same calendar day; only time matters for label
    const key = start.toISOString().split('T')[0];
    const end = new Date(`${key}T${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00+03:00`);
    return formatMoscowTimeHM(end);
  }

  getIcon(reason: string): string {
    const icons: any = {
      'Lunch': 'lunch_dining',
      'Personal': 'home',
      'Vacation': 'flight',
      'Sick': 'personal_injury',
      'Other': 'description'
    };
    return icons[reason] || 'block';
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
    const searchValue = (this.searchControl.value ?? '').toString().trim().toLowerCase();

    let filteredAppointments = appointments;
    if (filterValue !== 'all') {
      filteredAppointments = appointments.filter((a: any) =>
        a.status.toLowerCase() === filterValue.toLowerCase()
      );
    }

    if (searchValue) {
      filteredAppointments = filteredAppointments.filter((a: any) => {
        const haystack = [
          a.clientName,
          a.clientPhone,
          a.clientEmail,
          a.serviceTitle,
          a.notes
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(searchValue);
      });
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

  openRescheduleModal(appointment: AppointmentResponseDto): void {
    const anchor = appointment.appointmentTime ? new Date(appointment.appointmentTime as any) : (this.selectedDate ?? new Date());
    const ref = this.dialog.open(RescheduleDialogComponent, {
      data: { appointment, anchorDate: anchor },
      width: '900px',
      maxWidth: '95vw'
    });

    ref.afterClosed().subscribe((ok) => {
      if (ok) this.loadDayDetails();
    });
  }

  openQuickBookingModal(): void {
    const ref = this.dialog.open(QuickBookingDialogComponent, {
      data: { initialDate: this.selectedDate ?? new Date() },
      width: '820px',
      maxWidth: '95vw'
    });

    ref.afterClosed().subscribe((ok) => {
      if (ok) this.loadDayDetails();
    });
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

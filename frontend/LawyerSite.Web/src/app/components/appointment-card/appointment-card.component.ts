import { Component, Input, Output, EventEmitter } from '@angular/core';

import { AppointmentResponseDto } from '../../services/client/web-api-client';
import { UtcToLocalPipe } from '../../pipes/utc-to-local.pipe';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-appointment-card',
  standalone: true,
  imports: [UtcToLocalPipe, MatButtonModule, MatIconModule],
  templateUrl: './appointment-card.component.html',
  styleUrl: './appointment-card.component.scss'
})
export class AppointmentCardComponent {
  @Input() appointment!: AppointmentResponseDto;
  @Output() statusChanged = new EventEmitter<{ id: number, status: string }>();
  @Output() deleted = new EventEmitter<void>();
  @Output() rescheduleRequested = new EventEmitter<AppointmentResponseDto>();

  getStatusClass(status: string): string {
    return status.toLowerCase();
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

  confirm(): void {
    this.statusChanged.emit({ id: this.appointment.id!, status: 'Confirmed' });
  }

  cancel(): void {
    this.statusChanged.emit({ id: this.appointment.id!, status: 'Cancelled' });
  }

  delete(): void {
    if (confirm('Удалить эту запись?')) {
      this.deleted.emit();
    }
  }

  reschedule(): void {
    this.rescheduleRequested.emit(this.appointment);
  }
}

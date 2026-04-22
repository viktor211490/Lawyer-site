import { Component, Input, Output, EventEmitter, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { BlockedSlotsClient, CreateBlockedSlotDto } from '../../services/client/web-api-client';

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
      this.formData.date = date.toISOString().split('T')[0];
    }
  }
  
  formData = {
    date: '',
    reason: 'Vacation',
    comment: ''
  };
  
  constructor(private blockService: BlockedSlotsClient) {}
  
  isValid(): boolean {
    return !!this.formData.date;
  }
  
  submit(): void {
    if (!this.isValid()) return;
    
    const dto: CreateBlockedSlotDto = {
      dateTime: new Date(this.formData.date),
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
  }
}

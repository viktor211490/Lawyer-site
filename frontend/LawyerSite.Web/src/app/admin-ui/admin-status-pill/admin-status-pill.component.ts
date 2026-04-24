import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type AdminStatusTone = 'neutral' | 'success' | 'info' | 'warning' | 'danger';

@Component({
  selector: 'admin-status-pill',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-status-pill.component.html',
  styleUrl: './admin-status-pill.component.scss'
})
export class AdminStatusPillComponent {
  @Input({ required: true }) label!: string;
  @Input() tone: AdminStatusTone = 'neutral';
}


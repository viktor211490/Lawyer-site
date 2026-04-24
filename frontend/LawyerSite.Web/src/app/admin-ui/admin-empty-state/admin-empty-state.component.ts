import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'admin-empty-state',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './admin-empty-state.component.html',
  styleUrl: './admin-empty-state.component.scss'
})
export class AdminEmptyStateComponent {
  @Input({ required: true }) title!: string;
  @Input() description?: string;
  @Input() icon?: string;
}


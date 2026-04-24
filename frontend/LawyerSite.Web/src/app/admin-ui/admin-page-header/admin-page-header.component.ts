import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'admin-page-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-page-header.component.html',
  styleUrl: './admin-page-header.component.scss'
})
export class AdminPageHeaderComponent {
  @Input({ required: true }) title!: string;
  @Input() subtitle?: string;
}


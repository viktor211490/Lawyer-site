import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ServiceDto, ServicesClient, UpdateServiceDto } from '../../../services/client/web-api-client';
import { AdminActionToolbarComponent } from '../../../admin-ui/admin-action-toolbar/admin-action-toolbar.component';
import { AdminEmptyStateComponent } from '../../../admin-ui/admin-empty-state/admin-empty-state.component';
import { AdminPageHeaderComponent } from '../../../admin-ui/admin-page-header/admin-page-header.component';
import { AdminStatusPillComponent } from '../../../admin-ui/admin-status-pill/admin-status-pill.component';
import { ServiceEditDialogComponent, ServiceEditDialogResult } from './service-edit-dialog.component';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    AdminActionToolbarComponent,
    AdminEmptyStateComponent,
    AdminPageHeaderComponent,
    AdminStatusPillComponent
  ],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss'
})
export class ServicesComponent implements OnInit {
  services = signal<ServiceDto[]>([]);
  showActiveOnly = signal(false);
  readonly searchControl = new FormControl('', { nonNullable: true });

  readonly filteredServices = computed(() => {
    const q = this.searchControl.value.trim().toLowerCase();
    const list = this.services();
    if (!q) return list;
    return list.filter((s) => {
      const hay = [s.title, s.description].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  });

  constructor(
    private readonly serviceService: ServicesClient,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadServices();
  }

  loadServices(): void {
    this.serviceService.getServices(this.showActiveOnly()).subscribe({
      next: (services) => {
        this.services.set(services);
      },
      error: (err) => {
        console.error('Error loading services:', err);
      }
    });
  }

  toggleActiveFilter(): void {
    this.showActiveOnly.update(v => !v);
    this.loadServices();
  }

  openCreateModal(): void {
    const ref = this.dialog.open(ServiceEditDialogComponent, {
      data: { mode: 'create' },
      width: '720px',
      maxWidth: '95vw'
    });

    ref.afterClosed().subscribe((result: ServiceEditDialogResult | undefined) => {
      if (!result) return;
      this.serviceService.create(result).subscribe({
        next: () => this.loadServices(),
        error: (err) => console.error('Error creating service:', err)
      });
    });
  }

  editService(service: ServiceDto): void {
    const ref = this.dialog.open(ServiceEditDialogComponent, {
      data: { mode: 'edit', service },
      width: '720px',
      maxWidth: '95vw'
    });

    ref.afterClosed().subscribe((result: ServiceEditDialogResult | undefined) => {
      if (!result) return;
      this.serviceService.update(service.id!, result).subscribe({
        next: () => this.loadServices(),
        error: (err) => console.error('Error updating service:', err)
      });
    });
  }

  toggleActive(service: ServiceDto): void {
    const dto: UpdateServiceDto = {
      title: service.title,
      emoji: service.emoji,
      description: service.description || '',
      price: service.price,
      durationMinutes: service.durationMinutes,
      isActive: !service.isActive
    };

    this.serviceService.update(service.id!, dto).subscribe({
      next: () => this.loadServices(),
      error: (err) => console.error('Error toggling service:', err)
    });
  }

  getServiceEmoji(service: ServiceDto): string {
    if (service.emoji) return service.emoji;
    const title = (service.title ?? '').toLowerCase();
    if (title.includes('семейн')) return '⚖️';
    if (title.includes('суд')) return '🏛️';
    if (title.includes('иск') || title.includes('заявлен')) return '📄';
    if (title.includes('недвиж')) return '🏠';
    if (title.includes('консульт')) return '💬';
    if (title.includes('представ')) return '👨‍⚖️';
    if (title.includes('документ') || title.includes('договор')) return '📋';
    return '🛡️';
  }

  deleteService(service: ServiceDto): void {
    if (confirm(`Удалить услугу "${service.title}"?`)) {
      this.serviceService.delete(service.id!).subscribe({
        next: () => this.loadServices(),
        error: (err) => {
          console.error('Error deleting service:', err);
          alert(err.error?.message || 'Ошибка при удалении');
        }
      });
    }
  }
}

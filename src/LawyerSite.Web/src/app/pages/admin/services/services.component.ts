import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HeaderComponent } from '../../../components/header/header.component';
import { ServiceDto, ServicesClient, UpdateServiceDto } from '../../../services/client/web-api-client';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HeaderComponent],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss'
})
export class ServicesComponent implements OnInit {
  services = signal<ServiceDto[]>([]);
  showActiveOnly = signal(false);
  modalVisible = signal(false);
  isEditMode = signal(false);
  editingServiceId = signal<number | null>(null);

  serviceForm: FormGroup;

  constructor(
    private serviceService: ServicesClient,
    private fb: FormBuilder
  ) {
    this.serviceForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      price: [0, [Validators.required, Validators.min(0)]],
      durationMinutes: [60, [Validators.required, Validators.min(15)]],
      isActive: [true]
    });
  }

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
    this.isEditMode.set(false);
    this.editingServiceId.set(null);
    this.serviceForm.reset({
      title: '',
      description: '',
      price: 0,
      durationMinutes: 60,
      isActive: true
    });
    this.modalVisible.set(true);
  }

  editService(service: ServiceDto): void {
    this.isEditMode.set(true);
    this.editingServiceId.set(service.id!);
    this.serviceForm.patchValue({
      title: service.title,
      description: service.description || '',
      price: service.price,
      durationMinutes: service.durationMinutes,
      isActive: service.isActive
    });
    this.modalVisible.set(true);
  }

  toggleActive(service: ServiceDto): void {
    const dto: UpdateServiceDto = {
      title: service.title,
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

  closeModal(): void {
    this.modalVisible.set(false);
  }

  onSubmit(): void {
    if (this.serviceForm.invalid) return;

    const dto = this.serviceForm.getRawValue();

    if (this.isEditMode()) {
      const id = this.editingServiceId();
      if (id) {
        this.serviceService.update(id, dto).subscribe({
          next: () => {
            this.closeModal();
            this.loadServices();
          },
          error: (err) => console.error('Error updating service:', err)
        });
      }
    } else {
      this.serviceService.create(dto).subscribe({
        next: () => {
          this.closeModal();
          this.loadServices();
        },
        error: (err) => console.error('Error creating service:', err)
      });
    }
  }

  get f() {
    return this.serviceForm.controls;
  }
}

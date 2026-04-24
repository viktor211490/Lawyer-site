import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { ServiceDto } from '../../../services/client/web-api-client';

export type ServiceEditDialogMode = 'create' | 'edit';

export interface ServiceEditDialogData {
  mode: ServiceEditDialogMode;
  service?: ServiceDto;
}

export interface ServiceEditDialogResult {
  emoji?: string;
  title: string;
  description?: string;
  price: number;
  durationMinutes: number;
  isActive: boolean;
}

@Component({
  selector: 'app-service-edit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './service-edit-dialog.component.html',
  styleUrl: './service-edit-dialog.component.scss'
})
export class ServiceEditDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject<MatDialogRef<ServiceEditDialogComponent, ServiceEditDialogResult>>(MatDialogRef);
  readonly data = inject<ServiceEditDialogData>(MAT_DIALOG_DATA);

  readonly legalEmojis = [
    '⚖️', '🏛️', '👨‍⚖️', '👩‍⚖️', '📜', '📋', '📄', '📝', '✍️', '🖊️',
    '💼', '🗂️', '📁', '📊', '🔍', '🛡️', '🤝', '💰', '🏠', '🏢',
  ];

  readonly otherEmojis = [
    '🔏', '🔒', '🔑', '📌', '🗓️', '📞', '✉️', '💬', '🔔', '📈',
    '💡', '🎯', '⏰', '🌐', '🧾', '📱', '🤙', '📩', '🔖', '🗺️',
  ];

  readonly form = this.fb.nonNullable.group({
    emoji: [''],
    title: ['', [Validators.required]],
    description: [''],
    price: [0, [Validators.required, Validators.min(0)]],
    durationMinutes: [60, [Validators.required, Validators.min(15)]],
    isActive: [true]
  });

  readonly title = this.data.mode === 'edit' ? 'Редактирование услуги' : 'Новая услуга';

  constructor() {
    const data = this.data;
    if (data.service) {
      this.form.patchValue({
        emoji: data.service.emoji || '',
        title: data.service.title,
        description: data.service.description || '',
        price: data.service.price,
        durationMinutes: data.service.durationMinutes,
        isActive: data.service.isActive
      });
    }
  }

  selectEmoji(emoji: string): void {
    this.form.patchValue({ emoji });
  }

  close(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.form.invalid) return;
    this.dialogRef.close(this.form.getRawValue());
  }
}


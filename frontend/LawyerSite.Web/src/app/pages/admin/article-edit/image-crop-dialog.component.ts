import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Inject, OnDestroy, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import Cropper from 'cropperjs';

export type CropPreset = 'cover' | 'promo';

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageCropDialogData {
  imageUrl: string;
  preset: CropPreset;
}

export interface ImageCropDialogResult {
  preset: CropPreset;
  crop: CropRect;
}

@Component({
  selector: 'app-image-crop-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './image-crop-dialog.component.html',
  styleUrl: './image-crop-dialog.component.scss'
})
export class ImageCropDialogComponent implements AfterViewInit, OnDestroy {
  @ViewChild('img', { static: true }) imgRef!: ElementRef<HTMLImageElement>;

  private cropper?: Cropper;

  constructor(
    private readonly dialogRef: MatDialogRef<ImageCropDialogComponent, ImageCropDialogResult>,
    @Inject(MAT_DIALOG_DATA) readonly data: ImageCropDialogData
  ) {}

  ngAfterViewInit(): void {
    const aspect = this.data.preset === 'cover' ? 1200 / 630 : 1;
    this.initCropper(aspect);
  }

  ngOnDestroy(): void {
    this.cropper?.destroy();
  }

  cancel(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (!this.cropper) return;
    const d = this.cropper.getData(true) as any;

    this.dialogRef.close({
      preset: this.data.preset,
      crop: { x: d.x, y: d.y, width: d.width, height: d.height }
    });
  }

  private initCropper(aspectRatio: number): void {
    const img = this.imgRef.nativeElement;
    this.cropper?.destroy();
    this.cropper = new Cropper(img, {
      viewMode: 1,
      dragMode: 'move',
      aspectRatio,
      autoCropArea: 0.9,
      responsive: true,
      background: false,
      guides: true,
      center: true
    });
  }
}


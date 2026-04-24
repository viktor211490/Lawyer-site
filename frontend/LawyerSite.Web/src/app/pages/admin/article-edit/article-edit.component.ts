import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { QuillModule } from 'ngx-quill';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ArticlesClient, CropBlogImagesRequest, FileParameter } from '../../../services/client/web-api-client';
import { AdminPageHeaderComponent } from '../../../admin-ui/admin-page-header/admin-page-header.component';
import { CropPreset, ImageCropDialogComponent, ImageCropDialogResult } from './image-crop-dialog.component';

@Component({
  selector: 'app-article-edit',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule,
    MatDialogModule,
    QuillModule,
    AdminPageHeaderComponent
  ],
  templateUrl: './article-edit.component.html',
  styleUrl: './article-edit.component.scss'
})
export class ArticleEditComponent implements OnInit {
  articleForm: FormGroup;
  isEdit = signal(false);
  sourceImagePreview = signal<string>('');
  sourceImagePath = signal<string>('');
  coverImagePreview = signal<string>('');
  coverImagePath = signal<string>('');
  promoImagePreview = signal<string>('');
  promoImagePath = signal<string>('');
  isSaving = signal(false);
  isPublishing = signal(false);
  isUploadingCover = signal(false);
  isCropping = signal(false);
  readonly quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link'],
      ['clean']
    ],
    history: {
      delay: 500,
      maxStack: 100,
      userOnly: true
    }
  };

  constructor(
    private fb: FormBuilder,
    private articleService: ArticlesClient,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.articleForm = this.fb.group({
      title: ['', Validators.required],
      excerpt: ['', Validators.required],
      content: ['', Validators.required],
      tags: [''],
      isPublished: [false],
      isVisibleInBlog: [true]
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.articleService.getById(+id).subscribe({
        next: (article) => {
          this.articleForm.patchValue({
            title: article.title,
            excerpt: article.excerpt,
            content: article.content,
            tags: article.tags,
            isPublished: article.isPublished,
            isVisibleInBlog: article.isVisibleInBlog
          });
          const src = article.sourceImage || article.coverImage;
          if (src) {
            this.sourceImagePath.set(src);
            this.sourceImagePreview.set(src);
          }
          if (article.coverImage) {
            this.coverImagePath.set(article.coverImage);
            this.coverImagePreview.set(article.coverImage);
          }
          if (article.promoImage) {
            this.promoImagePath.set(article.promoImage);
            this.promoImagePreview.set(article.promoImage);
          }
        }
      });
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.uploadImage(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.files.length) {
      this.uploadImage(event.dataTransfer.files[0]);
    }
  }

  uploadImage(file: File): void {
    if (this.isUploadingCover()) return;
    this.isUploadingCover.set(true);

    const fileParameter: FileParameter = {
      data: file,
      fileName: file.name
    };

    const sub = this.articleService.uploadImage(fileParameter).subscribe({
      next: (path) => {
        this.sourceImagePath.set(path);
        this.sourceImagePreview.set(path);
        this.snackBar.open('Изображение загружено', 'Ок', { duration: 3500 });
      },
      error: (err) => {
        this.snackBar.open(err?.error?.message || 'Не удалось загрузить обложку', 'Ок', { duration: 6000 });
      }
    });

    sub.add(() => this.isUploadingCover.set(false));
  }

  onSubmit(): void {
    if (this.articleForm.invalid) return;
    if (this.isSaving()) return;
    this.isSaving.set(true);

    const dto = {
      ...this.articleForm.getRawValue(),
      sourceImage: this.sourceImagePath() || undefined,
      coverImage: this.coverImagePath() || this.sourceImagePath() || undefined,
      promoImage: this.promoImagePath() || undefined
    };

    const id = this.route.snapshot.paramMap.get('id');
    const request = id
      ? this.articleService.update(+id, dto)
      : this.articleService.create(dto);

    const sub = request.subscribe({
      next: () => {
        this.snackBar.open('Изменения сохранены', 'Ок', { duration: 3500 });
        this.router.navigate(['/admin/articles']);
      },
      error: (err) => {
        this.snackBar.open(err?.error?.message || 'Не удалось сохранить изменения', 'Ок', { duration: 6000 });
      }
    });

    sub.add(() => this.isSaving.set(false));
  }

  publish(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      if (this.isPublishing()) return;
      this.isPublishing.set(true);

      const sub = this.articleService.publish(+id).subscribe({
        next: () => {
          this.articleForm.patchValue({ isPublished: true, isVisibleInBlog: true });
          this.snackBar.open('Статья опубликована', 'Ок', { duration: 3500 });
        },
        error: (err) => {
          this.snackBar.open(err?.error?.message || 'Не удалось опубликовать статью', 'Ок', { duration: 6000 });
        }
      });

      sub.add(() => this.isPublishing.set(false));
    }
  }

  logout(): void {
    this.authService.logout();
  }

  openCropDialog(preset: CropPreset): void {
    const source = this.sourceImagePath();
    if (!source) {
      this.snackBar.open('Сначала загрузите изображение', 'Ок', { duration: 4000 });
      return;
    }
    if (this.isCropping()) return;

    const ref = this.dialog.open<ImageCropDialogComponent, { imageUrl: string; preset: CropPreset }, ImageCropDialogResult>(
      ImageCropDialogComponent,
      {
        width: '920px',
        maxWidth: '92vw',
        data: { imageUrl: source, preset }
      }
    );

    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      this.applyCrop(source, result);
    });
  }

  private applyCrop(sourceImagePath: string, result: ImageCropDialogResult): void {
    if (this.isCropping()) return;
    this.isCropping.set(true);

    const req: CropBlogImagesRequest = {
      sourceImagePath,
      coverCrop: result.preset === 'cover' ? result.crop : undefined,
      promoCrop: result.preset === 'promo' ? result.crop : undefined
    };

    const sub = this.articleService.cropBlogImages(req).subscribe({
      next: (resp) => {
        if (resp.coverImagePath) {
          this.coverImagePath.set(resp.coverImagePath);
          this.coverImagePreview.set(resp.coverImagePath);
        }
        if (resp.promoImagePath) {
          this.promoImagePath.set(resp.promoImagePath);
          this.promoImagePreview.set(resp.promoImagePath);
        }
        this.snackBar.open('Изображения для блога обновлены', 'Ок', { duration: 3500 });
      },
      error: (err) => {
        this.snackBar.open(err?.error?.message || 'Не удалось обработать изображение', 'Ок', { duration: 6000 });
      }
    });

    sub.add(() => this.isCropping.set(false));
  }
}

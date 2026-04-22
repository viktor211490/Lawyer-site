import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ArticlesClient, FileParameter } from '../../../services/client/web-api-client';

@Component({
  selector: 'app-article-edit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './article-edit.component.html',
  styleUrl: './article-edit.component.scss'
})
export class ArticleEditComponent implements OnInit {
  articleForm: FormGroup;
  isEdit = signal(false);
  coverImagePreview = signal<string>('');
  coverImagePath = signal<string>('');
  message = signal<string>('');
  messageType = signal<'success' | 'error'>('success');

  constructor(
    private fb: FormBuilder,
    private articleService: ArticlesClient,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
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
          if (article.coverImage) {
            this.coverImagePath.set(article.coverImage);
            this.coverImagePreview.set('http://localhost:5000' + article.coverImage);
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
    const fileParameter: FileParameter = {
      data: file,
      fileName: file.name
    };

    this.articleService.uploadImage(fileParameter).subscribe({
      next: (path) => {
        this.coverImagePath.set(path);
        this.coverImagePreview.set('http://localhost:5000' + path);
      },
      error: (err) => {
        this.message.set(err.error?.message || 'Ошибка загрузки');
        this.messageType.set('error');
      }
    });
  }

  onSubmit(): void {
    if (this.articleForm.invalid) return;

    const dto = {
      ...this.articleForm.getRawValue(),
      coverImage: this.coverImagePath()
    };

    const id = this.route.snapshot.paramMap.get('id');
    const request = id
      ? this.articleService.update(+id, dto)
      : this.articleService.create(dto);

    request.subscribe({
      next: () => {
        this.message.set('Статья сохранена');
        this.messageType.set('success');
        setTimeout(() => this.router.navigate(['/admin/articles']), 1500);
      },
      error: (err) => {
        this.message.set(err.error?.message || 'Ошибка сохранения');
        this.messageType.set('error');
      }
    });
  }

  publish(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.articleService.publish(+id).subscribe({
        next: () => {
          this.message.set('Статья опубликована');
          this.messageType.set('success');
        }
      });
    }
  }

  logout(): void {
    this.authService.logout();
  }
}

import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ArticleBriefDto, ArticlesClient } from '../../../services/client/web-api-client';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { AdminActionToolbarComponent } from '../../../admin-ui/admin-action-toolbar/admin-action-toolbar.component';
import { AdminEmptyStateComponent } from '../../../admin-ui/admin-empty-state/admin-empty-state.component';
import { AdminPageHeaderComponent } from '../../../admin-ui/admin-page-header/admin-page-header.component';
import { AdminStatusPillComponent, AdminStatusTone } from '../../../admin-ui/admin-status-pill/admin-status-pill.component';
import { formatMoscowDateRu } from '../../../utils/moscow-time';

@Component({
  selector: 'app-articles',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    AdminActionToolbarComponent,
    AdminEmptyStateComponent,
    AdminPageHeaderComponent,
    AdminStatusPillComponent
  ],
  templateUrl: './articles.component.html',
  styleUrl: './articles.component.scss'
})
export class ArticlesComponent implements OnInit {
  articles = signal<ArticleBriefDto[]>([]);
  private readonly visibilityBusyById = signal<Record<number, boolean>>({});
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly statusControl = new FormControl<'all' | 'draft' | 'published' | 'hidden' | 'scheduled'>('all', { nonNullable: true });

  readonly filteredArticles = computed(() => {
    const q = this.searchControl.value.trim().toLowerCase();
    const status = this.statusControl.value;
    let list = this.articles();
    if (status !== 'all') {
      list = list.filter((a) => (a.status || '').toLowerCase() === status);
    }
    if (!q) return list;
    return list.filter((a) => (a.title || '').toLowerCase().includes(q));
  });

  constructor(
    private articleService: ArticlesClient,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadArticles();
  }

  loadArticles(): void {
    this.articleService.getAll().subscribe({
      next: (articles) => this.articles.set(articles),
      error: (err) => console.error('Error loading articles:', err)
    });
  }

  formatDate(date: Date | string): string {
    return formatMoscowDateRu(date);
  }

  getStatusClass(status: string): string {
    return status.toLowerCase();
  }

  getStatusName(status: string): string {
    const names: any = {
      'draft': 'Черновик',
      'published': 'Опубликовано',
      'hidden': 'Скрыто',
      'scheduled': 'Запланировано'
    };
    return names[status.toLowerCase()] || status;
  }

  getStatusTone(status: string): AdminStatusTone {
    switch ((status || '').toLowerCase()) {
      case 'published':
        return 'success';
      case 'scheduled':
        return 'info';
      case 'hidden':
        return 'neutral';
      case 'draft':
      default:
        return 'warning';
    }
  }

  isVisibilityBusy(id: number): boolean {
    return !!this.visibilityBusyById()[id];
  }

  toggleVisibility(article: ArticleBriefDto): void {
    const id = article.id;
    if (!id || this.isVisibilityBusy(id)) return;

    this.visibilityBusyById.update((m) => ({ ...m, [id]: true }));

    const sub = this.articleService.toggleVisibility(id).subscribe({
      next: (updated) => {
        const isVisibleInBlog = !!updated.isVisibleInBlog;
        this.articles.update((list) =>
          list.map((a) => (a.id === id ? { ...a, isVisibleInBlog } : a))
        );
        this.snackBar.open('Видимость обновлена', 'Ок', { duration: 3500 });
      },
      error: (err) => {
        console.error('Error toggling visibility:', err);
        this.snackBar.open('Не удалось обновить видимость', 'Ок', { duration: 5000 });
      }
    });

    sub.add(() => {
      this.visibilityBusyById.update((m) => ({ ...m, [id]: false }));
    });
  }

  deleteArticle(id: number): void {
    if (confirm('Вы уверены, что хотите удалить эту статью?')) {
      this.articleService.delete(id).subscribe({
        next: () => this.loadArticles(),
        error: (err) => console.error('Error deleting article:', err)
      });
    }
  }

  logout(): void {
    this.authService.logout();
  }
}

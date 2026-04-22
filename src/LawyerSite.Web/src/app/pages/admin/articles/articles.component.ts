import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ArticleBriefDto, ArticlesClient } from '../../../services/client/web-api-client';

@Component({
  selector: 'app-articles',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './articles.component.html',
  styleUrl: './articles.component.scss'
})
export class ArticlesComponent implements OnInit {
  articles = signal<ArticleBriefDto[]>([]);

  constructor(
    private articleService: ArticlesClient,
    private authService: AuthService
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
    return format(new Date(date), 'd MMM yyyy', { locale: ru });
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

  toggleVisibility(id: number): void {
    this.articleService.toggleVisibility(id).subscribe({
      next: () => this.loadArticles(),
      error: (err) => console.error('Error toggling visibility:', err)
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

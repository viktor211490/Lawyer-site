import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../../components/header/header.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ArticleBriefDto, ArticlesClient } from '../../services/client/web-api-client';

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [RouterLink, HeaderComponent, FooterComponent],
  templateUrl: './blog.component.html',
  styleUrl: './blog.component.scss'
})
export class BlogComponent implements OnInit {
  articles = signal<ArticleBriefDto[]>([]);
  
  constructor(private articleService: ArticlesClient) {}
  
  ngOnInit(): void {
    this.articleService.getBlogArticles().subscribe({
      next: (articles) => this.articles.set(articles),
      error: (err) => console.error('Error loading articles:', err)
    });
  }
  
  formatDate(date: Date | string): string {
    return format(new Date(date), 'd MMMM yyyy', { locale: ru });
  }
}

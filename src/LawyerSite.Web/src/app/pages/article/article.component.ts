import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HeaderComponent } from '../../components/header/header.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ArticleResponseDto, ArticlesClient } from '../../services/client/web-api-client';

@Component({
  selector: 'app-article',
  standalone: true,
  imports: [HeaderComponent, FooterComponent],
  templateUrl: './article.component.html',
  styleUrl: './article.component.scss'
})
export class ArticleComponent implements OnInit {
  article = signal<ArticleResponseDto | null>(null);
  
  constructor(
    private route: ActivatedRoute,
    private articleService: ArticlesClient
  ) {}
  
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.articleService.getById(+id).subscribe({
        next: (article) => this.article.set(article),
        error: (err) => console.error('Error loading article:', err)
      });
    }
  }
  
  formatDate(date: Date | string): string {
    return format(new Date(date), 'd MMMM yyyy', { locale: ru });
  }
}

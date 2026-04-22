import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
  { path: 'booking', loadComponent: () => import('./pages/booking/booking.component').then(m => m.BookingComponent) },
  { path: 'blog', loadComponent: () => import('./pages/blog/blog.component').then(m => m.BlogComponent) },
  { path: 'article/:id', loadComponent: () => import('./pages/article/article.component').then(m => m.ArticleComponent) },

  // Admin routes с общим layout
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/admin-panel/admin-panel.component').then(m => m.AdminPanelComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'calendar', pathMatch: 'full' },
      { path: 'calendar', loadComponent: () => import('./pages/admin/calendar/calendar.component').then(m => m.CalendarComponent) },
      { path: 'services', loadComponent: () => import('./pages/admin/services/services.component').then(m => m.ServicesComponent) },
      { path: 'articles', loadComponent: () => import('./pages/admin/articles/articles.component').then(m => m.ArticlesComponent) },
      { path: 'article/:id', loadComponent: () => import('./pages/admin/article-edit/article-edit.component').then(m => m.ArticleEditComponent) },
      { path: 'article-new', loadComponent: () => import('./pages/admin/article-edit/article-edit.component').then(m => m.ArticleEditComponent) },
      { path: 'working-hours', loadComponent: () => import('./pages/admin/working-hours/working-hours.component').then(m => m.WorkingHoursComponent) }
    ]
  },
  { path: 'admin/login', loadComponent: () => import('./pages/admin/login/login.component').then(m => m.LoginComponent) },

  // 404
  { path: '**', redirectTo: 'home' }
];

import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HeaderComponent } from '../../components/header/header.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ServiceDto, ServicesClient } from '../../services/client/web-api-client';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, HeaderComponent, FooterComponent, MatSnackBarModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  services = signal<ServiceDto[]>([]);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private servicesClient: ServicesClient
  ) {}

  ngOnInit(): void {
    this.servicesClient.getServices(true).subscribe({
      next: (list) => this.services.set(list),
      error: (err) => console.error('Error loading services:', err)
    });

    this.route.queryParamMap.subscribe((params) => {
      if (params.get('booking') !== 'success') return;

      const timeLabel = params.get('timeLabel');
      const service = params.get('service');

      const msg = service && timeLabel
        ? `Запись подтверждена: ${service} — ${timeLabel}`
        : 'Запись подтверждена. Мы свяжемся с вами.';

      this.snackBar.open(msg, 'Ок', { duration: 7000 });
    });
  }

  getServiceEmoji(s: ServiceDto): string {
    if (s.emoji) return s.emoji;
    const title = (s.title ?? '').toLowerCase();
    if (title.includes('семейн')) return '⚖️';
    if (title.includes('иск') || title.includes('претенз') || title.includes('заявлен')) return '📄';
    if (title.includes('суд')) return '🏛️';
    if (title.includes('недвиж')) return '🏠';
    if (title.includes('перегов') || title.includes('урегул')) return '🤝';
    return '🛡️';
  }

  goToBooking(serviceId: number): void {
    this.router.navigate(['/booking'], { queryParams: { serviceId } });
  }
}

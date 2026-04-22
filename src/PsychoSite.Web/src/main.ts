import { provideZoneChangeDetection } from "@angular/core";
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { authInterceptor } from './app/interceptors/auth.interceptor';
import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection(),provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes),
    provideAnimations()
  ]
}).catch(err => console.error(err));

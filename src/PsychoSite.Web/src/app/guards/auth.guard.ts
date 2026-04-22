import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Проверяем есть ли токен
  const token = authService.getToken();
  
  console.log('AuthGuard check - Token exists:', !!token);
  
  if (!token) {
    console.log('No token, redirecting to login');
    router.navigate(['/admin/login'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }

  // Токен есть — разрешаем доступ
  // Если токен протух — interceptor перехватит 401 и сделает logout
  console.log('Token exists, allowing access');
  return true;
};

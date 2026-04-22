import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthClient, LoginDto, AuthResponseDto } from '../../../services/client/web-api-client';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage = signal<string>('');

  constructor(
    private fb: FormBuilder,
    private authClient: AuthClient,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    const { username, password } = this.loginForm.getRawValue();
    const loginDto: LoginDto = { username, password };

    this.authClient.login(loginDto).subscribe({
      next: (response: AuthResponseDto) => {
        this.authService.login(response.token || '', {
          id: '',
          username: response.username || '',
          email: response.email || '',
          fullName: response.fullName || ''
        });

        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/admin/calendar';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        console.error('Login error:', err);
        this.errorMessage.set(err.error?.message || 'Ошибка входа');
      }
    });
  }
}

import { Injectable, signal, computed } from '@angular/core';
import { AuthResponse, User } from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';

  private currentUserSignal = signal<User | null>(null);
  private isAuthenticatedSignal = signal<boolean>(false);

  public currentUser = computed(() => this.currentUserSignal());
  public isAuthenticated = computed(() => this.isAuthenticatedSignal());

  constructor() {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const userStr = localStorage.getItem(this.USER_KEY);
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        this.currentUserSignal.set(user);
        this.isAuthenticatedSignal.set(true);
      } catch {
        this.clearStorage();
      }
    }
  }

  login(token: string, user: User): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUserSignal.set(user);
    this.isAuthenticatedSignal.set(true);
  }

  logout(): void {
    this.clearStorage();
    this.currentUserSignal.set(null);
    this.isAuthenticatedSignal.set(false);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private clearStorage(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }
}

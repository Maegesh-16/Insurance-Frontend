import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { AuthSession } from '../models/reporting.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly authBaseUrl = '/reporting-api/api/auth';
  private readonly storageKey = 'reporting-service.session';
  private readonly sessionState = signal<AuthSession | null>(this.readStoredSession());

  readonly session = computed(() => this.sessionState());
  readonly isAuthenticated = computed(() => this.hasValidSession(this.sessionState()));

  login(email: string, password: string): Observable<AuthSession> {
    return this.http
      .post<AuthSession>(`${this.authBaseUrl}/login`, { email, password })
      .pipe(tap((session) => this.storeSession(session)));
  }

  logout(): void {
    this.clearSession();
    void this.router.navigateByUrl('/reporting/login');
  }

  expireSession(): void {
    this.clearSession();
  }

  getAccessToken(): string | null {
    const session = this.sessionState();

    if (!this.hasValidSession(session)) {
      this.clearSession();
      return null;
    }

    return session?.accessToken ?? null;
  }

  hasRole(role: string): boolean {
    return (this.sessionState()?.roles ?? []).includes(role);
  }

  hasAnyRole(roles: string[]): boolean {
    const userRoles = this.sessionState()?.roles ?? [];
    return roles.some((role) => userRoles.includes(role));
  }

  private storeSession(session: AuthSession): void {
    this.sessionState.set(session);
    localStorage.setItem(this.storageKey, JSON.stringify(session));
  }

  private clearSession(): void {
    this.sessionState.set(null);
    localStorage.removeItem(this.storageKey);
  }

  private readStoredSession(): AuthSession | null {
    const rawValue = localStorage.getItem(this.storageKey);

    if (!rawValue) {
      return null;
    }

    try {
      const parsed = JSON.parse(rawValue) as AuthSession;
      return this.hasValidSession(parsed) ? parsed : null;
    } catch {
      localStorage.removeItem(this.storageKey);
      return null;
    }
  }

  private hasValidSession(session: AuthSession | null): session is AuthSession {
    return Boolean(session?.accessToken && session.expiresAt && new Date(session.expiresAt).getTime() > Date.now());
  }
}
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthResponse, LoginRequest, RegisterRequest } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/identity-api/api/auth';
  private readonly sessionKey = 'insurance.session';

  login(request: LoginRequest): Observable<AuthResponse> { return this.http.post<AuthResponse>(`${this.apiUrl}/login`, request); }
  register(request: RegisterRequest): Observable<AuthResponse> { return this.http.post<AuthResponse>(`${this.apiUrl}/register`, request); }
  saveSession(response: AuthResponse): void { localStorage.setItem(this.sessionKey, JSON.stringify(response)); }

  getSession(): AuthResponse | null {
    const storedSession = localStorage.getItem(this.sessionKey);
    if (!storedSession) return null;

    try {
      return JSON.parse(storedSession) as AuthResponse;
    } catch {
      this.clearSession();
      return null;
    }
  }

  isAuthenticated(): boolean {
    const session = this.getSession();
    return !!session?.accessToken && new Date(session.accessTokenExpiresAtUtc).getTime() > Date.now();
  }

  clearSession(): void { localStorage.removeItem(this.sessionKey); }
}
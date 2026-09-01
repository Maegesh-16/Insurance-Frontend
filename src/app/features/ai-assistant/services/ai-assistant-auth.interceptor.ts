import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../../identity/services/auth.service';

const tokenStorageKey = 'ai-assistant-service-token';

export const aiAssistantAuthInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/ai-assistant-api/')) {
    return next(request);
  }

  const authService = inject(AuthService);
  const token = authService.isAuthenticated()
    ? authService.getSession()?.accessToken
    : localStorage.getItem(tokenStorageKey);
  return next(token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request);
};
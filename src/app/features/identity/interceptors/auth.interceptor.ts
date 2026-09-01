import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

// Covers all portal service APIs that don't have their own dedicated interceptor
const COVERED_PREFIXES = [
  '/identity-api/',
  '/customer-api/',
  '/policy-api/',
  '/claim-api/',
  '/premium-api/',
  '/payment-api/',
  '/notification-api/',
  '/gateway-api/',
];

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!COVERED_PREFIXES.some((prefix) => request.url.startsWith(prefix))) {
    return next(request);
  }

  const session = inject(AuthService).getSession();
  if (!session?.accessToken) return next(request);

  return next(request.clone({
    setHeaders: { Authorization: `Bearer ${session.accessToken}` }
  }));
};
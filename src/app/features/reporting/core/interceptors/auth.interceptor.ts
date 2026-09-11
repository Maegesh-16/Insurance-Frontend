import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/reporting-api/')) {
    return next(request);
  }

  const authService = inject(AuthService);
  const token = authService.getAccessToken();

  const nextRequest = token && !request.url.includes('/auth/login')
    ? request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      })
    : request;

  return next(nextRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        authService.expireSession();
      }

      return throwError(() => error);
    })
  );
};
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const session = authService.getSession();

  if (!authService.isAuthenticated()) return router.createUrlTree(['/login']);

  const allowedRoles = route.data['roles'] as readonly string[] | undefined;
  return !allowedRoles || allowedRoles.some((role) => session?.roles.includes(role))
    ? true
    : router.createUrlTree(['/dashboard']);
};
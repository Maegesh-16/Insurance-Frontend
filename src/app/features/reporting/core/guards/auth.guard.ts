import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AuthService as PortalAuthService } from '../../../identity/services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const portalAuthService = inject(PortalAuthService);
  const router = inject(Router);

  return authService.isAuthenticated() || portalAuthService.isAuthenticated() ? true : router.createUrlTree(['/login']);
};
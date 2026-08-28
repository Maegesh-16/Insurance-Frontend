import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../features/identity/services/auth.service';
import { NAVIGATION_ITEMS, NavigationItem } from '../../navigation/navigation.config';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app-shell.component.html'
})
export class AppShellComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly session = this.authService.getSession();
  protected readonly navigationItems = NAVIGATION_ITEMS.filter((item) => this.canAccess(item));

  protected signOut(): void {
    this.authService.clearSession();
    this.router.navigateByUrl('/login');
  }

  private canAccess(item: NavigationItem): boolean {
    const hasRequiredRole = !item.roles || item.roles.some((role) => this.session?.roles.includes(role));
    const hasRequiredPermission = !item.permission || this.session?.permissions.includes(item.permission) === true;

    return hasRequiredRole && hasRequiredPermission;
  }
}
import { Component, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent {
  private readonly authService = inject(AuthService);
  protected readonly session = this.authService.getSession();
  protected readonly firstName = this.session?.userName.split(' ')[0] ?? 'Member';
  protected readonly summaryCards = [
    { label: 'Active policies', value: '0', detail: 'Your coverage will appear here.' },
    { label: 'Open claims', value: '0', detail: 'No active claims right now.' },
    { label: 'Upcoming payments', value: '0', detail: 'Nothing due at the moment.' }
  ];
}
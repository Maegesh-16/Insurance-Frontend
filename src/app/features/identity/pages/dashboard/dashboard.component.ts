import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CustomerService } from '../../../customer/services/customer.service';
import { PolicyService } from '../../../policy/services/policy.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent {
  private readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly customerService = inject(CustomerService);
  private readonly policyService = inject(PolicyService);
  protected readonly session = this.authService.getSession();
  protected readonly firstName = this.session?.userName.split(' ')[0] ?? 'Member';
  private readonly roles = this.session?.roles ?? [];

  protected readonly dashboardType: 'admin' | 'customer' | 'operations' = this.roles.includes('PlatformAdmin')
    ? 'admin'
    : this.roles.includes('Customer')
      ? 'customer'
      : 'operations';

  protected readonly customerCards = [
    { label: 'Profile and KYC', detail: 'Create or update your profile and submit verification documents.', route: '/profile', action: 'Manage profile' },
    { label: 'Policies', detail: 'Browse policy types, request coverage, and view your policies.', route: '/policies', action: 'Open policies' },
    { label: 'Claims', detail: 'Claim processing is available when Claim Service is deployed.' },
    { label: 'Premiums', detail: 'Review your premium calculation, installment schedule, and payment history.', route: '/premiums', action: 'View premiums' },
    { label: 'Notifications', detail: 'Review your email, SMS, and push notification history.', route: '/notifications', action: 'View notifications' },
    { label: 'AI assistant', detail: 'Recommendations and policy summaries are not deployed yet.' }
  ];

  protected readonly operationsCards = this.getOperationsCards();
  protected readonly operationsTitle = this.getOperationsTitle();
  protected readonly serviceHealth = signal<{ name: string; status: string }[]>([]);
  protected readonly policyCount = signal<number | null>(null);

  constructor() {
    if (this.dashboardType === 'admin') this.loadServiceHealth();
    if (this.dashboardType === 'customer') this.loadPolicyCount();
  }

  private getOperationsCards(): { label: string; detail: string; route?: string; action?: string }[] {
    if (this.roles.includes('KycReviewer')) {
      return [{ label: 'KYC reviews', detail: 'Review pending customer identity documents.', route: '/kyc-review', action: 'Open KYC queue' }];
    }

    if (this.roles.includes('PolicyUnderwriter')) {
      return [{ label: 'Policy workspace', detail: 'Review policy types and current policy records.', route: '/policies', action: 'Open policies' }];
    }

    const unavailableAreas: Record<string, { label: string; detail: string }> = {
      ClaimsAdjuster: { label: 'Claims operations', detail: 'Claim verification and decisions need Claim Service.' },
      PaymentOperations: { label: 'Payment operations', detail: 'Payments and refunds need Payment Service.' },
      SupportAgent: { label: 'Customer support', detail: 'Customer and policy access is available when needed; ticketing is not deployed.' },
      ComplianceOfficer: { label: 'Compliance reporting', detail: 'Audit and reporting workflows need Reporting Service.' }
    };

    return [unavailableAreas[this.roles[0]] ?? { label: 'Assigned work', detail: 'No deployed work queue is assigned to this role.' }];
  }

  private getOperationsTitle(): string {
    const roleNames: Record<string, string> = {
      KycReviewer: 'KYC Review',
      PolicyUnderwriter: 'Underwriting',
      ClaimsAdjuster: 'Claims',
      PaymentOperations: 'Payments',
      SupportAgent: 'Customer Support',
      ComplianceOfficer: 'Compliance'
    };

    return this.roles.map((role) => roleNames[role]).find(Boolean) ?? 'Operations';
  }

  private loadServiceHealth(): void {
    const endpoints = [
      { name: 'API Gateway', url: '/gateway-api/health' },
      { name: 'Identity Service', url: '/identity-api/health' },
      { name: 'Customer Service', url: '/customer-api/health' },
      { name: 'Policy Service', url: '/policy-api/health' }
    ];
    endpoints.forEach((endpoint) => this.http.get<{ status: string }>(endpoint.url).subscribe({
      next: (response) => this.serviceHealth.update((items) => [...items, { name: endpoint.name, status: response.status }]),
      error: () => this.serviceHealth.update((items) => [...items, { name: endpoint.name, status: 'unavailable' }])
    }));
  }

  private loadPolicyCount(): void {
    this.customerService.getCurrent().subscribe({
      next: (customer) => this.policyService.getMine(customer.id).subscribe({
        next: (policies) => this.policyCount.set(policies.length),
        error: () => this.policyCount.set(null)
      }),
      error: () => this.policyCount.set(0)
    });
  }
}
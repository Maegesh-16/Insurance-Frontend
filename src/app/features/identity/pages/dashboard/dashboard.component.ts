import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CustomerService } from '../../../customer/services/customer.service';
import { PolicyService } from '../../../policy/services/policy.service';

interface DashboardCard {
  label: string;
  detail: string;
  route?: string;
  action?: string;
}

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
    { label: 'Profile and KYC', detail: 'View and update your profile, addresses, nominees, and KYC documents.', route: '/profile', action: 'Manage profile' },
    { label: 'My Policies', detail: 'Browse policy types, view active policies, coverage, and policy history.', route: '/policies', action: 'Open policies' },
    { label: 'My Claims', detail: 'Submit a claim, upload documents, and track your claim status and settlement.', route: '/claims', action: 'Open claims' },
    { label: 'Premiums', detail: 'Review your premium calculation, installment schedule, and payment history.', route: '/premiums', action: 'View premiums' },
    { label: 'Notifications', detail: 'View your email, SMS, and push notification history.', route: '/notifications', action: 'View notifications' },
    { label: 'AI Assistant', detail: 'Get help with your policy, claim status, coverage questions, and more.', route: '/ai-assistant', action: 'Open AI assistant' }
  ];

  protected readonly operationsCards = this.getOperationsCards();
  protected readonly operationsTitle = this.getOperationsTitle();
  protected readonly serviceHealth = signal<{ name: string; status: string }[]>([]);
  protected readonly policyCount = signal<number | null>(null);

  constructor() {
    if (this.dashboardType === 'admin') this.loadServiceHealth();
    if (this.dashboardType === 'customer') this.loadPolicyCount();
  }

  private getOperationsCards(): DashboardCard[] {
    const roleCards: Record<string, DashboardCard[]> = {
      KycReviewer: [
        { label: 'KYC review queue', detail: 'Review pending, under-review, approved, rejected, and resubmission-required KYC records.', route: '/kyc-review', action: 'Review KYC' },
        { label: 'Customer search', detail: 'Search and view customer profiles, addresses, and submitted KYC documents.' },
        { label: 'KYC history', detail: 'View past KYC decisions, remarks, and status changes for compliance records.' }
      ],
      PolicyUnderwriter: [
        { label: 'Policy applications', detail: 'Review new and pending policy applications, coverage, sum insured, and premium details.', route: '/policies', action: 'Open policies' },
        { label: 'Underwriting workspace', detail: 'Approve, reject, or request additional information and add underwriting remarks.' },
        { label: 'AI recommendations', detail: 'View AI policy recommendations as decision support during underwriting review.', route: '/ai-assistant', action: 'Open AI assistant' }
      ],
      ClaimsAdjuster: [
        { label: 'Claims queue', detail: 'View new claims, under-review, documents pending, and verification-pending cases.', route: '/claims', action: 'Open claims' },
        { label: 'Fraud alerts and AI review', detail: 'Review AI claim summaries, fraud warnings, confidence scores, and settlement recommendations.', route: '/ai-assistant/review', action: 'Open AI review' },
        { label: 'Settlement decisions', detail: 'Approve or reject settlements and forward approved settlements for payment processing.', route: '/claims', action: 'View settlements' }
      ],
      PaymentOperations: [
        { label: 'Payment overview', detail: 'Monitor pending, successful, and failed premium payments and settlement transactions.' },
        { label: 'Refunds and receipts', detail: 'Process authorized refunds, generate receipts, and track refund status.' },
        { label: 'Premium schedule', detail: 'View premium due dates, collection history, and applicable discounts.' }
      ],
      SupportAgent: [
        { label: 'Customer lookup', detail: 'Search customer profiles, KYC status, policies, premiums, payments, and claim history.', route: '/policies', action: 'Open policies' },
        { label: 'Claims and notifications', detail: 'View claim status, history, and notification records to assist customers.', route: '/claims', action: 'View claims' },
        { label: 'AI assistance', detail: 'Generate clear policy and claim summaries to support customer conversations.', route: '/ai-assistant', action: 'Open AI assistant' }
      ],
      ComplianceOfficer: [
        { label: 'Compliance reporting', detail: 'Access claim, revenue, policy, and branch reports for regulatory oversight.', route: '/reporting', action: 'Open reporting' },
        { label: 'Audit and monitoring', detail: 'Review audit logs, user activity, KYC history, claim decisions, and payment records.' },
        { label: 'Fraud and risk review', detail: 'View AI fraud warnings and compliance exceptions across claims and policies.', route: '/ai-assistant/review', action: 'Open AI review' }
      ]
    };

    const primaryRole = ['KycReviewer', 'PolicyUnderwriter', 'ClaimsAdjuster', 'PaymentOperations', 'SupportAgent', 'ComplianceOfficer']
      .find((role) => this.roles.includes(role));

    return primaryRole ? roleCards[primaryRole] : [{ label: 'Assigned work', detail: 'No operational role is assigned to this account.' }];
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
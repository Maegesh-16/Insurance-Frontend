import { HttpClient } from '@angular/common/http';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClaimApiService } from '../../../claim/services/claim-api.service';
import { ClaimSummary } from '../../../claim/models/claim.models';
import { PolicyResponse } from '../../../policy/models/policy.models';
import { AuthService } from '../../services/auth.service';
import { CustomerService } from '../../../customer/services/customer.service';
import { PolicyService } from '../../../policy/services/policy.service';
import { PremiumSchedule } from '../../../premium/models/premium.models';
import { PremiumService } from '../../../premium/services/premium.service';
import { CustomerResponse } from '../../../customer/models/customer.models';

interface DashboardCard {
  label: string;
  detail: string;
  route?: string;
  action?: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [CurrencyPipe, DatePipe, RouterLink],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent {
  private readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly customerService = inject(CustomerService);
  private readonly policyService = inject(PolicyService);
  private readonly premiumService = inject(PremiumService);
  private readonly claimApi = inject(ClaimApiService);
  protected readonly session = this.authService.getSession();
  protected readonly firstName = this.session?.userName.split(' ')[0] ?? 'Member';
  private readonly roles = this.session?.roles ?? [];

  protected readonly dashboardType: 'admin' | 'customer' | 'underwriter' | 'claimsAdjuster' | 'compliance' | 'operations' = this.roles.includes('PlatformAdmin')
    ? 'admin'
    : this.roles.includes('Customer')
      ? 'customer'
      : this.roles.includes('PolicyUnderwriter')
        ? 'underwriter'
        : this.roles.includes('ClaimsAdjuster')
          ? 'claimsAdjuster'
          : this.roles.includes('ComplianceOfficer')
            ? 'compliance'
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
  protected readonly dashboardError = signal('');
  protected readonly policyCount = signal<number | null>(null);
  protected readonly customer = signal<CustomerResponse | null>(null);
  protected readonly customerPolicies = signal<PolicyResponse[]>([]);
  protected readonly premiumSchedules = signal<PremiumSchedule[]>([]);
  protected readonly claimCount = signal<number | null>(null);
  protected readonly underwriterPolicies = signal<PolicyResponse[]>([]);
  protected readonly adjusterClaims = signal<ClaimSummary[]>([]);
  protected readonly activePolicies = computed(() => this.customerPolicies().filter((policy) => policy.status === 3));
  protected readonly totalCoverage = computed(() => this.activePolicies().flatMap((policy) => policy.coverages).reduce((sum, coverage) => sum + coverage.sumInsured, 0));
  protected readonly nextPremium = computed(() => this.premiumSchedules()
    .filter((schedule) => schedule.status.toLowerCase() !== 'paid' && new Date(schedule.dueDate) >= new Date())
    .sort((first, second) => first.dueDate.localeCompare(second.dueDate))[0] ?? null);
  protected readonly openClaimCount = computed(() => this.claimCount() ?? 0);
  protected readonly newApplications = computed(() => this.underwriterPolicies().filter((policy) => policy.status === 1));
  protected readonly pendingApplications = computed(() => this.underwriterPolicies().filter((policy) => policy.status === 2));
  protected readonly issuedPolicies = computed(() => this.underwriterPolicies().filter((policy) => policy.status === 3));
  protected readonly newClaims = computed(() => this.adjusterClaims().filter((claim) => this.hasClaimStatus(claim, 'submitted', 'open')));
  protected readonly claimsUnderReview = computed(() => this.adjusterClaims().filter((claim) => this.hasClaimStatus(claim, 'review', 'assessment')));
  protected readonly claimsRequiringDocuments = computed(() => this.adjusterClaims().filter((claim) => this.hasClaimStatus(claim, 'additional document', 'document required')));
  protected readonly claimsUnderInvestigation = computed(() => this.adjusterClaims().filter((claim) => this.hasClaimStatus(claim, 'investigation')));
  protected readonly approvedClaims = computed(() => this.adjusterClaims().filter((claim) => this.hasClaimStatus(claim, 'approved')));
  protected readonly rejectedClaims = computed(() => this.adjusterClaims().filter((claim) => this.hasClaimStatus(claim, 'rejected')));
  protected readonly settlementPendingClaims = computed(() => this.adjusterClaims().filter((claim) => this.hasClaimStatus(claim, 'settlement')));
  protected readonly pendingAdjusterClaims = computed(() => this.adjusterClaims()
    .filter((claim) => !this.hasClaimStatus(claim, 'settled', 'closed', 'rejected'))
    .sort((first, second) => new Date(second.reportedAt).getTime() - new Date(first.reportedAt).getTime()));

  constructor() {
    if (this.dashboardType === 'admin') this.loadServiceHealth();
    if (this.dashboardType === 'customer') this.loadCustomerDashboard();
    if (this.dashboardType === 'underwriter') this.loadUnderwriterDashboard();
    if (this.dashboardType === 'claimsAdjuster') this.loadClaimsAdjusterDashboard();
  }

  protected kycLabel(): string {
    const status = this.customer()?.kyc?.status;
    return status === 2 ? 'Approved' : status === 3 ? 'Rejected' : status === 4 ? 'Under review' : status ? 'Pending' : 'Not started';
  }

  protected kycAction(): string {
    return this.customer()?.kyc?.status === 2 ? 'View KYC status' : this.customer()?.kyc?.status === 3 ? 'Resubmit KYC' : 'Complete KYC';
  }

  protected policyStatusLabel(status: number): string {
    return ({ 1: 'Draft', 2: 'Pending approval', 3: 'Active', 4: 'Lapsed', 5: 'Cancelled', 6: 'Expired' } as Record<number, string>)[status] ?? 'Unknown';
  }

  private getOperationsCards(): DashboardCard[] {
    const roleCards: Record<string, DashboardCard[]> = {
      KycReviewer: [
        { label: 'Pending KYC', detail: 'Review KYC cases awaiting an initial decision.', route: '/kyc-review', action: 'Open KYC queue' },
        { label: 'Under review', detail: 'Continue reviews that require document and identity verification.', route: '/kyc-review', action: 'Open KYC queue' },
        { label: 'Approved KYC', detail: 'View verified customer KYC decisions and remarks.', route: '/kyc-review', action: 'Open KYC queue' },
        { label: 'Rejected KYC', detail: 'Review rejected cases and their recorded rejection reasons.', route: '/kyc-review', action: 'Open KYC queue' },
        { label: 'Resubmission required', detail: 'Track cases awaiting corrected or additional KYC documents.', route: '/kyc-review', action: 'Open KYC queue' },
        { label: 'Customer search', detail: 'Find customers and view permitted profile, address, and nominee details.' },
        { label: 'KYC documents', detail: 'View submitted KYC documents in the protected review queue.', route: '/kyc-review', action: 'Open KYC queue' },
        { label: 'KYC history', detail: 'View prior KYC decisions, reviewer remarks, and status changes.' },
        { label: 'KYC reports', detail: 'Review KYC activity and decision trends.' }
      ],
      PolicyUnderwriter: [
        { label: 'New applications', detail: 'Review newly submitted policy applications.', route: '/policies', action: 'Open applications' },
        { label: 'Pending review', detail: 'Continue policy applications awaiting underwriting decisions.', route: '/policies', action: 'Open applications' },
        { label: 'Approved policies', detail: 'View approved underwriting decisions and policy details.', route: '/policies', action: 'Open policies' },
        { label: 'Rejected policies', detail: 'Review rejected applications and underwriting remarks.', route: '/policies', action: 'Open applications' },
        { label: 'More information required', detail: 'Track applications waiting for customer information or documents.', route: '/policies', action: 'Open applications' },
        { label: 'Customer details', detail: 'View the customer information required for an underwriting decision.', route: '/policies', action: 'Open applications' },
        { label: 'KYC details', detail: 'Review KYC status as read-only underwriting context.', route: '/policies', action: 'Open applications' },
        { label: 'Policy details', detail: 'Review policy type, coverage, sum insured, and policy history.', route: '/policies', action: 'Open policies' },
        { label: 'Coverage and premium', detail: 'Review coverage limits, deductibles, premium calculation, and discounts.', route: '/policies', action: 'Open policies' },
        { label: 'AI recommendations', detail: 'View AI policy recommendations as decision support during underwriting review.', route: '/ai-assistant', action: 'Open AI assistant' }
      ],
      ClaimsAdjuster: [
        { label: 'New claims', detail: 'Review newly submitted claims and incident details.', route: '/claims', action: 'Open claims' },
        { label: 'Claims under review', detail: 'Continue active claim investigations and verification work.', route: '/claims', action: 'Open claims' },
        { label: 'Documents pending', detail: 'Find claims that require document review or additional documents.', route: '/claims', action: 'Open claims' },
        { label: 'Verification pending', detail: 'Review claims awaiting verification remarks and status changes.', route: '/claims', action: 'Open claims' },
        { label: 'Fraud alerts', detail: 'Review AI fraud warnings and risk indicators.', route: '/ai-assistant/review', action: 'Open AI review' },
        { label: 'AI recommendations', detail: 'Review AI claim summaries, confidence scores, and settlement recommendations.', route: '/ai-assistant/review', action: 'Open AI review' },
        { label: 'Settlement pending', detail: 'Review recommended settlement amounts and forward approved settlements for payment.', route: '/claims', action: 'Open claims' },
        { label: 'Approved claims', detail: 'View approved claims and settlement progress.', route: '/claims', action: 'Open claims' },
        { label: 'Rejected claims', detail: 'Review rejected claim decisions and recorded remarks.', route: '/claims', action: 'Open claims' },
        { label: 'Claim history', detail: 'View claim status and decision history.', route: '/claims', action: 'Open claims' },
        { label: 'Claim reports', detail: 'Review claim reporting for operational analysis.', route: '/reporting', action: 'Open reporting' }
      ],
      PaymentOperations: [
        { label: 'Payment overview', detail: 'Monitor premium payments and settlement transactions.' },
        { label: 'Pending payments', detail: 'Review payment attempts awaiting processing or verification.' },
        { label: 'Successful payments', detail: 'View completed premium and settlement payments.' },
        { label: 'Failed payments', detail: 'Investigate unsuccessful transactions and gateway references.' },
        { label: 'Transactions', detail: 'View transaction status and payment gateway references.' },
        { label: 'Refunds', detail: 'Process authorized refunds and review refund history.' },
        { label: 'Settlement payments', detail: 'Process approved claim settlement payments.' },
        { label: 'Receipts', detail: 'Generate and review premium and settlement receipts.' },
        { label: 'Premium schedule', detail: 'View premium due dates, collection history, and discounts.' },
        { label: 'Payment history', detail: 'Review historical premium and settlement payment activity.' },
        { label: 'Revenue reports', detail: 'Review revenue reporting for payment operations.', route: '/reporting', action: 'Open reporting' }
      ],
      SupportAgent: [
        { label: 'Customer search', detail: 'Search customer profiles and permitted customer activity.' },
        { label: 'Customer profile', detail: 'View customer contact and profile details needed for support.' },
        { label: 'KYC status', detail: 'View KYC status without making KYC decisions.' },
        { label: 'Policies', detail: 'View policy details and status to assist customers.', route: '/policies', action: 'Open policies' },
        { label: 'Premiums', detail: 'View premium schedules, due dates, and discounts.' },
        { label: 'Payments', detail: 'View payment, transaction, and receipt status.' },
        { label: 'Claims', detail: 'View claim status and history without changing decisions.', route: '/claims', action: 'Open claims' },
        { label: 'Notifications', detail: 'View notification history and resend permitted notifications.' },
        { label: 'Customer activity', detail: 'Review permitted customer interactions across support services.' }
      ],
      ComplianceOfficer: [
        { label: 'Compliance overview', detail: 'Review cross-service compliance activity and exceptions.' },
        { label: 'KYC monitoring', detail: 'Monitor KYC status and history without making KYC decisions.' },
        { label: 'Policy monitoring', detail: 'Review policy lifecycle and policy history.' },
        { label: 'Claim monitoring', detail: 'View claims, decisions, documents, and status history.', route: '/claims', action: 'Open claims' },
        { label: 'Fraud alerts', detail: 'View AI fraud warnings and risk indicators.', route: '/ai-assistant/review', action: 'Open AI review' },
        { label: 'Payment monitoring', detail: 'Review payment and transaction activity.' },
        { label: 'Refund monitoring', detail: 'Review refund decisions and status history.' },
        { label: 'Audit logs', detail: 'Review audit records and approval or rejection activity.' },
        { label: 'User activity', detail: 'Track user activity and authorized status changes.' },
        { label: 'Claim reports', detail: 'Review compliance claim reporting.', route: '/reporting', action: 'Open reporting' },
        { label: 'Policy statistics', detail: 'Review policy statistics for compliance oversight.', route: '/reporting', action: 'Open reporting' },
        { label: 'Revenue reports', detail: 'Review revenue reports for compliance oversight.', route: '/reporting', action: 'Open reporting' },
        { label: 'Branch reports', detail: 'Review branch reporting and regional trends.', route: '/reporting', action: 'Open reporting' }
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

  private loadCustomerDashboard(): void {
    this.customerService.getCurrent().subscribe({
      next: (customer) => {
        if (!customer) {
          this.policyCount.set(0);
          return;
        }
        this.customer.set(customer);
        localStorage.setItem('insurance.customer', JSON.stringify(customer));
        this.policyService.getMine(customer.id).subscribe({
          next: (policies) => {
            this.customerPolicies.set(policies);
            this.policyCount.set(policies.length);
            for (const policy of policies.filter((item) => item.status === 3)) {
              this.premiumService.getSchedules(policy.id).subscribe({
                next: (schedules) => this.premiumSchedules.update((items) => [...items, ...schedules]),
                error: () => undefined
              });
            }
          },
          error: () => this.policyCount.set(null)
        });
      },
      error: () => { this.dashboardError.set('Something went wrong while loading your account information. Please try again.'); this.policyCount.set(0); }
    });
    this.claimApi.getMyClaims().subscribe({
      next: (claims) => this.claimCount.set(claims.filter((claim) => !['Rejected', 'Settled', 'Closed'].includes(claim.claimStatusName)).length),
      error: () => this.claimCount.set(null)
    });
  }

  private loadUnderwriterDashboard(): void {
    this.policyService.getAll().subscribe({
      next: (policies) => this.underwriterPolicies.set(policies),
      error: () => this.dashboardError.set('Something went wrong while loading the underwriting queue. Please try again.')
    });
  }

  private loadClaimsAdjusterDashboard(): void {
    this.claimApi.getClaims().subscribe({
      next: (claims) => this.adjusterClaims.set(claims),
      error: () => this.dashboardError.set('Something went wrong while loading the claims queue. Please try again.')
    });
  }

  private hasClaimStatus(claim: ClaimSummary, ...terms: string[]): boolean {
    const status = claim.claimStatusName.toLowerCase();
    return terms.some((term) => status.includes(term));
  }
}
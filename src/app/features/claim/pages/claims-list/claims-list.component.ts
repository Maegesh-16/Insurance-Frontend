import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../identity/services/auth.service';
import { ClaimSummary } from '../../models/claim.models';
import { ClaimApiService } from '../../services/claim-api.service';

const previewClaims: ClaimSummary[] = [
  { claimId: 101, claimNumber: 'CLM-2026-00482', policyId: 8841, customerId: 302, claimTypeId: 1, claimTypeName: 'Motor', claimStatusId: 2, claimStatusName: 'In assessment', priorityId: 2, priorityName: 'High', incidentDate: '2026-08-24', reportedAt: '2026-08-25T09:30:00Z', claimAmount: 8400, approvedAmount: 0, settledAmount: 0 },
  { claimId: 102, claimNumber: 'CLM-2026-00481', policyId: 8820, customerId: 298, claimTypeId: 2, claimTypeName: 'Property', claimStatusId: 1, claimStatusName: 'Open', priorityId: 1, priorityName: 'Normal', incidentDate: '2026-08-21', reportedAt: '2026-08-22T14:10:00Z', claimAmount: 3250, approvedAmount: 0, settledAmount: 0 },
  { claimId: 103, claimNumber: 'CLM-2026-00480', policyId: 8774, customerId: 286, claimTypeId: 3, claimTypeName: 'Health', claimStatusId: 4, claimStatusName: 'Settled', priorityId: 1, priorityName: 'Normal', incidentDate: '2026-08-18', reportedAt: '2026-08-19T11:45:00Z', claimAmount: 1640, approvedAmount: 1500, settledAmount: 1500 }
];

@Component({
  selector: 'app-claims-list',
  imports: [CurrencyPipe, DatePipe, FormsModule, RouterLink],
  templateUrl: './claims-list.component.html',
  styleUrl: '../claim-workspace.scss'
})
export class ClaimsListComponent {
  private readonly claimsApi = inject(ClaimApiService);
  private readonly authService = inject(AuthService);
  private readonly roles = this.authService.getSession()?.roles ?? [];
  protected readonly claims = signal<ClaimSummary[]>(previewClaims);
  protected readonly query = signal('');
  protected readonly selectedStatus = signal('All statuses');
  protected readonly isLoading = signal(false);
  protected readonly apiState = signal<'preview' | 'connected' | 'error'>('preview');
  protected readonly canCreateClaim = this.roles.includes('Customer');
  protected readonly isAdjuster = this.roles.includes('ClaimsAdjuster');
  protected readonly isCompliance = this.roles.includes('ComplianceOfficer');
  protected readonly pageTitle = this.isAdjuster ? 'Claims operations queue' : this.isCompliance ? 'Claims monitoring' : 'My claims';
  protected readonly statusOptions = computed(() => ['All statuses', ...new Set(this.claims().map((claim) => claim.claimStatusName))]);
  protected readonly filteredClaims = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.claims().filter((claim) => (this.selectedStatus() === 'All statuses' || claim.claimStatusName === this.selectedStatus()) && (!query || `${claim.claimNumber} ${claim.claimTypeName}`.toLowerCase().includes(query)));
  });
  protected readonly openCount = computed(() => this.claims().filter((claim) => !['Settled', 'Closed', 'Rejected'].includes(claim.claimStatusName)).length);
  protected readonly assessmentCount = computed(() => this.claims().filter((claim) => claim.claimStatusName.toLowerCase().includes('assessment')).length);
  protected readonly outstandingAmount = computed(() => this.claims().reduce((total, claim) => total + claim.claimAmount - (claim.settledAmount ?? 0), 0));

  constructor() { this.refreshClaims(); }

  protected refreshClaims(): void {
    this.isLoading.set(true);
    this.claimsApi.getClaims().subscribe({
      next: (claims) => { this.claims.set(claims); this.apiState.set('connected'); this.isLoading.set(false); },
      error: () => { this.apiState.set('error'); this.isLoading.set(false); }
    });
  }

  protected badgeClass(status: string): string {
    return `status-${status.toLowerCase().replace(/[^a-z]+/g, '-')}`;
  }
}
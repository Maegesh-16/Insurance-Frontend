import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../identity/services/auth.service';
import { ClaimSummary } from '../../models/claim.models';
import { ClaimApiService } from '../../services/claim-api.service';

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
  protected readonly claims = signal<ClaimSummary[]>([]);
  protected readonly query = signal('');
  protected readonly selectedStatus = signal('All statuses');
  protected readonly isLoading = signal(true);
  protected readonly apiState = signal<'connected' | 'error'>('connected');
  protected readonly canCreateClaim = this.roles.includes('Customer');
  protected readonly isAdjuster = this.roles.includes('ClaimsAdjuster');
  protected readonly isCompliance = this.roles.includes('ComplianceOfficer');
  protected readonly claimsRoute = this.isAdjuster ? '/claims-adjuster/claims' : this.canCreateClaim ? '/customer/claims' : this.isCompliance ? '/compliance/claims' : '/claims';
  protected readonly newClaimRoute = '/customer/claims/new';
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
    (this.canCreateClaim ? this.claimsApi.getMyClaims() : this.claimsApi.getClaims()).subscribe({
      next: (claims) => { this.claims.set(claims); this.apiState.set('connected'); this.isLoading.set(false); },
      error: () => { this.apiState.set('error'); this.isLoading.set(false); }
    });
  }

  protected badgeClass(status: string): string {
    return `status-${status.toLowerCase().replace(/[^a-z]+/g, '-')}`;
  }
}
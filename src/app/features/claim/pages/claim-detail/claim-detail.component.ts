import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../identity/services/auth.service';
import { ClaimDetail } from '../../models/claim.models';
import { ClaimApiService } from '../../services/claim-api.service';

type ClaimTab = 'overview' | 'documents' | 'assessments' | 'parties' | 'settlements' | 'activity';
type ReviewStepState = 'complete' | 'attention' | 'blocked';

interface ReviewStep {
  label: string;
  detail: string;
  state: ReviewStepState;
}

@Component({
  selector: 'app-claim-detail',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, RouterLink],
  templateUrl: './claim-detail.component.html',
  styleUrl: '../claim-workspace.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClaimDetailComponent {
  private readonly claimsApi = inject(ClaimApiService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly claimId = Number(this.route.snapshot.paramMap.get('claimId'));
  private readonly roles = this.authService.getSession()?.roles ?? [];
  protected readonly isAdjuster = this.roles.includes('ClaimsAdjuster');
  protected readonly claimsRoute = this.roles.includes('ClaimsAdjuster') ? '/claims-adjuster/claims' : this.roles.includes('Customer') ? '/customer/claims' : this.roles.includes('ComplianceOfficer') ? '/compliance/claims' : '/claims';
  protected readonly claim = signal<ClaimDetail | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly error = signal('');
  protected readonly tabs: ClaimTab[] = ['overview', 'documents', 'assessments', 'parties', 'settlements', 'activity'];
  protected readonly selectedTab = signal<ClaimTab>('overview');
  protected readonly reviewSteps = computed<ReviewStep[]>(() => {
    const claim = this.claim();
    if (!claim) return [];

    return [
      { label: 'Verify policy', detail: `Policy ${claim.policyId} is linked to this claim. Confirm active coverage in the policy record.`, state: claim.policyId > 0 ? 'complete' : 'blocked' },
      { label: 'Check coverage', detail: `${claim.claimTypeName} claim for ${claim.currencyCode} ${claim.claimAmount.toLocaleString()}.`, state: claim.claimAmount > 0 ? 'attention' : 'blocked' },
      { label: 'Verify documents', detail: claim.documents.length ? `${claim.documents.length} supporting document${claim.documents.length === 1 ? '' : 's'} available for review.` : 'No supporting documents are attached.', state: claim.documents.length ? 'attention' : 'blocked' },
      { label: 'Investigate claim', detail: claim.assessments.length ? `${claim.assessments.length} assessment${claim.assessments.length === 1 ? '' : 's'} recorded.` : 'An assessment is required before a decision.', state: claim.assessments.length ? 'complete' : 'attention' },
      { label: 'Record decision', detail: claim.approvedAmount != null ? `Approved amount: ${claim.currencyCode} ${claim.approvedAmount.toLocaleString()}.` : 'Approve, partially approve, or reject after completing the review.', state: claim.approvedAmount != null || ['Rejected', 'Approved'].includes(claim.claimStatusName) ? 'complete' : 'blocked' },
      { label: 'Settlement', detail: claim.settlements.length ? `${claim.settlements.length} settlement record${claim.settlements.length === 1 ? '' : 's'} created.` : 'Settlement can begin only after an approval decision.', state: claim.settlements.length ? 'complete' : 'blocked' }
    ];
  });

  constructor() { this.loadClaim(); }

  protected selectTab(tab: ClaimTab): void { this.selectedTab.set(tab); }

  protected loadClaim(): void {
    if (!Number.isInteger(this.claimId) || this.claimId <= 0) { this.error.set('A valid claim ID is required.'); return; }
    this.isLoading.set(true);
    this.error.set('');
    this.claimsApi.getClaim(this.claimId).subscribe({
      next: (claim) => {
        this.claim.set({ ...claim, documents: claim.documents ?? [], assessments: claim.assessments ?? [], parties: claim.parties ?? [], settlements: claim.settlements ?? [], statusHistory: claim.statusHistory ?? [], actionHistory: claim.actionHistory ?? [] });
        this.isLoading.set(false);
      },
      error: (error) => { this.error.set(error.status === 404 ? 'This claim was not found or is not available to your role.' : 'Unable to load the claim record.'); this.isLoading.set(false); }
    });
  }
}
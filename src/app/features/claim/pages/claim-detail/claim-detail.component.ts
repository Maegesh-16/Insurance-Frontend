import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ClaimDetail } from '../../models/claim.models';
import { ClaimApiService } from '../../services/claim-api.service';

type ClaimTab = 'overview' | 'documents' | 'assessments' | 'parties' | 'settlements' | 'activity';

@Component({
  selector: 'app-claim-detail',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, RouterLink],
  templateUrl: './claim-detail.component.html',
  styleUrl: '../claim-workspace.scss'
})
export class ClaimDetailComponent {
  private readonly claimsApi = inject(ClaimApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly claimId = Number(this.route.snapshot.paramMap.get('claimId'));
  protected readonly claim = signal<ClaimDetail | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly error = signal('');
  protected readonly tabs: ClaimTab[] = ['overview', 'documents', 'assessments', 'parties', 'settlements', 'activity'];
  protected readonly selectedTab = signal<ClaimTab>('overview');

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
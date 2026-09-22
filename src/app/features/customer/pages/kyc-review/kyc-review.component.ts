import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { KycCaseSummary } from '../../models/customer.models';
import { CustomerService } from '../../services/customer.service';

@Component({
  selector: 'app-kyc-review',
  imports: [DatePipe],
  templateUrl: './kyc-review.component.html'
})
export class KycReviewComponent {
  private readonly customerService = inject(CustomerService);
  private readonly route = inject(ActivatedRoute);
  protected readonly selectedCaseId = this.route.snapshot.queryParamMap.get('caseId');
  protected readonly selectedStatus = this.route.snapshot.queryParamMap.get('status') ?? 'PendingReview';
  protected readonly cases = signal<KycCaseSummary[]>([]);
  protected readonly displayedCases = computed(() => this.selectedCaseId
    ? this.cases().filter((kycCase) => kycCase.id === this.selectedCaseId)
    : this.cases());
  protected readonly isLoading = signal(true);
  protected readonly activeCaseId = signal<string | null>(null);
  protected readonly error = signal('');
  protected readonly success = signal('');

  constructor() { this.loadCases(); }

  protected loadCases(): void {
    this.isLoading.set(true);
    this.error.set('');
    this.customerService.getKycCases(this.selectedStatus).subscribe({
      next: (cases) => { this.cases.set(cases); this.isLoading.set(false); },
      error: (error: HttpErrorResponse) => { this.error.set(this.getErrorMessage(error)); this.isLoading.set(false); }
    });
  }

  protected caseStatusLabel(kycCase: KycCaseSummary): string {
    if (kycCase.status) return kycCase.status;
    return this.selectedStatus === 'Verified'
      ? 'Verified'
      : this.selectedStatus === 'Rejected'
        ? 'Rejected'
        : this.selectedStatus === 'ReverificationRequired'
          ? 'Reverification required'
          : 'Pending review';
  }

  protected decide(kycCase: KycCaseSummary, verify: boolean, reasonInput: HTMLInputElement): void {
    const rejectionReason = reasonInput.value.trim();
    this.error.set('');
    this.success.set('');
    if (!verify && !rejectionReason) {
      this.error.set('Enter a rejection reason before rejecting a case.');
      return;
    }
    this.activeCaseId.set(kycCase.id);
    this.customerService.decideKycCase(kycCase.id, verify, rejectionReason).subscribe({
      next: () => {
        this.cases.update((cases) => cases.filter((item) => item.id !== kycCase.id));
        this.customerService.cacheKycCase(kycCase, verify ? 'Verified' : 'Rejected');
        this.success.set(`${kycCase.customerName}'s KYC case was ${verify ? 'verified' : 'rejected'}.`);
        this.activeCaseId.set(null);
      },
      error: (error: HttpErrorResponse) => { this.error.set(this.getErrorMessage(error)); this.activeCaseId.set(null); }
    });
  }

  protected viewDocument(kycCase: KycCaseSummary): void {
    this.error.set('');
    this.customerService.getKycDocument(kycCase.id).subscribe({
      next: (document) => {
        const documentUrl = URL.createObjectURL(document);
        globalThis.open(documentUrl, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(documentUrl), 60_000);
      },
      error: (error: HttpErrorResponse) => { this.error.set(this.getErrorMessage(error)); }
    });
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 403) return 'Your account does not have KYC reviewer access.';
    if (error.status === 404) return this.selectedStatus === 'PendingReview'
      ? 'The pending KYC queue is not available on the connected backend.'
      : `${this.statusLabel()} cases are not available on the connected backend yet. Deploy the updated Customer Service and try again.`;
    if (error.status === 0) return 'Cannot reach Customer Service. Start it on port 5180 and try again.';
    if (typeof error.error?.detail === 'string') return error.error.detail;
    if (typeof error.error?.title === 'string') return error.error.title;
    return 'The KYC queue could not be updated. Please try again.';
  }

  private statusLabel(): string {
    return ({ Verified: 'Approved KYC', Rejected: 'Rejected KYC', ReverificationRequired: 'Resubmission' } as Record<string, string>)[this.selectedStatus] ?? 'KYC';
  }
}
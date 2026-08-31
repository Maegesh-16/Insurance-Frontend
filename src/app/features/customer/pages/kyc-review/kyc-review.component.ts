import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { KycCaseSummary } from '../../models/customer.models';
import { CustomerService } from '../../services/customer.service';

@Component({
  selector: 'app-kyc-review',
  imports: [DatePipe],
  templateUrl: './kyc-review.component.html'
})
export class KycReviewComponent {
  private readonly customerService = inject(CustomerService);
  protected readonly cases = signal<KycCaseSummary[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly activeCaseId = signal<string | null>(null);
  protected readonly error = signal('');
  protected readonly success = signal('');

  constructor() { this.loadCases(); }

  protected loadCases(): void {
    this.isLoading.set(true);
    this.error.set('');
    this.customerService.getPendingKycCases().subscribe({
      next: (cases) => { this.cases.set(cases); this.isLoading.set(false); },
      error: (error: HttpErrorResponse) => { this.error.set(this.getErrorMessage(error)); this.isLoading.set(false); }
    });
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
    if (error.status === 404) return 'The submitted document is not available.';
    if (error.status === 0) return 'Cannot reach Customer Service. Start it on port 5180 and try again.';
    if (typeof error.error?.detail === 'string') return error.error.detail;
    if (typeof error.error?.title === 'string') return error.error.title;
    return 'The KYC queue could not be updated. Please try again.';
  }
}
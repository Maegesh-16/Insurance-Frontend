import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { KycCaseSummary } from '../../models/customer.models';
import { CustomerService } from '../../services/customer.service';

@Component({
  selector: 'app-customer-search',
  imports: [DatePipe, RouterLink],
  templateUrl: './customer-search.component.html'
})
export class CustomerSearchComponent {
  private readonly customerService = inject(CustomerService);
  protected readonly search = signal('');
  protected readonly cases = signal<KycCaseSummary[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly error = signal('');
  protected readonly results = computed(() => {
    const query = this.search().trim().toLowerCase();
    if (!query) return this.cases();
    return this.cases().filter((kycCase) => `${kycCase.customerName} ${kycCase.customerEmail}`.toLowerCase().includes(query));
  });

  constructor() {
    this.loadCases();
  }

  protected loadCases(): void {
    this.isLoading.set(true);
    this.error.set('');
    this.customerService.getPendingKycCases().subscribe({
      next: (cases) => { this.cases.set(cases); this.isLoading.set(false); },
      error: (error: HttpErrorResponse) => { this.error.set(this.getErrorMessage(error)); this.isLoading.set(false); }
    });
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 403) return 'Your account does not have customer search access.';
    if (error.status === 0) return 'Cannot reach Customer Service. Start it on port 5180 and try again.';
    if (typeof error.error?.detail === 'string') return error.error.detail;
    if (typeof error.error?.title === 'string') return error.error.title;
    return 'Customer search is currently unavailable. Please try again.';
  }
}
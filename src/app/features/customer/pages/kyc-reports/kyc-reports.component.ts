import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { KycHistoryEntry } from '../../models/customer.models';
import { CustomerService } from '../../services/customer.service';

@Component({
  selector: 'app-kyc-reports',
  imports: [DatePipe, RouterLink],
  templateUrl: './kyc-reports.component.html'
})
export class KycReportsComponent {
  private readonly customerService = inject(CustomerService);
  protected readonly history = signal<KycHistoryEntry[]>([]);
  protected readonly search = signal('');
  protected readonly isLoading = signal(true);
  protected readonly error = signal('');
  protected readonly filteredHistory = computed(() => {
    const query = this.search().trim().toLowerCase();
    if (!query) return this.history();
    return this.history().filter((entry) => `${entry.customerName} ${entry.customerEmail} ${entry.status} ${entry.eventType}`.toLowerCase().includes(query));
  });
  protected readonly totalRecords = computed(() => this.history().length);
  protected readonly verifiedCount = computed(() => this.history().filter((entry) => entry.status === 'Verified' || entry.eventType === 'kyc.verified').length);
  protected readonly rejectedCount = computed(() => this.history().filter((entry) => entry.status === 'Rejected' || entry.eventType === 'kyc.rejected').length);
  protected readonly pendingCount = computed(() => this.history().filter((entry) => entry.status === 'PendingReview').length);
  protected readonly latestActivity = computed(() => this.history()[0]?.occurredAtUtc ?? null);

  constructor() {
    this.loadReport();
  }

  protected loadReport(): void {
    this.isLoading.set(true);
    this.error.set('');
    this.customerService.getKycHistory().subscribe({
      next: (history) => { this.history.set(history); this.isLoading.set(false); },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.status === 403 ? 'Your account does not have KYC report access.' : 'KYC reports are currently unavailable. Please try again.');
        this.isLoading.set(false);
      }
    });
  }
}
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { KycHistoryEntry } from '../../models/customer.models';
import { CustomerService } from '../../services/customer.service';

@Component({
  selector: 'app-kyc-history',
  imports: [DatePipe, RouterLink],
  templateUrl: './kyc-history.component.html'
})
export class KycHistoryComponent {
  private readonly customerService = inject(CustomerService);
  protected readonly search = signal('');
  protected readonly history = signal<KycHistoryEntry[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly error = signal('');
  protected readonly results = computed(() => {
    const query = this.search().trim().toLowerCase();
    if (!query) return this.history();
    return this.history().filter((entry) => `${entry.customerName} ${entry.customerEmail} ${entry.status} ${entry.eventType}`.toLowerCase().includes(query));
  });

  constructor() {
    this.loadHistory();
  }

  protected loadHistory(): void {
    this.isLoading.set(true);
    this.error.set('');
    this.customerService.getKycHistory().subscribe({
      next: (history) => { this.history.set(history); this.isLoading.set(false); },
      error: (error: HttpErrorResponse) => {
        const message = error.status === 403
          ? 'Your account does not have KYC history access.'
          : error.status === 404
            ? 'KYC history is not available on the connected backend yet. Deploy the updated Customer Service and try again.'
            : error.status === 0
              ? 'Cannot reach Customer Service. Start the local gateway or switch the frontend to the local proxy.'
              : 'KYC history is currently unavailable. Please try again.';
        this.error.set(message);
        this.isLoading.set(false);
      }
    });
  }
}
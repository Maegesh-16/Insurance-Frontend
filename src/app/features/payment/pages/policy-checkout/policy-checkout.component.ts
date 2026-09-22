import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PolicyResponse } from '../../../policy/models/policy.models';
import { PolicyService } from '../../../policy/services/policy.service';
import { CreatePaymentRequest } from '../../models/payment.models';
import { PaymentService } from '../../services/payment.service';

@Component({
  selector: 'app-policy-checkout',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './policy-checkout.component.html'
})
export class PolicyCheckoutComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly policyService = inject(PolicyService);
  private readonly paymentService = inject(PaymentService);
  private paymentAttempt: { request: CreatePaymentRequest; idempotencyKey: string } | null = null;
  protected readonly policy = signal<PolicyResponse | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly isPaying = signal(false);
  protected readonly error = signal('');
  protected readonly paymentReference = signal('');

  constructor() {
    const policyId = this.route.snapshot.paramMap.get('policyId');
    const customerId = this.getCustomerId();
    if (!policyId || !customerId) {
      this.error.set('We could not find the policy selected for checkout.');
      this.isLoading.set(false);
      return;
    }
    this.policyService.getMine(customerId).subscribe({
      next: (policies) => {
        const policy = policies.find((item) => item.id === policyId) ?? null;
        if (!policy || policy.status !== 3) {
          this.error.set('Only approved active policies are available for payment. Check My Applications for underwriting status.');
        } else {
          this.policy.set(policy);
        }
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => this.handleError(error)
    });
  }

  protected payNow(): void {
    const policy = this.policy();
    if (!policy || this.isPaying()) return;
    const paymentAttempt = this.paymentAttempt ??= {
      request: {
        policyId: policy.id,
        amount: policy.premiumAmount,
        method: 'Online',
        status: 'Completed',
        paymentDate: new Date().toISOString()
      },
      idempotencyKey: crypto.randomUUID()
    };
    this.isPaying.set(true);
    this.error.set('');
    this.paymentService.createPayment(paymentAttempt.request, paymentAttempt.idempotencyKey).subscribe({
      next: (payment) => {
        this.paymentReference.set(payment.paymentId);
        this.isPaying.set(false);
      },
      error: (error: HttpErrorResponse) => this.handleError(error)
    });
  }

  protected returnToPolicies(): void { void this.router.navigateByUrl('/customer/policies'); }

  private getCustomerId(): string | null {
    try { return (JSON.parse(localStorage.getItem('insurance.customer') || 'null') as { id?: string } | null)?.id ?? null; }
    catch { return null; }
  }

  private handleError(error: HttpErrorResponse): void {
    this.isLoading.set(false);
    this.isPaying.set(false);
    this.error.set(error.status === 0
      ? 'Payment service is currently unavailable. Please try again shortly.'
      : 'We could not complete your payment. Please try again.');
  }
}
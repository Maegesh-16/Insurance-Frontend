import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PolicyResponse } from '../../../policy/models/policy.models';
import { PolicyService } from '../../../policy/services/policy.service';
import { CreatePaymentRequest, Payment } from '../../models/payment.models';
import { PaymentService } from '../../services/payment.service';

@Component({
  selector: 'app-payment-workspace',
  imports: [CurrencyPipe, DatePipe, FormsModule],
  templateUrl: './payment-workspace.component.html'
})
export class PaymentWorkspaceComponent {
  private readonly policyService = inject(PolicyService);
  private readonly paymentService = inject(PaymentService);
  private paymentAttempt: { request: CreatePaymentRequest; idempotencyKey: string } | null = null;
  protected readonly policies = signal<PolicyResponse[]>([]);
  protected readonly payments = signal<Payment[]>([]);
  protected readonly selectedPolicyId = signal('');
  protected readonly amount = signal<number | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly error = signal('');
  protected readonly success = signal('');

  constructor() { this.loadPolicies(); }

  protected selectPolicy(policyId: string): void {
    this.paymentAttempt = null;
    this.selectedPolicyId.set(policyId);
    this.payments.set([]);
    if (policyId) this.loadPayments();
  }

  protected updateAmount(amount: string | number): void {
    this.paymentAttempt = null;
    this.amount.set(amount === '' ? null : Number(amount));
  }

  protected recordPayment(): void {
    const policyId = this.selectedPolicyId();
    const amount = this.amount();
    if (!policyId || !amount || amount <= 0) return;

    const paymentAttempt = this.paymentAttempt ??= {
      request: { policyId, amount, method: 'Standard', status: 'Completed', paymentDate: new Date().toISOString() },
      idempotencyKey: crypto.randomUUID()
    };
    this.isSaving.set(true);
    this.error.set('');
    this.success.set('');
    this.paymentService.createPayment(paymentAttempt.request, paymentAttempt.idempotencyKey).subscribe({
      next: (payment) => {
      this.paymentAttempt = null;
        this.payments.update((payments) => [payment, ...payments]);
        this.amount.set(null);
        this.isSaving.set(false);
        this.success.set('Payment recorded successfully.');
      },
      error: (error: HttpErrorResponse) => {
        this.isSaving.set(false);
        this.handleError(error);
      }
    });
  }

  protected policyLabel(policy: PolicyResponse): string { return `${policy.policyType.name} - ${policy.policyNumber}`; }

  private loadPolicies(): void {
    try {
      const customer = JSON.parse(localStorage.getItem('insurance.customer') || 'null') as { id: string } | null;
      if (!customer?.id) {
        this.error.set('Complete your profile before recording a payment.');
        this.isLoading.set(false);
        return;
      }
      this.policyService.getMine(customer.id).subscribe({
        next: (policies) => {
          const activePolicies = policies.filter((policy) => policy.status === 3);
          this.policies.set(activePolicies);
          this.isLoading.set(false);
          if (activePolicies[0]) this.selectPolicy(activePolicies[0].id);
        },
        error: (error: HttpErrorResponse) => this.handleError(error)
      });
    } catch {
      this.error.set('Complete your profile before recording a payment.');
      this.isLoading.set(false);
    }
  }

  private loadPayments(): void {
    this.paymentService.getPayments(this.selectedPolicyId()).subscribe({
      next: (payments) => this.payments.set(payments),
      error: (error: HttpErrorResponse) => this.handleError(error)
    });
  }

  private handleError(error: HttpErrorResponse): void {
    this.isLoading.set(false);
    if (error.status === 0) this.error.set('Cannot reach Payment Service. Start it on port 5169 and try again.');
    else if (error.status === 401 || error.status === 403) this.error.set('Your account is not authorized to access payment details.');
    else if (typeof error.error?.detail === 'string') this.error.set(error.error.detail);
    else this.error.set('We could not complete the payment request. Please try again.');
  }
}
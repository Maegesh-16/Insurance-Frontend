import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PolicyResponse } from '../../models/policy.models';
import { PolicyService } from '../../services/policy.service';

@Component({
  selector: 'app-policy-management',
  imports: [CurrencyPipe, DatePipe, FormsModule],
  templateUrl: './policy-management.component.html'
})
export class PolicyManagementComponent {
  private readonly policyService = inject(PolicyService);
  protected readonly policies = signal<PolicyResponse[]>([]);
  protected readonly loading = signal(true);
  protected readonly savingPolicyId = signal<string | null>(null);
  protected readonly selectedPolicy = signal<PolicyResponse | null>(null);
  protected readonly targetPolicyStatus = signal(2);
  protected readonly underwritingRemarks = signal('');
  protected readonly error = signal('');

  constructor() { this.loadPolicies(); }

  protected openPolicyDecision(policy: PolicyResponse): void {
    const nextStatuses = this.nextPolicyStatuses(policy.status);
    if (nextStatuses.length === 0) return;
    this.selectedPolicy.set(policy);
    this.targetPolicyStatus.set(nextStatuses[0]);
    this.underwritingRemarks.set('');
  }

  protected savePolicyDecision(): void {
    const policy = this.selectedPolicy();
    const remarks = this.underwritingRemarks().trim();
    if (!policy || !remarks) return;
    this.savingPolicyId.set(policy.id);
    this.policyService.transitionStatus(policy.id, { status: this.targetPolicyStatus(), remarks }).subscribe({
      next: (updatedPolicy) => {
        this.policies.update((policies) => policies.map((item) => item.id === updatedPolicy.id ? updatedPolicy : item));
        this.selectedPolicy.set(null);
        this.savingPolicyId.set(null);
      },
      error: (error: HttpErrorResponse) => { this.error.set(this.message(error)); this.savingPolicyId.set(null); }
    });
  }

  protected policyStatusLabel(status: number): string {
    return ({ 1: 'Draft', 2: 'Pending approval', 3: 'Active', 4: 'Lapsed', 5: 'Cancelled', 6: 'Expired' } as Record<number, string>)[status] ?? 'Unknown';
  }

  protected nextPolicyStatuses(status: number): number[] {
    return ({ 1: [2, 5], 2: [3, 5], 3: [4, 5, 6] } as Record<number, number[]>)[status] ?? [];
  }

  private loadPolicies(): void {
    this.loading.set(true);
    this.policyService.getAll().subscribe({
      next: (policies) => { this.policies.set(policies); this.loading.set(false); },
      error: (error: HttpErrorResponse) => { this.error.set(this.message(error)); this.loading.set(false); }
    });
  }

  private message(error: HttpErrorResponse): string {
    if (typeof error.error?.detail === 'string') return error.error.detail;
    return error.status === 403 ? 'Your account does not have policy-management permission.' : 'Policy management is unavailable until the updated Policy Service is deployed.';
  }
}